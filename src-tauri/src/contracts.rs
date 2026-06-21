#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct BBox {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct OcrBlock {
    pub id: String,
    pub text: String,
    pub bbox: BBox,
    pub confidence: f64,
    pub source: String,
    pub language: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct TranslateItem {
    pub source: String,
    pub target: String,
    pub engine: String,
    pub cached: bool,
    pub error_code: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct TranslationUsage {
    pub input_chars: usize,
    pub estimated_cost_usd: f64,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct TranslateResponse {
    pub items: Vec<TranslateItem>,
    pub usage: TranslationUsage,
}
