"""SQLite storage. Raw rows hold no free text, no device identifier and no time finer than the hour."""
from __future__ import annotations

import sqlite3
import threading
from pathlib import Path

from .regions import CATEGORIES, LESSON, REGIONS

SCHEMA = """
CREATE TABLE IF NOT EXISTS scam_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_hour TEXT NOT NULL,          -- UTC, truncated to the hour
  scam_category TEXT NOT NULL,
  channel TEXT NOT NULL,
  region_code TEXT NOT NULL,
  risk_band TEXT NOT NULL,
  source TEXT NOT NULL,                -- 'app' or 'seed' (demo data is always labelled)
  client_batch_id TEXT NOT NULL UNIQUE -- makes retries idempotent
);
CREATE TABLE IF NOT EXISTS region_lookup (region_code TEXT PRIMARY KEY, name_en TEXT, name_hi TEXT, parent_region TEXT, display_order INTEGER);
CREATE TABLE IF NOT EXISTS scam_categories (category_code TEXT PRIMARY KEY, linked_lesson TEXT);
CREATE TABLE IF NOT EXISTS daily_aggregates (
  date TEXT NOT NULL, region_code TEXT NOT NULL, scam_category TEXT NOT NULL, channel TEXT NOT NULL, source TEXT NOT NULL,
  report_count INTEGER NOT NULL, PRIMARY KEY (date, region_code, scam_category, channel, source)
);
CREATE TABLE IF NOT EXISTS alert_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT, created_at TEXT NOT NULL,
  title_en TEXT NOT NULL, title_hi TEXT NOT NULL, title_cg TEXT NOT NULL,
  summary_en TEXT NOT NULL, summary_hi TEXT NOT NULL, summary_cg TEXT NOT NULL,
  scam_category TEXT NOT NULL, region_scope TEXT NOT NULL, expires_at TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1, source_note TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS rate_limit_log (hashed_token TEXT NOT NULL, window_start TEXT NOT NULL, count INTEGER NOT NULL, PRIMARY KEY (hashed_token, window_start));
CREATE INDEX IF NOT EXISTS idx_agg_date ON daily_aggregates(date);
"""


class Database:
    def __init__(self, path: str | Path):
        if str(path) != ":memory:":
            Path(path).parent.mkdir(parents=True, exist_ok=True)
        self.conn = sqlite3.connect(str(path), check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self.lock = threading.RLock()
        with self.lock:
            self.conn.executescript(SCHEMA)
            self.conn.executemany("INSERT OR IGNORE INTO region_lookup VALUES (?,?,?,?,?)", [(c, en, hi, "chhattisgarh", i) for i, (c, en, hi) in enumerate(REGIONS)])
            self.conn.executemany("INSERT OR IGNORE INTO scam_categories VALUES (?,?)", [(c, LESSON[c]) for c in CATEGORIES])
            self.conn.commit()

    def query(self, sql: str, params: tuple = ()):
        with self.lock:
            return [dict(r) for r in self.conn.execute(sql, params).fetchall()]

    def execute(self, sql: str, params: tuple = ()):
        with self.lock:
            cur = self.conn.execute(sql, params)
            self.conn.commit()
            return cur
