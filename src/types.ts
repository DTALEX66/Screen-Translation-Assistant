export interface TranslationBlock {
  sourceText: string;
  targetText: string;
  bbox: [number, number, number, number];
  confidence: number;
  fromCache: boolean;
  engine: string;
}

export interface TranslateResponse {
  ok: boolean;
  mode: string;
  elapsedMs: number;
  blocks: TranslationBlock[];
  error?: string | null;
}

export interface DiagnosticEvent {
  timestamp: string;
  level: string;
  event: string;
  message: string;
  elapsedMs?: number | null;
}

export interface DiagnosticsSnapshot {
  ok: boolean;
  ocrStatus: string;
  databaseStatus: string;
  privacyMode: boolean;
  screenCount: number;
  recentEvents: DiagnosticEvent[];
}
