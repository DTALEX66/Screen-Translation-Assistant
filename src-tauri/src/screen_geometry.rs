use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone, Copy)]
pub struct Rect {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MonitorInfo {
    pub id: String,
    #[serde(rename = "originX")]
    pub origin_x: f64,
    #[serde(rename = "originY")]
    pub origin_y: f64,
    pub width: f64,
    pub height: f64,
    #[serde(rename = "scaleFactor")]
    pub scale_factor: f64,
}

pub fn ocr_box_to_global_box(capture_rect: Rect, ocr_box: Rect) -> Rect {
    Rect {
        x: capture_rect.x + ocr_box.x,
        y: capture_rect.y + ocr_box.y,
        width: ocr_box.width,
        height: ocr_box.height,
    }
}

pub fn physical_to_logical(rect: Rect, scale_factor: f64) -> Rect {
    let safe_scale = if scale_factor <= 0.0 { 1.0 } else { scale_factor };
    Rect {
        x: rect.x / safe_scale,
        y: rect.y / safe_scale,
        width: rect.width / safe_scale,
        height: rect.height / safe_scale,
    }
}

pub fn clamp_overlay_to_monitor(mut rect: Rect, monitor: &MonitorInfo, padding: f64) -> Rect {
    let min_x = monitor.origin_x + padding;
    let min_y = monitor.origin_y + padding;
    let max_x = monitor.origin_x + monitor.width - rect.width - padding;
    let max_y = monitor.origin_y + monitor.height - rect.height - padding;

    if rect.x < min_x { rect.x = min_x; }
    if rect.y < min_y { rect.y = min_y; }
    if rect.x > max_x { rect.x = max_x; }
    if rect.y > max_y { rect.y = max_y; }
    rect
}
