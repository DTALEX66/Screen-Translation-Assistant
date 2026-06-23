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
  return (
    <section className="content">
      <p className="eyebrow">翻译历史</p>
      <h1>翻译历史</h1>
      <p className="lead">浏览所有翻译记录和按模式筛选。</p>
      <div className="actions">
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
      </div>
      <section className="result-panel">
        <div className="panel-header">
          <h2>共 {filteredHistory.length} 条记录</h2>
          <button
            onClick={onExportCSV}
            style={{
              border: "1px solid rgba(20,33,51,0.2)",
              borderRadius: 10,
              padding: "8px 14px",
              background: "white",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            导出 CSV
          </button>
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
                {entry.engine === "sqlite-cache" ? "⚡ 缓存命中" : entry.engine}
              </span>
              <span>{entry.time}</span>
            </div>
          </div>
        ))}
      </section>
    </section>
  );
}
