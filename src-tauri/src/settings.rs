use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PrivacySettings {
    pub privacy_mode: bool,
    pub upload_screenshots: bool,
    pub upload_ocr_text: bool,
    pub app_blacklist: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppSettings {
    pub target_language: String,
    pub ocr_endpoint: String,
    pub translation_engine: String,
    pub privacy: PrivacySettings,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            target_language: "zh-CN".to_string(),
            ocr_endpoint: "http://127.0.0.1:8765".to_string(),
            translation_engine: "mock".to_string(),
            privacy: PrivacySettings {
                privacy_mode: true,
                upload_screenshots: false,
                upload_ocr_text: true,
                app_blacklist: vec![
                    "1Password.exe".to_string(),
                    "Bitwarden.exe".to_string(),
                    "KeePass.exe".to_string(),
                    "password".to_string(),
                    "bank".to_string(),
                ],
            },
        }
    }
}
