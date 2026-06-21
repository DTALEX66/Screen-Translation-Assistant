use rusqlite::{params, Connection, Result};
use std::fs;
use std::path::PathBuf;

pub struct TranslationCache {
    conn: Connection,
}

impl TranslationCache {
    pub fn open_default() -> Result<Self> {
        let path = default_db_path();
        if let Some(parent) = path.parent() {
            let _ = fs::create_dir_all(parent);
        }
        let conn = Connection::open(path)?;
        let cache = Self { conn };
        cache.init()?;
        Ok(cache)
    }

    fn init(&self) -> Result<()> {
        self.conn.execute_batch(
            r#"
            CREATE TABLE IF NOT EXISTS translation_cache (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              source_text TEXT NOT NULL,
              target_language TEXT NOT NULL,
              target_text TEXT NOT NULL,
              engine TEXT NOT NULL,
              hit_count INTEGER NOT NULL DEFAULT 0,
              created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
              updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
              UNIQUE(source_text, target_language)
            );
            "#,
        )?;
        Ok(())
    }

    pub fn lookup(&self, source_text: &str, target_language: &str) -> Result<Option<String>> {
        let mut stmt = self.conn.prepare(
            "SELECT target_text FROM translation_cache WHERE source_text = ?1 AND target_language = ?2 LIMIT 1",
        )?;
        let mut rows = stmt.query(params![source_text, target_language])?;
        if let Some(row) = rows.next()? {
            let target_text: String = row.get(0)?;
            self.conn.execute(
                "UPDATE translation_cache SET hit_count = hit_count + 1, updated_at = CURRENT_TIMESTAMP WHERE source_text = ?1 AND target_language = ?2",
                params![source_text, target_language],
            )?;
            Ok(Some(target_text))
        } else {
            Ok(None)
        }
    }

    pub fn insert(&self, source_text: &str, target_language: &str, target_text: &str, engine: &str) -> Result<()> {
        self.conn.execute(
            r#"
            INSERT INTO translation_cache (source_text, target_language, target_text, engine)
            VALUES (?1, ?2, ?3, ?4)
            ON CONFLICT(source_text, target_language)
            DO UPDATE SET target_text = excluded.target_text, engine = excluded.engine, updated_at = CURRENT_TIMESTAMP
            "#,
            params![source_text, target_language, target_text, engine],
        )?;
        Ok(())
    }
}

fn default_db_path() -> PathBuf {
    if let Ok(local_app_data) = std::env::var("LOCALAPPDATA") {
        return PathBuf::from(local_app_data).join("ScreenLingua").join("screenlingua.db");
    }
    PathBuf::from("screenlingua.db")
}
