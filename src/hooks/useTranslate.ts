import { useMemo, useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { TranslateResponse } from "../types";
import {
  fallbackMockResponse,
  getMockResponse,
  resetMockCache,
  getMockScenes,
} from "../mock";

const scenes = getMockScenes();

async function callSimulate(sceneName?: string): Promise<TranslateResponse> {
  try {
    return await invoke("simulate_region_translate", {
      request: { mode: "mock", targetLanguage: "zh-CN" },
    });
  } catch {
    return getMockResponse(sceneName);
  }
}

export interface UseTranslateOptions {
  onToast?: (message: string) => void;
}

export function useTranslate(options?: UseTranslateOptions) {
  const [result, setResult] = useState<TranslateResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMode, setErrorMode] = useState(false);
  const [translateCount, setTranslateCount] = useState(0);
  const [totalWords, setTotalWords] = useState(0);
  const [cacheHits, setCacheHits] = useState(0);
  const [sceneIndex, setSceneIndex] = useState(0);

  const summary = useMemo(() => {
    if (!result) {
      return "等待翻译任务";
    }
    if (!result.ok) {
      return "翻译失败";
    }
    const cacheCount = result.blocks.filter((b) => b.fromCache).length;
    const countText = result.blocks.length + " 条 · " + result.elapsedMs + "ms";
    const cacheText = cacheCount > 0 ? " · " + cacheCount + " 缓存" : "";
    return countText + cacheText;
  }, [result]);

  const handleTranslate = useCallback(async () => {
    if (errorMode) {
      setResult({
        ok: false,
        mode: "error",
        elapsedMs: 0,
        blocks: [],
        error: "SL-OCR-001: OCR 服务未启动",
      });
      return;
    }
    setLoading(true);
    try {
      const response = await callSimulate(scenes[sceneIndex]);
      setResult(response);
      setTranslateCount((count) => count + 1);
      setTotalWords((words) => {
        if (!response.blocks) {
          return words;
        }
        const added = response.blocks.reduce((sum, block) => {
          return sum + block.sourceText.length;
        }, 0);
        return words + added;
      });
      setCacheHits((hits) => {
        if (!response.blocks) {
          return hits;
        }
        const added = response.blocks.filter((block) => block.fromCache).length;
        return hits + added;
      });
    } finally {
      setLoading(false);
    }
  }, [errorMode, sceneIndex]);

  const handleNextScene = useCallback(() => {
    setSceneIndex((index) => (index + 1) % scenes.length);
    setResult(null);
  }, []);

  const handleToggleErrorMode = useCallback(() => {
    setErrorMode((previous) => !previous);
    setResult(null);
  }, []);

  const handleClearCache = useCallback(() => {
    resetMockCache();
    options?.onToast?.("缓存已清除");
  }, [options?.onToast]);

  const handleCloseError = useCallback(() => {
    setErrorMode(false);
    setResult(null);
  }, []);

  return {
    result,
    loading,
    errorMode,
    translateCount,
    totalWords,
    cacheHits,
    sceneIndex,
    scenes,
    summary,
    handleTranslate,
    handleNextScene,
    handleToggleErrorMode,
    handleClearCache,
    handleCloseError,
  };
}
