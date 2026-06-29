import { useCallback, useEffect, useMemo, useState } from 'react';
import type { TermEntry } from '../components';

export interface GlossaryState {
  terms: TermEntry[];
  brandReplacements: TermEntry[];
  path: string;
  loading: boolean;
  saving: boolean;
  error: string | null;
  source: 'sidecar' | 'fallback';
  reload: () => void;
  save: (terms: TermEntry[], brandReplacements: TermEntry[]) => Promise<boolean>;
}

const fallbackTerms: TermEntry[] = [
  { source: 'Render Settings', target: '渲染设置' },
  { source: 'Subdivision Surface', target: '细分曲面' },
  { source: 'Permission Denied', target: '权限被拒绝' },
  { source: 'Prompt Engineering', target: '提示词工程' },
  { source: 'Home', target: '首页' },
  { source: 'Feed', target: '动态' },
  { source: 'Pullrequests', target: '拉取请求' },
  { source: 'Vscode', target: 'VS Code' },
  { source: 'Mock+Cache', target: 'Mock + 缓存' },
  { source: 'F-Droid', target: 'F-Droid' },
];

interface GlossaryApiResponse {
  ok: boolean;
  path?: string;
  terms?: TermEntry[];
  brand_replacements?: TermEntry[];
  error?: string | null;
}

function normalizeEntries(entries: TermEntry[] | undefined): TermEntry[] {
  if (!Array.isArray(entries)) {
    return [];
  }
  return entries.filter((entry) => entry.source && entry.target);
}

export function useGlossary(): GlossaryState {
  const [terms, setTerms] = useState<TermEntry[]>(fallbackTerms);
  const [brandReplacements, setBrandReplacements] = useState<TermEntry[]>([]);
  const [path, setPath] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'sidecar' | 'fallback'>('fallback');
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => {
    setReloadToken((value) => value + 1);
  }, []);

  const applyResponse = useCallback((data: GlossaryApiResponse) => {
    if (!data.ok) {
      throw new Error(data.error || 'glossary is unavailable');
    }

    const loadedTerms = normalizeEntries(data.terms);
    const loadedReplacements = normalizeEntries(data.brand_replacements);
    if (!loadedTerms.length) {
      throw new Error('glossary returned no terms');
    }

    setTerms(loadedTerms);
    setBrandReplacements(loadedReplacements);
    setPath(data.path || '');
    setSource('sidecar');
    setError(null);
  }, []);

  const save = useCallback(async (nextTerms: TermEntry[], nextBrandReplacements: TermEntry[]) => {
    setSaving(true);
    try {
      const response = await fetch('http://127.0.0.1:8765/glossary', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          terms: nextTerms,
          brand_replacements: nextBrandReplacements,
        }),
      });
      const data = (await response.json()) as GlossaryApiResponse;
      if (!response.ok) {
        throw new Error(data.error || 'glossary save failed: ' + response.status);
      }
      applyResponse(data);
      return true;
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'glossary save failed');
      return false;
    } finally {
      setSaving(false);
    }
  }, [applyResponse]);

  useEffect(() => {
    let cancelled = false;

    async function loadGlossary() {
      setLoading(true);
      try {
        const response = await fetch('http://127.0.0.1:8765/glossary', {
          headers: { Accept: 'application/json' },
        });
        if (!response.ok) {
          throw new Error('glossary request failed: ' + response.status);
        }

        const data = (await response.json()) as GlossaryApiResponse;
        if (!cancelled) {
          applyResponse(data);
        }
      } catch (loadError) {
        if (!cancelled) {
          setTerms(fallbackTerms);
          setBrandReplacements([]);
          setPath('');
          setSource('fallback');
          setError(loadError instanceof Error ? loadError.message : 'glossary request failed');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadGlossary();

    return () => {
      cancelled = true;
    };
  }, [applyResponse, reloadToken]);

  return useMemo(
    () => ({
      terms,
      brandReplacements,
      path,
      loading,
      saving,
      error,
      source,
      reload,
      save,
    }),
    [terms, brandReplacements, path, loading, saving, error, source, reload, save],
  );
}
