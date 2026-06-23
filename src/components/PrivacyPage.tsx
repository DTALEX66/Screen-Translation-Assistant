export function PrivacyPage() {
  return (
    <section className="content">
      <p className="eyebrow">隐私保护</p>
      <h1>隐私与安全</h1>
      <p className="lead">本地优先、隐私保护的策略。</p>
      <div className="privacy-grid">
        <article>
          <h3>🔀 默认不上传截图</h3>
          <p>OCR 在本地完成，仅上传纯文本，原始截图不离开设备。</p>
        </article>
        <article>
          <h3>📵 应用黑名单</h3>
          <p>可设置敏感应用列表，不在这些应用中激活翻译。</p>
        </article>
        <article>
          <h3>💾 本地存储</h3>
          <p>缓存和历史存储在本地 SQLite，不上传云端。</p>
        </article>
        <article>
          <h3>🛡️ 不注入进程</h3>
          <p>通过截图+OCR 方式工作，不修改不注入第三方进程。</p>
        </article>
      </div>
    </section>
  );
}
