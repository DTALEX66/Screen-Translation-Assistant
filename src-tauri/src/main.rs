mod settings;
mod screen_geometry;
mod privacy;
mod diagnostics;
mod capture;
mod commands;
mod db;
mod hotkeys;
mod overlay;
mod translation;

use crate::db::TranslationCache;

fn main() {
    // 启动时创建数据库连接，注入 Tauri State
    let cache = TranslationCache::open_default()
        .expect("无法打开翻译缓存数据库");

    tauri::Builder::default()
        .manage(cache)
        .setup(|app| {
            // 启动时注册全局快捷键
            if let Err(e) = hotkeys::register_default_hotkeys(app.handle()) {
                eprintln!("快捷键注册失败: {}", e);
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::simulate_region_translate,
            commands::get_app_status,
            commands::get_diagnostics_snapshot,
            commands::capture_screen_region,
            commands::capture_full_screen,
            commands::show_overlay,
            commands::hide_overlay,
            commands::translate_text,
        ])
        .run(tauri::generate_context!())
        .expect("error while running ScreenLingua");
}
