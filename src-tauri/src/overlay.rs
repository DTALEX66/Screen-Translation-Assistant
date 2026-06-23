// overlay.rs - Transparent always-on-top overlay window for ScreenLingua.
// One overlay window renders many text blocks positioned at their screen locations.

use crate::screen_geometry;
use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};

// ----------------------------------------------------------------
// OverlayMode - visual presentation style for translated text
// ----------------------------------------------------------------

#[derive(Debug, Clone)]
pub enum OverlayMode {
    /// Rounded speech-bubble style, one bubble per block.
    Bubble,
    /// Semi-transparent region panel covering all blocks.
    RegionPanel,
    /// Minimal inline text directly at each block's location.
    Inline,
    /// Horizontal subtitle band at the bottom of the overlay.
    Subtitle,
}

// ----------------------------------------------------------------
// OverlayBlock - a single on-screen text region with translation
// ----------------------------------------------------------------

/// A detected text block together with its bounding box and translation.
#[derive(Debug, Clone)]
pub struct OverlayBlock {
    /// Original OCR text.
    pub text: String,
    /// Bounding box in screen coordinates (pixels).
    pub bbox: screen_geometry::Rect,
    /// Translated text; may be empty when translation has not completed.
    pub translated_text: String,
}

// ----------------------------------------------------------------
// Internal helpers
// ----------------------------------------------------------------

/// Minimal HTML entity escaping to prevent injection / broken markup.
fn escape_html(raw: &str) -> String {
    raw.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
}

/// Compute the axis-aligned bounding rectangle that encloses every block.
/// Returns (min_x, min_y, max_x, max_y) in screen coordinates.
fn union_bbox(blocks: &[OverlayBlock]) -> (f64, f64, f64, f64) {
    let mut min_x = f64::MAX;
    let mut min_y = f64::MAX;
    let mut max_x = f64::MIN;
    let mut max_y = f64::MIN;

    for block in blocks {
        let x = block.bbox.x;
        let y = block.bbox.y;
        let r = x + block.bbox.width;
        let b = y + block.bbox.height;

        if x < min_x { min_x = x; }
        if y < min_y { min_y = y; }
        if r > max_x { max_x = r; }
        if b > max_y { max_y = b; }
    }

    (min_x, min_y, max_x, max_y)
}

/// Build the complete HTML document that the overlay window will display.
fn build_overlay_html(blocks: &[OverlayBlock], mode: &OverlayMode) -> String {
    let (min_x, min_y, _max_x, _max_y) = union_bbox(blocks);

    // Mode-specific inline style for each block.
    let block_style: &str = match mode {
        OverlayMode::Bubble => {
            "background:rgba(30,30,30,0.88);color:#fff;\
             border-radius:10px;padding:6px 10px;\
             font-size:14px;line-height:1.4;\
             font-family:'Segoe UI','Microsoft YaHei',sans-serif;\
             box-shadow:0 2px 8px rgba(0,0,0,0.35);\
             white-space:pre-wrap;word-break:break-word;"
        }
        OverlayMode::RegionPanel => {
            "background:rgba(20,20,20,0.82);color:#eee;\
             border-radius:6px;padding:8px 12px;\
             font-size:15px;line-height:1.5;\
             font-family:'Segoe UI','Microsoft YaHei',sans-serif;\
             border:1px solid rgba(255,255,255,0.12);\
             white-space:pre-wrap;word-break:break-word;"
        }
        OverlayMode::Inline => {
            "background:rgba(0,0,0,0.70);color:#ffd;\
             border-radius:3px;padding:2px 6px;\
             font-size:13px;line-height:1.3;\
             font-family:'Segoe UI','Microsoft YaHei',sans-serif;\
             white-space:pre-wrap;word-break:break-word;"
        }
        OverlayMode::Subtitle => {
            "background:rgba(0,0,0,0.78);color:#fff;\
             border-radius:6px;padding:6px 14px;\
             font-size:16px;line-height:1.5;\
             font-family:'Segoe UI','Microsoft YaHei',sans-serif;\
             text-align:center;white-space:pre-wrap;"
        }
    };

    // Build block elements.
    let mut block_divs = String::new();

    if matches!(mode, OverlayMode::Subtitle) {
        // Subtitle mode: concatenate all translated texts at the bottom.
        let combined: String = blocks
            .iter()
            .filter_map(|b| {
                let t = if b.translated_text.is_empty() {
                    &b.text
                } else {
                    &b.translated_text
                };
                if t.is_empty() {
                    None
                } else {
                    Some(t.as_str())
                }
            })
            .collect::<Vec<_>>()
            .join("  |  ");

        block_divs.push_str(&format!(
            "<div class='subtitle-bar' style='{bs}'>{txt}</div>",
            bs = block_style,
            txt = escape_html(&combined),
        ));
    } else {
        // Bubble / RegionPanel / Inline: one element per block at its position.
        for block in blocks {
            let rel_x = block.bbox.x - min_x;
            let rel_y = block.bbox.y - min_y;
            let w = block.bbox.width;
            let h = block.bbox.height;

            let display_text = if block.translated_text.is_empty() {
                &block.text
            } else {
                &block.translated_text
            };

            block_divs.push_str(&format!(
                "<div class='ol-block' style='left:{rx}px;top:{ry}px;\
                 width:{w}px;min-height:{h}px;{bs}'>{txt}</div>",
                rx = rel_x,
                ry = rel_y,
                w = w,
                h = h,
                bs = block_style,
                txt = escape_html(display_text),
            ));
        }
    }

    // Complete HTML document.
    format!(
        r#"<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  *,*::before,*::after {{ box-sizing:border-box; margin:0; padding:0; }}
  html,body {{ width:100%; height:100%; background:transparent; overflow:hidden; }}
  .ol-block {{ position:absolute; display:flex; align-items:flex-start; justify-content:flex-start; }}
  .subtitle-bar {{ position:absolute; bottom:0; left:0; right:0; }}
</style>
</head>
<body>
{blocks}
</body>
</html>"#,
        blocks = block_divs,
    )
}

/// Escape a string so it can be safely embedded inside a JavaScript
/// template-literal backtick string.
fn escape_js_template(raw: &str) -> String {
    raw.replace('\\', "\\\\")
        .replace('`', "\\`")
        .replace("${", "\\${")
}

// ----------------------------------------------------------------
// Public API
// ----------------------------------------------------------------

/// Create (or recreate) a transparent, always-on-top overlay window that
/// renders the given translated blocks.
///
/// The window encloses all blocks' bounding boxes and displays each
/// block's text (original or translated) at its relative position.
pub fn create_overlay_window(
    app: &tauri::AppHandle,
    blocks: &[OverlayBlock],
    mode: OverlayMode,
) -> Result<(), String> {
    if blocks.is_empty() {
        return Err("overlay: blocks list is empty".into());
    }

    // Close any existing overlay window first.
    close_overlay(app)?;

    let padding: f64 = 24.0;
    let (min_x, min_y, max_x, max_y) = union_bbox(blocks);

    let win_w = (max_x - min_x + 2.0 * padding).max(1.0);
    let win_h = (max_y - min_y + 2.0 * padding).max(1.0);
    let win_x = (min_x - padding).max(0.0);
    let win_y = (min_y - padding).max(0.0);

    let html = build_overlay_html(blocks, &mode);

    // Build the window (hidden at first to avoid flicker).
    let window = WebviewWindowBuilder::new(
        app,
        "screenlingua-overlay",
        WebviewUrl::App("index.html".into()),
    )
    .title("ScreenLingua Overlay")
    .inner_size(win_w, win_h)
    .position(win_x, win_y)
    .decorations(false)
    .transparent(true)
    .always_on_top(true)
    .skip_taskbar(true)
    .resizable(false)
    .visible(false)
    .build()
    .map_err(|e| format!("overlay: failed to create window: {}", e))?;

    // Replace the page content with our overlay HTML via eval.
    let escaped_html = escape_js_template(&html);
    let js = format!(
        "document.open('text/html');document.write(`{}`);document.close();",
        escaped_html,
    );
    window
        .eval(&js)
        .map_err(|e| format!("overlay: failed to inject HTML: {}", e))?;

    // Reveal the window.
    window
        .show()
        .map_err(|e| format!("overlay: failed to show window: {}", e))?;

    Ok(())
}

/// Close the overlay window if it exists.
pub fn close_overlay(app: &tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("screenlingua-overlay") {
        window
            .close()
            .map_err(|e| format!("overlay: failed to close window: {}", e))?;
    }
    Ok(())
}
