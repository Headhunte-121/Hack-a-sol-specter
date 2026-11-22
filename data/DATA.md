# Data cards

Every dataset used, with its licence **as stated**. Where a licence is not stated the dataset is **not redistributed** in this repository: it is downloaded locally, used for local training only, and the limitation is stated in the README and evaluation report. Re-check each page before the final submission.

| Source | Link | Downloaded | Size (usable rows after dedupe) | Language | Licence as stated | Used for | In repo? |
|---|---|---|---|---|---|---|---|
| Shade63 scam-classification-multiclass | https://huggingface.co/datasets/Shade63/scam-classification-multiclass | 2026-11-22 | ~7.7k of 14k | English, Indian context | "Same as original dataset" (original not named) | training, per-source eval | **No** |
| CloveAI india-spam-sms | https://huggingface.co/datasets/CloveAI/india-spam-sms | 2026-11-22 | ~5k of 20k | English, Indian style | not stated (README empty) | training, per-source eval | **No** |
| bolewara hinglish-scam-text-dataset | https://huggingface.co/datasets/bolewara/hinglish-scam-text-dataset | 2026-11-22 | ~3.5k | English (UCI SMS Spam) + a few dozen Hinglish | not stated; UCI part has its own terms | training | **No** |
| ysangam Indian_Cyber_Scam_PhoneCall_Hinglish | https://huggingface.co/datasets/ysangam/Indian_Cyber_Scam_PhoneCall_Hinglish_Dataset | 2026-11-22 | 743 unique of 10k | Hinglish call text | not stated | training, call-lexicon ideas | **No** |
| Team-written messages v1/v2 | `ai tuning/data/synthetic*.csv` | 2026-11-22 | ~2.5k | en / hi / hinglish | team-generated (templates) | training | Yes |
| Team-written messages v3 | `data/team/messages_v3.csv` | 2026-11-22 | ~1k (about 500 after dedupe) | hi / hinglish | team-generated (templates) | training | Yes |
| Challenge set v1 | `ai tuning/data/wild_big.csv` | 2026-11-22 | 160 | en / hi / hinglish | team-generated (templates) | final evaluation only, never trained on | Yes |

## Label harmonisation

- Binary label: 1 = scam, 0 = genuine. Source labels are used as given (Shade63: any non-"legit" class is scam).
- Genuine bank transaction alerts and genuine OTP delivery messages are genuine. Promotional spam in the UCI part is labelled as the source labels it (scam), which is a known limitation.

## Splitting

`ml/build_corpus.py`: exact and near-duplicate removal on a masked-token key (links, numbers, amounts replaced by placeholders), group id = template id (team data) or first six masked tokens (public data), then a group-aware 70/15/15 split stratified by (source, label), seed 20261122. The script asserts that no group appears in two splits. The challenge set is removed from the corpus before splitting. File hashes are written to `data/processed/split_meta.json`.

## Known issues

- Public data is almost entirely English and looks templated, so test scores on it are optimistic.
- Hindi (Devanagari) coverage is a few hundred team-written rows.
- The team-generated and challenge sets are template-based and reflect one author's idea of a scam; they are not real-world traffic. No real phone numbers, names or account details are used.
- A model trained on datasets with unstated licences is a derivative; the exported model file is committed as the app requires it, and this limitation is flagged for the organisers.
