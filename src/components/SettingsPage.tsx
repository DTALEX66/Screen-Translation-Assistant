import type { SidecarStatusState } from '../hooks';

interface SettingsPageProps {
  engine: string;
  apiKey: string;
  targetLang: string;
  hoverDelay: number;
  hotkey: string;
  saved: boolean;
  sidecarStatus: SidecarStatusState;
  onEngineChange: (value: string) => void;
  onApiKeyChange: (value: string) => void;
  onTargetLangChange: (value: string) => void;
  onHoverDelayChange: (value: number) => void;
  onHotkeyChange: (value: string) => void;
  onSave: () => void;
}

export function SettingsPage({
  engine,
  apiKey,
  targetLang,
  hoverDelay,
  hotkey,
  saved,
  sidecarStatus,
  onEngineChange,
  onApiKeyChange,
  onTargetLangChange,
  onHoverDelayChange,
  onHotkeyChange,
  onSave,
}: SettingsPageProps) {
  const health = sidecarStatus.health;
  const cache = health?.cache;
  const serviceState = sidecarStatus.error ? '异常' : health?.ok ? '正常' : '连接中';

  return (
    <section className="content">
      <p className="eyebrow">应用配置</p>
      <h1>设置</h1>
      <p className="lead">默认使用本地优先模式；未安装本地模型时自动回退到 mock 演示。</p>

      <div className="settings-form">
        <label className="setting-row">
          <span>翻译引擎</span>
          <select
            value={engine}
            onChange={event => { onEngineChange(event.target.value); }}
          >
            <option value="local">Local First (本地优先)</option>
            <option value="argos">Argos Translate (本地)</option>
            <option value="mock">Mock (演示)</option>
            <option value="openai">OpenAI Compatible</option>
            <option value="deepseek">DeepSeek</option>
          </select>
        </label>
        <label className="setting-row">
          <span>API Key（仅云端）</span>
          <input
            type="password"
            placeholder="本地模式不需要"
            value={apiKey}
            onChange={event => { onApiKeyChange(event.target.value); }}
          />
        </label>
        <label className="setting-row">
          <span>目标语言</span>
          <select
            value={targetLang}
            onChange={event => { onTargetLangChange(event.target.value); }}
          >
            <option value="zh-CN">简体中文</option>
            <option value="zh-TW">繁体中文</option>
            <option value="ja">日本語</option>
            <option value="ko">한국어</option>
          </select>
        </label>
        <label className="setting-row">
          <span>悬停延迟 (ms)</span>
          <input
            type="number"
            value={hoverDelay}
            onChange={event => { onHoverDelayChange(Number(event.target.value)); }}
            min={200}
            max={3000}
            step={100}
          />
        </label>
        <label className="setting-row">
          <span>框选快捷键</span>
          <input
            value={hotkey}
            onChange={event => { onHotkeyChange(event.target.value); }}
          />
        </label>
        <div
          className="actions"
          style={{
            padding: "16px 0 0",
            borderTop: "1px solid rgba(20,33,51,.08)",
          }}
        >
          <button className="primary" onClick={onSave}>
            {saved ? "✓ 已保存" : "保存设置"}
          </button>
        </div>
      </div>

      <section className="result-panel service-panel">
        <div className="panel-header">
          <div>
            <h2>本地服务</h2>
            <span>{health ? `Sidecar ${health.version} · ${health.mode}` : '127.0.0.1:8765'}</span>
          </div>
          <div className="panel-actions">
            <button type="button" onClick={() => { void sidecarStatus.refresh(); }} disabled={sidecarStatus.loading}>
              {sidecarStatus.loading ? '刷新中' : '刷新'}
            </button>
            <button
              type="button"
              className="danger"
              onClick={() => { void sidecarStatus.clearCache(); }}
              disabled={sidecarStatus.clearing || sidecarStatus.loading || !health}
            >
              {sidecarStatus.clearing ? '清理中' : '清理缓存'}
            </button>
          </div>
        </div>

        {sidecarStatus.error && <div className="inline-warning">{sidecarStatus.error}</div>}

        <section className="service-grid">
          <article>
            <span>状态</span>
            <strong>{serviceState}</strong>
          </article>
          <article>
            <span>OCR</span>
            <strong>{health?.ocr.provider || '-'}</strong>
            <small>{health?.ocr.rapidocr_available ? 'RapidOCR 可用' : 'RapidOCR 不可用'}</small>
          </article>
          <article>
            <span>翻译</span>
            <strong>{health?.translation.provider || '-'}</strong>
            <small>{health?.translation.argos_available ? 'Argos 可用' : 'Argos 不可用'}</small>
          </article>
          <article>
            <span>术语</span>
            <strong>{health?.glossary.terms ?? '-'}</strong>
            <small>{health ? `${health.glossary.brand_replacements} 个品牌替换` : '-'}</small>
          </article>
          <article>
            <span>OCR 缓存</span>
            <strong>{cache ? `${cache.ocr}/${cache.ocr_max}` : '-'}</strong>
          </article>
          <article>
            <span>翻译缓存</span>
            <strong>{cache ? `${cache.translation}/${cache.translation_max}` : '-'}</strong>
          </article>
        </section>
      </section>
    </section>
  );
}
