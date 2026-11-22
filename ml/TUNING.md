# Tuning the scam message model

The message checker in the app (`#/message`) runs a small model on the phone. It flags too many genuine messages. This guide sets up the training pipeline on a new PC and gives the loop for fixing false flags with real messages.

A **false flag** is a genuine message that the app shows as **suspicious** or **likely scam**. A **missed scam** is a scam shown as **looks genuine**. Fixing the first must not create more of the second.

## 1. Set up (once, about 5 minutes)

Needs Git, Python 3.11 or newer and Node 22 or newer. Commands are for PowerShell, run from the repository root.

```powershell
git clone https://github.com/Headhunte-121/Hack-a-sol-specter
cd Hack-a-sol-specter
python -m pip install -r ml/requirements.txt
```

Download the four public datasets into `ai tuning/data/ext/` (about 11 MB, git-ignored; their licences are unclear, so never commit them):

```powershell
python -c "from huggingface_hub import snapshot_download as d; [d(r, repo_type='dataset', local_dir='ai tuning/data/ext/' + r.split('/')[1], allow_patterns=['*.csv', '*.parquet', '*.json', '*.md']) for r in ['Shade63/scam-classification-multiclass', 'CloveAI/india-spam-sms', 'bolewara/hinglish-scam-text-dataset', 'ysangam/Indian_Cyber_Scam_PhoneCall_Hinglish_Dataset']]"
```

Without them the pipeline does not fail: it quietly trains on about 1,500 team-written rows only, and the model is much worse. Only data files are downloaded; the Python, notebook and pickle files in those repositories are not trusted and must not be run.

```powershell
cd apps/web
npm ci
cd ../..
```

Check that the setup reproduces the shipped model (about 1 minute):

```powershell
cd ml
python build_corpus.py
python train.py
python evaluate.py
python parity.py
cd ..
git status
```

Expected: `build_corpus.py` prints `"rows": 23501` and `"challenge_rows": 160`; `train.py` prints `suspicious cut=0.05` and `scam cut=0.21` and `46832 features`; `git status` shows only `docs/evaluation.json` changed (two timing numbers). If `apps/web/public/model/model.json` changed, the datasets or library versions differ: fix that before tuning.

## 2. How the pieces fit

| File | Role |
|---|---|
| `ml/textpipe.py` | Reference text pipeline: normalise, mask links / phones / amounts / numbers, tokenise, features, rules, score. `apps/web/src/detector/textpipe.ts` and `model.ts` do exactly the same on the phone. |
| `ml/signals.json` | 19 hand-written rules (`asks_secret_code`, `has_link`, `transaction_notice`, `tells_not_to_share`, ...). Read by Python and by the app. `train.py` copies it to `apps/web/public/model/`. |
| `ml/build_corpus.py` | Public datasets + `ai tuning/data/synthetic*.csv` + every `data/team/*.csv`; dedupes on masked text; group-aware 70/15/15 split; removes the challenge set. Writes `data/processed/` (git-ignored). |
| `ml/train.py` | TF-IDF (character pieces inside words + words + word pairs) + rule flags, logistic regression. Picks C, calibration and the two band cuts on the validation split only. Writes `apps/web/public/model/model.json`. |
| `ml/evaluate.py` | Scores the test split and the 160-message challenge set. Writes `docs/evaluation.json` and `docs/evaluation_report.md`. |
| `ml/parity.py` | Writes `apps/web/src/detector/__fixtures__/parity.json`; the web tests check the phone scores exactly like Python. |
| `ml/check_file.py` | Scores any CSV and prints each false flag and missed scam with the rules and text pieces that moved the score. |

Bands: probability at or above the scam cut is **likely scam**, at or above the suspicious cut is **suspicious**, below is **looks genuine**. The cuts (now 0.05 and 0.21) are in `model.json` under `thresholds` and are chosen by `train.py`.

Where it stands: on the challenge set, 15 of the 80 genuine messages are flagged (7 likely scam, 8 suspicious). The test-split numbers (F1 0.979) are optimistic because that data is templated. A first lead: the `has_link` rule adds about +4.2 to the score, so a genuine delivery message with a tracking link shows as likely scam.

## 3. Collect real messages (privacy first)

Real messages go in `data/real/`, which is git-ignored. Never commit them or upload them anywhere.

Make two CSV files with the columns `text,label,lang,group` (`label` 1 scam, 0 genuine, decided with `data/LABELING.md`; `lang` is `english`, `hindi` or `hinglish`; `group` names the message type, for example `sbi-debit-alert`):

- `data/real/check.csv`, the **measuring set**. Real genuine and real scam messages, never trained on. Aim for 100 or more genuine messages across banks, UPI apps, delivery, telecom, electricity, government and family chat, and 30 or more real scams.
- `data/team/real_v1.csv`, the **training additions** (this one is committed). Different messages from `check.csv`: not the same message with another number, because numbers and links are masked and the two would count as the same.

Before a message goes into `data/team/`, redact it: replace names, account and card digits, OTP values, phone numbers, UPI ids and addresses with fake ones of the same shape (`XX1234`, `98765 43210`, `name@okaxis`, `Ramesh`). Keep the spelling, language mix, punctuation and sender style exactly as they are; that is what the model learns from.

## 4. The tuning loop

1. **Measure.** `cd ml`, then `python check_file.py ../data/real/check.csv`. Save the summary at the end; it is the baseline. If it warns that messages are also in the training corpus, those results say nothing about new messages: replace them in `check.csv` with other messages.
2. **Pick a fix for each false flag**, from what `check_file.py` prints:
   - **A rule fires wrongly** (for example `has_link` on a genuine tracking link, `asks_secret_code` on a genuine OTP message): edit that rule in `ml/signals.json`. Each rule needs one phrase from every group in `groups`, and must not match any phrase in `none`. Phrases are lower-case words after masking; a trailing `*` matches the start of a word; links become `urltok`, `urlshorttok` or `urlsusptok`, phone numbers `phonetok`, amounts `amounttok`, other long numbers `numtok`. Add the genuine wording to `none` or narrow a phrase, and bump the file's `version`.
   - **A normal message type the model has never seen** (a bank's alert format, a Hinglish family message about money): add 5 to 20 redacted genuine messages of that type to `data/team/real_v1.csv` with one shared `group`. Add a few real scams of a nearby type too, so the model learns the difference and not "this bank is always safe".
   - Never edit `model.json` or the cuts by hand, never train on `check.csv` or the challenge set, never delete scam rows to lower the count.
3. **Retrain.** In `ml`: `python build_corpus.py`, `python train.py`, `python evaluate.py`, `python parity.py`.
4. **Re-measure** with `check_file.py`. Keep the change only if:
   - false flags on `check.csv` go down,
   - missed scams on `check.csv` do not go up,
   - in `docs/evaluation_report.md` the challenge-set recall does not drop by more than 0.02 and F1 does not drop, and the test-split F1 stays about 0.98.
5. **Run the web tests:** `cd apps/web`, then `npm test`. All must pass. If a test that expects a band for a specific message fails, change the test only when the new answer is clearly right under `data/LABELING.md`.
6. **Try it in the app:** `cd apps/web`, `npm run dev`, open `http://localhost:5173/#/message` and paste a few of the fixed messages (redacted).

Change one rule or one message type at a time, so it is clear what helped.

`ml/textpipe.py` and `apps/web/src/detector/textpipe.ts` must stay identical. Prefer rule and data changes; if the pipeline itself must change, change both files the same way and the parity test will confirm it.

## 5. Commit

Work on a branch `module/model-tuning`. In `ml/train.py`, bump `VERSION` (for example `2026-11-24.1`) before the final retrain.

Commit: `ml/signals.json`, `ml/train.py`, `apps/web/public/model/model.json`, `apps/web/public/model/signals.json`, `apps/web/src/detector/__fixtures__/parity.json`, `docs/evaluation.json`, `docs/evaluation_report.md`, `data/team/real_v1.csv` (redacted only), and a new row for it in `data/DATA.md`.

Never commit `data/real/`, `ai tuning/data/ext/` or `data/processed/`.
