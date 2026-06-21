#!/usr/bin/env python3
from pathlib import Path
import json
import hashlib

ROOT = Path(__file__).resolve().parents[1]
ocr = json.loads((ROOT / 'fixtures' / 'ocr_blocks.sample.json').read_text(encoding='utf-8'))
terms = {
    'Render Settings': '渲染设置',
    'Subdivision Surface': '细分曲面',
    'Export selected objects': '导出所选对象',
    'API key is missing': '缺少 API key',
}
cache = {}

def translate(text):
    key = hashlib.sha256(text.encode('utf-8')).hexdigest()
    if key in cache:
        return {'source': text, 'target': cache[key], 'engine': 'mock', 'cached': True}
    target = terms.get(text, f'[模拟翻译] {text}')
    cache[key] = target
    return {'source': text, 'target': target, 'engine': 'mock', 'cached': False}

first = [translate(b['text']) for b in ocr['blocks']]
second = [translate(b['text']) for b in ocr['blocks']]
assert len(first) >= 3, 'expected at least 3 translated blocks'
assert all('target' in item for item in first), 'missing target'
assert any(item['cached'] for item in second), 'expected cache hits on second pass'
print('Mock acceptance passed')
print(json.dumps({'first': first, 'second': second}, ensure_ascii=False, indent=2))
