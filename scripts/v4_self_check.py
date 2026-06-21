from __future__ import annotations

import json
import py_compile
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT.parent

required = [
    PACK / "00_CODEX_START_HERE.md",
    PACK / "MANIFEST.md",
    PACK / "docs/36_V4_ENGINEERING_HARDENING.md",
    PACK / "docs/46_V4_SELF_CHECK_10_ROUNDS.md",
    PACK / "prompts/phase_14_real_capture_windows.md",
    PACK / "prompts/phase_15_dpi_multimonitor_overlay.md",
    PACK / "prompts/phase_16_packaging_diagnostics.md",
    PACK / "config/default.settings.v4.json",
    ROOT / "src-tauri/src/diagnostics.rs",
    ROOT / "src-tauri/src/privacy.rs",
    ROOT / "src-tauri/src/screen_geometry.rs",
    ROOT / "src-tauri/src/settings.rs",
]

missing = [str(p.relative_to(PACK)) for p in required if not p.exists()]
if missing:
    raise SystemExit("Missing files:\n" + "\n".join(missing))

json.loads((PACK / "config/default.settings.v4.json").read_text(encoding="utf-8"))
json.loads((ROOT / "package.json").read_text(encoding="utf-8"))
json.loads((ROOT / "src-tauri/tauri.conf.json").read_text(encoding="utf-8"))

for py_file in [ROOT / "sidecars/ocr_service/main.py", ROOT / "scripts/smoke_check.py"]:
    py_compile.compile(str(py_file), doraise=True)

schema = (ROOT / "database/schema.sql").read_text(encoding="utf-8")
conn = sqlite3.connect(":memory:")
conn.executescript(schema)
for table in ["translation_cache", "translate_history", "terminology", "diagnostics_events"]:
    conn.execute(f"SELECT 1 FROM {table} LIMIT 1")
conn.close()

main_rs = (ROOT / "src-tauri/src/main.rs").read_text(encoding="utf-8")
for token in ["mod diagnostics;", "mod privacy;", "mod screen_geometry;", "mod settings;"]:
    if token not in main_rs:
        raise SystemExit(f"main.rs missing {token}")

print("V4 self check passed")
print(f"Package root: {PACK}")
