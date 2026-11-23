# Production Deployment Guide

Suraksha uses an offline-first architecture. The core detection engine runs entirely in the user's browser without contacting any server. Two online cloud services complement the client:

```
┌────────────────────────┐         ┌────────────────────────┐         ┌────────────────────────┐
│    Vercel Project A    │  HTTPS  │    Vercel Project B    │  TCP    │    Supabase Postgres   │
│  (React PWA / Static)  ├────────►│    (FastAPI Backend)   ├────────►│   Transaction Pooler   │
│   apps/web             │  CORS   │   services/api         │  :6543  │    Port 6543 / RLS     │
└────────────────────────┘         └────────────────────────┘         └────────────────────────┘
            │                                  │
  VITE_API_BASE=https://api...         DATABASE_URL=postgresql://...
  VITE_ASR_BASE=(optional local)       CRON_SECRET, API_SECRET, API_CORS
```

- **Vercel Project A (`apps/web`)**: Client-side React 19 PWA, pre-compiled static assets, Service Worker caching.
- **Vercel Project B (`services/api`)**: Serverless Python function running FastAPI for community scam trend aggregation and anonymous reports.
- **Supabase Postgres**: Managed PostgreSQL database accessed through the Supavisor transaction pooler with strict Row Level Security (RLS).
- **Speech Service (`services/asr`)**: Optional, local-only service run on the developer's workstation via ngrok when speech demos are needed; not hosted on cloud serverless.

---

## 1. Supabase Database Setup

### 1.1 Project Creation
1. Sign in to [Supabase](https://supabase.com) and create a new project on the **Free Plan**.
2. Select the region nearest your users (e.g., `ap-south-1` Mumbai).
3. Choose a strong database password and store it in your password manager.

### 1.2 Connection Strings
Supabase provides two IPv4 pooler connection strings under **Project Settings → Database → Connection Pooling**:
- **Session Mode (Port 5432)**: Used for applying schema DDL and running one-time seed scripts.
- **Transaction Mode (Port 6543)**: Used by Vercel serverless functions. Transaction mode handles high-frequency connection pooling with low overhead. *Note: Transaction mode does not support server-side prepared statements (`prepare_threshold=None` is configured in our adapter).*

### 1.3 Apply Schema & Seed
1. In the Supabase dashboard, open the **SQL Editor**, paste the contents of `services/api/schema.sql`, and run it.
   *(Alternatively, run `psql "<session-connection-string-port-5432>" -f services/api/schema.sql`).*
2. Populate the verified demo dataset from your local terminal using the session pooler:
   ```bash
   DATABASE_URL="<session-mode-connection-string-port-5432>" python -X utf8 -m app.seed
   ```
   This inserts labeled benchmark records (`source='seed'`) and lookup table values.

### 1.4 Row Level Security (RLS) Lockdown
Every table in the `public` schema has RLS enabled with **zero public policies**. The backend accesses Postgres directly as the table owner (bypassing RLS), while Supabase's auto-generated REST/Data API exposes nothing:
1. Verify RLS is active on all tables in the Supabase SQL Editor:
   ```sql
   SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
   ```
   All rows must return `rowsecurity = true`.
2. Test unauthorized access using the project's anonymous publishable key:
   ```bash
   curl -i "https://<your-project-id>.supabase.co/rest/v1/scam_reports?select=*" \
     -H "apikey: <your-anon-key>" \
     -H "Authorization: Bearer <your-anon-key>"
   ```
   Must return an empty array `[]` or a `401/403 Permission Denied` status.

---

## 2. Backend Deployment: Vercel Project B (`services/api`)

### 2.1 Project Creation
1. Open the [Vercel Dashboard](https://vercel.com) and click **Add New → Project**.
2. Import the `Hack-a-sol-specter` repository.
3. Configure the project settings:
   - **Project Name**: e.g., `suraksha-api`
   - **Framework Preset**: Other
   - **Root Directory**: `services/api`
4. Deploy the production branch (`main`) or your module preview branch.

### 2.2 Environment Variables
Add the following environment variables in **Project Settings → Environment Variables** (for Production and Preview):

| Variable | Description | Example / Format |
| :--- | :--- | :--- |
| `DATABASE_URL` | Supabase **Transaction Pooler** string (port 6543) | `postgresql://postgres.[ref]:[password]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres` |
| `API_SECRET` | Daily salt secret for report token hashing | 32+ hex characters (e.g. from `openssl rand -hex 32`) |
| `API_ADMIN_KEY` | Key for posting system alert banners | Random secret string |
| `API_CORS` | Allowed web frontend origin(s) | `https://hack-a-sol-specter.vercel.app,http://localhost:5173` |
| `CRON_SECRET` | Bearer token for Vercel daily cron trigger | Random secret string |
| `API_AUTOSTART` | Initialize FastAPI app instance at import time | `1` |

### 2.3 Automated Retention & Keep-Alive Cron
`services/api/vercel.json` configures a daily cron job scheduled at 03:00 UTC:
- Endpoint: `POST /internal/purge`
- Header: `Authorization: Bearer <CRON_SECRET>`
- Purpose: Cleans up expired rate-limit tracking rows, purges raw app reports past the retention window, and touches the database to keep Supabase's free project active.

---

## 3. Web Frontend: Vercel Project A (`apps/web`)

### 3.1 Environment Variables
Set in the frontend Vercel project settings:

| Variable | Description | Value |
| :--- | :--- | :--- |
| `VITE_API_BASE` | URL of Vercel Project B (no trailing slash) | `https://suraksha-api-xi.vercel.app` (Vercel adds a suffix when the plain name is taken: use the address shown in the project's Domains list, never a guessed one) |
| `VITE_ASR_BASE` | Optional speech server endpoint | Leave unset in production unless local speech tunnel is active |

### 3.2 Build & Verification
When `VITE_API_BASE` is configured:
- The **Trends Dashboard** fetches live community aggregation metrics. If offline or unreachable, it smoothly falls back to on-device cached metrics.
- The **Settings** page displays the **Server status** card with real-time health indicator dots for the Reports API and Speech Server.
- When `VITE_ASR_BASE` is unset or unreachable, the **Call Check** interface gracefully displays a localized notice and defaults to text paste and demo calls.

---

## 4. Smoke Testing & Verification

Run the automated smoke test script against your deployed backend:

```bash
bash scripts/smoke.sh https://<your-api-url>.vercel.app https://<your-web-url>.vercel.app
```

The script verifies:
1. `GET /health` returns `200 OK` with JSON `{"status": "ok", "version": ...}`.
2. CORS preflight (`OPTIONS /reports`) returns allowed origin and methods.
3. CORS actual request honors allowed origins.
4. Anonymous report submission (`POST /reports/batch`) succeeds idempotently.
5. Public endpoints (`GET /trends/overview?demo=0`) return valid aggregates.
6. Raw data endpoints (`GET /reports`, `GET /raw`) return `404/405` (no raw leaks).

---

## 5. Rollback & Maintenance Procedures

### 5.1 Instant Rollback
Vercel keeps immutable deployment artifacts:
1. In the Vercel Dashboard, go to **Deployments**.
2. Locate the last known good deployment.
3. Click the three dots `...` and select **Promote to Production**.
4. The change takes effect instantaneously without re-running builds.

### 5.2 Supabase Inactivity Pause
Supabase free tier databases pause after 7 days of total inactivity:
- The daily Vercel cron job `/internal/purge` prevents pausing by querying the database every 24 hours.
- If paused before a demo, visit the Supabase dashboard and click **Restore Project** (takes ~1-2 minutes).

---

## 6. Optional Local Speech Service (ASR)

The transcription service requires heavy neural network models (Whisper / Indic-Whisper) unsuitable for Vercel serverless. To use voice transcription during live demos:
1. Run the local speech server on a machine with Python / GPU:
   ```bash
   cd services/asr
   python -m uvicorn app:app --port 8001
   ```
2. Start an ngrok tunnel:
   ```bash
   ngrok http 8001
   ```
3. Set `VITE_ASR_BASE=https://<ngrok-id>.ngrok-free.dev` in the local `.env` or temporary frontend deployment.
