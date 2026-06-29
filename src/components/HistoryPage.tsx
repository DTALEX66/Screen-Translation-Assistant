export interface HistoryEntry {
  id: number;
  source: string;
  target: string;
  mode: string;
  engine: string;
  time: string;
}

interface HistoryPageProps {
  filteredHistory: HistoryEntry[];
  historySearch: string;
  historyFilter: string;
  onHistorySearch: (value: string) => void;
  onHistoryFilter: (value: string) => void;
  onClearFilter: () => void;
  onExportCSV: () => void;
}

export function HistoryPage({
  filteredHistory,
  historySearch,
  historyFilter,
  onHistorySearch,
  onHistoryFilter,
  onClearFilter,
  onExportCSV,
}: HistoryPageProps) {
  const cacheCount = filteredHistory.filter(entry => entry.engine === "sqlite-cache").length;

  return (
    <section className="content client-workspace">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">记录中心</p>
          <h1>翻译历史</h1>
          <p className="lead">检索本地翻译记录，快速确认缓存命中和来源场景。</p>
        </div>
        <div className="service-pill">
          <span>当前列表</span>
          <strong>{filteredHistory.length} 条</strong>
        </div>
      </header>

      <section className="client-status-strip">
        <article>
          <span>记录数</span>
          <strong>{filteredHistory.length}</strong>
          <small>当前筛选</small>
        </article>
        <article>
          <span>缓存命中</span>
          <strong>{cacheCount}</strong>
          <small>SQLite / 内存缓存</small>
        </article>
        <article>
          <span>筛选模式</span>
          <strong>{historyFilter === "all" ? "全部" : historyFilter}</strong>
          <small>框选 · 悬停 · 固定</small>
        </article>
        <article>
          <span>搜索</span>
          <strong>{historySearch ? "已启用" : "未启用"}</strong>
          <small>原文或译文</small>
        </article>
      </section>

      <div className="history-toolbar">
        <input
          className="search-input"
          placeholder="搜索原文或译文..."
          value={historySearch}
          onChange={event => { onHistorySearch(event.target.value); }}
        />
        <select
          value={historyFilter}
          onChange={event => { onHistoryFilter(event.target.value); }}
        >
          <option value="all">全部模式</option>
          <option value="框选">框选</option>
          <option value="悬停">悬停</option>
          <option value="固定区域">固定区域</option>
        </select>
        <button onClick={onClearFilter}>清除筛选</button>
        <button className="primary" onClick={onExportCSV}>导出 CSV</button>
      </div>

      <section className="result-panel">
        <div className="panel-header">
          <h2>本地记录</h2>
          <span>{filteredHistory.length} 条</span>
        </div>
        {filteredHistory.length === 0 && (
          <div className="empty">暂无匹配记录。</div>
        )}
        {filteredHistory.map(entry => (
          <div className="result-row" key={entry.id}>
            <div className="source">
              <span>原文</span>
              <strong>{entry.source}</strong>
            </div>
            <div className="target">
              <span>译文</span>
              <strong>{entry.target}</strong>
            </div>
            <div className="meta">
              <span>{entry.mode}</span>
              <span className={entry.engine === "sqlite-cache" ? "cache-hit" : ""}>
                {entry.engine === "sqlite-cache" ? "缓存命中" : entry.engine}
              </span>
              <span>{entry.time}</span>
            </div>
          </div>
        ))}
      </section>
    </section>
  );
}
