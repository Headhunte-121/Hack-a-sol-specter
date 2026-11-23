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

Without them `build_corpus.py` stops with exit status 2 (fewer than 15,000 usable external rows, a missing external source, or a missing `ai tuning/data/wild_big.csv`): it no longer trains quietly on a few hundred team-written rows. Only data files are downloaded; the Python, notebook and pickle files in those repositories are not trusted and must not be run.

**Working in a git worktree?** A worktree contains tracked files only, so the git-ignored folders `ai tuning/data/ext` and `data/real` are missing there. Make directory junctions to the main checkout's folders (never commit through them; git ignores both):

```powershell
$S = "<path of the main checkout>"
New-Item -ItemType Junction -Path "ai tuning\data\ext" -Target "$S\ai tuning\data\ext"
New-Item -ItemType Junction -Path "data\real" -Target "$S\data\real"
```

`data/real/blind_eval_2026-11-23/` holds the frozen evaluation sets (blind, probe, OTP, clip and evasion texts). They are never trained on or tuned on; `ml/leak_check.py` removes every training row that matches them (exact masked text, near-duplicate signature, or token-set similarity of 0.85 or more), `build_corpus.py` applies it, and `train.py` refuses to train if any row still matches.

```powershell
cd apps/web
npm ci
cd ../..
```

Build and train a candidate (about 3 minutes). The app's model is not touched unless you add `--ship`:

```powershell
cd ml
python build_corpus.py
python train.py
python evaluate.py --model artifacts/candidate/model.json
cd ..
python -m pytest ml
```

Expected: `build_corpus.py` prints the environment guard (about 22,100 usable external rows, `wild_big.csv` present), `"rows": 24422`, `"challenge_rows": 160` and a zero-match leak check; `train.py` prints `leak guard: 0 of 24422 corpus rows match ...`, cuts 0.31 / 0.46, 49,945 features, and writes `ml/artifacts/candidate/model.json` (SHA-256 `8ae68abc...`, byte-identical on every re-run). **That candidate (2026-11-23.4) is not the model in the app.** The app ships `2026-11-23.3`, trained earlier on a truncated corpus; the candidate was evaluated on 23 Nov 2026 and rejected (`docs/retrain_2026-11-23.4_candidate_report.md`), so these commands do not reproduce the shipped file. If `build_corpus.py` stops with exit status 2, the git-ignored datasets are missing: fix the junctions above, do not use `--allow-small`.

## 2. How the pieces fit

| File | Role |
|---|---|
| `ml/textpipe.py` | Reference text pipeline: normalise, mask links / phones / amounts / numbers, tokenise, features, rules, score. `apps/web/src/detector/textpipe.ts` and `model.ts` do exactly the same on the phone. |
| `ml/signals.json` | 25 hand-written rules (`asks_secret_code`, `has_link`, `transaction_notice`, `tells_not_to_share`, ...). Read by Python and by the app. `train.py` copies it to `apps/web/public/model/`. |
| `ml/build_corpus.py` | Public datasets + `ai tuning/data/synthetic*.csv` + every `data/team/*.csv`; dedupes on masked text; removes every frozen evaluation text (challenge sets, blind / probe / OTP / clip / evasion sets) with `leak_check`; group-aware 70/15/15 split (generated groups are also stratified by message family). Refuses to run on incomplete data (`--allow-small` only for tests). Writes `data/processed/` (git-ignored). |
| `ml/leak_check.py` | The leak guard. `python leak_check.py [--drop]` reports (file, row, group, frozen set, rule; never the text) every training row that equals a frozen evaluation text after masking, shares its first six and last four tokens, or has token-set similarity of 0.85 or more. Exit status 1 when anything is found. |
| `ml/gen_team_data.py` | Generates `data/team/trap_genuine_v1.csv` and `scam_gap_v1.csv` (template families, one group per sentence structure, hard-negative rounds `h1`, `h2`). Filters every row against the frozen texts before writing. |
| `ml/train.py` | TF-IDF (character pieces inside words + words + word pairs) + rule flags, logistic regression. Rows are weighted by source and message family (the generated trap / gap data carries at most 15% of the weighted mass, no other source more than 30%). Picks C and the calibration on the validation split; picks the two band cuts with the 97% recall / 97% precision policy on a larger realistic slice (validation rows plus out-of-family predictions for the team-written training rows). Seeded: a re-run is byte-identical. Refuses a truncated or leaky corpus. Writes `ml/artifacts/candidate/model.json`; `--ship` writes `apps/web/public/model/model.json` instead. |
| `ml/evaluate.py` | Scores the test split (a development run). With `--measure` it also scores the 160-message challenge set and the frozen blind / probe / OTP / clip / evasion sets, at most 3 times in total (logged in `ml/artifacts/measurements.json`). Prints the cuts read from `model.json`, the trade-off curve, per-language and per-family tables and bootstrap intervals; for the shipped model it writes `docs/evaluation.json` and `docs/evaluation_report.md`. |
| `ml/parity.py` | Writes `apps/web/src/detector/__fixtures__/parity.json`; the web tests check the phone scores exactly like Python. |
| `ml/check_file.py` | Scores any CSV and prints each false flag and missed scam with the rules and text pieces that moved the score. |
| `ml/test_*.py` | Unit tests (`python -m pytest ml`): the leak rules, the build and training guards, the weights and cuts, the generator, `evaluate.py`, the personal-data scan. |

Bands: probability at or above the scam cut is **likely scam**, at or above the suspicious cut is **suspicious**, below is **looks genuine**. The cuts (0.10 and 0.35 in the shipped model) are in `model.json` under `thresholds` and are chosen by `train.py`.

Where it stands (23 Nov 2026): the shipped model `2026-11-23.3` was trained on 1,184 rows and has challenge-set recall 0.787 (F1 0.875). The corrected retrain (candidate `2026-11-23.4`) has recall 0.887 / F1 0.934 but missed too many independently written scams at its chosen cut, so it was not shipped; the report lists what to try next. Test-split numbers on the public data (F1 about 0.98) are optimistic because that data is templated.

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
3. **Retrain.** In `ml`: `python build_corpus.py`, `python train.py` (writes a candidate), `python evaluate.py --model artifacts/candidate/model.json`. Only when the candidate passes the checks below: `python train.py --ship`, `python parity.py`, `python evaluate.py --measure` (see step 4).
4. **Re-measure** with `check_file.py`. Keep the change only if:
   - false flags on `check.csv` go down,
   - missed scams on `check.csv` do not go up,
   - in `docs/evaluation_report.md` the challenge-set recall does not drop by more than 0.02 and F1 does not drop, and the test-split F1 stays about 0.98.

   The challenge set and the frozen sets in `data/real/blind_eval_*` are for measuring, not for tuning: `evaluate.py --measure` is limited to 3 runs in total and never shows individual messages. Decide changes from the validation split, the family tables printed by `train.py` and your own `check.csv`.
5. **Run the web tests:** `cd apps/web`, then `npm test`. All must pass. If a test that expects a band for a specific message fails, change the test only when the new answer is clearly right under `data/LABELING.md`.
6. **Try it in the app:** `cd apps/web`, `npm run dev`, open `http://localhost:5173/#/message` and paste a few of the fixed messages (redacted).

Change one rule or one message type at a time, so it is clear what helped.

`ml/textpipe.py` and `apps/web/src/detector/textpipe.ts` must stay identical. Prefer rule and data changes; if the pipeline itself must change, change both files the same way and the parity test will confirm it.

## 5. Commit

Work on a branch `module/model-tuning`. In `ml/train.py`, bump `VERSION` (for example `2026-11-24.1`) before the final retrain.

Commit: `ml/signals.json`, `ml/train.py`, `apps/web/public/model/model.json`, `apps/web/public/model/signals.json`, `apps/web/src/detector/__fixtures__/parity.json`, `docs/evaluation.json`, `docs/evaluation_report.md`, `data/team/real_v1.csv` (redacted only), and a new row for it in `data/DATA.md`. Before the last commit run `python ml/leak_check.py`, `python ml/redact_check.py`, `python -m pytest ml` and, in `apps/web`, `npm test`, `npx tsc --noEmit`, `npm run build`, `npm run check:content`.

Never commit `data/real/`, `ai tuning/data/ext/` or `data/processed/`.
