# Test plan

The step-by-step scripts for a team of four, with exact inputs and expected results, are in [TEST_SCRIPTS.md](TEST_SCRIPTS.md). Log results in `test_results_template.csv`. The Hindi / Chhattisgarhi review worksheet is `cg_review.csv`.

What has been checked automatically, what each person should check by hand, and what is still open. Mark results in the Status column.

## Automated tests

| Suite | Command | Covers |
|---|---|---|
| Web (102 tests) | `cd apps/web && npx vitest run` | Python/TypeScript scorer parity (247 examples), detector bands and the saved demo set, link checks, reporting routes (one per routing row), quiz scoring and selection, report builder (no message text can enter), consent gate, call lexicon on 16 transcripts, ten QR codes |
| Reports API (12) | `cd services/api && python -m pytest -q` | validation, idempotent batch sync (counted once), small-cell suppression, raw rows unreadable, rate limit, alerts, purge |
| Transcription service (9) | `cd services/asr && python -m pytest -q` | size, type, length and silence limits, audio deleted after success and after failure, rate limit |
| Content check | `cd apps/web && npm run check:content` | every UI string exists in Hindi and Chhattisgarhi, placeholders match |
| Model pipeline | `cd ml && python build_corpus.py && python train.py && python evaluate.py && python parity.py` | no template group in two splits, metrics, bias checks, export |

## Manual tests per module

Run on a low-cost Android phone with recent Chrome, a second phone with a different screen size, and a laptop. Test once online, then in airplane mode after one online visit.

| # | Module | What to do | Expected | Status |
|---|---|---|---|---|
| 0 | Shell | Open the live link, add to home screen | Installs, opens without an address bar | open |
| 0 | Shell | Switch language on every screen | All visible text changes, no reload | open |
| 0 | Shell | Airplane mode after one visit | Home, language switch, message check, lessons, quiz, reporting guide work | open |
| 0 | Shell | Settings: delete all data | Language, progress, queue and caches are gone | open |
| 0 | Shell | Ship a new build, reopen the app | "New version ready" appears; it never refreshes during a quiz or report | open |
| 1 | Message | Use the 8 example chips, in all three languages | Scam examples are not "looks genuine"; the bank debit alert and OTP examples are "looks genuine" | open |
| 1 | Message | Paste 30 messages in English, Hindi and Hinglish (real-looking, no real numbers) | Every result has a reason in the active language; note every miss | open |
| 1 | Message | Paste `<script>alert(1)</script>`, an emoji-only text, an empty box, a 2000 character text | Shown as text; no crash | open |
| 1 | Message | Watch the browser Network tab while checking | No request is sent | open |
| 2 | Call | Open all examples; paste a transcript | Scam examples show the right script and phrases; genuine ones are not high | open |
| 2 | Call | Upload the 12 recorded clips (needs the service) | Transcript, verdict and phrases for each; fill the clip table | open |
| 2 | Call | Switch the service off | Paste and examples still work; upload shows a clear message and the paste option | open |
| 3 | Report | Walk all five situations | 1930 first when money is lost; Chakshu when nothing is lost; bank then 1930 when a code was shared | open |
| 3 | Report | Reach the right channel from a flagged result | Three taps or fewer | open |
| 3 | Report | Verify 1930, cybercrime.gov.in and Chakshu on the live official sites | Numbers and links match; update `src/report/channels.ts` (`LAST_VERIFIED`) | open |
| 4 | Learn | Complete a full quiz in airplane mode | Same score for the same answers; weakest topic opens its lesson | open |
| 4 | Learn | Read every lesson and question in Hindi and Chhattisgarhi on a small phone | Text fits, font is consistent | open |
| 5 | Trends | Consent card, send a report, check the API | One row with only category, channel, district, risk band, hour | open |
| 5 | Trends | Send a report offline, reconnect | Counted exactly once | open |
| 5 | Trends | Look at a district with few reports | No figure shown | open |
| 5 | Trends | With consent off, watch the Network tab | No request carries report data | open |
| 6 | QR | Scan the ten codes in `docs/qr-test-codes` (screen or print) | Results match the README there; the word "safe" never appears | open |
| 6 | Call card | Open "On a call right now?" in airplane mode | Opens at once, large text, 60 second pause works | open |
| - | Accessibility | Large text, contrast, one-hand use, screen reader on the home and result screens | Usable; fix findings | open |
| - | Usability | Three people outside the team, ten minutes each | They finish the main tasks unaided | open |
| - | PWA audit | Lighthouse PWA audit on the deployed site | Installable, no warnings | open |

## Review needed from people

| Item | Where | Who |
|---|---|---|
| Chhattisgarhi wording | `apps/web/src/i18n/cg.json`, `apps/web/public/content/*.json` (source: `apps/web/scripts/content_source.py`, `strings_*.py`) | A native speaker. Keep wording simple; do not change the meaning of a safety instruction |
| Hindi wording | same files | A Hindi speaker |
| Lesson facts and numbers | `apps/web/public/content/lessons.json` | Check against the official channels |
| Scam-script lexicon | `apps/web/public/model/call_lexicon.json` | Add phrases heard in the recorded clips |

## Data the team adds

| What | Target | Where |
|---|---|---|
| Hinglish scam messages | 150+ | `data/team/*.csv` (see `data/team/README.md`) |
| Hindi (Devanagari) scam messages | 100+ | same |
| Genuine messages that look scary (bank OTPs, delivery notices, bills, reminders) | 150+ | same |
| Independent challenge set, written by one person who does not touch the training data | 60+ | `data/challenge_team.csv` |
| Recorded call clips | 12+ (3 fake KYC, 3 digital arrest, 3 courier/customs, 3 genuine) | see `docs/call_clips.md` |

After adding data run the model pipeline again and replace the exported model; the parity test must pass.

## Known gaps

- Nothing has been run on a real phone or in real airplane mode yet.
- The audio-to-text path was run once with the real Whisper `tiny` model on one spoken English clip (3 timestamped segments, flagged high). No Hindi or Hinglish speech, no phone-quality audio and no `small` or Hindi fine-tuned model has been tried yet.
- Hindi training data is small; Hindi challenge recall is 0.81.
- The challenge set is not fully blind (see `docs/evaluation_report.md`).
- The public datasets have no stated licences and are not redistributed.
- Alerts can only be published through the API with an admin key; there is no admin screen.
- Official channel details were checked through search results, not on the live sites.
