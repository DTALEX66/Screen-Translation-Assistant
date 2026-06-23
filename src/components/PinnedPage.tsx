export function PinnedPage() {
  return (
    <section className="content">
      <p className="eyebrow">实时翻译</p>
      <h1>固定区域</h1>
      <p className="lead">在屏幕上固定一个区域，持续监测文字变化并实时翻译。</p>
      <div className="empty-state">
        <div className="empty-icon">📌</div>
        <h3>暂无固定区域</h3>
        <p>按 Alt+W 在屏幕上框选区域。</p>
        <button className="primary">新建固定区域</button>
      </div>
    </section>
  );
}
