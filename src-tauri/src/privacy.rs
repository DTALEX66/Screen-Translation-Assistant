use serde::Serialize;

use crate::settings::AppSettings;

#[derive(Debug, Serialize)]
pub struct PrivacyCheckResult {
    pub allowed: bool,
    #[serde(rename = "reasonCode")]
    pub reason_code: Option<String>,
    #[serde(rename = "userMessage")]
    pub user_message: Option<String>,
}

pub fn is_window_allowed(app_name: Option<&str>, window_title: Option<&str>, settings: &AppSettings) -> PrivacyCheckResult {
    let app = app_name.unwrap_or("").to_lowercase();
    let title = window_title.unwrap_or("").to_lowercase();

    for item in &settings.privacy.app_blacklist {
        let needle = item.to_lowercase();
        if !needle.is_empty() && (app.contains(&needle) || title.contains(&needle)) {
            return PrivacyCheckResult {
                allowed: false,
                reason_code: Some("PRIVACY_BLACKLIST_MATCHED".to_string()),
                user_message: Some("当前窗口已被隐私保护规则拦截，未进行截图或上传。".to_string()),
            };
        }
    }

    PrivacyCheckResult {
        allowed: true,
        reason_code: None,
        user_message: None,
    }
}
