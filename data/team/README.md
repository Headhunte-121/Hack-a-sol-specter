# Team-written data

Drop CSV files here. Every `*.csv` in this folder is read by `ml/build_corpus.py`.

| Column | Meaning |
|---|---|
| `text` | The message. Rewritten from a pattern; **no real numbers, names or account details**; never copied from a real person's message |
| `label` | `1` scam, `0` genuine (see `../LABELING.md`) |
| `lang` | `english`, `hindi` or `hinglish` (optional; detected if empty) |
| `group` | A template id: messages made from the same template share a group so they stay in one split (optional) |

Example rows are in `TEMPLATE.csv`. After adding data: `cd ml && python build_corpus.py && python train.py && python evaluate.py && python parity.py`, then run the web tests.

## Independent challenge set

`../challenge_team.csv` (columns `text,label,lang`) is read by `build_corpus.py` as an extra challenge set. It must be written by one person who does not touch the training data. It is never trained on and is scored only in the evaluation. Aim for 60 or more unseen scam and tricky genuine messages.
