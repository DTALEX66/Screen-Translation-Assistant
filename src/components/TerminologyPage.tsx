export interface TermEntry {
  source: string;
  target: string;
}

interface TerminologyPageProps {
  terms: TermEntry[];
}

export function TerminologyPage({ terms }: TerminologyPageProps) {
  return (
    <section className="content">
      <p className="eyebrow">专业术语</p>
      <h1>术语库</h1>
      <p className="lead">管理专业术语映射，确保翻译一致性。</p>
      <section className="result-panel">
        <div className="panel-header">
          <h2>共 {terms.length} 条术语</h2>
        </div>
        {terms.map((term, index) => (
          <div className="result-row" key={index}>
            <div className="source">
              <span>原文</span>
              <strong>{term.source}</strong>
            </div>
            <div className="target">
              <span>译法</span>
              <strong>{term.target}</strong>
            </div>
            <div className="meta">
              <span>通用领域</span>
            </div>
          </div>
        ))}
      </section>
    </section>
  );
}
