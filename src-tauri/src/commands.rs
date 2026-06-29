use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::time::Instant;
use tauri::State;

use crate::capture::CaptureRegion;
use crate::db::TranslationCache;
use crate::diagnostics::{mock_snapshot, DiagnosticsSnapshot};
use crate::overlay::{OverlayBlock, OverlayMode};
use crate::privacy::{is_window_allowed, PrivacyCheckResult};
use crate::settings::AppSettings;
use crate::translation::mock_translate;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SimulateTranslateRequest {
    pub mode: Option<String>,
    pub target_language: Option<String>,
    pub x: Option<i32>,
    pub y: Option<i32>,
    pub width: Option<i32>,
    pub height: Option<i32>,
    pub display_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct OcrBlock {
    pub text: String,
    pub bbox: [i32; 4],
    pub confidence: f32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OcrResponse {
    pub ok: bool,
    pub provider: String,
    pub elapsed_ms: i32,
    pub blocks: Vec<OcrBlock>,
    pub error: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct LocalTranslationRequest {
    pub texts: Vec<String>,
    pub target_language: String,
    pub engine: String,
    pub source_language: String,
}

#[derive(Debug, Deserialize)]
pub struct LocalTranslationResponse {
    pub ok: bool,
    pub provider: String,
    pub elapsed_ms: i32,
    pub translations: Vec<String>,
    pub error: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct TranslationBlock {
    #[serde(rename = "sourceText")]
    pub source_text: String,
    #[serde(rename = "targetText")]
    pub target_text: String,
    pub bbox: [i32; 4],
    pub confidence: f32,
    #[serde(rename = "fromCache")]
    pub from_cache: bool,
    pub engine: String,
}

#[derive(Debug, Serialize)]
pub struct TranslateResponse {
    pub ok: bool,
    pub mode: String,
    #[serde(rename = "elapsedMs")]
    pub elapsed_ms: i64,
    pub blocks: Vec<TranslationBlock>,
    pub error: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct AppStatus {
    pub ok: bool,
    pub app: String,
    pub version: String,
    #[serde(rename = "ocrEndpoint")]
    pub ocr_endpoint: String,
}

#[tauri::command]
pub fn get_app_status() -> AppStatus {
    AppStatus {
        ok: true,
        app: "ScreenLingua".to_string(),
        version: "0.1.0".to_string(),
        ocr_endpoint: "http://127.0.0.1:8765".to_string(),
    }
}

#[tauri::command]
pub async fn simulate_region_translate(
    cache: State<'_, TranslationCache>,
    request: SimulateTranslateRequest,
) -> Result<TranslateResponse, String> {
    let start = Instant::now();
    let target_language = request
        .target_language
        .clone()
        .unwrap_or_else(|| "zh-CN".to_string());
    let mode = request.mode.clone().unwrap_or_else(|| "local".to_string());

    let capture_path = capture_request_region_to_temp_file(&request).ok();
    let ocr = match call_ocr_sidecar(capture_path.as_ref()).await {
        Ok(response) => response,
        Err(_) => fallback_ocr_response(),
    };
    if let Some(path) = capture_path {
        let _ = fs::remove_file(path);
    }
    let mut block_slots: Vec<Option<TranslationBlock>> = Vec::new();
    let mut cache_misses: Vec<(usize, OcrBlock)> = Vec::new();

    for block in ocr.blocks {
        if block.text.trim().is_empty() {
            continue;
        }

        let slot_index = block_slots.len();
        let cache_for_lookup = cache.inner().clone();
        let source = block.text.clone();
        let lang = target_language.clone();

        let cached = tokio::task::spawn_blocking(move || cache_for_lookup.lookup(&source, &lang))
            .await
            .map_err(|join_err| format!("cache lookup thread failed: {}", join_err))?
            .map_err(|db_err| format!("cache lookup failed: {}", db_err))?;

        if let Some(cached_text) = cached {
            block_slots.push(Some(TranslationBlock {
                source_text: block.text,
                target_text: cached_text,
                bbox: block.bbox,
                confidence: block.confidence,
                from_cache: true,
                engine: "sqlite-cache".to_string(),
            }));
            continue;
        }

        block_slots.push(None);
        cache_misses.push((slot_index, block));
    }

    if !cache_misses.is_empty() {
        let texts_to_translate = cache_misses
            .iter()
            .map(|(_, block)| block.text.clone())
            .collect::<Vec<_>>();
        let (translations, engine) =
            translate_texts_locally(&texts_to_translate, &target_language).await;

        let should_cache = !engine.contains("fallback") && !engine.starts_with("mock");

        for ((slot_index, block), translated) in cache_misses.into_iter().zip(translations) {
            if should_cache {
                let cache_for_insert = cache.inner().clone();
                let source = block.text.clone();
                let lang = target_language.clone();
                let translation = translated.clone();
                let cache_engine = engine.clone();

                tokio::task::spawn_blocking(move || {
                    cache_for_insert.insert(&source, &lang, &translation, &cache_engine)
                })
                .await
                .map_err(|join_err| format!("cache insert thread failed: {}", join_err))?
                .map_err(|db_err| format!("cache insert failed: {}", db_err))?;
            }

            block_slots[slot_index] = Some(TranslationBlock {
                source_text: block.text,
                target_text: translated,
                bbox: block.bbox,
                confidence: block.confidence,
                from_cache: false,
                engine: engine.clone(),
            });
        }
    }

    let blocks = block_slots.into_iter().flatten().collect();

    Ok(TranslateResponse {
        ok: true,
        mode,
        elapsed_ms: start.elapsed().as_millis() as i64,
        blocks,
        error: None,
    })
}

fn fallback_ocr_response() -> OcrResponse {
    OcrResponse {
        ok: true,
        provider: "rust-fallback-mock".to_string(),
        elapsed_ms: 0,
        error: None,
        blocks: vec![
            OcrBlock {
                text: "Render Settings".to_string(),
                bbox: [420, 180, 570, 212],
                confidence: 0.96,
            },
            OcrBlock {
                text: "Subdivision Surface".to_string(),
                bbox: [440, 260, 620, 292],
                confidence: 0.94,
            },
            OcrBlock {
                text: "Permission Denied".to_string(),
                bbox: [380, 330, 548, 362],
                confidence: 0.97,
            },
            OcrBlock {
                text: "Prompt Engineering".to_string(),
                bbox: [360, 410, 560, 442],
                confidence: 0.95,
            },
        ],
    }
}

fn capture_request_region_to_temp_file(
    request: &SimulateTranslateRequest,
) -> Result<PathBuf, String> {
    let region = CaptureRegion {
        x: request.x.unwrap_or(0),
        y: request.y.unwrap_or(0),
        width: request.width.unwrap_or(1200),
        height: request.height.unwrap_or(800),
        display_id: request.display_id.clone(),
    };

    let png_bytes = crate::capture::capture_region(&region)?;
    let file_name = format!(
        "screenlingua_capture_{}_{}.png",
        std::process::id(),
        start_timestamp_millis()
    );
    let path = std::env::temp_dir().join(file_name);
    fs::write(&path, png_bytes).map_err(|err| {
        format!(
            "failed to write temporary capture file {}: {}",
            path.display(),
            err
        )
    })?;
    Ok(path)
}

fn start_timestamp_millis() -> u128 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or(0)
}

async fn translate_texts_locally(
    source_texts: &[String],
    target_language: &str,
) -> (Vec<String>, String) {
    if source_texts.is_empty() {
        return (Vec::new(), "local-empty".to_string());
    }

    match call_local_translate_sidecar(
        source_texts.to_vec(),
        target_language,
        "local",
    )
    .await
    {
        Ok(response) if response.ok && response.translations.len() == source_texts.len() => {
            (response.translations, response.provider)
        }
        _ => (
            source_texts
                .iter()
                .map(|source_text| mock_translate(source_text, target_language))
                .collect(),
            "rust-local-fallback".to_string(),
        ),
    }
}

async fn call_ocr_sidecar(image_path: Option<&PathBuf>) -> Result<OcrResponse, reqwest::Error> {
    let client = reqwest::Client::new();
    let body = serde_json::json!({
        "mode": "local",
        "language_hint": "en",
        "image_path": image_path.map(|path| path.to_string_lossy().to_string()),
    });

    client
        .post("http://127.0.0.1:8765/ocr")
        .json(&body)
        .send()
        .await?
        .json::<OcrResponse>()
        .await
}

async fn call_local_translate_sidecar(
    texts: Vec<String>,
    target_language: &str,
    engine: &str,
) -> Result<LocalTranslationResponse, String> {
    let client = reqwest::Client::new();
    let request = LocalTranslationRequest {
        texts,
        target_language: target_language.to_string(),
        engine: engine.to_string(),
        source_language: "en".to_string(),
    };

    let response = client
        .post("http://127.0.0.1:8765/translate")
        .json(&request)
        .send()
        .await
        .map_err(|err| format!("local translation sidecar request failed: {}", err))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("local translation sidecar returned {}: {}", status, body));
    }

    response
        .json::<LocalTranslationResponse>()
        .await
        .map_err(|err| format!("local translation sidecar response invalid: {}", err))
}

#[tauri::command]
pub fn get_diagnostics_snapshot() -> DiagnosticsSnapshot {
    mock_snapshot()
}

#[tauri::command]
pub fn check_privacy_for_window(
    app_name: Option<String>,
    window_title: Option<String>,
) -> PrivacyCheckResult {
    let settings = AppSettings::default();
    is_window_allowed(app_name.as_deref(), window_title.as_deref(), &settings)
}

#[tauri::command]
pub fn capture_screen_region(x: i32, y: i32, width: i32, height: i32) -> Result<Vec<u8>, String> {
    let region = CaptureRegion {
        x,
        y,
        width,
        height,
        display_id: None,
    };
    crate::capture::capture_region(&region)
}

#[tauri::command]
pub fn capture_full_screen(display_id: Option<String>) -> Result<Vec<u8>, String> {
    crate::capture::capture_full_screen(display_id.as_deref())
}

#[tauri::command]
pub fn show_overlay(
    app: tauri::AppHandle,
    blocks: Vec<OverlayBlock>,
    mode: String,
) -> Result<(), String> {
    let mode = match mode.as_str() {
        "bubble" => OverlayMode::Bubble,
        "panel" => OverlayMode::RegionPanel,
        "inline" => OverlayMode::Inline,
        "subtitle" => OverlayMode::Subtitle,
        _ => OverlayMode::Bubble,
    };
    crate::overlay::create_overlay_window(&app, &blocks, mode)
}

#[tauri::command]
pub fn hide_overlay(app: tauri::AppHandle) -> Result<(), String> {
    crate::overlay::close_overlay(&app)
}

#[tauri::command]
pub async fn translate_text(
    texts: Vec<String>,
    target_lang: String,
    engine: String,
    api_key: String,
    api_base: Option<String>,
    model: Option<String>,
) -> Result<Vec<String>, String> {
    let config = crate::translation::TranslationConfig {
        engine: engine.clone(),
        api_key,
        api_base,
        model,
    };

    match engine.as_str() {
        "local" | "argos" => match call_local_translate_sidecar(texts.clone(), &target_lang, &engine).await {
            Ok(response) if response.ok && response.translations.len() == texts.len() => {
                Ok(response.translations)
            }
            _ => Ok(texts
                .iter()
                .map(|text| crate::translation::mock_translate(text, &target_lang))
                .collect()),
        },
        "openai" => crate::translation::translate_via_openai(&texts, &target_lang, &config).await,
        "deepseek" => crate::translation::translate_via_deepseek(&texts, &target_lang, &config).await,
        _ => Ok(texts
            .iter()
            .map(|text| crate::translation::mock_translate(text, &target_lang))
            .collect()),
    }
}
