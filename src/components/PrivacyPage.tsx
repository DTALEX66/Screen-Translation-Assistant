export function PrivacyPage() {
  return (
    <section className="content client-workspace">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">本地安全</p>
          <h1>隐私与安全</h1>
          <p className="lead">截图、OCR 文本、术语和缓存都按本地优先策略处理。</p>
        </div>
        <div className="service-pill good">
          <span>隐私模式</span>
          <strong>本地优先</strong>
        </div>
      </header>

      <div className="privacy-grid">
        <article>
          <span>截图</span>
          <h3>不上传截图</h3>
          <p>截图只用于本机 OCR 流程，不作为云端请求内容。</p>
        </article>
        <article>
          <span>OCR</span>
          <h3>RapidOCR 本地识别</h3>
          <p>识别过程在 sidecar 内完成，便于离线和真机测试。</p>
        </article>
        <article>
          <span>翻译</span>
          <h3>Argos 本地翻译</h3>
          <p>英文到中文模型安装后，可直接在本机完成翻译。</p>
        </article>
        <article>
          <span>缓存</span>
          <h3>本机缓存</h3>
          <p>OCR 和翻译缓存保存在本地运行时，设置页可清理。</p>
        </article>
      </div>
    </section>
  );
}
