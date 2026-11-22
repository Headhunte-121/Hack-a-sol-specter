"""Seed script (seedDemoData) and purge script (purgeExpiredData).

Seeded rows are a clearly labelled SYNTHETIC dataset: source='seed'. The dashboard shows a demo banner whenever they are included.
Usage:  python -m app.seed          (from services/api, creates data/reports.db demo data)
        python -m app.seed --purge  (apply the retention rule)
"""
from __future__ import annotations

import os
import random
import sys
from datetime import datetime, timedelta, timezone

from .db import Database
from .regions import CATEGORIES, CHANNELS, REGIONS

# Larger districts get more demo reports; a few remote ones stay below the suppression threshold on purpose.
WEIGHT = {"raipur": 10, "durg": 8, "bilaspur": 8, "korba": 5, "raigarh": 4, "rajnandgaon": 4, "bastar": 2, "surguja": 2, "janjgir_champa": 3, "mahasamund": 2, "dhamtari": 2,
          "kanker": 1, "sukma": 0.15, "narayanpur": 0.15, "bijapur": 0.15}
CATEGORY_BASE = {"kyc_bank": 5, "otp": 4, "digital_arrest": 2, "courier_customs": 2, "lottery_prize": 2, "loan_app": 2, "investment_job": 3, "phishing_link": 4, "payment_request": 3, "fake_qr": 1, "other": 1}
CHANNEL_FOR = {"kyc_bank": ["sms", "call"], "otp": ["call", "sms"], "digital_arrest": ["call"], "courier_customs": ["call", "sms"], "fake_qr": ["qr"]}


def seed_demo_data(db: Database, now: datetime | None = None, weeks: int = 8, seed: int = 42) -> int:
    rnd = random.Random(seed)
    now = now or datetime.now(timezone.utc)
    inserted = 0
    for w in range(weeks):                      # w = 0 is the most recent week
        age = weeks - 1 - w
        for code, _, _ in REGIONS:
            wt = WEIGHT.get(code, 0.6)
            for cat in CATEGORIES:
                base = CATEGORY_BASE[cat] * wt * (0.8 + 0.4 * rnd.random())
                if cat == "digital_arrest":
                    base *= 0.5 + (weeks - age) * 0.35        # digital-arrest reports rise over the period (demo story)
                if cat == "fake_qr":
                    base *= 0.2 if age > 2 else 1.6          # fake-QR reports appear recently
                for _ in range(int(round(base / 2))):
                    day = now - timedelta(days=age * 7 + rnd.randint(0, 6))
                    ch = rnd.choice(CHANNEL_FOR.get(cat, list(CHANNELS)))
                    db.execute("INSERT OR IGNORE INTO scam_reports (created_hour, scam_category, channel, region_code, risk_band, source, client_batch_id) VALUES (?,?,?,?,?,'seed',?)",
                               (day.strftime("%Y-%m-%dT%H:00:00Z"), cat, ch, code, rnd.choice(["likely_scam", "suspicious"]), f"seed-{seed}-{inserted:07d}"))
                    db.execute("""INSERT INTO daily_aggregates VALUES (?,?,?,?, 'seed', 1)
                                  ON CONFLICT(date, region_code, scam_category, channel, source) DO UPDATE SET report_count = report_count + 1""",
                               (day.strftime("%Y-%m-%d"), code, cat, ch))
                    inserted += 1
    return inserted


def purge_expired_data(db: Database, now: datetime | None = None, retention_days: int = 30) -> dict[str, int]:
    """Delete rate-limit logs older than a day and raw app rows older than the retention period. Aggregates and demo rows are kept."""
    now = now or datetime.now(timezone.utc)
    rl = db.execute("DELETE FROM rate_limit_log WHERE window_start < ?", ((now - timedelta(days=1)).strftime("%Y-%m-%dT%H"),)).rowcount
    raw = db.execute("DELETE FROM scam_reports WHERE source='app' AND created_hour < ?", ((now - timedelta(days=retention_days)).strftime("%Y-%m-%dT%H:00:00Z"),)).rowcount
    return {"rate_limit_rows_deleted": rl, "raw_rows_deleted": raw}


if __name__ == "__main__":
    database = Database(os.environ.get("API_DB", "data/reports.db"))
    if "--purge" in sys.argv:
        print(purge_expired_data(database))
    else:
        print(f"seeded {seed_demo_data(database)} demo reports (source='seed')")
