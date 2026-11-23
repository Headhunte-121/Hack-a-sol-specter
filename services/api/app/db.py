"""Database abstraction supporting both SQLite and PostgreSQL.

Dialect differences (placeholders, date math, identity, upserts) are fully encapsulated.
SQLite is used for local runs and in-memory tests.
PostgreSQL (psycopg 3) is used for production / Supabase.
Serverless rule: PostgreSQL opens short-lived connections per request, prepare_threshold=None,
and does no DDL or connection at module import time.
"""
from __future__ import annotations

import os
import sqlite3
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Protocol, runtime_checkable

from .regions import CATEGORIES, LESSON, REGIONS

SQLITE_SCHEMA = """
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


@runtime_checkable
class Database(Protocol):
    """Database interface implemented by both SqliteDatabase and PostgresDatabase."""

    def record_rate_limit(self, hashed_token: str, window_start: str, n: int, limit: int) -> bool:
        """Returns True if within rate limit and updated; False if limit exceeded."""
        ...

    def insert_report(self, created_hour: str, scam_category: str, channel: str, region_code: str,
                      risk_band: str, source: str, client_batch_id: str, date_str: str) -> str:
        """Inserts a single report and updates daily aggregates atomically. Returns 'accepted' or 'duplicate'."""
        ...

    def query_trends(self, group: str, region: str | None, category: str | None, channel: str | None,
                     start: str, end: str, demo: bool) -> list[dict]:
        """Returns aggregated trends grouped by week (Monday) or region."""
        ...

    def query_window_counts(self, region: str | None, start: str, end: str, demo: bool) -> dict[str, int]:
        """Returns scam_category -> count for the given window."""
        ...

    def has_seed_data(self, region: str | None, category: str | None, channel: str | None, start: str, end: str) -> bool:
        """Returns True if any aggregate in the range has source='seed'."""
        ...

    def get_regions(self) -> list[dict]: ...
    def get_categories(self) -> list[dict]: ...
    def get_alerts(self, today_str: str, region: str | None = None) -> list[dict]: ...
    def create_alert(self, created_at: str, title_en: str, title_hi: str, title_cg: str,
                     summary_en: str, summary_hi: str, summary_cg: str, scam_category: str,
                     region_scope: str, expires_at: str, source_note: str) -> None: ...

    def export_aggregates(self, start: str, end: str) -> list[dict]: ...
    def purge_expired(self, rate_limit_before: str, raw_reports_before: str) -> dict[str, int]: ...
    def seed_report(self, created_hour: str, scam_category: str, channel: str, region_code: str,
                    risk_band: str, client_batch_id: str, date_str: str) -> bool: ...
    def seed_reports_batch(self, items: list[tuple[str, str, str, str, str, str, str]]) -> int: ...

    def query(self, sql: str, params: tuple = ()) -> list[dict]: ...
    def execute(self, sql: str, params: tuple = ()) -> Any: ...
    def close(self) -> None: ...


class SqliteDatabase:
    """SQLite implementation for local development and in-memory unit tests."""

    def __init__(self, path: str | Path):
        self.path = str(path)
        if self.path != ":memory:":
            Path(self.path).parent.mkdir(parents=True, exist_ok=True)
        self.conn = sqlite3.connect(self.path, check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self.lock = threading.RLock()
        with self.lock:
            self.conn.executescript(SQLITE_SCHEMA)
            self.conn.executemany("INSERT OR IGNORE INTO region_lookup VALUES (?,?,?,?,?)",
                                  [(c, en, hi, "chhattisgarh", i) for i, (c, en, hi) in enumerate(REGIONS)])
            self.conn.executemany("INSERT OR IGNORE INTO scam_categories VALUES (?,?)",
                                  [(c, LESSON[c]) for c in CATEGORIES])
            self.conn.commit()

    def query(self, sql: str, params: tuple = ()) -> list[dict]:
        with self.lock:
            return [dict(r) for r in self.conn.execute(sql, params).fetchall()]

    def execute(self, sql: str, params: tuple = ()) -> Any:
        with self.lock:
            cur = self.conn.execute(sql, params)
            self.conn.commit()
            return cur

    def record_rate_limit(self, hashed_token: str, window_start: str, n: int, limit: int) -> bool:
        with self.lock:
            cur = self.conn.execute("SELECT count FROM rate_limit_log WHERE hashed_token=? AND window_start=?", (hashed_token, window_start))
            row = cur.fetchone()
            used = row["count"] if row else 0
            if used + n > limit:
                return False
            self.conn.execute(
                "INSERT INTO rate_limit_log (hashed_token, window_start, count) VALUES (?,?,?) "
                "ON CONFLICT(hashed_token, window_start) DO UPDATE SET count = count + ?",
                (hashed_token, window_start, n, n)
            )
            self.conn.commit()
            return True

    def insert_report(self, created_hour: str, scam_category: str, channel: str, region_code: str,
                      risk_band: str, source: str, client_batch_id: str, date_str: str) -> str:
        with self.lock:
            cur = self.conn.execute("SELECT 1 FROM scam_reports WHERE client_batch_id=?", (client_batch_id,))
            if cur.fetchone():
                return "duplicate"
            self.conn.execute(
                "INSERT INTO scam_reports (created_hour, scam_category, channel, region_code, risk_band, source, client_batch_id) VALUES (?,?,?,?,?,?,?)",
                (created_hour, scam_category, channel, region_code, risk_band, source, client_batch_id)
            )
            self.conn.execute(
                "INSERT INTO daily_aggregates (date, region_code, scam_category, channel, source, report_count) VALUES (?,?,?,?,?,1) "
                "ON CONFLICT(date, region_code, scam_category, channel, source) DO UPDATE SET report_count = daily_aggregates.report_count + 1",
                (date_str, region_code, scam_category, channel, source)
            )
            self.conn.commit()
            return "accepted"

    def query_trends(self, group: str, region: str | None, category: str | None, channel: str | None,
                     start: str, end: str, demo: bool) -> list[dict]:
        where = ["date >= ?", "date <= ?"]
        params: list[Any] = [start, end]
        if not demo:
            where.append("source <> 'seed'")
        if region:
            where.append("region_code = ?"); params.append(region)
        if category:
            where.append("scam_category = ?"); params.append(category)
        if channel:
            where.append("channel = ?"); params.append(channel)
        where_clause = " AND ".join(where)

        if group == "week":
            sql = (f"SELECT date(date, '-6 days', 'weekday 1') AS week_start, scam_category, SUM(report_count) AS report_count "
                   f"FROM daily_aggregates WHERE {where_clause} GROUP BY week_start, scam_category ORDER BY week_start")
        else:
            sql = (f"SELECT region_code, scam_category, SUM(report_count) AS report_count "
                   f"FROM daily_aggregates WHERE {where_clause} GROUP BY region_code, scam_category ORDER BY region_code")
        return self.query(sql, tuple(params))

    def query_window_counts(self, region: str | None, start: str, end: str, demo: bool) -> dict[str, int]:
        where = ["date >= ?", "date <= ?"]
        params: list[Any] = [start, end]
        if not demo:
            where.append("source <> 'seed'")
        if region:
            where.append("region_code = ?"); params.append(region)
        where_clause = " AND ".join(where)
        sql = f"SELECT scam_category, SUM(report_count) AS n FROM daily_aggregates WHERE {where_clause} GROUP BY scam_category"
        rows = self.query(sql, tuple(params))
        return {r["scam_category"]: r["n"] for r in rows}

    def has_seed_data(self, region: str | None, category: str | None, channel: str | None, start: str, end: str) -> bool:
        where = ["date >= ?", "date <= ?", "source = 'seed'"]
        params: list[Any] = [start, end]
        if region:
            where.append("region_code = ?"); params.append(region)
        if category:
            where.append("scam_category = ?"); params.append(category)
        if channel:
            where.append("channel = ?"); params.append(channel)
        sql = f"SELECT 1 FROM daily_aggregates WHERE {' AND '.join(where)} LIMIT 1"
        return bool(self.query(sql, tuple(params)))

    def get_regions(self) -> list[dict]:
        return self.query("SELECT region_code, name_en, name_hi, parent_region, display_order FROM region_lookup ORDER BY name_en")

    def get_categories(self) -> list[dict]:
        return self.query("SELECT category_code, linked_lesson FROM scam_categories ORDER BY category_code")

    def get_alerts(self, today_str: str, region: str | None = None) -> list[dict]:
        rows = self.query("SELECT * FROM alert_items WHERE active=1 AND expires_at >= ? ORDER BY created_at DESC", (today_str,))
        if region:
            rows = [r for r in rows if r["region_scope"] in ("all", region)]
        return rows

    def create_alert(self, created_at: str, title_en: str, title_hi: str, title_cg: str,
                     summary_en: str, summary_hi: str, summary_cg: str, scam_category: str,
                     region_scope: str, expires_at: str, source_note: str) -> None:
        self.execute(
            "INSERT INTO alert_items (created_at, title_en, title_hi, title_cg, summary_en, summary_hi, summary_cg, scam_category, region_scope, expires_at, active, source_note) VALUES (?,?,?,?,?,?,?,?,?,?,1,?)",
            (created_at, title_en, title_hi, title_cg, summary_en, summary_hi, summary_cg, scam_category, region_scope, expires_at, source_note)
        )

    def export_aggregates(self, start: str, end: str) -> list[dict]:
        sql = ("SELECT date(date, '-6 days', 'weekday 1') AS week_start, region_code, scam_category, "
               "SUM(report_count) AS report_count, MAX(source='seed') AS includes_seed "
               "FROM daily_aggregates WHERE date >= ? AND date <= ? GROUP BY week_start, region_code, scam_category")
        return self.query(sql, (start, end))

    def purge_expired(self, rate_limit_before: str, raw_reports_before: str) -> dict[str, int]:
        with self.lock:
            rl = self.conn.execute("DELETE FROM rate_limit_log WHERE window_start < ?", (rate_limit_before,)).rowcount
            raw = self.conn.execute("DELETE FROM scam_reports WHERE source='app' AND created_hour < ?", (raw_reports_before,)).rowcount
            self.conn.commit()
            return {"rate_limit_rows_deleted": rl, "raw_rows_deleted": raw}

    def seed_report(self, created_hour: str, scam_category: str, channel: str, region_code: str,
                    risk_band: str, client_batch_id: str, date_str: str) -> bool:
        with self.lock:
            cur = self.conn.execute(
                "INSERT OR IGNORE INTO scam_reports (created_hour, scam_category, channel, region_code, risk_band, source, client_batch_id) VALUES (?,?,?,?,?,'seed',?)",
                (created_hour, scam_category, channel, region_code, risk_band, client_batch_id)
            )
            if cur.rowcount > 0:
                self.conn.execute(
                    "INSERT INTO daily_aggregates VALUES (?,?,?,?, 'seed', 1) "
                    "ON CONFLICT(date, region_code, scam_category, channel, source) DO UPDATE SET report_count = report_count + 1",
                    (date_str, region_code, scam_category, channel)
                )
                self.conn.commit()
                return True
            return False

    def seed_reports_batch(self, items: list[tuple[str, str, str, str, str, str, str]]) -> int:
        with self.lock:
            scam_rows = [(r[0], r[1], r[2], r[3], r[4], 'seed', r[5]) for r in items]
            self.conn.executemany(
                "INSERT OR IGNORE INTO scam_reports (created_hour, scam_category, channel, region_code, risk_band, source, client_batch_id) VALUES (?,?,?,?,?,?,?)",
                scam_rows
            )
            agg_counts: dict[tuple[str, str, str, str, str], int] = {}
            for r in items:
                k = (r[6], r[3], r[1], r[2], 'seed')
                agg_counts[k] = agg_counts.get(k, 0) + 1
            agg_rows = [(k[0], k[1], k[2], k[3], k[4], cnt, cnt) for k, cnt in agg_counts.items()]
            self.conn.executemany(
                "INSERT INTO daily_aggregates VALUES (?,?,?,?,?,?) ON CONFLICT(date, region_code, scam_category, channel, source) DO UPDATE SET report_count = report_count + ?",
                agg_rows
            )
            self.conn.commit()
            return len(items)

    def close(self) -> None:
        with self.lock:
            self.conn.close()


class PostgresDatabase:
    """PostgreSQL implementation using psycopg 3.

    Serverless safe:
    - Opens connections per request with prepare_threshold=None (required for Supavisor transaction pooler).
    - Sensible connection and statement timeouts.
    - No global connection or DDL at import time.
    """

    def __init__(self, dsn: str):
        self.dsn = dsn

    def _connect(self):
        import psycopg
        import psycopg.rows
        # prepare_threshold=None ensures compatibility with transaction poolers (Supavisor port 6543)
        return psycopg.connect(
            self.dsn,
            prepare_threshold=None,
            connect_timeout=10,
            row_factory=psycopg.rows.dict_row
        )

    def query(self, sql: str, params: tuple = ()) -> list[dict]:
        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute(sql, params)
                return [dict(r) for r in cur.fetchall()]

    def execute(self, sql: str, params: tuple = ()) -> Any:
        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute(sql, params)
                conn.commit()
                return cur

    def record_rate_limit(self, hashed_token: str, window_start: str, n: int, limit: int) -> bool:
        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT count FROM rate_limit_log WHERE hashed_token = %s AND window_start = %s", (hashed_token, window_start))
                row = cur.fetchone()
                used = row["count"] if row else 0
                if used + n > limit:
                    return False
                cur.execute(
                    "INSERT INTO rate_limit_log (hashed_token, window_start, count) VALUES (%s, %s, %s) "
                    "ON CONFLICT (hashed_token, window_start) DO UPDATE SET count = rate_limit_log.count + EXCLUDED.count",
                    (hashed_token, window_start, n)
                )
                conn.commit()
                return True

    def insert_report(self, created_hour: str, scam_category: str, channel: str, region_code: str,
                      risk_band: str, source: str, client_batch_id: str, date_str: str) -> str:
        with self._connect() as conn:
            with conn.cursor() as cur:
                # Idempotent insert using ON CONFLICT DO NOTHING
                cur.execute(
                    "INSERT INTO scam_reports (created_hour, scam_category, channel, region_code, risk_band, source, client_batch_id) "
                    "VALUES (%s, %s, %s, %s, %s, %s, %s) ON CONFLICT (client_batch_id) DO NOTHING",
                    (created_hour, scam_category, channel, region_code, risk_band, source, client_batch_id)
                )
                if cur.rowcount == 0:
                    return "duplicate"
                cur.execute(
                    "INSERT INTO daily_aggregates (date, region_code, scam_category, channel, source, report_count) "
                    "VALUES (%s, %s, %s, %s, %s, 1) "
                    "ON CONFLICT (date, region_code, scam_category, channel, source) "
                    "DO UPDATE SET report_count = daily_aggregates.report_count + 1",
                    (date_str, region_code, scam_category, channel, source)
                )
                conn.commit()
                return "accepted"

    def query_trends(self, group: str, region: str | None, category: str | None, channel: str | None,
                     start: str, end: str, demo: bool) -> list[dict]:
        where = ["date >= %s", "date <= %s"]
        params: list[Any] = [start, end]
        if not demo:
            where.append("source <> 'seed'")
        if region:
            where.append("region_code = %s"); params.append(region)
        if category:
            where.append("scam_category = %s"); params.append(category)
        if channel:
            where.append("channel = %s"); params.append(channel)
        where_clause = " AND ".join(where)

        if group == "week":
            sql = (f"SELECT to_char(date_trunc('week', date::date), 'YYYY-MM-DD') AS week_start, scam_category, "
                   f"SUM(report_count)::int AS report_count "
                   f"FROM daily_aggregates WHERE {where_clause} GROUP BY week_start, scam_category ORDER BY week_start")
        else:
            sql = (f"SELECT region_code, scam_category, SUM(report_count)::int AS report_count "
                   f"FROM daily_aggregates WHERE {where_clause} GROUP BY region_code, scam_category ORDER BY region_code")
        return self.query(sql, tuple(params))

    def query_window_counts(self, region: str | None, start: str, end: str, demo: bool) -> dict[str, int]:
        where = ["date >= %s", "date <= %s"]
        params: list[Any] = [start, end]
        if not demo:
            where.append("source <> 'seed'")
        if region:
            where.append("region_code = %s"); params.append(region)
        where_clause = " AND ".join(where)
        sql = f"SELECT scam_category, SUM(report_count)::int AS n FROM daily_aggregates WHERE {where_clause} GROUP BY scam_category"
        rows = self.query(sql, tuple(params))
        return {r["scam_category"]: r["n"] for r in rows}

    def has_seed_data(self, region: str | None, category: str | None, channel: str | None, start: str, end: str) -> bool:
        where = ["date >= %s", "date <= %s", "source = 'seed'"]
        params: list[Any] = [start, end]
        if region:
            where.append("region_code = %s"); params.append(region)
        if category:
            where.append("scam_category = %s"); params.append(category)
        if channel:
            where.append("channel = %s"); params.append(channel)
        sql = f"SELECT 1 FROM daily_aggregates WHERE {' AND '.join(where)} LIMIT 1"
        return bool(self.query(sql, tuple(params)))

    def get_regions(self) -> list[dict]:
        return self.query("SELECT region_code, name_en, name_hi, parent_region, display_order FROM region_lookup ORDER BY name_en")

    def get_categories(self) -> list[dict]:
        return self.query("SELECT category_code, linked_lesson FROM scam_categories ORDER BY category_code")

    def get_alerts(self, today_str: str, region: str | None = None) -> list[dict]:
        rows = self.query("SELECT * FROM alert_items WHERE active=1 AND expires_at >= %s ORDER BY created_at DESC", (today_str,))
        if region:
            rows = [r for r in rows if r["region_scope"] in ("all", region)]
        return rows

    def create_alert(self, created_at: str, title_en: str, title_hi: str, title_cg: str,
                     summary_en: str, summary_hi: str, summary_cg: str, scam_category: str,
                     region_scope: str, expires_at: str, source_note: str) -> None:
        self.execute(
            "INSERT INTO alert_items (created_at, title_en, title_hi, title_cg, summary_en, summary_hi, summary_cg, scam_category, region_scope, expires_at, active, source_note) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 1, %s)",
            (created_at, title_en, title_hi, title_cg, summary_en, summary_hi, summary_cg, scam_category, region_scope, expires_at, source_note)
        )

    def export_aggregates(self, start: str, end: str) -> list[dict]:
        sql = ("SELECT to_char(date_trunc('week', date::date), 'YYYY-MM-DD') AS week_start, region_code, scam_category, "
               "SUM(report_count)::int AS report_count, bool_or(source='seed')::int AS includes_seed "
               "FROM daily_aggregates WHERE date >= %s AND date <= %s GROUP BY week_start, region_code, scam_category")
        return self.query(sql, (start, end))

    def purge_expired(self, rate_limit_before: str, raw_reports_before: str) -> dict[str, int]:
        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM rate_limit_log WHERE window_start < %s", (rate_limit_before,))
                rl = cur.rowcount
                cur.execute("DELETE FROM scam_reports WHERE source='app' AND created_hour < %s", (raw_reports_before,))
                raw = cur.rowcount
                conn.commit()
                return {"rate_limit_rows_deleted": rl, "raw_rows_deleted": raw}

    def seed_report(self, created_hour: str, scam_category: str, channel: str, region_code: str,
                    risk_band: str, client_batch_id: str, date_str: str) -> bool:
        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO scam_reports (created_hour, scam_category, channel, region_code, risk_band, source, client_batch_id) "
                    "VALUES (%s, %s, %s, %s, %s, 'seed', %s) ON CONFLICT (client_batch_id) DO NOTHING",
                    (created_hour, scam_category, channel, region_code, risk_band, client_batch_id)
                )
                if cur.rowcount > 0:
                    cur.execute(
                        "INSERT INTO daily_aggregates (date, region_code, scam_category, channel, source, report_count) "
                        "VALUES (%s, %s, %s, %s, 'seed', 1) "
                        "ON CONFLICT (date, region_code, scam_category, channel, source) "
                        "DO UPDATE SET report_count = daily_aggregates.report_count + 1",
                        (date_str, region_code, scam_category, channel)
                    )
                    conn.commit()
                    return True
                return False

    def seed_reports_batch(self, items: list[tuple[str, str, str, str, str, str, str]]) -> int:
        with self._connect() as conn:
            with conn.cursor() as cur:
                scam_rows = [(r[0], r[1], r[2], r[3], r[4], 'seed', r[5]) for r in items]
                cur.executemany(
                    "INSERT INTO scam_reports (created_hour, scam_category, channel, region_code, risk_band, source, client_batch_id) "
                    "VALUES (%s, %s, %s, %s, %s, %s, %s) ON CONFLICT (client_batch_id) DO NOTHING",
                    scam_rows
                )
                agg_counts: dict[tuple[str, str, str, str, str], int] = {}
                for r in items:
                    k = (r[6], r[3], r[1], r[2], 'seed')
                    agg_counts[k] = agg_counts.get(k, 0) + 1
                agg_rows = [(k[0], k[1], k[2], k[3], k[4], cnt) for k, cnt in agg_counts.items()]
                cur.executemany(
                    "INSERT INTO daily_aggregates (date, region_code, scam_category, channel, source, report_count) "
                    "VALUES (%s, %s, %s, %s, %s, %s) "
                    "ON CONFLICT (date, region_code, scam_category, channel, source) "
                    "DO UPDATE SET report_count = daily_aggregates.report_count + EXCLUDED.report_count",
                    agg_rows
                )
            conn.commit()
            return len(items)

    def close(self) -> None:
        pass


def get_database(target: str | Path | None = None) -> Database:
    """Factory selecting the adapter: Postgres if DATABASE_URL or target starts with postgresql://, else SQLite."""
    url = target if isinstance(target, str) and (target.startswith("postgresql://") or target.startswith("postgres://")) else None
    if not url and target is None:
        url = os.environ.get("DATABASE_URL")
    if url:
        return PostgresDatabase(url)
    return SqliteDatabase(target or os.environ.get("API_DB", "data/reports.db"))
