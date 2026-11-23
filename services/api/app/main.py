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

from .db import Database, PostgresDatabase, get_database
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
    db = get_database(db_path)
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
                       allow_headers=["Content-Type", "X-Client-Token", "X-Admin-Key", "Authorization"], allow_credentials=False)

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
        if not db.record_rate_limit(h, window, n, LIMIT):
            raise HTTPException(429, "rate limit reached, try again later")

    def valid(r: ReportIn) -> bool:
        return r.scam_category in CATEGORIES and r.channel in CHANNELS and r.region_code in region_codes and r.risk_band in RISK_BANDS and (
            r.client_batch_id is None or bool(BATCH_ID.match(r.client_batch_id)))

    def insert_report(r: ReportIn, source: str = "app") -> str:
        """validateReport + insertReport: returns 'accepted', 'duplicate' or 'rejected'."""
        if not valid(r):
            return "rejected"
        t = now()
        bid = r.client_batch_id or str(uuid.uuid4())
        created_hour = t.strftime("%Y-%m-%dT%H:00:00Z")
        date_str = t.strftime("%Y-%m-%d")
        return db.insert_report(created_hour, r.scam_category, r.channel, r.region_code, r.risk_band, source, bid, date_str)

    def date_range(frm: str | None, to: str | None, default_days: int = 56) -> tuple[str, str]:
        end = to or now().strftime("%Y-%m-%d")
        start = frm or (now() - timedelta(days=default_days)).strftime("%Y-%m-%d")
        for v in (start, end):
            if not re.match(r"^\d{4}-\d{2}-\d{2}$", v):
                raise HTTPException(422, "dates must be YYYY-MM-DD")
        return start, end

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
               frm: str | None = Query(None, alias="from"), to: str | None = None, demo: bool = True):
        start, end = date_range(frm, to)
        rows = db.query_trends(group, region, category, channel, start, end, demo)
        shown = [r for r in rows if r["report_count"] >= MIN]  # applySuppression
        inc_seed = False if not demo else db.has_seed_data(region, category, channel, start, end)
        return {"group": group, "min_count": MIN, "suppressed_cells": len(rows) - len(shown), "includes_seed": inc_seed, "rows": shown}

    def window_counts(region: str | None, days_ago_start: int, days_ago_end: int, demo: bool = True) -> dict[str, int]:
        end = (now() - timedelta(days=days_ago_end)).strftime("%Y-%m-%d")
        start = (now() - timedelta(days=days_ago_start)).strftime("%Y-%m-%d")
        return db.query_window_counts(region, start, end, demo)

    @app.get("/trends/top")
    def top(region: str | None = None, days: int = Query(7, ge=1, le=60), demo: bool = True):
        counts = window_counts(region, days - 1, 0, demo)
        ranked = sorted(((c, n) for c, n in counts.items() if n >= MIN), key=lambda x: -x[1])
        return {"days": days, "min_count": MIN, "rows": [{"scam_category": c, "report_count": n} for c, n in ranked]}

    @app.get("/trends/overview")
    def overview(region: str | None = None, demo: bool = True):
        cur, prev = window_counts(region, 6, 0, demo), window_counts(region, 13, 7, demo)
        cur = {c: n for c, n in cur.items() if n >= MIN}
        prev = {c: n for c, n in prev.items() if n >= MIN}
        total, ptotal = sum(cur.values()), sum(prev.values())
        change = None if ptotal == 0 else round((total - ptotal) / ptotal * 100, 1)
        inc_seed = False if not demo else db.has_seed_data(region, None, None, (now() - timedelta(days=13)).strftime("%Y-%m-%d"), now().strftime("%Y-%m-%d"))
        return {"this_week_total": total, "last_week_total": ptotal, "change_pct": change, "min_count": MIN,
                "top3": [{"scam_category": c, "report_count": n} for c, n in sorted(cur.items(), key=lambda x: -x[1])[:3]], "includes_seed": inc_seed}

    @app.get("/trends/rising")
    def rising(demo: bool = True):
        """suggestFromReports: categories whose weekly count rises sharply, as a prompt for a human to write an alert."""
        cur, prev = window_counts(None, 6, 0, demo), window_counts(None, 13, 7, demo)
        rows = [{"scam_category": c, "this_week": n, "last_week": prev.get(c, 0)} for c, n in cur.items() if n >= MIN and n >= 2 * max(1, prev.get(c, 0))]
        return {"rows": sorted(rows, key=lambda r: -r["this_week"])}

    @app.get("/regions")
    def regions(response: Response):
        response.headers["Cache-Control"] = "public, max-age=3600"
        return {"rows": db.get_regions()}

    @app.get("/categories")
    def categories(response: Response):
        response.headers["Cache-Control"] = "public, max-age=3600"
        return {"rows": db.get_categories()}

    @app.get("/alerts")
    def alerts(region: str | None = None):
        today = now().strftime("%Y-%m-%d")
        return {"rows": db.get_alerts(today, region)}

    @app.post("/alerts")
    def publish_alert(a: AlertIn, x_admin_key: str | None = Header(default=None)):
        if not ADMIN or not x_admin_key or not hmac.compare_digest(ADMIN, x_admin_key):
            raise HTTPException(403, "admin key required")
        if a.scam_category not in CATEGORIES or (a.region_scope != "all" and a.region_scope not in region_codes):
            raise HTTPException(422, "unknown category or region")
        for lang in ("en", "hi", "cg"):
            if not a.title.get(lang, "").strip() or not a.summary.get(lang, "").strip():
                raise HTTPException(422, f"title and summary are required in {lang}")
        db.create_alert(now().strftime("%Y-%m-%dT%H:%M:%SZ"), a.title["en"], a.title["hi"], a.title["cg"],
                        a.summary["en"], a.summary["hi"], a.summary["cg"], a.scam_category, a.region_scope, a.expires_at, a.source_note)
        return {"ok": True}

    @app.get("/export")
    def export(frm: str | None = Query(None, alias="from"), to: str | None = None):
        """Aggregates only: weekly counts per region and category, small cells removed."""
        start, end = date_range(frm, to)
        rows = db.export_aggregates(start, end)
        buf = io.StringIO()
        w = csv.writer(buf)
        w.writerow(["week_start", "region_code", "scam_category", "report_count", "includes_demo_data"])
        for r in rows:
            if r["report_count"] >= MIN:
                w.writerow([r["week_start"], r["region_code"], r["scam_category"], r["report_count"], int(r["includes_seed"])])
        return Response(buf.getvalue(), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=scam_trends.csv"})

    # ------------------------------------------------------------------ internal maintenance (D4)
    @app.post("/internal/purge")
    def internal_purge(authorization: str | None = Header(default=None)):
        """Daily retention cleanup. Protected by Authorization: Bearer <CRON_SECRET>.
        Also prevents Supabase free-tier project from pausing due to inactivity."""
        cron_secret = os.environ.get("CRON_SECRET", "")
        expected = f"Bearer {cron_secret}"
        if not cron_secret or not authorization or not hmac.compare_digest(expected, authorization):
            raise HTTPException(401, "unauthorized cron execution")
        t = now()
        rl_before = (t - timedelta(days=1)).strftime("%Y-%m-%dT%H")
        raw_before = (t - timedelta(days=30)).strftime("%Y-%m-%dT%H:00:00Z")
        res = db.purge_expired(rl_before, raw_before)
        return {"ok": True, "status": "purged", **res}

    @app.get("/")
    def root():
        return {"status": "ok", "service": "suraksha-api", "version": VERSION}

    @app.get("/health")
    def health(check_db: int = 0):
        adapter = "postgres" if isinstance(db, PostgresDatabase) else "sqlite"
        res = {"status": "ok", "version": VERSION, "db": adapter, "time": now().strftime("%Y-%m-%dT%H:%M:%SZ")}
        if check_db:
            try:
                db.query("SELECT 1")
                res["db_connected"] = True
            except Exception as e:
                res["db_connected"] = False
                res["db_error"] = f"{type(e).__name__}: {str(e)[:150]}"
        return res

    app.state.insert_report = insert_report
    app.state.token_hash = token_hash
    return app


app = create_app() if os.environ.get("API_AUTOSTART", "1") == "1" else None
