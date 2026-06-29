import type { SidecarStatusState } from "../hooks";
import type { DiagnosticsSnapshot, TranslateResponse } from "../types";

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
  sidecarStatus: SidecarStatusState;
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
  sidecarStatus,
  onTranslate,
  onNextScene,
  onToggleErrorMode,
  onClearCache,
  onDiagnostics,
  onCloseError,
  onCopyTarget,
}: HomePageProps) {
  const health = sidecarStatus.health;
  const cache = health?.cache;
  const serviceLabel = sidecarStatus.error
    ? "服务离线"
    : health?.ok
      ? "本地服务在线"
      : sidecarStatus.loading
        ? "连接中"
        : "等待服务";
  const serviceTone = sidecarStatus.error ? "bad" : health?.ok ? "good" : "wait";
  const cacheText = cache ? `${cache.ocr}/${cache.ocr_max} · ${cache.translation}/${cache.translation_max}` : "-";
  const resultCount = result?.ok ? result.blocks.length : 0;

  return (
    <section className="content client-workspace">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">本地工作台</p>
          <h1>屏幕翻译控制台</h1>
          <p className="lead">截图、OCR、翻译、术语和缓存都在本机处理。</p>
        </div>
        <div className={"service-pill " + serviceTone}>
          <span>{serviceLabel}</span>
          <strong>{health?.version || "sidecar"}</strong>
        </div>
      </header>

      <section className="client-status-strip">
        <article>
          <span>OCR</span>
          <strong>{health?.ocr.provider || "RapidOCR"}</strong>
          <small>{health?.ocr.rapidocr_available ? "可用" : "等待检测"}</small>
        </article>
        <article>
          <span>翻译</span>
          <strong>{health?.translation.provider || "Argos"}</strong>
          <small>{health?.translation.argos_available ? "可用" : "等待检测"}</small>
        </article>
        <article>
          <span>术语</span>
          <strong>{health?.glossary.terms ?? "-"}</strong>
          <small>{health ? `${health.glossary.brand_replacements} 个品牌替换` : "等待检测"}</small>
        </article>
        <article>
          <span>缓存</span>
          <strong>{cacheText}</strong>
          <small>OCR · 翻译</small>
        </article>
      </section>

      {toast && <div className="toast">{toast}</div>}

      <section className="translator-workbench">
        <div className="capture-panel">
          <div className="panel-header">
            <div>
              <h2>捕获队列</h2>
              <span>{scenes[sceneIndex]} · 第 {translateCount + 1} 次</span>
            </div>
            <span className={"run-state " + (loading ? "busy" : errorMode ? "bad" : "ready")}>
              {loading ? "处理中" : errorMode ? "错误模拟" : "就绪"}
            </span>
          </div>

          <div className="capture-preview">
            <div className="preview-window">
              <div className="preview-toolbar">
                <span />
                <span />
                <span />
              </div>
              <div className="preview-grid">
                <div className="preview-line wide" />
                <div className="preview-line" />
                <div className="translation-chip">
                  <span>Render Settings</span>
                  <strong>渲染设置</strong>
                </div>
                <div className="preview-line short" />
              </div>
            </div>
          </div>

          <div className="actions command-row">
            <button className="primary large-command" onClick={onTranslate} disabled={loading}>
              {loading ? "翻译中..." : "本地截图翻译"}
            </button>
            <button onClick={onNextScene}>下一场景</button>
            <button onClick={onDiagnostics}>诊断</button>
          </div>

          <div className="secondary-actions">
            <button onClick={onToggleErrorMode}>
              {errorMode ? "恢复正常" : "模拟 OCR 错误"}
            </button>
            <button onClick={onClearCache}>清除缓存</button>
            <button onClick={() => { void sidecarStatus.refresh(); }} disabled={sidecarStatus.loading}>
              刷新服务
            </button>
          </div>
        </div>

        <aside className="operator-panel">
          <article>
            <span>翻译次数</span>
            <strong>{translateCount}</strong>
          </article>
          <article>
            <span>处理字数</span>
            <strong>{totalWords}</strong>
          </article>
          <article>
            <span>缓存命中</span>
            <strong>{cacheHits}</strong>
          </article>
          <article>
            <span>结果块</span>
            <strong>{resultCount}</strong>
          </article>
        </aside>
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
          <strong>翻译失败</strong>
          <span>{result.error}</span>
          <button onClick={onCloseError}>关闭错误模式</button>
        </div>
      )}

      {!result && (
        <div className="empty-state compact-empty">
          <div className="empty-icon">→</div>
          <h3>等待第一组截图结果</h3>
          <p>固定区域 · 本地 OCR · 本地翻译</p>
        </div>
      )}

      {result && result.ok && (
        <section className="result-panel">
          <div className="panel-header">
            <h2>翻译结果</h2>
            <span>{summary}</span>
          </div>
          {result.blocks.map((block, index) => (
            <div className="result-row" key={block.sourceText + "-" + index}>
              <div className="source">
                <span>原文</span>
                <strong>{block.sourceText}</strong>
              </div>
              <div
                className="target clickable"
                onClick={() => { onCopyTarget(block.targetText); }}
                title="点击复制"
              >
                <span>译文</span>
                <strong>{block.targetText}</strong>
              </div>
              <div className="meta">
                <span>bbox [{block.bbox.join(", ")}]</span>
                <span>{Math.round(block.confidence * 100)}%</span>
                <span className={block.fromCache ? "cache-hit" : ""}>
                  {block.fromCache ? "缓存命中" : block.engine}
                </span>
              </div>
            </div>
          ))}
        </section>
      )}
    </section>
  );
}
