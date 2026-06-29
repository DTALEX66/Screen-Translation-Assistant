export function PinnedPage() {
  return (
    <section className="content client-workspace">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">实时翻译</p>
          <h1>固定区域</h1>
          <p className="lead">保存常用屏幕区域，持续监测文字变化并输出本地翻译。</p>
        </div>
        <div className="service-pill wait">
          <span>监听状态</span>
          <strong>未启动</strong>
        </div>
      </header>

      <section className="pinned-layout">
        <div className="capture-panel">
          <div className="panel-header">
            <div>
              <h2>区域列表</h2>
              <span>用于桌面端真机框选</span>
            </div>
            <span className="run-state ready">可配置</span>
          </div>

          <div className="region-board">
            <div className="region-preview">
              <div className="region-box">
                <span>1200 × 800</span>
              </div>
            </div>
            <div className="region-copy">
              <h3>默认捕获区域</h3>
              <p>桌面端当前使用默认固定区域。真机测试通过后，可以接入拖拽框选覆盖这里的坐标。</p>
              <div className="secondary-actions">
                <button>新建区域</button>
                <button>暂停监听</button>
                <button>清除区域</button>
              </div>
            </div>
          </div>
        </div>

        <aside className="operator-panel">
          <article>
            <span>热键</span>
            <strong>Alt+Q</strong>
          </article>
          <article>
            <span>模式</span>
            <strong>固定区域</strong>
          </article>
          <article>
            <span>刷新</span>
            <strong>手动</strong>
          </article>
        </aside>
      </section>
    </section>
  );
}
