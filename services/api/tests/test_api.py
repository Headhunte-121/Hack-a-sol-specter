import json
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient

from app.db import Database
from app.main import create_app
from app.seed import purge_expired_data, seed_demo_data

NOW = datetime(2026, 11, 23, 10, 30, tzinfo=timezone.utc)
TOKEN = "t" * 32
GOOD = {"scam_category": "kyc_bank", "channel": "sms", "region_code": "raipur", "risk_band": "likely_scam"}


@pytest.fixture
def clock():
    return {"t": NOW}


def make(clock, **kw):
    app = create_app(db_path=":memory:", secret="s", now_fn=lambda: clock["t"], **kw)
    return app, TestClient(app)


def post(c, body, token=TOKEN):
    return c.post("/reports", json=body, headers={"X-Client-Token": token})


def test_health(clock):
    _, c = make(clock)
    assert c.get("/health").json()["status"] == "ok"


def test_report_validation_and_no_free_text(clock):
    _, c = make(clock, min_count=1)
    assert post(c, GOOD).status_code == 200
    assert post(c, {**GOOD, "scam_category": "nope"}).status_code == 422
    assert post(c, {**GOOD, "region_code": "atlantis"}).status_code == 422
    assert post(c, {**GOOD, "message_text": "your OTP is 123456"}).status_code == 422  # unknown fields are rejected, so text cannot enter
    assert post(c, {**GOOD, "phone": "9876543210"}).status_code == 422
    assert c.post("/reports", json=GOOD).status_code == 400  # token required


def test_batch_is_idempotent_exactly_once(clock):
    _, c = make(clock, min_count=1)
    body = {"reports": [{**GOOD, "client_batch_id": "abc-12345678"}, {**GOOD, "client_batch_id": "abc-87654321", "channel": "call"}]}
    r1 = c.post("/reports/batch", json=body, headers={"X-Client-Token": TOKEN}).json()
    assert sorted(r1["accepted"]) == ["abc-12345678", "abc-87654321"]
    r2 = c.post("/reports/batch", json=body, headers={"X-Client-Token": TOKEN}).json()  # offline device retries after reconnecting
    assert r2["accepted"] == [] and sorted(r2["duplicates"]) == ["abc-12345678", "abc-87654321"]
    total = sum(r["report_count"] for r in c.get("/trends").json()["rows"])
    assert total == 2  # counted exactly once


def test_small_cells_are_suppressed(clock):
    _, c = make(clock, min_count=5)
    for i in range(3):
        c.post("/reports/batch", json={"reports": [{**GOOD, "client_batch_id": f"id-0000000{i}"}]}, headers={"X-Client-Token": TOKEN})
    assert c.get("/trends").json()["rows"] == []  # 3 < 5: no figure at all
    for i in range(3, 6):
        c.post("/reports/batch", json={"reports": [{**GOOD, "client_batch_id": f"id-0000000{i}"}]}, headers={"X-Client-Token": TOKEN})
    rows = c.get("/trends").json()["rows"]
    assert len(rows) == 1 and rows[0]["report_count"] == 6
    assert c.get("/trends/top").json()["rows"][0]["report_count"] == 6
    assert "id-0000000" not in c.get("/export").text  # export has aggregates only


def test_public_interface_cannot_read_raw_rows(clock):
    app, c = make(clock, min_count=1)
    post(c, GOOD)
    for path in ("/reports", "/reports/1", "/scam_reports", "/reports/all", "/rows"):
        assert c.get(path).status_code in (404, 405)
    get_paths = {p for p, ops in app.openapi()["paths"].items() if "get" in ops}
    assert "/reports" not in get_paths and "/reports/batch" not in get_paths
    for p in ("/trends", "/trends/top", "/trends/overview", "/export", "/alerts", "/regions", "/categories", "/health", "/trends/rising"):
        body = c.get(p).text
        assert "client_batch_id" not in body and "created_hour" not in body  # no raw column ever leaves the server


def test_rate_limit_per_token_and_daily_rotation(clock):
    app, c = make(clock, min_count=1, rate_limit=3)
    assert [post(c, GOOD).status_code for _ in range(4)] == [200, 200, 200, 429]
    assert post(c, GOOD, token="u" * 32).status_code == 200  # a different token has its own budget
    th = app.state.token_hash
    assert th(TOKEN, "2026-11-23") != th(TOKEN, "2026-11-24")  # hashed with a daily salt: cannot be tracked across days
    clock["t"] = NOW + timedelta(hours=1)
    assert post(c, GOOD).status_code == 200  # new hour, new window


def test_alerts_need_admin_key_and_expire(clock):
    _, c = make(clock, admin_key="k" * 20)
    alert = {"title": {"en": "t", "hi": "ट", "cg": "ट"}, "summary": {"en": "s", "hi": "स", "cg": "स"}, "scam_category": "digital_arrest", "region_scope": "all",
             "expires_at": "2026-11-25", "source_note": "team review of reports"}
    assert c.post("/alerts", json=alert).status_code == 403
    assert c.post("/alerts", json=alert, headers={"X-Admin-Key": "wrong"}).status_code == 403
    assert c.post("/alerts", json=alert, headers={"X-Admin-Key": "k" * 20}).status_code == 200
    assert len(c.get("/alerts").json()["rows"]) == 1
    clock["t"] = NOW + timedelta(days=5)
    assert c.get("/alerts").json()["rows"] == []  # expireAlerts


def test_admin_disabled_without_key(clock):
    _, c = make(clock, admin_key="")
    assert c.post("/alerts", json={"title": {}, "summary": {}, "scam_category": "other", "expires_at": "2026-12-01", "source_note": "abc"}, headers={"X-Admin-Key": ""}).status_code in (403, 422)


def test_seeded_demo_data_is_labelled_and_suppression_applies(clock):
    app, c = make(clock, min_count=5)
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


def test_demo_off_returns_only_real_reports_and_never_unlabelled_demo_numbers(clock):
    app, c = make(clock, min_count=5)
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


def test_demo_off_with_no_real_reports_shows_nothing(clock):
    app, c = make(clock, min_count=5)
    seed_demo_data(app.state.db, now=NOW)
    ov = c.get("/trends/overview", params={"demo": 0}).json()
    assert ov["includes_seed"] is False and ov["this_week_total"] == 0 and ov["top3"] == []
    assert c.get("/trends", params={"demo": 0}).json()["rows"] == []


def test_purge_removes_old_raw_rows_and_rate_logs_but_keeps_aggregates(clock):
    app, c = make(clock, min_count=1)
    post(c, GOOD)
    later = NOW + timedelta(days=40)
    res = purge_expired_data(app.state.db, now=later)
    assert res["raw_rows_deleted"] == 1 and res["rate_limit_rows_deleted"] == 1
    assert app.state.db.query("SELECT COUNT(*) AS n FROM scam_reports")[0]["n"] == 0
    assert sum(r["report_count"] for r in c.get("/trends").json()["rows"]) == 1  # aggregates stay


def test_regions_and_categories_lists(clock):
    _, c = make(clock)
    assert len(c.get("/regions").json()["rows"]) == 33
    assert {r["category_code"] for r in c.get("/categories").json()["rows"]} >= {"kyc_bank", "digital_arrest", "fake_qr"}


def test_oversized_body_rejected(clock):
    _, c = make(clock)
    big = json.dumps({"reports": [], "pad": "x" * 70000})
    assert c.post("/reports/batch", content=big, headers={"X-Client-Token": TOKEN, "Content-Type": "application/json"}).status_code == 413
