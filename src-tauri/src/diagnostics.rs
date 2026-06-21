use chrono::Utc;
use serde::Serialize;

#[derive(Debug, Serialize, Clone)]
pub struct DiagnosticEvent {
    pub timestamp: String,
    pub level: String,
    pub event: String,
    pub message: String,
    #[serde(rename = "elapsedMs")]
    pub elapsed_ms: Option<i64>,
}

#[derive(Debug, Serialize)]
pub struct DiagnosticsSnapshot {
    pub ok: bool,
    #[serde(rename = "ocrStatus")]
    pub ocr_status: String,
    #[serde(rename = "databaseStatus")]
    pub database_status: String,
    #[serde(rename = "privacyMode")]
    pub privacy_mode: bool,
    #[serde(rename = "screenCount")]
    pub screen_count: i32,
    #[serde(rename = "recentEvents")]
    pub recent_events: Vec<DiagnosticEvent>,
}

pub fn event(level: &str, event: &str, message: &str, elapsed_ms: Option<i64>) -> DiagnosticEvent {
    DiagnosticEvent {
        timestamp: Utc::now().to_rfc3339(),
        level: level.to_string(),
        event: event.to_string(),
        message: message.to_string(),
        elapsed_ms,
    }
}

pub fn mock_snapshot() -> DiagnosticsSnapshot {
    DiagnosticsSnapshot {
        ok: true,
        ocr_status: "mock-sidecar-or-fallback".to_string(),
        database_status: "sqlite-local".to_string(),
        privacy_mode: true,
        screen_count: 1,
        recent_events: vec![
            event("INFO", "app_start", "ScreenLingua scaffold started", None),
            event("INFO", "privacy_mode", "Privacy mode is enabled by default", None),
            event("INFO", "ocr_sidecar", "OCR sidecar uses mock endpoint in V0.1", None),
        ],
    }
}
