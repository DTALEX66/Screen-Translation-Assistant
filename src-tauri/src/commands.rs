use serde::{Deserialize, Serialize};
use std::time::Instant;
use tauri::State;

use crate::db::TranslationCache;
use crate::translation::mock_translate;
use crate::diagnostics::{mock_snapshot, DiagnosticsSnapshot};
use crate::settings::AppSettings;
use crate::privacy::{is_window_allowed, PrivacyCheckResult};
use crate::overlay::{OverlayBlock, OverlayMode};

// ── 请求/响应数据结构 ──────────────────────────────────────────

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

// ── Tauri Commands ─────────────────────────────────────────────

#[tauri::command]
pub fn get_app_status() -> AppStatus {
    AppStatus {
        ok: true,
        app: "ScreenLingua".to_string(),
        version: "0.1.0".to_string(),
        ocr_endpoint: "http://127.0.0.1:8765".to_string(),
    }
}

/// 核心翻译 command：异步调用 OCR sidecar，通过 Tauri State 共享 DB 连接，
/// 避免每次请求都重新 open 数据库。
#[tauri::command]
pub async fn simulate_region_translate(
    cache: State<'_, TranslationCache>,
    request: SimulateTranslateRequest,
) -> Result<TranslateResponse, String> {
    let start = Instant::now();
    let target_language = request.target_language.unwrap_or_else(|| "zh-CN".to_string());
    let mode = request.mode.unwrap_or_else(|| "mock".to_string());

    // 异步调用 OCR sidecar
    let ocr = call_ocr_sidecar().await.unwrap_or_else(|_| OcrResponse {
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
    });

    let mut blocks = Vec::new();

    for block in ocr.blocks {
        if block.text.trim().is_empty() {
            continue;
        }

        // 把 DB 操作丢到 spawn_blocking 里，避免阻塞 async runtime。
        // TranslationCache 是 Arc 包裹的，clone 开销很小。
        let cache_for_lookup = cache.inner().clone();
        let source = block.text.clone();
        let lang = target_language.clone();

        let cached = tokio::task::spawn_blocking(move || cache_for_lookup.lookup(&source, &lang))
            .await
            .map_err(|join_err| format!("缓存查询线程异常: {}", join_err))?
            .map_err(|db_err| format!("数据库查询失败: {}", db_err))?;

        if let Some(cached_text) = cached {
            blocks.push(TranslationBlock {
                source_text: block.text,
                target_text: cached_text,
                bbox: block.bbox,
                confidence: block.confidence,
                from_cache: true,
                engine: "sqlite-cache".to_string(),
            });
        } else {
            let translated = mock_translate(&block.text, &target_language);

            // 插入缓存同样走 spawn_blocking
            let cache_for_insert = cache.inner().clone();
            let source = block.text.clone();
            let lang = target_language.clone();
            let translation = translated.clone();

            tokio::task::spawn_blocking(move || {
                cache_for_insert.insert(&source, &lang, &translation, "mock")
            })
            .await
            .map_err(|join_err| format!("缓存写入线程异常: {}", join_err))?
            .map_err(|db_err| format!("数据库写入失败: {}", db_err))?;

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

/// 异步调用 OCR sidecar（非阻塞 reqwest）。
async fn call_ocr_sidecar() -> Result<OcrResponse, reqwest::Error> {
    let client = reqwest::Client::new();
    client
        .post("http://127.0.0.1:8765/ocr")
        .json(&serde_json::json!({"mode": "mock", "language_hint": "en"}))
        .send()
        .await?
        .json::<OcrResponse>()
        .await
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

// ── 截图命令 ───────────────────────────────────────────────────

/// 截图指定区域，返回 PNG 字节
#[tauri::command]
pub fn capture_screen_region(x: i32, y: i32, width: i32, height: i32) -> Result<Vec<u8>, String> {
    crate::capture::capture_region(x, y, width, height)
}

/// 全屏截图，可选指定显示器
#[tauri::command]
pub fn capture_full_screen(display_id: Option<String>) -> Result<Vec<u8>, String> {
    crate::capture::capture_full_screen(display_id)
}

// ── 悬浮窗命令 ─────────────────────────────────────────────────

/// 显示翻译悬浮窗
#[tauri::command]
pub fn show_overlay(app: tauri::AppHandle, blocks: Vec<OverlayBlock>, mode: String) -> Result<(), String> {
    let mode = match mode.as_str() {
        "bubble" => OverlayMode::Bubble,
        "panel" => OverlayMode::RegionPanel,
        "inline" => OverlayMode::Inline,
        "subtitle" => OverlayMode::Subtitle,
        _ => OverlayMode::Bubble,
    };
    crate::overlay::create_overlay_window(&app, &blocks, mode)
}

/// 隐藏翻译悬浮窗
#[tauri::command]
pub fn hide_overlay(app: tauri::AppHandle) -> Result<(), String> {
    crate::overlay::close_overlay(&app)
}

// ── 翻译命令 ───────────────────────────────────────────────────

/// 调用翻译引擎批量翻译文本
#[tauri::command]
pub async fn translate_text(texts: Vec<String>, target_lang: String, engine: String, api_key: String, api_base: Option<String>, model: Option<String>) -> Result<Vec<String>, String> {
    let config = crate::translation::TranslationConfig { engine: engine.clone(), api_key, api_base, model };
    match engine.as_str() {
        "openai" => crate::translation::translate_via_openai(&texts, &target_lang, &config).await,
        "deepseek" => crate::translation::translate_via_deepseek(&texts, &target_lang, &config).await,
        _ => Ok(texts.iter().map(|t| crate::translation::mock_translate(t, &target_lang)).collect()),
    }
}