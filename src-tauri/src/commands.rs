use serde::{Deserialize, Serialize};
use std::time::Instant;

use crate::db::TranslationCache;
use crate::translation::mock_translate;
use crate::diagnostics::{mock_snapshot, DiagnosticsSnapshot};
use crate::settings::AppSettings;
use crate::privacy::{is_window_allowed, PrivacyCheckResult};

#[derive(Debug, Deserialize)]
pub struct SimulateTranslateRequest {
    pub mode: Option<String>,
    pub target_language: Option<String>,
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
pub fn simulate_region_translate(request: SimulateTranslateRequest) -> Result<TranslateResponse, String> {
    let start = Instant::now();
    let target_language = request.target_language.unwrap_or_else(|| "zh-CN".to_string());
    let mode = request.mode.unwrap_or_else(|| "mock".to_string());

    let ocr = call_ocr_sidecar().unwrap_or_else(|_| OcrResponse {
        ok: true,
        provider: "rust-fallback-mock".to_string(),
        elapsed_ms: 0,
        error: None,
        blocks: vec![
            OcrBlock { text: "Render Settings".to_string(), bbox: [420, 180, 570, 212], confidence: 0.96 },
            OcrBlock { text: "Subdivision Surface".to_string(), bbox: [440, 260, 620, 292], confidence: 0.94 },
            OcrBlock { text: "Permission Denied".to_string(), bbox: [380, 330, 548, 362], confidence: 0.97 },
            OcrBlock { text: "Prompt Engineering".to_string(), bbox: [360, 410, 560, 442], confidence: 0.95 },
        ],
    });

    let cache = TranslationCache::open_default().map_err(|err| err.to_string())?;
    let mut blocks = Vec::new();

    for block in ocr.blocks {
        if block.text.trim().is_empty() {
            continue;
        }

        if let Some(cached) = cache.lookup(&block.text, &target_language).map_err(|err| err.to_string())? {
            blocks.push(TranslationBlock {
                source_text: block.text,
                target_text: cached,
                bbox: block.bbox,
                confidence: block.confidence,
                from_cache: true,
                engine: "sqlite-cache".to_string(),
            });
        } else {
            let translated = mock_translate(&block.text, &target_language);
            cache.insert(&block.text, &target_language, &translated, "mock").map_err(|err| err.to_string())?;
            blocks.push(TranslationBlock {
                source_text: block.text,
                target_text: translated,
                bbox: block.bbox,
                confidence: block.confidence,
                from_cache: false,
                engine: "mock".to_string(),
            });
        }
    }

    Ok(TranslateResponse {
        ok: true,
        mode,
        elapsed_ms: start.elapsed().as_millis() as i64,
        blocks,
        error: None,
    })
}

fn call_ocr_sidecar() -> Result<OcrResponse, reqwest::Error> {
    let client = reqwest::blocking::Client::new();
    client
        .post("http://127.0.0.1:8765/ocr")
        .json(&serde_json::json!({"mode": "mock", "language_hint": "en"}))
        .send()?
        .json::<OcrResponse>()
}


#[tauri::command]
pub fn get_diagnostics_snapshot() -> DiagnosticsSnapshot {
    mock_snapshot()
}

#[tauri::command]
pub fn check_privacy_for_window(app_name: Option<String>, window_title: Option<String>) -> PrivacyCheckResult {
    let settings = AppSettings::default();
    is_window_allowed(app_name.as_deref(), window_title.as_deref(), &settings)
}
