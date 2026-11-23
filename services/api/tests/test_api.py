import json
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.db import Database
from app.main import create_app
from app.seed import purge_expired_data, seed_demo_data

NOW = datetime(2026, 11, 23, 10, 30, tzinfo=timezone.utc)
TOKEN = "t" * 32
GOOD = {"scam_category": "kyc_bank", "channel": "sms", "region_code": "raipur", "risk_band": "likely_scam"}

TEST_PG_URL = os.environ.get("TEST_DATABASE_URL")
BACKENDS = [":memory:"]
if TEST_PG_URL:
    BACKENDS.append(TEST_PG_URL)


@pytest.fixture
def clock():
    return {"t": NOW}


@pytest.fixture(params=BACKENDS, ids=["sqlite", "postgres"] if len(BACKENDS) > 1 else ["sqlite"])
def db_target(request):
    target = request.param
    if target.startswith("postgres"):
        import psycopg
        # Ensure schema is applied and tables are empty for each test
        schema_path = Path(__file__).resolve().parent.parent / "schema.sql"
        with psycopg.connect(target) as conn:
            with conn.cursor() as cur:
                cur.execute(schema_path.read_text(encoding="utf-8"))
                cur.execute("TRUNCATE scam_reports, daily_aggregates, alert_items, rate_limit_log RESTART IDENTITY;")
            conn.commit()
    return target


def make(clock, db_target=":memory:", **kw):
    app = create_app(db_path=db_target, secret="s", now_fn=lambda: clock["t"], **kw)
    return app, TestClient(app)


def post(c, body, token=TOKEN):
    return c.post("/reports", json=body, headers={"X-Client-Token": token})


def test_health(clock, db_target):
    _, c = make(clock, db_target=db_target)
    assert c.get("/health").json()["status"] == "ok"
    assert c.get("/").json()["status"] == "ok"


def test_report_validation_and_no_free_text(clock, db_target):
    _, c = make(clock, db_target=db_target, min_count=1)
    assert post(c, GOOD).status_code == 200
    assert post(c, {**GOOD, "scam_category": "nope"}).status_code == 422
    assert post(c, {**GOOD, "region_code": "atlantis"}).status_code == 422
    assert post(c, {**GOOD, "message_text": "your OTP is 123456"}).status_code == 422  # unknown fields are rejected, so text cannot enter
    assert post(c, {**GOOD, "phone": "9876543210"}).status_code == 422
    assert c.post("/reports", json=GOOD).status_code == 400  # token required


def test_batch_is_idempotent_exactly_once(clock, db_target):
    _, c = make(clock, db_target=db_target, min_count=1)
    body = {"reports": [{**GOOD, "client_batch_id": "abc-12345678"}, {**GOOD, "client_batch_id": "abc-87654321", "channel": "call"}]}
    r1 = c.post("/reports/batch", json=body, headers={"X-Client-Token": TOKEN}).json()
    assert sorted(r1["accepted"]) == ["abc-12345678", "abc-87654321"]
    r2 = c.post("/reports/batch", json=body, headers={"X-Client-Token": TOKEN}).json()  # offline device retries after reconnecting
    assert r2["accepted"] == [] and sorted(r2["duplicates"]) == ["abc-12345678", "abc-87654321"]
    total = sum(r["report_count"] for r in c.get("/trends").json()["rows"])
    assert total == 2  # counted exactly once


def test_small_cells_are_suppressed(clock, db_target):
    _, c = make(clock, db_target=db_target, min_count=5)
    for i in range(3):
        c.post("/reports/batch", json={"reports": [{**GOOD, "client_batch_id": f"id-0000000{i}"}]}, headers={"X-Client-Token": TOKEN})
    assert c.get("/trends").json()["rows"] == []  # 3 < 5: no figure at all
    for i in range(3, 6):
        c.post("/reports/batch", json={"reports": [{**GOOD, "client_batch_id": f"id-0000000{i}"}]}, headers={"X-Client-Token": TOKEN})
    rows = c.get("/trends").json()["rows"]
    assert len(rows) == 1 and rows[0]["report_count"] == 6
    assert c.get("/trends/top").json()["rows"][0]["report_count"] == 6
    assert "id-0000000" not in c.get("/export").text  # export has aggregates only


def test_public_interface_cannot_read_raw_rows(clock, db_target):
    app, c = make(clock, db_target=db_target, min_count=1)
    post(c, GOOD)
    for path in ("/reports", "/reports/1", "/scam_reports", "/reports/all", "/rows"):
        assert c.get(path).status_code in (404, 405)
    get_paths = {p for p, ops in app.openapi()["paths"].items() if "get" in ops}
    assert "/reports" not in get_paths and "/reports/batch" not in get_paths
    for p in ("/trends", "/trends/top", "/trends/overview", "/export", "/alerts", "/regions", "/categories", "/health", "/trends/rising"):
        body = c.get(p).text
        assert "client_batch_id" not in body and "created_hour" not in body  # no raw column ever leaves the server


def test_rate_limit_per_token_and_daily_rotation(clock, db_target):
    app, c = make(clock, db_target=db_target, min_count=1, rate_limit=3)
    assert [post(c, GOOD).status_code for _ in range(4)] == [200, 200, 200, 429]
    assert post(c, GOOD, token="u" * 32).status_code == 200  # a different token has its own budget
    th = app.state.token_hash
    assert th(TOKEN, "2026-11-23") != th(TOKEN, "2026-11-24")  # hashed with a daily salt: cannot be tracked across days
    clock["t"] = NOW + timedelta(hours=1)
    assert post(c, GOOD).status_code == 200  # new hour, new window


def test_alerts_need_admin_key_and_expire(clock, db_target):
    _, c = make(clock, db_target=db_target, admin_key="k" * 20)
    alert = {"title": {"en": "t", "hi": "ट", "cg": "ट"}, "summary": {"en": "s", "hi": "स", "cg": "स"}, "scam_category": "digital_arrest", "region_scope": "all",
             "expires_at": "2026-11-25", "source_note": "team review of reports"}
    assert c.post("/alerts", json=alert).status_code == 403
    assert c.post("/alerts", json=alert, headers={"X-Admin-Key": "wrong"}).status_code == 403
    assert c.post("/alerts", json=alert, headers={"X-Admin-Key": "k" * 20}).status_code == 200
    assert len(c.get("/alerts").json()["rows"]) == 1
    clock["t"] = NOW + timedelta(days=5)
    assert c.get("/alerts").json()["rows"] == []  # expireAlerts


def test_admin_disabled_without_key(clock, db_target):
    _, c = make(clock, db_target=db_target, admin_key="")
    assert c.post("/alerts", json={"title": {}, "summary": {}, "scam_category": "other", "expires_at": "2026-12-01", "source_note": "abc"}, headers={"X-Admin-Key": ""}).status_code in (403, 422)


def test_seeded_demo_data_is_labelled_and_suppression_applies(clock, db_target):
    app, c = make(clock, db_target=db_target, min_count=5)
    n = seed_demo_data(app.state.db, now=NOW)
    assert n > 500
    t = c.get("/trends", params={"group": "region"}).json()
    assert t["includes_seed"] is True  # the dashboard shows a demo banner
    regions_shown = {r["region_code"] for r in t["rows"]}
    assert "raipur" in regions_shown and "sukma" not in regions_shown  # a tiny district stays hidden
    ov = c.get("/trends/overview").json()
    assert ov["includes_seed"] is True and len(ov["top3"]) == 3
    rising = {r["scam_category"] for r in c.get("/trends/rising").json()["rows"]}
    assert isinstance(rising, set)


def test_demo_off_returns_only_real_reports_and_never_unlabelled_demo_numbers(clock, db_target):
    app, c = make(clock, db_target=db_target, min_count=5)
    seed_demo_data(app.state.db, now=NOW)
    real = [{**GOOD, "client_batch_id": f"real-0000{i}"} for i in range(6)]
    assert c.post("/reports/batch", json={"reports": real}, headers={"X-Client-Token": TOKEN}).status_code == 200

    with_demo = c.get("/trends/overview").json()  # the default is unchanged
    assert with_demo["includes_seed"] is True and with_demo["this_week_total"] > 6

    ov = c.get("/trends/overview", params={"demo": 0}).json()
    assert ov["includes_seed"] is False
    assert ov["this_week_total"] == 6 and ov["top3"] == [{"scam_category": "kyc_bank", "report_count": 6}]

    t = c.get("/trends", params={"group": "region", "demo": "false"}).json()
    assert t["includes_seed"] is False
    assert [(r["region_code"], r["scam_category"], r["report_count"]) for r in t["rows"]] == [("raipur", "kyc_bank", 6)]
    assert c.get("/trends/top", params={"demo": 0}).json()["rows"] == [{"scam_category": "kyc_bank", "report_count": 6}]
    assert c.get("/trends/rising", params={"demo": 0}).json()["rows"] == [{"scam_category": "kyc_bank", "this_week": 6, "last_week": 0}]  # from the real six only


def test_demo_off_with_no_real_reports_shows_nothing(clock, db_target):
    app, c = make(clock, db_target=db_target, min_count=5)
    seed_demo_data(app.state.db, now=NOW)
    ov = c.get("/trends/overview", params={"demo": 0}).json()
    assert ov["includes_seed"] is False and ov["this_week_total"] == 0 and ov["top3"] == []
    assert c.get("/trends", params={"demo": 0}).json()["rows"] == []


def test_purge_removes_old_raw_rows_and_rate_logs_but_keeps_aggregates(clock, db_target):
    app, c = make(clock, db_target=db_target, min_count=1)
    post(c, GOOD)
    later = NOW + timedelta(days=40)
    res = purge_expired_data(app.state.db, now=later)
    assert res["raw_rows_deleted"] == 1 and res["rate_limit_rows_deleted"] == 1
    assert app.state.db.query("SELECT COUNT(*) AS n FROM scam_reports")[0]["n"] == 0
    assert sum(r["report_count"] for r in c.get("/trends").json()["rows"]) == 1  # aggregates stay


def test_regions_and_categories_lists(clock, db_target):
    _, c = make(clock, db_target=db_target)
    assert len(c.get("/regions").json()["rows"]) == 33
    assert {r["category_code"] for r in c.get("/categories").json()["rows"]} >= {"kyc_bank", "digital_arrest", "fake_qr"}


def test_oversized_body_rejected(clock, db_target):
    _, c = make(clock, db_target=db_target)
    big = json.dumps({"reports": [], "pad": "x" * 70000})
    assert c.post("/reports/batch", content=big, headers={"X-Client-Token": TOKEN, "Content-Type": "application/json"}).status_code == 413


def test_internal_purge_endpoint(clock, db_target, monkeypatch):
    monkeypatch.setenv("CRON_SECRET", "secret-cron-key-12345")
    app, c = make(clock, db_target=db_target, min_count=1)
    post(c, GOOD)

    # 1. Missing header -> 401
    assert c.post("/internal/purge").status_code == 401

    # 2. Wrong secret -> 401
    assert c.post("/internal/purge", headers={"Authorization": "Bearer wrong"}).status_code == 401

    # 3. Advance clock 40 days and run valid purge -> 200
    clock["t"] = NOW + timedelta(days=40)
    res = c.post("/internal/purge", headers={"Authorization": "Bearer secret-cron-key-12345"})
    assert res.status_code == 200
    data = res.json()
    assert data["ok"] is True
    assert data["status"] == "purged"
    assert data["raw_rows_deleted"] == 1
    assert data["rate_limit_rows_deleted"] == 1


def test_week_boundary_logic_on_adapter(clock, db_target):
    """Verify that Monday (2026-11-23), Wednesday (2026-11-25), Sunday (2026-11-29)
    all group into Monday 2026-11-23, and next Monday (2026-11-30) groups into 2026-11-30."""
    app, c = make(clock, db_target=db_target, min_count=1)
    db = app.state.db

    # Insert reports on Monday, Wednesday, Sunday of week 1
    db.insert_report("2026-11-23T10:00:00Z", "kyc_bank", "sms", "raipur", "likely_scam", "app", "b-mon-1", "2026-11-23")
    db.insert_report("2026-11-25T10:00:00Z", "kyc_bank", "sms", "raipur", "likely_scam", "app", "b-wed-1", "2026-11-25")
    db.insert_report("2026-11-29T23:00:00Z", "kyc_bank", "sms", "raipur", "likely_scam", "app", "b-sun-1", "2026-11-29")
    # Insert report on next Monday
    db.insert_report("2026-11-30T09:00:00Z", "kyc_bank", "sms", "raipur", "likely_scam", "app", "b-mon-2", "2026-11-30")

    trends = db.query_trends(group="week", region=None, category=None, channel=None, start="2026-11-01", end="2026-12-05", demo=True)
    by_week = {r["week_start"]: r["report_count"] for r in trends if r["scam_category"] == "kyc_bank"}

    assert by_week.get("2026-11-23") == 3, f"Expected 3 reports in week 2026-11-23, got {by_week.get('2026-11-23')}"
    assert by_week.get("2026-11-30") == 1, f"Expected 1 report in week 2026-11-30, got {by_week.get('2026-11-30')}"


@pytest.mark.skipif(not TEST_PG_URL, reason="TEST_DATABASE_URL not set")
def test_postgres_schema_idempotency_and_rls():
    import psycopg
    schema_path = Path(__file__).resolve().parent.parent / "schema.sql"
    sql = schema_path.read_text(encoding="utf-8")
    with psycopg.connect(TEST_PG_URL) as conn:
        with conn.cursor() as cur:
            # Idempotency: executing twice must succeed
            cur.execute(sql)
            cur.execute(sql)
            # RLS enabled on all public tables
            cur.execute("SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public'")
            rows = cur.fetchall()
            assert len(rows) >= 6
            for table, rls in rows:
                assert rls is True, f"RLS must be enabled on {table}"


def test_cors_preflight_allows_cache_control_and_headers(clock):
    _, c = make(clock)
    headers = {
        "Origin": "https://hack-a-sol-specter.vercel.app",
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "cache-control",
    }
    r = c.options("/health", headers=headers)
    assert r.status_code == 200
    assert r.headers.get("access-control-allow-origin") in ("*", "https://hack-a-sol-specter.vercel.app")
