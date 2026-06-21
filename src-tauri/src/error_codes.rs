#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub enum ScreenLinguaErrorCode {
    #[serde(rename = "SL-CAP-001")]
    CapturePermissionDenied,
    #[serde(rename = "SL-CAP-002")]
    ProtectedWindow,
    #[serde(rename = "SL-CAP-003")]
    DpiCoordinateMismatch,
    #[serde(rename = "SL-OCR-001")]
    OcrServiceNotConnected,
    #[serde(rename = "SL-OCR-002")]
    OcrTimeout,
    #[serde(rename = "SL-OCR-003")]
    NoTextDetected,
    #[serde(rename = "SL-TR-001")]
    TranslationApiKeyMissing,
    #[serde(rename = "SL-TR-002")]
    TranslationTimeout,
    #[serde(rename = "SL-TR-003")]
    TranslationBudgetExceeded,
    #[serde(rename = "SL-DB-001")]
    DatabaseUnavailable,
    #[serde(rename = "SL-PRIV-001")]
    PrivacyBlacklistMatched,
    #[serde(rename = "SL-APP-001")]
    Unknown,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ScreenLinguaError {
    pub code: ScreenLinguaErrorCode,
    pub message: String,
    pub recoverable: bool,
}

impl ScreenLinguaError {
    pub fn new(code: ScreenLinguaErrorCode, message: impl Into<String>, recoverable: bool) -> Self {
        Self { code, message: message.into(), recoverable }
    }
}
