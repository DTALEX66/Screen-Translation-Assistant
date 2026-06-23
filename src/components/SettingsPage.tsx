interface SettingsPageProps {
  engine: string;
  apiKey: string;
  targetLang: string;
  hoverDelay: number;
  hotkey: string;
  saved: boolean;
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
  onEngineChange,
  onApiKeyChange,
  onTargetLangChange,
  onHoverDelayChange,
  onHotkeyChange,
  onSave,
}: SettingsPageProps) {
  return (
    <section className="content">
      <p className="eyebrow">应用配置</p>
      <h1>设置</h1>
      <p className="lead">配置翻译引擎、快捷键和偏好设置（当前为 mock 演示）。</p>
      <div className="settings-form">
        <label className="setting-row">
          <span>翻译引擎</span>
          <select
            value={engine}
            onChange={event => { onEngineChange(event.target.value); }}
          >
            <option value="mock">Mock (演示)</option>
            <option value="openai">OpenAI Compatible</option>
            <option value="deepseek">DeepSeek</option>
            <option value="argos">Local Argos Translate</option>
          </select>
        </label>
        <label className="setting-row">
          <span>API Key</span>
          <input
            type="password"
            placeholder="sk-..."
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
    </section>
  );
}
