CREATE TABLE IF NOT EXISTS translation_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_text TEXT NOT NULL,
  source_language TEXT DEFAULT 'auto',
  target_language TEXT NOT NULL,
  target_text TEXT NOT NULL,
  engine TEXT NOT NULL,
  domain TEXT DEFAULT 'general',
  hit_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(source_text, target_language, domain)
);

CREATE TABLE IF NOT EXISTS terminology (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_term TEXT NOT NULL,
  target_term TEXT NOT NULL,
  domain TEXT NOT NULL DEFAULT 'general',
  note TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(source_term, domain)
);

CREATE TABLE IF NOT EXISTS translate_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  app_name TEXT,
  window_title TEXT,
  mode TEXT NOT NULL,
  source_text TEXT NOT NULL,
  target_text TEXT NOT NULL,
  bbox_json TEXT,
  engine TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS app_blacklist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  app_name TEXT NOT NULL UNIQUE,
  reason TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS diagnostics_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    level TEXT NOT NULL,
    event TEXT NOT NULL,
    message TEXT NOT NULL,
    task_id TEXT,
    elapsed_ms INTEGER,
    app_name TEXT,
    debug_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_diagnostics_events_timestamp ON diagnostics_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_diagnostics_events_event ON diagnostics_events(event);
