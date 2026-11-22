"""Anonymous scam-report API and aggregate trends (Module 5 server).

Privacy by design: the public interface can only INSERT reports and READ aggregates. No endpoint returns a raw row.
Reports are fixed-field (category, channel, region, risk band): no free text, no device id, no precise time.
Small cells are suppressed before they leave the server. Logs carry status and path only.
"""
from __future__ import annotations

import csv
import hashlib
import hmac
import io
import os
import re
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Callable

from fastapi import FastAPI, Header, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel, ConfigDict, Field

from .db import Database
from .regions import CATEGORIES, CHANNELS, REGIONS, RISK_BANDS

VERSION = "0.1.0"
BATCH_ID = re.compile(r"^[A-Za-z0-9-]{8,64}$")
MAX_BODY = 64 * 1024
MAX_BATCH = 20


class ReportIn(BaseModel):
    """Only these fields are accepted; anything else is rejected (extra='forbid')."""
    model_config = ConfigDict(extra="forbid")
    scam_category: str = Field(max_length=32)
    channel: str = Field(max_length=16)
    region_code: str = Field(max_length=48)
    risk_band: str = Field(default="unknown", max_length=16)
    client_batch_id: str | None = Field(default=None, max_length=64)


class BatchIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reports: list[ReportIn] = Field(max_length=MAX_BATCH)


class AlertIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: dict[str, str]
    summary: dict[str, str]
    scam_category: str
    region_scope: str = "all"
    expires_at: str  # ISO date
    source_note: str = Field(min_length=3, max_length=200)  # every alert names its source


def create_app(db_path: str | None = None, secret: str | None = None, min_count: int | None = None, rate_limit: int | None = None,
               now_fn: Callable[[], datetime] | None = None, admin_key: str | None = None) -> FastAPI:
    db = Database(db_path or os.environ.get("API_DB", "data/reports.db"))
    secret = secret or os.environ.get("API_SECRET") or secrets.token_hex(16)
    MIN = int(min_count if min_count is not None else os.environ.get("API_MIN_COUNT", 5))
    LIMIT = int(rate_limit if rate_limit is not None else os.environ.get("API_RATE_LIMIT", 60))
    ADMIN = admin_key if admin_key is not None else os.environ.get("API_ADMIN_KEY", "")
    now = now_fn or (lambda: datetime.now(timezone.utc))
    region_codes = {r[0] for r in REGIONS}

    app = FastAPI(title="Suraksha anonymous reports API", version=VERSION)
    app.state.db = db
    app.state.min_count = MIN
    app.add_middleware(CORSMiddleware, allow_origins=os.environ.get("API_CORS", "*").split(","), allow_methods=["GET", "POST"],
                       allow_headers=["Content-Type", "X-Client-Token", "X-Admin-Key"], allow_credentials=False)

    @app.middleware("http")
    async def limit_body(request: Request, call_next):
        if int(request.headers.get("content-length") or 0) > MAX_BODY:
            return JSONResponse({"detail": "request too large"}, status_code=413)
        return await call_next(request)

    # ------------------------------------------------------------------ helpers
    def token_hash(token: str, day: str) -> str:
        """rotateClientToken (server side): hashed with a daily salt so tokens cannot be tracked across days."""
        salt = hashlib.sha256(f"{secret}:{day}".encode()).hexdigest()
        return hashlib.sha256(f"{salt}:{token}".encode()).hexdigest()

    def check_rate(token: str | None, n: int) -> None:
        if not token or len(token) < 16 or len(token) > 128:
            raise HTTPException(400, "missing or invalid X-Client-Token")
        t = now()
        h, window = token_hash(token, t.strftime("%Y-%m-%d")), t.strftime("%Y-%m-%dT%H")
        row = db.query("SELECT count FROM rate_limit_log WHERE hashed_token=? AND window_start=?", (h, window))
        used = row[0]["count"] if row else 0
        if used + n > LIMIT:
            raise HTTPException(429, "rate limit reached, try again later")
        db.execute("INSERT INTO rate_limit_log VALUES (?,?,?) ON CONFLICT(hashed_token, window_start) DO UPDATE SET count = count + ?", (h, window, n, n))

    def valid(r: ReportIn) -> bool:
        return r.scam_category in CATEGORIES and r.channel in CHANNELS and r.region_code in region_codes and r.risk_band in RISK_BANDS and (
            r.client_batch_id is None or bool(BATCH_ID.match(r.client_batch_id)))

    def insert_report(r: ReportIn, source: str = "app") -> str:
        """validateReport + insertReport: returns 'accepted', 'duplicate' or 'rejected'."""
        if not valid(r):
            return "rejected"
        t = now()
        bid = r.client_batch_id or str(uuid.uuid4())
        with db.lock:
            if db.query("SELECT 1 FROM scam_reports WHERE client_batch_id=?", (bid,)):
                return "duplicate"
            db.conn.execute("INSERT INTO scam_reports (created_hour, scam_category, channel, region_code, risk_band, source, client_batch_id) VALUES (?,?,?,?,?,?,?)",
                            (t.strftime("%Y-%m-%dT%H:00:00Z"), r.scam_category, r.channel, r.region_code, r.risk_band, source, bid))
            db.conn.execute("""INSERT INTO daily_aggregates VALUES (?,?,?,?,?,1)
                               ON CONFLICT(date, region_code, scam_category, channel, source) DO UPDATE SET report_count = report_count + 1""",
                            (t.strftime("%Y-%m-%d"), r.region_code, r.scam_category, r.channel, source))
            db.conn.commit()
        return "accepted"

    def monday(d: str) -> str:
        return d  # weekly bucketing is done in SQL below

    WEEK = "date(date, '-6 days', 'weekday 1')"

    def filters(region: str | None, category: str | None, channel: str | None, start: str, end: str):
        where, params = ["date >= ?", "date <= ?"], [start, end]
        for col, val in (("region_code", region), ("scam_category", category), ("channel", channel)):
            if val:
                where.append(f"{col} = ?")
                params.append(val)
        return " AND ".join(where), tuple(params)

    def date_range(frm: str | None, to: str | None, default_days: int = 56) -> tuple[str, str]:
        end = to or now().strftime("%Y-%m-%d")
        start = frm or (now() - timedelta(days=default_days)).strftime("%Y-%m-%d")
        for v in (start, end):
            if not re.match(r"^\d{4}-\d{2}-\d{2}$", v):
                raise HTTPException(422, "dates must be YYYY-MM-DD")
        return start, end

    def includes_seed(where: str, params: tuple) -> bool:
        return bool(db.query(f"SELECT 1 FROM daily_aggregates WHERE {where} AND source='seed' LIMIT 1", params))

    # ------------------------------------------------------------------ write endpoints
    @app.post("/reports")
    def post_report(report: ReportIn, x_client_token: str | None = Header(default=None)):
        check_rate(x_client_token, 1)
        status = insert_report(report)
        if status == "rejected":
            raise HTTPException(422, "unknown category, channel, region or risk band")
        return {"ok": True, "status": status}  # an acknowledgement only

    @app.post("/reports/batch")
    def post_batch(batch: BatchIn, x_client_token: str | None = Header(default=None)):
        """Idempotent through client_batch_id, so a retry after a dropped connection never double counts."""
        check_rate(x_client_token, len(batch.reports))
        out: dict[str, list[str]] = {"accepted": [], "duplicates": [], "rejected": []}
        for r in batch.reports:
            if not r.client_batch_id or not BATCH_ID.match(r.client_batch_id):
                continue  # batch items must carry a valid id; nothing to acknowledge
            status = insert_report(r)
            out["duplicates" if status == "duplicate" else status if status != "accepted" else "accepted"].append(r.client_batch_id)
        return out

    # ------------------------------------------------------------------ read endpoints (aggregates only)
    @app.get("/trends")
    def trends(group: str = Query("week", pattern="^(week|region)$"), region: str | None = None, category: str | None = None, channel: str | None = None,
               frm: str | None = Query(None, alias="from"), to: str | None = None):
        start, end = date_range(frm, to)
        where, params = filters(region, category, channel, start, end)
        if group == "week":
            rows = db.query(f"SELECT {WEEK} AS week_start, scam_category, SUM(report_count) AS report_count FROM daily_aggregates WHERE {where} GROUP BY week_start, scam_category ORDER BY week_start", params)
        else:
            rows = db.query(f"SELECT region_code, scam_category, SUM(report_count) AS report_count FROM daily_aggregates WHERE {where} GROUP BY region_code, scam_category ORDER BY region_code", params)
        shown = [r for r in rows if r["report_count"] >= MIN]  # applySuppression
        return {"group": group, "min_count": MIN, "suppressed_cells": len(rows) - len(shown), "includes_seed": includes_seed(where, params), "rows": shown}

    def window_counts(region: str | None, days_ago_start: int, days_ago_end: int) -> dict[str, int]:
        end = (now() - timedelta(days=days_ago_end)).strftime("%Y-%m-%d")
        start = (now() - timedelta(days=days_ago_start)).strftime("%Y-%m-%d")
        where, params = filters(region, None, None, start, end)
        return {r["scam_category"]: r["n"] for r in db.query(f"SELECT scam_category, SUM(report_count) AS n FROM daily_aggregates WHERE {where} GROUP BY scam_category", params)}

    @app.get("/trends/top")
    def top(region: str | None = None, days: int = Query(7, ge=1, le=60)):
        counts = window_counts(region, days - 1, 0)
        ranked = sorted(((c, n) for c, n in counts.items() if n >= MIN), key=lambda x: -x[1])
        return {"days": days, "min_count": MIN, "rows": [{"scam_category": c, "report_count": n} for c, n in ranked]}

    @app.get("/trends/overview")
    def overview(region: str | None = None):
        cur, prev = window_counts(region, 6, 0), window_counts(region, 13, 7)
        cur = {c: n for c, n in cur.items() if n >= MIN}
        prev = {c: n for c, n in prev.items() if n >= MIN}
        total, ptotal = sum(cur.values()), sum(prev.values())
        change = None if ptotal == 0 else round((total - ptotal) / ptotal * 100, 1)
        where, params = filters(region, None, None, (now() - timedelta(days=13)).strftime("%Y-%m-%d"), now().strftime("%Y-%m-%d"))
        return {"this_week_total": total, "last_week_total": ptotal, "change_pct": change, "min_count": MIN,
                "top3": [{"scam_category": c, "report_count": n} for c, n in sorted(cur.items(), key=lambda x: -x[1])[:3]], "includes_seed": includes_seed(where, params)}

    @app.get("/trends/rising")
    def rising():
        """suggestFromReports: categories whose weekly count rises sharply, as a prompt for a human to write an alert."""
        cur, prev = window_counts(None, 6, 0), window_counts(None, 13, 7)
        rows = [{"scam_category": c, "this_week": n, "last_week": prev.get(c, 0)} for c, n in cur.items() if n >= MIN and n >= 2 * max(1, prev.get(c, 0))]
        return {"rows": sorted(rows, key=lambda r: -r["this_week"])}

    @app.get("/regions")
    def regions(response: Response):
        response.headers["Cache-Control"] = "public, max-age=3600"
        return {"rows": db.query("SELECT region_code, name_en, name_hi, parent_region, display_order FROM region_lookup ORDER BY name_en")}

    @app.get("/categories")
    def categories(response: Response):
        response.headers["Cache-Control"] = "public, max-age=3600"
        return {"rows": db.query("SELECT category_code, linked_lesson FROM scam_categories ORDER BY category_code")}

    @app.get("/alerts")
    def alerts(region: str | None = None):
        today = now().strftime("%Y-%m-%d")
        rows = db.query("SELECT * FROM alert_items WHERE active=1 AND expires_at >= ? ORDER BY created_at DESC", (today,))  # expireAlerts: hidden after expiry
        if region:
            rows = [r for r in rows if r["region_scope"] in ("all", region)]
        return {"rows": rows}

    @app.post("/alerts")
    def publish_alert(a: AlertIn, x_admin_key: str | None = Header(default=None)):
        if not ADMIN or not x_admin_key or not hmac.compare_digest(ADMIN, x_admin_key):
            raise HTTPException(403, "admin key required")
        if a.scam_category not in CATEGORIES or (a.region_scope != "all" and a.region_scope not in region_codes):
            raise HTTPException(422, "unknown category or region")
        for lang in ("en", "hi", "cg"):
            if not a.title.get(lang, "").strip() or not a.summary.get(lang, "").strip():
                raise HTTPException(422, f"title and summary are required in {lang}")
        db.execute("INSERT INTO alert_items (created_at, title_en, title_hi, title_cg, summary_en, summary_hi, summary_cg, scam_category, region_scope, expires_at, active, source_note) VALUES (?,?,?,?,?,?,?,?,?,?,1,?)",
                   (now().strftime("%Y-%m-%dT%H:%M:%SZ"), a.title["en"], a.title["hi"], a.title["cg"], a.summary["en"], a.summary["hi"], a.summary["cg"], a.scam_category, a.region_scope, a.expires_at, a.source_note))
        return {"ok": True}

    @app.get("/export")
    def export(frm: str | None = Query(None, alias="from"), to: str | None = None):
        """Aggregates only: weekly counts per region and category, small cells removed."""
        start, end = date_range(frm, to)
        where, params = filters(None, None, None, start, end)
        rows = db.query(f"SELECT {WEEK} AS week_start, region_code, scam_category, SUM(report_count) AS report_count, MAX(source='seed') AS includes_seed FROM daily_aggregates WHERE {where} GROUP BY week_start, region_code, scam_category", params)
        buf = io.StringIO()
        w = csv.writer(buf)
        w.writerow(["week_start", "region_code", "scam_category", "report_count", "includes_demo_data"])
        for r in rows:
            if r["report_count"] >= MIN:
                w.writerow([r["week_start"], r["region_code"], r["scam_category"], r["report_count"], int(r["includes_seed"])])
        return Response(buf.getvalue(), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=scam_trends.csv"})

    @app.get("/health")
    def health():
        return {"status": "ok", "version": VERSION, "time": now().strftime("%Y-%m-%dT%H:%M:%SZ")}

    app.state.insert_report = insert_report
    app.state.token_hash = token_hash
    return app


app = create_app() if os.environ.get("API_AUTOSTART", "1") == "1" else None
