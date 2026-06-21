#!/usr/bin/env python3
from pathlib import Path
import json
import sys
import ast

ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT.parent

required = [
    ROOT / 'package.json',
    ROOT / 'src' / 'App.tsx',
    ROOT / 'src-tauri' / 'tauri.conf.json',
    ROOT / 'sidecars' / 'ocr_service' / 'main.py',
    ROOT / 'database' / 'schema.sql',
    ROOT / 'contracts' / 'api.contract.v5.json',
    ROOT / 'fixtures' / 'ocr_blocks.sample.json',
    ROOT / 'fixtures' / 'translation_response.sample.json',
    PACK / 'config' / 'default.settings.v5.json',
]

errors = []
for path in required:
    if not path.exists():
        errors.append(f'MISSING: {path.relative_to(PACK)}')

for rel in ['src-tauri/tauri.conf.json', 'contracts/api.contract.v5.json', 'fixtures/ocr_blocks.sample.json', 'fixtures/translation_response.sample.json']:
    p = ROOT / rel
    if p.exists():
        try:
            json.loads(p.read_text(encoding='utf-8'))
        except Exception as e:
            errors.append(f'INVALID JSON: {rel}: {e}')

settings = PACK / 'config' / 'default.settings.v5.json'
if settings.exists():
    try:
        data = json.loads(settings.read_text(encoding='utf-8'))
        if data.get('privacy', {}).get('upload_screenshot') is not False:
            errors.append('PRIVACY: upload_screenshot must default to false')
        if data.get('features', {}).get('cloudTranslation') is not False:
            errors.append('FEATURE: cloudTranslation must default to false')
    except Exception as e:
        errors.append(f'INVALID JSON: config/default.settings.v5.json: {e}')

py_files = [ROOT / 'sidecars' / 'ocr_service' / 'main.py']
for p in py_files:
    if p.exists():
        try:
            ast.parse(p.read_text(encoding='utf-8'))
        except Exception as e:
            errors.append(f'PYTHON SYNTAX: {p.relative_to(ROOT)}: {e}')

if errors:
    print('V5 validation failed:')
    for e in errors:
        print(' -', e)
    sys.exit(1)
print('V5 validation passed')
