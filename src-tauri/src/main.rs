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

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            commands::simulate_region_translate,
            commands::get_app_status,
            commands::get_diagnostics_snapshot
        ])
        .run(tauri::generate_context!())
        .expect("error while running ScreenLingua");
}
