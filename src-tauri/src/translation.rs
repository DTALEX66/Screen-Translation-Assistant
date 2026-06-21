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
