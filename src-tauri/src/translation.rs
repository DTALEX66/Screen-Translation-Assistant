use serde::{Deserialize, Serialize};

/// 翻译引擎配置（支持 Serialize/Deserialize）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranslationConfig {
    pub engine: String,
    pub api_key: String,
    pub api_base: Option<String>,
    pub model: Option<String>,
}

/// 构建翻译 prompt
fn build_translation_prompt(texts: &[String], target_lang: &str) -> String {
    let items: Vec<String> = texts
        .iter()
        .enumerate()
        .map(|(i, t)| format!("{}. {}", i + 1, t))
        .collect();
    format!(
        "Translate the following texts from English to {}. For each numbered line, return only the translated text on a new line in the same order, preserving the number prefix:\n{}",
        target_lang,
        items.join("\n")
    )
}

/// 解析翻译结果为 Vec
fn parse_translation_response(raw: &str) -> Vec<String> {
    raw.lines()
        .filter_map(|line| {
            let trimmed = line.trim();
            // 去除可能的序号前缀 "1. " 或 "1."
            trimmed
                .find(". ")
                .map(|pos| trimmed[pos + 2..].to_string())
                .or_else(|| {
                    trimmed
                        .find('.')
                        .filter(|&pos| pos == 1 || pos == 2)
                        .map(|pos| trimmed[pos + 1..].trim().to_string())
                })
                .or_else(|| Some(trimmed.to_string()))
        })
        .filter(|s| !s.is_empty())
        .collect()
}

/// 调用 OpenAI-compatible chat/completions API 进行批量翻译
pub async fn translate_via_openai(
    texts: &[String],
    target_lang: &str,
    config: &TranslationConfig,
) -> Result<Vec<String>, String> {
    let api_base = config
        .api_base
        .as_deref()
        .unwrap_or("https://api.openai.com/v1");
    let model = config.model.as_deref().unwrap_or("gpt-4o-mini");
    let prompt = build_translation_prompt(texts, target_lang);

    let client = reqwest::Client::new();
    let url = format!("{}/chat/completions", api_base.trim_end_matches('/'));

    let body = serde_json::json!({
        "model": model,
        "messages": [
            {"role": "system", "content": "You are a professional translator. Output only the translated texts, one per line, preserving order."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.3
    });

    let resp = client
        .post(&url)
        .header("Authorization", format!("Bearer {}", config.api_key))
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("HTTP request failed: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let error_body = resp.text().await.unwrap_or_default();
        return Err(format!("OpenAI API error {}: {}", status, error_body));
    }

    let json: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    let content = json["choices"][0]["message"]["content"]
        .as_str()
        .ok_or("Unexpected response format from OpenAI API")?;

    Ok(parse_translation_response(content))
}

/// 调用 DeepSeek API 进行批量翻译（api_base 默认 https://api.deepseek.com）
pub async fn translate_via_deepseek(
    texts: &[String],
    target_lang: &str,
    config: &TranslationConfig,
) -> Result<Vec<String>, String> {
    // DeepSeek 使用 OpenAI-compatible 接口，复用同一逻辑
    let mut deepseek_config = config.clone();
    if deepseek_config.api_base.is_none() {
        deepseek_config.api_base = Some("https://api.deepseek.com".to_string());
    }
    if deepseek_config.model.is_none() {
        deepseek_config.model = Some("deepseek-chat".to_string());
    }
    translate_via_openai(texts, target_lang, &deepseek_config).await
}

/// 本地翻译（当前为 mock_translate 别名，后续可替换为 Argos 本地模型）
pub fn translate_via_local(source: &str, target_lang: &str) -> String {
    mock_translate(source, target_lang)
}

pub fn mock_translate(source_text: &str, _target_language: &str) -> String {
    match source_text.trim() {
        "Render Settings" => "渲染设置".to_string(),
        "Subdivision Surface" => "细分曲面".to_string(),
        "Permission Denied" => "权限被拒绝".to_string(),
        "Prompt Engineering" => "提示词工程".to_string(),
        "Layer" => "图层".to_string(),
        "Mask" => "蒙版".to_string(),
        "Stroke" => "描边".to_string(),
        other => format!("{}（待翻译）", other),
    }
}
