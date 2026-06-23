// Capture module: Windows screen capture via GDI FFI + self-contained PNG encoder.
//
// Optional dependencies (add to Cargo.toml for better compression):
//   flate2 = "1"        # proper zlib compression → much smaller PNGs
//   png   = "0.17"      # full PNG encoder (replaces handwritten encoder below)
//
// If you add the deps above, you can replace the internal png_encode()
// with a standard PNG crate call while keeping the same public API.

use std::mem;
use std::ptr;

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/// Describes a rectangular region on screen to capture.
/// `display_id` is an optional monitor identifier (e.g. "0", "1", or device name).
#[derive(Debug, Clone)]
pub struct CaptureRegion {
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
    pub display_id: Option<String>,
}

// ---------------------------------------------------------------------------
// Windows GDI FFI — user32.dll
// ---------------------------------------------------------------------------

#[link(name = "user32")]
extern "system" {
    fn GetDC(h_wnd: isize) -> isize;
    fn ReleaseDC(h_wnd: isize, h_dc: isize) -> i32;
    fn GetSystemMetrics(n_index: i32) -> i32;
}

// ---------------------------------------------------------------------------
// Windows GDI FFI — gdi32.dll
// ---------------------------------------------------------------------------

#[link(name = "gdi32")]
extern "system" {
    fn CreateCompatibleDC(h_dc: isize) -> isize;
    fn CreateCompatibleBitmap(h_dc: isize, cx: i32, cy: i32) -> isize;
    fn SelectObject(h_dc: isize, h_gdi_obj: isize) -> isize;
    fn BitBlt(
        hdc_dest: isize,
        x: i32,
        y: i32,
        cx: i32,
        cy: i32,
        hdc_src: isize,
        x1: i32,
        y1: i32,
        rop: u32,
    ) -> i32;
    fn GetDIBits(
        hdc: isize,
        hbm: isize,
        start: u32,
        c_lines: u32,
        lpv_bits: *mut u8,
        lpbmi: *mut BITMAPINFO,
        usage: u32,
    ) -> i32;
    fn DeleteDC(hdc: isize) -> i32;
    fn DeleteObject(h_gdi_obj: isize) -> i32;
    fn EnumDisplayMonitors(
        hdc: isize,
        lprc_clip: *const RECT,
        lpfn_enum: MonitorEnumProc,
        dw_data: isize,
    ) -> i32;
    fn GetMonitorInfoW(h_monitor: isize, lpmi: *mut MONITORINFOEXW) -> i32;
}

// ---------------------------------------------------------------------------
// C struct layouts (repr(C)) for GDI
// ---------------------------------------------------------------------------

#[repr(C)]
#[derive(Debug, Clone, Copy)]
struct RECT {
    left: i32,
    top: i32,
    right: i32,
    bottom: i32,
}

#[repr(C)]
struct BITMAPINFOHEADER {
    bi_size: u32,
    bi_width: i32,
    bi_height: i32,
    bi_planes: u16,
    bi_bit_count: u16,
    bi_compression: u32,
    bi_size_image: u32,
    bi_x_pels_per_meter: i32,
    bi_y_pels_per_meter: i32,
    bi_clr_used: u32,
    bi_clr_important: u32,
}

#[repr(C)]
struct BITMAPINFO {
    bmi_header: BITMAPINFOHEADER,
    // No palette needed for 32-bit BI_RGB
}

#[repr(C)]
struct MONITORINFOEXW {
    cb_size: u32,
    rc_monitor: RECT,
    rc_work: RECT,
    dw_flags: u32,
    sz_device: [u16; 32], // CCHDEVICENAME
}

// ---------------------------------------------------------------------------
// Data passed to EnumDisplayMonitors callback via LPARAM
// ---------------------------------------------------------------------------

struct MonitorEntry {
    rect: RECT,
    device_name: String,
}

// ---------------------------------------------------------------------------
// GDI constants
// ---------------------------------------------------------------------------

const SRCCOPY: u32 = 0x00CC0020;
const DIB_RGB_COLORS: u32 = 0;
const BI_RGB: u32 = 0;

// GetSystemMetrics indices
const SM_XVIRTUALSCREEN: i32 = 76;
const SM_YVIRTUALSCREEN: i32 = 77;
const SM_CXVIRTUALSCREEN: i32 = 78;
const SM_CYVIRTUALSCREEN: i32 = 79;

// ---------------------------------------------------------------------------
// Monitor enumeration callback (must be free function, not closure)
// ---------------------------------------------------------------------------

type MonitorEnumProc = unsafe extern "system" fn(isize, isize, *mut RECT, isize) -> i32;

unsafe extern "system" fn monitor_enum_callback(
    h_monitor: isize,
    _hdc_monitor: isize,
    lprc_monitor: *mut RECT,
    dw_data: isize,
) -> i32 {
    if lprc_monitor.is_null() || dw_data == 0 {
        return 0; // stop
    }
    let monitors: &mut Vec<MonitorEntry> = &mut *(dw_data as *mut Vec<MonitorEntry>);

    let mut mi = MONITORINFOEXW {
        cb_size: mem::size_of::<MONITORINFOEXW>() as u32,
        rc_monitor: RECT { left: 0, top: 0, right: 0, bottom: 0 },
        rc_work: RECT { left: 0, top: 0, right: 0, bottom: 0 },
        dw_flags: 0,
        sz_device: [0u16; 32],
    };
    if GetMonitorInfoW(h_monitor, &mut mi) == 0 {
        return 1; // continue
    }

    // Convert wide device name to Rust String
    let len = mi.sz_device.iter().position(|&c| c == 0).unwrap_or(mi.sz_device.len());
    let device_name = String::from_utf16_lossy(&mi.sz_device[..len]);

    monitors.push(MonitorEntry {
        rect: mi.rc_monitor,
        device_name,
    });

    1 // TRUE = continue enumeration
}

// ---------------------------------------------------------------------------
// Internal: enumerate all monitors, return their rects + device names
// ---------------------------------------------------------------------------

unsafe fn enumerate_monitors() -> Vec<MonitorEntry> {
    let mut monitors: Vec<MonitorEntry> = Vec::new();
    let ptr: *mut Vec<MonitorEntry> = &mut monitors;
    EnumDisplayMonitors(
        0,                          // hdc = NULL → virtual screen coords
        ptr::null(),                // lprcClip = NULL → all
        monitor_enum_callback,
        ptr as isize,               // dwData
    );
    monitors
}

// ---------------------------------------------------------------------------
// Internal: resolve display_id → RECT on the virtual screen
// ---------------------------------------------------------------------------

unsafe fn resolve_display_rect(display_id: Option<&str>) -> Option<RECT> {
    let monitors = enumerate_monitors();
    if monitors.is_empty() {
        return None;
    }
    let id = display_id.unwrap_or("0");

    // Try numeric index
    if let Ok(idx) = id.parse::<usize>() {
        return monitors.get(idx).map(|m| m.rect);
    }
    // Try device name match (case-insensitive)
    let lower = id.to_lowercase();
    for m in &monitors {
        if m.device_name.to_lowercase() == lower {
            return Some(m.rect);
        }
    }
    // Fallback: first monitor
    monitors.first().map(|m| m.rect)
}

// ---------------------------------------------------------------------------
// Internal: grab BGRA pixel data for a given screen rect via GDI
// ---------------------------------------------------------------------------

unsafe fn gdi_capture(x: i32, y: i32, width: i32, height: i32) -> Result<Vec<u8>, String> {
    if width <= 0 || height <= 0 {
        return Err(format!("invalid dimensions: {width}x{height}"));
    }

    // 1. Get desktop DC
    let hdc_screen = GetDC(0);
    if hdc_screen == 0 {
        return Err("GetDC(0) failed".into());
    }

    // 2. Create compatible memory DC
    let hdc_mem = CreateCompatibleDC(hdc_screen);
    if hdc_mem == 0 {
        ReleaseDC(0, hdc_screen);
        return Err("CreateCompatibleDC failed".into());
    }

    // 3. Create compatible bitmap
    let hbm = CreateCompatibleBitmap(hdc_screen, width, height);
    if hbm == 0 {
        DeleteDC(hdc_mem);
        ReleaseDC(0, hdc_screen);
        return Err("CreateCompatibleBitmap failed".into());
    }

    // 4. Select bitmap into memory DC
    let hbm_old = SelectObject(hdc_mem, hbm);
    if hbm_old == 0 {
        DeleteObject(hbm);
        DeleteDC(hdc_mem);
        ReleaseDC(0, hdc_screen);
        return Err("SelectObject failed".into());
    }

    // 5. BitBlt from screen → memory DC
    let ok = BitBlt(hdc_mem, 0, 0, width, height, hdc_screen, x, y, SRCCOPY);
    if ok == 0 {
        SelectObject(hdc_mem, hbm_old);
        DeleteObject(hbm);
        DeleteDC(hdc_mem);
        ReleaseDC(0, hdc_screen);
        return Err("BitBlt failed".into());
    }

    // 6. Prepare BITMAPINFO for 32-bit top-down BGRA
    let mut bmi = BITMAPINFO {
        bmi_header: BITMAPINFOHEADER {
            bi_size: mem::size_of::<BITMAPINFOHEADER>() as u32,
            bi_width: width,
            bi_height: -height, // negative → top-down DIB
            bi_planes: 1,
            bi_bit_count: 32,
            bi_compression: BI_RGB,
            bi_size_image: 0,
            bi_x_pels_per_meter: 0,
            bi_y_pels_per_meter: 0,
            bi_clr_used: 0,
            bi_clr_important: 0,
        },
    };

    // 7. Allocate pixel buffer (4 bytes per pixel: BGRA)
    let row_size = (width as usize) * 4;
    let buf_size = row_size * (height as usize);
    let mut pixels: Vec<u8> = vec![0u8; buf_size];

    let lines = GetDIBits(
        hdc_mem,
        hbm,
        0,
        height as u32,
        pixels.as_mut_ptr(),
        &mut bmi,
        DIB_RGB_COLORS,
    );
    if lines == 0 {
        SelectObject(hdc_mem, hbm_old);
        DeleteObject(hbm);
        DeleteDC(hdc_mem);
        ReleaseDC(0, hdc_screen);
        return Err("GetDIBits failed".into());
    }

    // 8. Cleanup GDI resources
    SelectObject(hdc_mem, hbm_old);
    DeleteObject(hbm);
    DeleteDC(hdc_mem);
    ReleaseDC(0, hdc_screen);

    Ok(pixels)
}

// ---------------------------------------------------------------------------
// PNG encoder — self-contained, no external compression crates
//
// Produces valid PNG with uncompressed (stored) deflate blocks inside zlib.
// Larger than compressed PNG but requires zero extra dependencies.
// ---------------------------------------------------------------------------

/// Build a CRC32 lookup table for polynomial 0xEDB88320 (PNG standard).
fn make_crc32_table() -> [u32; 256] {
    let mut table = [0u32; 256];
    for (i, entry) in table.iter_mut().enumerate() {
        let mut crc = i as u32;
        for _ in 0..8 {
            if crc & 1 != 0 {
                crc = 0xEDB88320u32 ^ (crc >> 1);
            } else {
                crc >>= 1;
            }
        }
        *entry = crc;
    }
    table
}

/// CRC32 over `data`, seeded with `crc`.  Pass !0u32 initially, then !result.
fn crc32_update(crc: u32, data: &[u8], table: &[u32; 256]) -> u32 {
    let mut c = crc;
    for &byte in data {
        let idx = ((c ^ byte as u32) & 0xFF) as usize;
        c = table[idx] ^ (c >> 8);
    }
    c
}

fn crc32(data: &[u8], table: &[u32; 256]) -> u32 {
    !crc32_update(!0u32, data, table)
}

/// Adler-32 checksum (used by zlib trailer).
fn adler32(data: &[u8]) -> u32 {
    let mut a: u32 = 1;
    let mut b: u32 = 0;
    const MOD: u32 = 65521;
    for &byte in data {
        a = (a + byte as u32) % MOD;
        b = (b + a) % MOD;
    }
    (b << 16) | a
}

/// Write a big-endian u32 to `buf`.
fn write_u32_be(buf: &mut [u8], v: u32) {
    buf[0] = (v >> 24) as u8;
    buf[1] = (v >> 16) as u8;
    buf[2] = (v >> 8) as u8;
    buf[3] = v as u8;
}

/// Encode raw BGRA pixel data (top-down, 4 bytes per pixel) as a PNG byte vector.
fn png_encode_rgba(width: u32, height: u32, pixels: &[u8]) -> Result<Vec<u8>, String> {
    let total_pixels = (width as usize) * (height as usize) * 4;
    if pixels.len() != total_pixels {
        return Err(format!(
            "pixel buffer size mismatch: expected {total_pixels}, got {}",
            pixels.len()
        ));
    }

    let crc_table = make_crc32_table();
    let mut out: Vec<u8> = Vec::new();

    // ---- PNG signature ----
    out.extend_from_slice(&[137, 80, 78, 71, 13, 10, 26, 10]);

    // ---- IHDR chunk ----
    {
        let mut ihdr_data = [0u8; 13];
        write_u32_be(&mut ihdr_data[0..4], width);
        write_u32_be(&mut ihdr_data[4..8], height);
        ihdr_data[8] = 8;  // bit depth
        ihdr_data[9] = 6;  // color type: RGBA
        ihdr_data[10] = 0; // compression
        ihdr_data[11] = 0; // filter
        ihdr_data[12] = 0; // interlace

        let mut chunk = Vec::with_capacity(4 + 4 + 13 + 4);
        chunk.extend_from_slice(&(13u32).to_be_bytes());          // length
        chunk.extend_from_slice(b"IHDR");                          // type
        chunk.extend_from_slice(&ihdr_data);                       // data
        let c = crc32(&chunk[4..4 + 4 + 13], &crc_table);          // CRC over type+data
        chunk.extend_from_slice(&c.to_be_bytes());
        out.extend_from_slice(&chunk);
    }

    // ---- Build raw image data (filter byte 0 + scanline) ----
    let row_size = (width as usize) * 4;
    let mut raw_data = Vec::with_capacity((height as usize) * (1 + row_size));
    for row in 0..(height as usize) {
        raw_data.push(0u8); // filter: None
        let start = row * row_size;
        // BGRA → RGBA: swap B and R for each pixel
        for px in 0..(width as usize) {
            let base = start + px * 4;
            raw_data.push(pixels[base + 2]); // R
            raw_data.push(pixels[base + 1]); // G
            raw_data.push(pixels[base]);     // B
            raw_data.push(pixels[base + 3]); // A
        }
    }

    // ---- Build zlib + deflate stream (uncompressed stored blocks) ----
    let mut zlib = Vec::new();

    // Zlib header: CMF=0x78 (deflate, 32K window), FLG=0x01 (level 0, check bits ok)
    zlib.push(0x78);
    zlib.push(0x01);

    // Split raw_data into deflate "stored" blocks (max 65535 bytes per block)
    const MAX_STORED: usize = 65535;
    let num_chunks = raw_data.len().div_ceil(MAX_STORED);

    for (i, chunk) in raw_data.chunks(MAX_STORED).enumerate() {
        let is_last = i == num_chunks - 1;
        // Block header: BFINAL=is_last, BTYPE=00 (stored)
        // Bits: [BTYPE1, BTYPE0, BFINAL, 0,0,0,0,0] → LSB first
        zlib.push(if is_last { 0x01 } else { 0x00 });
        // Pad to byte boundary (already aligned after 3 bits + 5 zero bits)

        let len = chunk.len() as u16;
        let nlen = !len;
        zlib.extend_from_slice(&len.to_le_bytes());
        zlib.extend_from_slice(&nlen.to_le_bytes());
        zlib.extend_from_slice(chunk);
    }

    // Zlib trailer: Adler-32 of raw_data
    let a32 = adler32(&raw_data);
    zlib.extend_from_slice(&a32.to_be_bytes());

    // ---- IDAT chunk ----
    {
        let len = zlib.len() as u32;
        let mut chunk = Vec::with_capacity(4 + 4 + zlib.len() + 4);
        chunk.extend_from_slice(&len.to_be_bytes());
        chunk.extend_from_slice(b"IDAT");
        chunk.extend_from_slice(&zlib);
        let c = crc32(&chunk[4..4 + 4 + zlib.len()], &crc_table);
        chunk.extend_from_slice(&c.to_be_bytes());
        out.extend_from_slice(&chunk);
    }

    // ---- IEND chunk ----
    {
        let mut chunk = Vec::with_capacity(4 + 4 + 4);
        chunk.extend_from_slice(&0u32.to_be_bytes());              // length = 0
        chunk.extend_from_slice(b"IEND");
        let c = crc32(b"IEND", &crc_table);
        chunk.extend_from_slice(&c.to_be_bytes());
        out.extend_from_slice(&chunk);
    }

    Ok(out)
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/// Capture a rectangular region of the screen and return PNG-encoded bytes.
///
/// * `region` — the rectangle to capture (coordinates are virtual-screen-relative).
pub fn capture_region(region: &CaptureRegion) -> Result<Vec<u8>, String> {
    let pixels = unsafe {
        gdi_capture(region.x, region.y, region.width, region.height)
    }?;
    png_encode_rgba(region.width as u32, region.height as u32, &pixels)
}

/// Capture an entire monitor (or all monitors) and return PNG-encoded bytes.
///
/// * `display_id` — `None` or `Some("0")` for the first monitor,
///   `Some("1")` for the second, etc.  Also accepts a GDI device name
///   like `\\.\DISPLAY1`.  When `None`, captures the whole virtual screen
///   (all monitors combined).
pub fn capture_full_screen(display_id: Option<&str>) -> Result<Vec<u8>, String> {
    let rect = match display_id {
        Some(_) => unsafe {
            resolve_display_rect(display_id)
                .ok_or_else(|| "no matching monitor found".to_string())?
        },
        None => {
            // Entire virtual screen
            let x = unsafe { GetSystemMetrics(SM_XVIRTUALSCREEN) };
            let y = unsafe { GetSystemMetrics(SM_YVIRTUALSCREEN) };
            let w = unsafe { GetSystemMetrics(SM_CXVIRTUALSCREEN) };
            let h = unsafe { GetSystemMetrics(SM_CYVIRTUALSCREEN) };
            if w <= 0 || h <= 0 {
                return Err("GetSystemMetrics returned zero-sized virtual screen".into());
            }
            RECT { left: x, top: y, right: x + w, bottom: y + h }
        }
    };

    let width = rect.right - rect.left;
    let height = rect.bottom - rect.top;
    let pixels = unsafe { gdi_capture(rect.left, rect.top, width, height) }?;
    png_encode_rgba(width as u32, height as u32, &pixels)
}

