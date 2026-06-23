// ── Manual test script: Screen Translation Assistant ────────────
// Usage: npx tsx _test.ts

import { mockTranslate } from './src/core';
import { toUserError } from './src/lib/errorMap';
import type { ScreenLinguaErrorCode } from './src/lib/errorMap';
import { getMockResponse, resetMockCache, getMockScenes } from './src/mock';
import { defaultFeatureFlags, isEnabled } from './src/lib/featureFlags';

// ── Tiny test helpers ───────────────────────────────────────────

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`ASSERT: ${msg}`);
}

function assertEqual<T>(a: T, b: T, msg: string) {
  if (a !== b) throw new Error(`ASSERT: ${msg} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
}

let passed = 0;
let failed = 0;

// ── All 12 error codes ──────────────────────────────────────────

const ALL_CODES: ScreenLinguaErrorCode[] = [
  'SL-CAP-001', 'SL-CAP-002', 'SL-CAP-003',
  'SL-OCR-001', 'SL-OCR-002', 'SL-OCR-003',
  'SL-TR-001',  'SL-TR-002',  'SL-TR-003',
  'SL-DB-001',  'SL-PRIV-001', 'SL-APP-001',
];

// ── Main runner ─────────────────────────────────────────────────

async function main() {

  // ═══════════════════════════════════════════════════════════════
  // Module 1 — mockTranslate
  // ═══════════════════════════════════════════════════════════════
  try {
    const result = await mockTranslate(['Render Settings', 'Preferences', 'ZzzUnknown']);

    assertEqual(result.length, 3, 'returns 3 results');

    const r0 = result[0];
    assertEqual(r0.sourceText, 'Render Settings', 'sourceText preserved');
    assertEqual(r0.targetText, '\u6e32\u67d3\u8bbe\u7f6e', 'known \u2192 dict value');
    assertEqual(r0.engine, 'mock', 'engine = mock');
    assertEqual(r0.cached, false, 'cached = false');

    const r1 = result[1];
    assertEqual(r1.sourceText, 'Preferences', 'Preferences sourceText');
    assertEqual(r1.targetText, '\u504f\u597d\u8bbe\u7f6e', 'Preferences \u2192 dict');

    const r2 = result[2];
    assertEqual(r2.sourceText, 'ZzzUnknown', 'unknown sourceText');
    assert(r2.targetText.includes('ZzzUnknown'), 'unknown uses fallback pattern');

    passed += 9;
  } catch (e: any) { failed++; console.error('Module 1 (mockTranslate):', e.message ?? e); }

  // ═══════════════════════════════════════════════════════════════
  // Module 2 — toUserError (all 12 codes + fallback)
  // ═══════════════════════════════════════════════════════════════
  try {
    for (const code of ALL_CODES) {
      const entry = toUserError(code);
      assert(typeof entry.title   === 'string' && entry.title.length   > 0, `${code}: title`);
      assert(typeof entry.message === 'string' && entry.message.length > 0, `${code}: message`);
      assert(typeof entry.action  === 'string' && entry.action.length  > 0, `${code}: action`);
    }
    const fallback = toUserError('NOT-A-CODE' as ScreenLinguaErrorCode);
    assertEqual(fallback.title, toUserError('SL-APP-001').title, 'unknown \u2192 SL-APP-001 fallback');
    passed += ALL_CODES.length * 3 + 1; // 37
  } catch (e: any) { failed++; console.error('Module 2 (toUserError):', e.message ?? e); }

  // ═══════════════════════════════════════════════════════════════
  // Module 3 — mock.ts (getMockResponse / resetMockCache / getMockScenes)
  // ═══════════════════════════════════════════════════════════════
  try {
    resetMockCache();

    // ── basic response shape ──
    const resp = getMockResponse('vscode');
    assertEqual(resp.ok, true, 'resp.ok');
    assertEqual(resp.mode, 'mock', 'resp.mode');
    assert(typeof resp.elapsedMs === 'number' && resp.elapsedMs >= 0, 'resp.elapsedMs');
    assert(Array.isArray(resp.blocks) && resp.blocks.length === 3, 'vscode \u2192 3 blocks');

    const b = resp.blocks[0];
    assert(typeof b.sourceText === 'string', 'block.sourceText');
    assert(typeof b.targetText === 'string', 'block.targetText');
    assert(Array.isArray(b.bbox) && b.bbox.length === 4, 'block.bbox [4]');
    assert(typeof b.confidence === 'number' && b.confidence > 0, 'block.confidence');
    assert(typeof b.fromCache === 'boolean', 'block.fromCache');
    assert(typeof b.engine === 'string', 'block.engine');

    // ── cache behaviour ──
    resetMockCache();
    const c1 = getMockResponse('blender');
    assertEqual(c1.blocks[0].fromCache, false, '1st call \u2192 not cached');
    const c2 = getMockResponse('blender');
    assertEqual(c2.blocks[0].fromCache, true, '2nd call \u2192 cached');

    resetMockCache();
    const c3 = getMockResponse('blender');
    assertEqual(c3.blocks[0].fromCache, false, 'after reset \u2192 not cached');

    // ── getMockScenes ──
    const scenes = getMockScenes();
    for (const s of ['blender', 'vscode', 'docker', 'photoshop']) {
      assert(scenes.includes(s), `scenes includes ${s}`);
    }

    // ── unknown scene fallback ──
    const unknown = getMockResponse('nonexistent');
    assert(Array.isArray(unknown.blocks) && unknown.blocks.length > 0, 'unknown scene \u2192 fallback');

    passed += 18;
  } catch (e: any) { failed++; console.error('Module 3 (mock.ts):', e.message ?? e); }

  // ═══════════════════════════════════════════════════════════════
  // Module 4 — types.ts runtime shape
  // ═══════════════════════════════════════════════════════════════
  try {
    resetMockCache();
    const resp = getMockResponse('photoshop');

    // TranslateResponse fields
    assert(typeof resp.ok === 'boolean', 'types: resp.ok boolean');
    assert(typeof resp.mode === 'string', 'types: resp.mode string');
    assert(typeof resp.elapsedMs === 'number', 'types: resp.elapsedMs number');
    assert(resp.error === undefined || resp.error === null || typeof resp.error === 'string', 'types: resp.error');

    // TranslationBlock fields (check every block)
    for (const b of resp.blocks) {
      assert(typeof b.sourceText  === 'string',   `types: ${b.sourceText} sourceText`);
      assert(typeof b.targetText  === 'string',   `types: ${b.targetText} targetText`);
      assert(Array.isArray(b.bbox) && b.bbox.length === 4 &&
             b.bbox.every((n: number) => typeof n === 'number'), `types: bbox [4]`);
      assert(typeof b.confidence === 'number' &&
             b.confidence >= 0 && b.confidence <= 1, `types: confidence 0\u20131`);
      assert(typeof b.fromCache   === 'boolean',   `types: fromCache`);
      assert(typeof b.engine      === 'string',    `types: engine`);
    }

    passed += 4 + resp.blocks.length * 6; // photoshop has 4 blocks → 28
  } catch (e: any) { failed++; console.error('Module 4 (types.ts):', e.message ?? e); }

  // ═══════════════════════════════════════════════════════════════
  // Module 5 — featureFlags
  // ═══════════════════════════════════════════════════════════════
  try {
    const f = defaultFeatureFlags;

    assertEqual(isEnabled(f, 'mockOcr'),          true,  'mockOcr default');
    assertEqual(isEnabled(f, 'mockTranslation'),  true,  'mockTranslation default');
    assertEqual(isEnabled(f, 'localCache'),       true,  'localCache default');
    assertEqual(isEnabled(f, 'history'),          true,  'history default');
    assertEqual(isEnabled(f, 'privacyBlacklist'), true,  'privacyBlacklist default');
    assertEqual(isEnabled(f, 'realCapture'),      false, 'realCapture default');
    assertEqual(isEnabled(f, 'realPaddleOcr'),    false, 'realPaddleOcr default');
    assertEqual(isEnabled(f, 'cloudTranslation'), false, 'cloudTranslation default');
    assertEqual(isEnabled(f, 'hoverTranslate'),   false, 'hoverTranslate default');

    const mod = { ...f, mockOcr: false, realCapture: true, debugScreenshotSave: true };
    assertEqual(isEnabled(mod, 'mockOcr'),             false, 'toggled mockOcr');
    assertEqual(isEnabled(mod, 'realCapture'),         true,  'toggled realCapture');
    assertEqual(isEnabled(mod, 'debugScreenshotSave'), true,  'toggled debug');

    passed += 12;
  } catch (e: any) { failed++; console.error('Module 5 (featureFlags):', e.message ?? e); }

  // ── Summary ──────────────────────────────────────────────────
  console.log(`\n✅ ${passed} passed / ❌ ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main();
