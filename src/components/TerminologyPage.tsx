import { useEffect, useMemo, useState } from 'react';

export interface TermEntry {
  source: string;
  target: string;
}

interface TerminologyPageProps {
  terms: TermEntry[];
  brandReplacements: TermEntry[];
  path: string;
  loading: boolean;
  saving: boolean;
  error: string | null;
  source: 'sidecar' | 'fallback';
  onReload: () => void;
  onSave: (terms: TermEntry[], brandReplacements: TermEntry[]) => Promise<boolean>;
}

function entriesEqual(left: TermEntry[], right: TermEntry[]) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function validateEntries(entries: TermEntry[], label: string) {
  const seen = new Set<string>();
  for (let index = 0; index < entries.length; index += 1) {
    const source = entries[index].source.trim();
    const target = entries[index].target.trim();
    if (!source || !target) {
      return `${label}第 ${index + 1} 行需要同时填写原文和译法。`;
    }
    if (seen.has(source)) {
      return `${label}存在重复原文：${source}`;
    }
    seen.add(source);
  }
  return null;
}

export function TerminologyPage({
  terms,
  brandReplacements,
  path,
  loading,
  saving,
  error,
  source,
  onReload,
  onSave,
}: TerminologyPageProps) {
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<'terms' | 'brand'>('terms');
  const [draftTerms, setDraftTerms] = useState<TermEntry[]>(terms);
  const [draftBrandReplacements, setDraftBrandReplacements] = useState<TermEntry[]>(brandReplacements);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    setDraftTerms(terms);
    setDraftBrandReplacements(brandReplacements);
    setLocalError(null);
  }, [terms, brandReplacements]);

  function handleKindChange(nextKind: 'terms' | 'brand') {
    setKind(nextKind);
    setQuery('');
    setLocalError(null);
  }

  const entries = kind === 'terms' ? draftTerms : draftBrandReplacements;
  const filteredEntries = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return entries
      .map((term, index) => ({ term, index }))
      .filter(({ term }) => {
        if (!normalizedQuery) {
          return true;
        }
        return (
          term.source.toLowerCase().includes(normalizedQuery) ||
          term.target.toLowerCase().includes(normalizedQuery)
        );
      });
  }, [entries, query]);

  const hasChanges = (
    !entriesEqual(draftTerms, terms) ||
    !entriesEqual(draftBrandReplacements, brandReplacements)
  );
  const validationError = (
    validateEntries(draftTerms, '术语') ||
    validateEntries(draftBrandReplacements, '品牌替换')
  );

  function updateEntry(index: number, field: keyof TermEntry, value: string) {
    const setEntries = kind === 'terms' ? setDraftTerms : setDraftBrandReplacements;
    setEntries((previous) => previous.map((entry, itemIndex) => (
      itemIndex === index ? { ...entry, [field]: value } : entry
    )));
    setLocalError(null);
  }

  function addEntry() {
    const setEntries = kind === 'terms' ? setDraftTerms : setDraftBrandReplacements;
    setEntries((previous) => [...previous, { source: '', target: '' }]);
    setQuery('');
    setLocalError(null);
  }

  function deleteEntry(index: number) {
    const setEntries = kind === 'terms' ? setDraftTerms : setDraftBrandReplacements;
    setEntries((previous) => previous.filter((_, itemIndex) => itemIndex !== index));
    setLocalError(null);
  }

  async function handleSave() {
    if (validationError) {
      setLocalError(validationError);
      return;
    }
    const saved = await onSave(draftTerms, draftBrandReplacements);
    if (saved) {
      setLocalError(null);
    }
  }

  function handleReload() {
    setLocalError(null);
    onReload();
  }

  const activeCount = kind === 'terms' ? draftTerms.length : draftBrandReplacements.length;
  const visibleError = localError || error;

  return (
    <section className="content">
      <p className="eyebrow">专业术语</p>
      <h1>术语库</h1>
      <p className="lead">管理专业术语映射，确保本地 OCR 翻译结果一致。</p>

      <section className="term-summary">
        <article>
          <span>术语</span>
          <strong>{draftTerms.length}</strong>
        </article>
        <article>
          <span>品牌替换</span>
          <strong>{draftBrandReplacements.length}</strong>
        </article>
        <article>
          <span>来源</span>
          <strong>{source === 'sidecar' ? 'Sidecar' : 'Fallback'}</strong>
        </article>
      </section>

      <section className="result-panel">
        <div className="panel-header">
          <div>
            <h2>{kind === 'terms' ? '术语映射' : '品牌替换'}</h2>
            <span>{path || '本地兜底词库'}</span>
          </div>
          <div className="panel-actions">
            <button type="button" onClick={handleReload} disabled={loading || saving}>
              {loading ? '刷新中' : '刷新'}
            </button>
            <button
              type="button"
              className="primary"
              onClick={handleSave}
              disabled={!hasChanges || saving || loading}
            >
              {saving ? '保存中' : '保存'}
            </button>
          </div>
        </div>

        <div className="term-toolbar">
          <div className="segmented">
            <button
              type="button"
              className={kind === 'terms' ? 'active' : ''}
              onClick={() => handleKindChange('terms')}
            >
              术语
            </button>
            <button
              type="button"
              className={kind === 'brand' ? 'active' : ''}
              onClick={() => handleKindChange('brand')}
            >
              品牌替换
            </button>
          </div>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索原文或译法"
          />
          <button type="button" className="add-term-button" onClick={addEntry}>
            新增{kind === 'terms' ? '术语' : '替换'}
          </button>
        </div>

        {visibleError && <div className="inline-warning">{visibleError}</div>}

        {!filteredEntries.length && <div className="empty">没有匹配的术语</div>}

        {filteredEntries.map(({ term, index }) => (
          <div className="result-row editable" key={`${kind}-${term.source}-${index}`}>
            <label className="source">
              <span>原文</span>
              <input
                className="term-input"
                value={term.source}
                onChange={(event) => updateEntry(index, 'source', event.target.value)}
                placeholder="原文"
              />
            </label>
            <label className="target">
              <span>{kind === 'terms' ? '译法' : '替换为'}</span>
              <input
                className="term-input"
                value={term.target}
                onChange={(event) => updateEntry(index, 'target', event.target.value)}
                placeholder={kind === 'terms' ? '译法' : '替换为'}
              />
            </label>
            <div className="meta term-row-actions">
              <span>{kind === 'terms' ? '本地术语' : '译后修正'}</span>
              <button
                type="button"
                className="danger"
                onClick={() => deleteEntry(index)}
                disabled={activeCount <= 1}
              >
                删除
              </button>
            </div>
          </div>
        ))}
      </section>
    </section>
  );
}
