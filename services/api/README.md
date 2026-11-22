# Anonymous reports API (Module 5 server)

FastAPI + SQLite. Receives anonymous, opt-in scam reports and serves **aggregates only**.

## Run

```bash
cd services/api
pip install -r requirements.txt
python -m app.seed                      # optional: labelled DEMO data (source='seed')
API_SECRET=change-me uvicorn app.main:app --port 8000
python -m pytest -q                     # 12 tests (set API_AUTOSTART=0 is handled by tests/conftest.py)
```

| Variable | Meaning | Default |
|---|---|---|
| `API_DB` | SQLite file | `data/reports.db` |
| `API_SECRET` | server secret used for the daily token salt (set it in the host settings, never in the repo) | random per start |
| `API_MIN_COUNT` | cells with fewer reports are never returned | 5 |
| `API_RATE_LIMIT` | reports per token per hour | 60 |
| `API_ADMIN_KEY` | enables `POST /alerts` (empty = disabled) | empty |
| `API_CORS` | allowed origins, comma separated | `*` |

## Endpoints

| Method and path | Purpose | Rules |
|---|---|---|
| `POST /reports` | one anonymous report | fixed fields only (`extra=forbid`), values checked against lookup lists, per-token rate limit, returns an acknowledgement only |
| `POST /reports/batch` | queued reports from an offline phone | up to 20, each validated separately, **idempotent** on `client_batch_id` |
| `GET /trends` | counts by week or region (`group=`) with filters | small cells removed |
| `GET /trends/top`, `/trends/overview`, `/trends/rising` | ranked types, week-on-week, sharply rising types | same suppression |
| `GET /regions`, `/categories` | picker lists | cacheable |
| `GET /alerts`, `POST /alerts` | new-scam alerts; publishing needs `X-Admin-Key` | alerts expire; every alert names a source |
| `GET /export` | CSV of aggregates | aggregates only |
| `GET /health` | status | used by the app before syncing |

There is deliberately **no endpoint that returns raw rows**; a test proves that.

## Privacy design

- A report holds: category, channel, region (district chosen from a list, never GPS), risk band, the hour. No free text, no device id, no precise time.
- Rate limiting uses `sha256(daily_salt + token)`, so a token cannot be tracked across days; rate-limit rows are purged after a day, raw app rows after 30 days (`python -m app.seed --purge`). Aggregates are kept.
- Seeded rows are labelled `source='seed'` and every trend response carries `includes_seed` so the app shows a "demo data" banner.
- Logs: use the host's access log only (status and path). Nothing in a request body is printed.

## Note on Supabase

The specification suggests Supabase. A Supabase project needs an account created by the team, so this service implements the same endpoints and rules locally (SQLite) and can be hosted on Render or a Hugging Face Space. Swapping the storage layer for Postgres only touches `app/db.py` and the SQL in `app/main.py`.
