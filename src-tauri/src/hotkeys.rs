// ── Required Cargo.toml dependencies ──────────────────────────────────────────
// Add the following to [dependencies]:
//
//   windows = { version = "0.58", features = [
//     "Win32_UI_Input_KeyboardAndMouse",
//     "Win32_UI_WindowsAndMessaging",
//     "Win32_System_Threading",
//     "Win32_Foundation",
//   ] }
// ──────────────────────────────────────────────────────────────────────────────

use std::mem;
use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
use std::thread;

use tauri::Emitter;

use windows::Win32::System::Threading::GetCurrentThreadId;
use windows::Win32::UI::Input::KeyboardAndMouse::{
    RegisterHotKey, UnregisterHotKey, MOD_ALT, MOD_CONTROL, MOD_NOREPEAT, MOD_SHIFT,
};
use windows::Win32::UI::WindowsAndMessaging::{
    GetMessageW, PostThreadMessageW, MSG, WM_HOTKEY, WM_USER,
};

// ── Default keybindings ──────────────────────────────────────────────────────

pub const DEFAULT_REGION_HOTKEY: &str = "Alt+Q";
pub const DEFAULT_SCREEN_HOTKEY: &str = "Ctrl+Shift+T";
pub const DEFAULT_PINNED_HOTKEY: &str = "Alt+W";
pub const DEFAULT_HOVER_HOTKEY: &str = "Alt+S";

// ── Internal constants ───────────────────────────────────────────────────────

const HOTKEY_ID_REGION: i32 = 1;
const HOTKEY_ID_SCREEN: i32 = 2;
const HOTKEY_ID_PINNED: i32 = 3;
const HOTKEY_ID_HOVER: i32 = 4;

const VK_Q: u32 = 0x51;
const VK_T: u32 = 0x54;
const VK_W: u32 = 0x57;
const VK_S: u32 = 0x53;

const WM_STOP: u32 = WM_USER + 0x100;

// ── Global state ─────────────────────────────────────────────────────────────

static ACTIVE: AtomicBool = AtomicBool::new(false);
static THREAD_ID: AtomicU32 = AtomicU32::new(0);

// ── Public API ───────────────────────────────────────────────────────────────

/// Register the four default global hotkeys via the Windows `RegisterHotKey` API.
///
/// Spawns a dedicated background thread that runs a message pump.
/// Each hotkey fires a named event to the Tauri frontend:
///
/// | Combo          | Event name                  |
/// |----------------|-----------------------------|
/// | `Alt+Q`        | `hotkey-region-translate`   |
/// | `Ctrl+Shift+T` | `hotkey-screen-translate`   |
/// | `Alt+W`        | `hotkey-pinned-region`      |
/// | `Alt+S`        | `hotkey-hover-toggle`       |
///
/// Returns `Err` when a hotkey pump is already running or the background
/// thread could not be spawned.  Individual `RegisterHotKey` failures are
/// silently ignored so that one conflicting shortcut does not block the rest.
pub fn register_default_hotkeys(app: &tauri::AppHandle) -> Result<(), String> {
    if ACTIVE.swap(true, Ordering::SeqCst) {
        return Err("global hotkeys are already registered".into());
    }

    let handle = app.clone();

    match thread::Builder::new()
        .name("scrnlnghotk".into())
        .spawn(move || hotkey_pump(handle))
    {
        Ok(_) => Ok(()),
        Err(e) => {
            ACTIVE.store(false, Ordering::SeqCst);
            Err(format!("failed to spawn hotkey thread: {}", e))
        }
    }
}

/// Unregister all hotkeys and tear down the background message pump.
///
/// Posts a stop message to the message-pump thread so that `GetMessageW`
/// wakes up, the loop exits, and every `UnregisterHotKey` call is issued
/// during cleanup.
pub fn unregister_all(_app: &tauri::AppHandle) -> Result<(), String> {
    if !ACTIVE.load(Ordering::SeqCst) {
        return Err("global hotkeys are not registered".into());
    }

    let tid = THREAD_ID.load(Ordering::SeqCst);
    if tid == 0 {
        return Err("hotkey message-pump thread not running".into());
    }

    unsafe {
        let _ = PostThreadMessageW(tid, WM_STOP, Default::default(), Default::default());
    }

    Ok(())
}

// ── Internal helpers ─────────────────────────────────────────────────────────

/// Background message-pump entry point.
fn hotkey_pump(handle: tauri::AppHandle) {
    THREAD_ID.store(unsafe { GetCurrentThreadId() }, Ordering::SeqCst);

    // Best-effort registration — one conflict shouldn't kill the rest.
    unsafe {
        let _ = RegisterHotKey(None, HOTKEY_ID_REGION, MOD_ALT | MOD_NOREPEAT, VK_Q);
        let _ = RegisterHotKey(None, HOTKEY_ID_SCREEN, MOD_CONTROL | MOD_SHIFT | MOD_NOREPEAT, VK_T);
        let _ = RegisterHotKey(None, HOTKEY_ID_PINNED, MOD_ALT | MOD_NOREPEAT, VK_W);
        let _ = RegisterHotKey(None, HOTKEY_ID_HOVER, MOD_ALT | MOD_NOREPEAT, VK_S);
    }

    loop {
        let mut msg: MSG = unsafe { mem::zeroed() };
        let ret = unsafe { GetMessageW(&mut msg, None, 0, 0) };

        // 0  → WM_QUIT   /   -1 → error
        if ret.0 <= 0 {
            break;
        }

        match msg.message {
            WM_HOTKEY => {
                let event = match msg.wParam.0 as i32 {
                    HOTKEY_ID_REGION => "hotkey-region-translate",
                    HOTKEY_ID_SCREEN => "hotkey-screen-translate",
                    HOTKEY_ID_PINNED => "hotkey-pinned-region",
                    HOTKEY_ID_HOVER => "hotkey-hover-toggle",
                    _ => continue,
                };
                let _ = handle.emit(event, ());
            }
            WM_STOP => break,
            _ => {}
        }
    }

    // Cleanup — unregister whatever was registered.
    unsafe {
        let _ = UnregisterHotKey(None, HOTKEY_ID_REGION);
        let _ = UnregisterHotKey(None, HOTKEY_ID_SCREEN);
        let _ = UnregisterHotKey(None, HOTKEY_ID_PINNED);
        let _ = UnregisterHotKey(None, HOTKEY_ID_HOVER);
    }

    THREAD_ID.store(0, Ordering::SeqCst);
    ACTIVE.store(false, Ordering::SeqCst);
}
