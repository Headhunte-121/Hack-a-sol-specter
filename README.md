# Specter: Scam Shield

An installable web app (PWA) that helps first-time digital payment users in Chhattisgarh spot scam messages and calls, report fraud through the right official channel, and learn payment safety in Hindi, Chhattisgarhi and English. Most of it works with no internet.

Built for Hack-a-Sol 5.0, GovTech & Impact track, problem statement GT-02.

## Who it is for

A first-time smartphone payments user in a rural or semi-urban household, comfortable in Hindi or Chhattisgarhi, on a mid-range Android phone with patchy data, who is targeted by OTP scams, fake KYC messages, fake QR codes and calls from "bank staff", "police" or "customs". A second user is a district bank or administration analyst who needs to see which scams are spreading where.

## What it does

| Module | What you get | Works offline |
|---|---|---|
| Check a message | Paste an SMS, WhatsApp text or link. Verdict (likely scam / suspicious / looks genuine), highlighted words, plain-language reasons, next steps. English, Hindi, Hinglish. | Yes |
| Check a call | Transcript analysis for fake KYC, digital arrest, fake courier/customs, electricity and lottery scripts, with the phrases heard and when. Paste text, example calls, or upload / record audio. | Paste and examples: yes. Audio to text: needs internet |
| Report a scam | Two questions, then 1930 helpline, cybercrime.gov.in or Chakshu (Sanchar Saathi), an evidence checklist and a copyable summary. | Yes (opening a portal needs internet) |
| Learn and quiz | 7 short lessons, 28 questions, a Digital Financial Literacy Score and the weakest topic to study next. Hindi, Chhattisgarhi, English. | Yes |
| Scam trends | Anonymous, opt-in counts by district and scam type, charts with table alternatives, new-scam alerts. | Last saved copy |
| Check a QR | Reads a QR code, shows the UPI payee and amount, flags risky structure. Never says a code is "safe". | Yes |
| On a call right now? | One-tap card with what to do while a suspicious caller is on the line. | Yes |

## Architecture

```mermaid
flowchart LR
  subgraph Phone["Phone (PWA, works offline)"]
    A[App shell + service worker] --> B[Message detector<br/>on-device linear model]
    A --> C[Reporting guide]
    A --> D[Lessons + quiz]
    A --> E[Call analysis<br/>stage rules + model]
    A --> F[Fake-QR checker]
    A --> Q[(Offline report queue)]
  end
  E -- audio, optional --> S[Transcription service<br/>FastAPI + faster-whisper]
  Q -- anonymous counts, opt-in --> R[Reports API<br/>FastAPI + SQLite]
  R --> T[Aggregates with small cells hidden]
  T --> A
```

Everything that can run on the phone does. Message text never leaves the phone. Audio goes to the transcription service only when the user chooses it and is deleted right after. Only opted-in anonymous counts (scam type, channel, district, risk level, the hour) reach the reports API.

## Repository layout

| Path | Contents |
|---|---|
| `apps/web` | The PWA: `src/shell`, `detector`, `call`, `report`, `learn`, `dashboard`, `qr`; model and content in `public/` |
| `services/api` | Anonymous reports API and trends |
| `services/asr` | Speech-to-text service for the call screen |
| `ml` | Training, evaluation, export and parity pipeline for the on-device model |
| `data` | Data cards (`DATA.md`) and team-written messages |
| `docs` | Evaluation report, scoring design, architecture notes, test plan |
| `ai tuning` | Model experiments (larger models, ablations, GPU fine-tuning) |

## Run it

On Windows, double-click `start-all.bat`: it seeds labelled demo data, starts the reports API (port 8000), optionally the transcription service (8001), builds and serves the web app (http://localhost:4173) and opens the browser. `stop-all.bat` closes everything. Or run the pieces by hand:

```bash
# web app
cd apps/web
npm install
npm run dev                 # http://localhost:5173
npm test                    # unit + parity tests
npm run build               # production build with service worker

# reports API (optional, powers the trends screen)
cd services/api
pip install -r requirements.txt
python -m app.seed          # labelled demo data
API_SECRET=change-me uvicorn app.main:app --port 8000

# transcription service (optional, powers audio upload)
cd services/asr
pip install -r requirements.txt
uvicorn app.main:app --port 8001
```

Point the app at the services with `VITE_API_BASE=http://localhost:8000` and `VITE_ASR_BASE=http://localhost:8001` (public values only, no secrets). Tests: `python -m pytest -q` inside `services/api` and `services/asr`.

## Evaluation

The message model is a regularised logistic regression on character and word n-grams plus 17 interpretable warning signals, calibrated, 1.3 MB, scored by TypeScript on the phone. A parity test checks 247 saved examples against the Python scorer (identical tokens and signals, probabilities within 1e-6).

| Set | Messages | Precision / recall / F1 (scam) | Keyword-only baseline F1 |
|---|---|---|---|
| Group-aware test split | 3,050 | 0.991 / 0.967 / 0.979 | 0.130 |
| Hand-written challenge set | 160 | 0.911 / 0.900 / 0.906 | 0.222 |

Full per-language results, bias checks, calibration and the most confident mistakes are in [docs/evaluation_report.md](docs/evaluation_report.md).

## Limitations

- The test split is mostly templated English data and its score is optimistic. The challenge set was written by the model's authors, so it is not fully blind.
- Hindi (Devanagari) training data is small; Hindi recall on the challenge set is 0.81.
- Call analysis supports Hindi and Hinglish only. There is no speech recognition for Chhattisgarhi, and audio transcription needs a connection.
- Live detection during a call is not possible in a web app: phone systems do not let browsers hear a call in progress. The "On a call right now?" card is the substitute.
- Scammers change wording; the model reflects its training data only. No check is perfect, and the app never calls anything "safe".
- The trends screen is indicative, not official statistics. Demo data is always labelled.
- The app does not file complaints and cannot recover money.
- Chhattisgarhi text uses working translations that need confirmation by a native speaker.

## Privacy and security

- Consent to share anonymous counts is off by default and can be switched off at any time; switching it off discards anything queued.
- Reports hold four fixed fields and the hour. A unit test proves message text cannot enter a report, and an API test proves the public interface cannot read raw rows.
- Groups with fewer than 5 reports are hidden before data leaves the server.
- Rate limiting uses a token hashed with a daily salt. No accounts, no device identifiers, no location.
- All text is rendered as plain text; a strict content security policy ships with the hosting configuration.

## Data, models and credits

Public datasets (downloaded from Hugging Face; licences are not stated on the dataset pages, so they are used for local training only and are not redistributed here): [Shade63/scam-classification-multiclass](https://huggingface.co/datasets/Shade63/scam-classification-multiclass), [CloveAI/india-spam-sms](https://huggingface.co/datasets/CloveAI/india-spam-sms), [bolewara/hinglish-scam-text-dataset](https://huggingface.co/datasets/bolewara/hinglish-scam-text-dataset), [ysangam/Indian_Cyber_Scam_PhoneCall_Hinglish_Dataset](https://huggingface.co/datasets/ysangam/Indian_Cyber_Scam_PhoneCall_Hinglish_Dataset). Full data cards: [data/DATA.md](data/DATA.md).

Pre-trained models: [intfloat/multilingual-e5-small](https://huggingface.co/intfloat/multilingual-e5-small) (experiments), [Helsinki-NLP/opus-mt-en-hi](https://huggingface.co/Helsinki-NLP/opus-mt-en-hi) (augmentation experiments), Whisper through [faster-whisper](https://github.com/SYSTRAN/faster-whisper) (call transcription).

Libraries: React, Vite, Tailwind CSS, Recharts, jsQR, vite-plugin-pwa, Noto Sans Devanagari (OFL), FastAPI, scikit-learn, PyTorch, Hugging Face Transformers.

Official channels shown in the app: National Cyber Crime Helpline 1930, [cybercrime.gov.in](https://cybercrime.gov.in), [Chakshu on Sanchar Saathi](https://sancharsaathi.gov.in/sfc/).

## AI tools

Claude Code (Anthropic) was used for code, tests and data generation under the team's direction; details in [docs/ai_usage.md](docs/ai_usage.md).
