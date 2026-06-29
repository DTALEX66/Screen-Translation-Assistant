from __future__ import annotations

import json
import os
import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def check_file(path: str) -> None:
    p = ROOT / path
    if not p.exists():
        raise SystemExit(f"missing required file: {p}")


def check_json(path: str) -> None:
    p = ROOT / path
    json.loads(p.read_text(encoding="utf-8"))


def check_sql() -> None:
    schema = (ROOT / "database/schema.sql").read_text(encoding="utf-8")
    conn = sqlite3.connect(":memory:")
    conn.executescript(schema)
    conn.close()


def main() -> None:
    required = [
        "package.json",
        "index.html",
        "src/App.tsx",
        "src/main.tsx",
        "src-tauri/Cargo.toml",
        "src-tauri/tauri.conf.json",
        "src-tauri/src/main.rs",
        "sidecars/ocr_service/main.py",
        "config/glossary.zh-CN.json",
        "database/schema.sql",
    ]
    for item in required:
        check_file(item)
    check_json("package.json")
    check_json("src-tauri/tauri.conf.json")
    check_json("config/glossary.zh-CN.json")
    check_sql()
    print("ScreenLingua scaffold smoke check passed")


if __name__ == "__main__":
    main()
