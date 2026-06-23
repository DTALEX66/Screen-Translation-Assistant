import type { TranslateResponse, DiagnosticsSnapshot } from "../types";

interface HomePageProps {
  scenes: string[];
  sceneIndex: number;
  translateCount: number;
  totalWords: number;
  cacheHits: number;
  loading: boolean;
  errorMode: boolean;
  result: TranslateResponse | null;
  diagnostics: DiagnosticsSnapshot | null;
  toast: string;
  summary: string;
  onTranslate: () => void;
  onNextScene: () => void;
  onToggleErrorMode: () => void;
  onClearCache: () => void;
  onDiagnostics: () => void;
  onCloseError: () => void;
  onCopyTarget: (text: string) => void;
}

export function HomePage({
  scenes,
  sceneIndex,
  translateCount,
  totalWords,
  cacheHits,
  loading,
  errorMode,
  result,
  diagnostics,
  toast,
  summary,
  onTranslate,
  onNextScene,
  onToggleErrorMode,
  onClearCache,
  onDiagnostics,
  onCloseError,
  onCopyTarget,
}: HomePageProps) {
  return (
    <section className="content">
      <p className="eyebrow">Windows 系统级屏幕翻译助手</p>
      <h1>不只翻网页，直接翻译整个电脑屏幕。</h1>
      <p className="lead">框选、悬停、固定区域和缓存闭环，Mock 优先，逐层替换真实实现。</p>
      <div className="home-hero">
        <div className="hero-visual">
          <div className="screen-mock">
            <div className="mock-block">Render Settings</div>
            <div className="mock-arrow">→</div>
            <div className="mock-block">渲染设置</div>
          </div>
        </div>
      </div>

      <div className="actions">
        <button
          className="primary"
          onClick={onTranslate}
          disabled={loading}
        >
          {loading ? "翻译中..." : "模拟框选翻译"}
        </button>
        <button onClick={onNextScene}>
          下一场景 ({scenes[(sceneIndex + 1) % scenes.length]})
        </button>
        <button onClick={onToggleErrorMode}>
          {errorMode ? "✓ 恢复正常" : "模拟 OCR 错误"}
        </button>
        <button onClick={onClearCache}>清除缓存</button>
        <button onClick={onDiagnostics}>诊断检查</button>
      </div>

      {toast && <div className="toast">{toast}</div>}

      <section className="status-grid">
        <article>
          <span>场景</span>
          <strong>{scenes[sceneIndex]}</strong>
          <small>第 {translateCount + 1} 次翻译</small>
        </article>
        <article>
          <span>引擎</span>
          <strong>Mock + Cache</strong>
          <small>重复点击命中缓存</small>
        </article>
        <article>
          <span>状态</span>
          <strong>{errorMode ? "错误模拟" : "正常"}</strong>
          <small>{errorMode ? "OCR 将返回故障" : "就绪"}</small>
        </article>
      </section>

      <section
        className="stats-mini"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
          marginTop: 28,
        }}
      >
        {[
          { label: "翻译次数", value: translateCount },
          { label: "处理字数", value: totalWords },
          { label: "缓存命中", value: cacheHits },
          { label: "引擎", value: "Mock" },
        ].map((stat, index) => (
          <article
            key={index}
            style={{
              padding: 16,
              background: "rgba(255, 255, 255, .75)",
              borderRadius: 16,
              textAlign: "center",
            }}
          >
            <span style={{ fontSize: 12, color: "#667085" }}>
              {stat.label}
            </span>
            <strong style={{ fontSize: 24, display: "block" }}>
              {stat.value}
            </strong>
          </article>
        ))}
      </section>

      {diagnostics && (
        <section className="diagnostics-panel">
          <div className="panel-header">
            <h2>诊断状态</h2>
            <span>已检查</span>
          </div>
          <div className="diagnostics-grid">
            <div>
              <span>OCR</span>
              <strong>{diagnostics.ocrStatus}</strong>
            </div>
            <div>
              <span>数据库</span>
              <strong>{diagnostics.databaseStatus}</strong>
            </div>
            <div>
              <span>隐私模式</span>
              <strong>{diagnostics.privacyMode ? "开启" : "关闭"}</strong>
            </div>
            <div>
              <span>屏幕数量</span>
              <strong>{diagnostics.screenCount}</strong>
            </div>
          </div>
        </section>
      )}

      {result && !result.ok && (
        <div className="error-banner">
          <strong>⚠️ 翻译失败</strong>
          <span>{result.error}</span>
          <button onClick={onCloseError}>关闭错误模式</button>
        </div>
      )}

      {!result && (
        <div className="empty-state">
          <div className="empty-icon">🠪</div>
          <h3>点击"模拟框选翻译"开始</h3>
          <p>选择不同软件场景，重复点击观察缓存命中效果。</p>
          <button className="primary" onClick={onTranslate}>
            开始翻译
          </button>
        </div>
      )}

      {result && result.ok && (
        <section className="result-panel">
          <div className="panel-header">
            <h2>翻译结果</h2>
            <span>{summary}</span>
          </div>
          {result.blocks.map((block, index) => (
            <div
              className="result-row"
              key={block.sourceText + "-" + index}
            >
              <div className="source">
                <span>原文</span>
                <strong>{block.sourceText}</strong>
              </div>
              <div
                className="target"
                onClick={() => { onCopyTarget(block.targetText); }}
                style={{ cursor: "pointer" }}
                title="点击复制"
              >
                <span>译文</span>
                <strong>{block.targetText}</strong>
              </div>
              <div className="meta">
                <span>bbox [{block.bbox.join(", ")}]</span>
                <span>{Math.round(block.confidence * 100)}%</span>
                <span className={block.fromCache ? "cache-hit" : ""}>
                  {block.fromCache ? "⚡ 缓存命中" : block.engine}
                </span>
              </div>
            </div>
          ))}
        </section>
      )}
    </section>
  );
}
