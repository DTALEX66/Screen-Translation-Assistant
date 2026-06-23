import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { DiagnosticsSnapshot } from "../types";

async function callDiagnostics(): Promise<DiagnosticsSnapshot> {
  try {
    return await invoke("get_diagnostics_snapshot");
  } catch {
    return {
      ok: true,
      ocrStatus: "browser-fallback",
      databaseStatus: "not-connected",
      privacyMode: true,
      screenCount: 1,
      recentEvents: [
        {
          timestamp: new Date().toISOString(),
          level: "INFO",
          event: "prototype",
          message: "Fallback",
        },
      ],
    };
  }
}

export function useDiagnostics() {
  const [diagnostics, setDiagnostics] = useState<DiagnosticsSnapshot | null>(null);

  const handleDiagnostics = useCallback(async () => {
    setDiagnostics(await callDiagnostics());
  }, []);

  return {
    diagnostics,
    handleDiagnostics,
  };
}
