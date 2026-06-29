import { useCallback, useEffect, useMemo, useState } from 'react';

export interface SidecarCacheStatus {
  ocr: number;
  translation: number;
  ocr_max: number;
  translation_max: number;
}

export interface SidecarHealth {
  ok: boolean;
  version: string;
  mode: string;
  ocr: {
    provider: string;
    rapidocr_available: boolean;
  };
  translation: {
    provider: string;
    argos_available: boolean;
  };
  glossary: {
    terms: number;
    brand_replacements: number;
    error: string | null;
  };
  cache: SidecarCacheStatus;
}

export interface SidecarStatusState {
  health: SidecarHealth | null;
  loading: boolean;
  clearing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  clearCache: () => Promise<boolean>;
}

export function useSidecarStatus(): SidecarStatusState {
  const [health, setHealth] = useState<SidecarHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('http://127.0.0.1:8765/health', {
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) {
        throw new Error('sidecar health failed: ' + response.status);
      }
      const data = (await response.json()) as SidecarHealth;
      setHealth(data);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'sidecar health failed');
    } finally {
      setLoading(false);
    }
  }, []);

  const clearCache = useCallback(async () => {
    setClearing(true);
    try {
      const response = await fetch('http://127.0.0.1:8765/cache/clear', {
        method: 'POST',
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) {
        throw new Error('cache clear failed: ' + response.status);
      }
      await refresh();
      return true;
    } catch (clearError) {
      setError(clearError instanceof Error ? clearError.message : 'cache clear failed');
      return false;
    } finally {
      setClearing(false);
    }
  }, [refresh]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return useMemo(
    () => ({
      health,
      loading,
      clearing,
      error,
      refresh,
      clearCache,
    }),
    [health, loading, clearing, error, refresh, clearCache],
  );
}
