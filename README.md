# Suraksha

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
| Learn and quiz | 10 short lessons as swipeable cards, with audio from the lesson recordings or the phone's own voice, 150 questions, a Digital Financial Literacy Score and the weakest topic to study next. Hindi, Chhattisgarhi, English. | Yes |
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

The message model (`2026-11-23.3`) is a regularised logistic regression on character and word n-grams plus 25 interpretable warning signals, calibrated, 0.34 MB, scored by TypeScript on the phone. A parity test checks 247 saved examples against the Python scorer (identical tokens and signals, probabilities within 1e-6). The warning bands start at a calibrated probability of 0.10 (suspicious) and 0.35 (likely scam).

**Read these numbers with care (review of 23 Nov 2026).** This model was trained on 1,184 messages, not the roughly 16,700 it should have used (its work folder did not contain the git-ignored public datasets), and some evaluation messages leaked into its generated training data, so its results on the blind and probe sets are flattering. Its scores on its own "test split" (202 messages) say nothing and are no longer quoted. A corrected retrain (`2026-11-23.4`: full data, a leak guard, capped weight for the generated data, two hard-negative rounds) was evaluated and did **not** meet the acceptance rules, so it was not shipped: it recovered the challenge-set recall (0.887, F1 0.934) but missed too many independently written scams at its chosen cut (probe set 377 of 399, spoken-clip texts 15 of 22, adversarial rewrites 117 of 274). The full comparison is in [docs/retrain_2026-11-23.4_candidate_report.md](docs/retrain_2026-11-23.4_candidate_report.md).

| Set (shipped model) | Messages | Result | Keyword-only baseline F1 |
|---|---|---|---|
| Hand-written challenge set (never trained on) | 160 | precision / recall / F1 (scam, p ≥ 0.5) 0.984 / 0.787 / 0.875; 1 of 80 genuine flagged | 0.222 |
| Probe set written by others | 780 | scams caught 387 of 399; genuine flagged 25 of 381 (flattered by the leak) | |
| Spoken-clip texts as speech-to-text heard them | 40 | scams caught 19 of 22; genuine flagged 0 of 18 | |
| Adversarial rewrites of scams | 274 | caught 120 | |

The challenge set is hand-written but small (160 messages, wide uncertainty) and was inspected during development; the sets written by other people are the more honest numbers. Per-language results, bias checks and calibration are in [docs/evaluation_report.md](docs/evaluation_report.md) (read its status note first).

## Limitations

- The shipped model was trained on far less data than intended and its probe and blind-set results are flattered by leaked rows (see the Evaluation section). Test-split scores on the public datasets are optimistic anyway because that data is templated English. The challenge set was written by the model's authors, so it is not fully blind.
- Hindi (Devanagari) training data is small; Hindi recall on the challenge set is 0.73.
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

Pre-trained models: [intfloat/multilingual-e5-small](https://huggingface.co/intfloat/multilingual-e5-small) (experiments), [Helsinki-NLP/opus-mt-en-hi](https://huggingface.co/Helsinki-NLP/opus-mt-en-hi) (augmentation experiments), Whisper small (OpenAI, MIT licence) through [faster-whisper](https://github.com/SYSTRAN/faster-whisper) (MIT) and CTranslate2 (MIT) for call transcription, and [vasista22/whisper-hindi-small](https://huggingface.co/vasista22/whisper-hindi-small) (Apache-2.0, a Hindi fine-tune of Whisper small) for Hindi speech; the converted copy is built locally with `services/asr/convert_model.py` and is not stored in this repository.

Lesson video narration is a placeholder computer voice made with the unofficial Google Translate text-to-speech endpoint (no stated licence; Hindi voice used for Chhattisgarhi); native-speaker recordings are planned, see [docs/lesson_audio.md](docs/lesson_audio.md).

Libraries: React, Vite, Tailwind CSS, Recharts, jsQR, vite-plugin-pwa, Noto Sans Devanagari (OFL), FastAPI, scikit-learn, PyTorch, Hugging Face Transformers.

Official channels shown in the app: National Cyber Crime Helpline 1930, [cybercrime.gov.in](https://cybercrime.gov.in), [Chakshu on Sanchar Saathi](https://sancharsaathi.gov.in/sfc/)...

## AI tools

Claude Code (Anthropic) was used for code, tests and data generation under the team's direction; details in [docs/ai_usage.md](docs/ai_usage.md).
