import React from 'react';  
import { useMemo, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { DiagnosticsSnapshot, TranslateResponse } from './types';
import { fallbackMockResponse } from './mock';

var navItems = ['首页', '历史', '术语库', '固定区域', '隐私', '设置'];

async function callDiagnostics() {
  try {
    return await invoke('get_diagnostics_snapshot');
  } catch (error) {
    console.warn('Diagnostics fallback:', error);
    return {
      ok: true, ocrStatus: 'browser-fallback',
      databaseStatus: 'not-connected-in-browser-preview',
      privacyMode: true, screenCount: 1,
      recentEvents: [{ timestamp: new Date().toISOString(), level: 'INFO', event: 'prototype', message: 'Static preview fallback diagnostics' }]
    };
  }
}

async function callSimulateTranslate() {
  try {
    return await invoke('simulate_region_translate', { request: { mode: 'mock', targetLanguage: 'zh-CN' } });
  } catch (error) {
    console.warn('Tauri fallback:', error);
    return fallbackMockResponse;
  }
}

export function App() {
  var _s = useState, _m = useMemo;
  var _r = _s(null), result = _r[0], setResult = _r[1];
  var _l = _s(false), loading = _l[0], setLoading = _l[1];
  var _h = _s(false), hoverEnabled = _h[0], setHoverEnabled = _h[1];
  var _d = _s(null), diagnostics = _d[0], setDiagnostics = _d[1];

  var summary = _m(function() {
    if (!result) return '等待翻译任务';
    return result.blocks.length + ' 条文本 \u00b7 ' + result.elapsedMs + 'ms \u00b7 ' + result.mode;
  }, [result]);

  async function handleDiagnostics() { setDiagnostics(await callDiagnostics()); }
  async function handleMockTranslate() {
    setLoading(true);
    try { setResult(await callSimulateTranslate()); }
    finally { setLoading(false); }
  }

  return React.createElement('main', { className: 'app-shell' },
    React.createElement('aside', { className: 'sidebar' },
      React.createElement('div', { className: 'brand-block' },
        React.createElement('div', { className: 'brand-mark' }, '译'),
        React.createElement('div', null,
          React.createElement('div', { className: 'brand' }, 'ScreenLingua'),
          React.createElement('div', { className: 'brand-subtitle' }, '屏幕译 V0.4')
        )
      ),
      React.createElement('nav', null,
        navItems.map(function(item) { return React.createElement('button', { key: item, className: item === '首页' ? 'active' : '' }, item); })
      ),
      React.createElement('div', { className: 'privacy-card' },
        React.createElement('strong', null, '隐私模式'),
        React.createElement('span', null, '默认不上传截图，仅上传 OCR 后文本。')
      )
    ),
    React.createElement('section', { className: 'content' },
      React.createElement('p', { className: 'eyebrow' }, 'Windows 系统级屏幕翻译助手'),
      React.createElement('h1', null, '不只翻网页，直接翻译整个电脑屏幕。'),
      React.createElement('p', { className: 'lead' }, '先跑通框选、悬停、固定区域和缓存闭环，再接入真实 OCR 与翻译引擎。'),
      React.createElement('div', { className: 'actions' },
        React.createElement('button', { className: 'primary', onClick: handleMockTranslate, disabled: loading }, loading ? '翻译中...' : '模拟框选翻译 Alt+Q'),
        React.createElement('button', null, '当前屏幕 Ctrl+Shift+T'),
        React.createElement('button', null, '固定区域 Alt+W'),
        React.createElement('button', { onClick: function() { setHoverEnabled(function(v) { return !v; }); } }, hoverEnabled ? '关闭悬停 Alt+S' : '开启悬停 Alt+S'),
        React.createElement('button', { onClick: handleDiagnostics }, '诊断检查')
      ),
      React.createElement('section', { className: 'status-grid' },
        React.createElement('article', null, React.createElement('span', null, 'OCR'), React.createElement('strong', null, 'Mock Sidecar'), React.createElement('small', null, '127.0.0.1:8765')),
        React.createElement('article', null, React.createElement('span', null, '翻译'), React.createElement('strong', null, 'Mock + Cache'), React.createElement('small', null, '后续接 DeepSeek / OpenAI / Argos')),
        React.createElement('article', null, React.createElement('span', null, '悬停'), React.createElement('strong', null, hoverEnabled ? '已开启' : '未开启'), React.createElement('small', null, '默认 700ms 停留触发'))
      )
    )
  );
}