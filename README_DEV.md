# ScreenLingua Local Dev Guide

This scaffold runs as a local-first screen translation assistant.

The intended runtime flow is:

```text
screen capture -> local OCR sidecar -> local translation sidecar -> SQLite cache -> Tauri UI
```

No screenshot or OCR text needs to leave the machine in local mode.

## Required Tools

- Windows 10/11
- Node.js 20.19+ or 22.12+
- pnpm
- Rust stable + Cargo
- Python 3.10+
- Visual Studio Build Tools with C++ components

Quick environment checks:

```powershell
pnpm env:check
node scripts\check_node_version.mjs
```

`pnpm dev`, `pnpm build`, `pnpm tauri:dev`, and `pnpm tauri:build` run these checks before starting so missing tools fail with a short actionable message. Tauri is wired to `pnpm dev:compat` and `pnpm build:compat`, so a compatible bundled Node can be used while the system Node.js is still old.

To preview the Windows install commands:

```powershell
pnpm env:install:dry
```

To install the desktop prerequisites with winget:

```powershell
pnpm env:install
```

If `winget` is missing, install **App Installer** from Microsoft Store first, or install Node.js LTS, Rustup, and Visual Studio Build Tools manually.

To open all manual installer pages:

```powershell
pnpm env:open-prereqs
```

If App Installer is already installed but `winget` is still missing:

```powershell
pnpm env:winget:check
pnpm env:winget:register
```

Reopen PowerShell after installing so PATH updates are visible.

Chinese step-by-step desktop setup guide:

```text
docs/windows-desktop-setup.zh-CN.md
```

Next task checklist and data placement policy:

```text
docs/next-steps-and-data-policy.zh-CN.md
```

## Frontend Preview

```powershell
cd "D:\Project Directory\Screen-Translation-Assistant"
pnpm install
pnpm dev
```

If the system Node.js is still old but a compatible Node exists elsewhere on this machine, use:

```powershell
pnpm node:compat
pnpm dev:ensure
pnpm sidecar:ensure
pnpm tauri:prepare
pnpm dev:compat
pnpm build:compat
```

Open:

```text
http://127.0.0.1:5173/
```

The browser preview uses frontend mock fallback when Tauri APIs are unavailable.

## Local Sidecar

The sidecar exposes both OCR and translation endpoints on `127.0.0.1:8765`.

```powershell
cd "D:\Project Directory\Screen-Translation-Assistant"
pnpm sidecar
```

Health check:

```powershell
Invoke-RestMethod http://127.0.0.1:8765/health
```

Useful endpoints:

```text
GET  /health
GET  /glossary
POST /glossary
POST /cache/clear
POST /ocr
POST /translate
```

## Real Offline Engines

Default startup installs only the lightweight API server dependencies. It can run without models and falls back to mock OCR/translation.

To install optional local engines:

```powershell
cd "D:\Project Directory\Screen-Translation-Assistant"
pnpm sidecar:engines
```

Optional engines:

- OCR: RapidOCR / ONNXRuntime
- Translation: Argos Translate

Argos still needs installed language packages. Install English to Chinese with:

```powershell
pnpm models:argos
```

If a package is missing, the sidecar reports it in `/health` and falls back to mock translation.

The sidecar also applies lightweight local post-processing:

- Adjacent OCR blocks on the same text line are merged before translation.
- Chinese text, numbers, and short symbols are preserved instead of being sent to the English-to-Chinese model.
- Common UI and developer terms such as GitHub, Pull requests, Feed, Star, Copilot, Python, and F-Droid are handled by a local glossary.

The glossary lives at:

```text
config/glossary.zh-CN.json
```

It contains exact UI terms and post-translation brand replacements. Restart the sidecar after editing it. To use a different glossary file:

```powershell
$env:SCREENLINGUA_GLOSSARY_PATH = "D:\path\to\glossary.zh-CN.json"
pnpm sidecar
```

The terminology page in the frontend reads `GET /glossary` and can save edits through `POST /glossary` while the sidecar is running.

The sidecar keeps small in-memory OCR and translation caches. Defaults:

```powershell
$env:SCREENLINGUA_OCR_CACHE_MAX = "32"
$env:SCREENLINGUA_TRANSLATION_CACHE_MAX = "2048"
```

Set either value to `0` before starting the sidecar to disable that cache.

## Current Capture Flow

In the Tauri desktop app, `simulate_region_translate` now captures a default fixed screen region, writes it to a temporary PNG, sends the image path to the local sidecar `/ocr`, then sends recognized text to `/translate`.

Default region:

```text
x=0, y=0, width=1200, height=800
```

The command also accepts optional `x`, `y`, `width`, `height`, and `displayId` fields in the request. The future drag-to-select overlay should pass those coordinates instead of using the default fixed region.

## Tauri Dev

Run the local sidecar in one terminal:

```powershell
cd "D:\Project Directory\Screen-Translation-Assistant"
pnpm sidecar
```

Run the Tauri app in another terminal:

```powershell
cd "D:\Project Directory\Screen-Translation-Assistant"
pnpm env:check
pnpm tauri:dev
```

`pnpm tauri:dev` runs `pnpm tauri:prepare` first, which reuses or starts the local sidecar and Vite dev server.

Service helpers:

```powershell
pnpm services:status
pnpm services:stop:dry
pnpm services:stop
```

Real-machine acceptance after installing Rust/Cargo and Visual Studio Build Tools:

```powershell
pnpm test:real-machine
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\real_machine_test.ps1 -ImageDir "D:\测试截图" -Image "D:\ScreenShot_2026-06-28_163226_974.png"
```

Build the Windows desktop app:

```powershell
cd "D:\Project Directory\Screen-Translation-Assistant"
pnpm tauri:build
```

## Checks

```powershell
pnpm check
pnpm build
python scripts\smoke_check.py
```

With the sidecar running, validate the local OCR/translation API:

```powershell
pnpm test:local-flow
```

To run the same check against screenshots:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test_local_flow.ps1 -ImageDir "D:\测试截图"
```
