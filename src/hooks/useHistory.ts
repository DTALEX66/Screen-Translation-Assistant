import { useState, useMemo, useCallback } from "react";

export interface HistoryEntry {
  id: number;
  source: string;
  target: string;
  mode: string;
  engine: string;
  time: string;
}

export interface UseHistoryOptions {
  onToast?: (message: string) => void;
}

export function useHistory(entries: HistoryEntry[], options?: UseHistoryOptions) {
  const [historySearch, setHistorySearch] = useState("");
  const [historyFilter, setHistoryFilter] = useState("all");

  const filteredHistory = useMemo(() => {
    return entries.filter((entry) => {
      if (historyFilter !== "all" && entry.mode !== historyFilter) {
        return false;
      }
      if (historySearch) {
        const keyword = historySearch.toLowerCase();
        const matchSource = entry.source.toLowerCase().includes(keyword);
        const matchTarget = entry.target.includes(historySearch);
        if (!matchSource && !matchTarget) {
          return false;
        }
      }
      return true;
    });
  }, [entries, historySearch, historyFilter]);

  const handleExportCSV = useCallback(() => {
    const header = "source,target,mode,engine,time";
    const rows = filteredHistory.map((entry) => {
      return [entry.source, entry.target, entry.mode, entry.engine, entry.time].join(",");
    });
    const csv = header + "\n" + rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(blob);
    anchor.download = "screenlingua-history.csv";
    anchor.click();
    options?.onToast?.("已导出 CSV");
  }, [filteredHistory, options?.onToast]);

  const handleClearFilter = useCallback(() => {
    setHistorySearch("");
    setHistoryFilter("all");
  }, []);

  return {
    historySearch,
    historyFilter,
    filteredHistory,
    setHistorySearch,
    setHistoryFilter,
    handleExportCSV,
    handleClearFilter,
  };
}
