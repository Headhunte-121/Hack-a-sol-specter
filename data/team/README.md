# Team-written data

Drop CSV files here. Every `*.csv` in this folder is read by `ml/build_corpus.py`.

| Column | Meaning |
|---|---|
| `text` | The message. **No real numbers, names or account details.** Either written from a pattern, or a real message from a team member's own phone, redacted as described in `../../ml/TUNING.md` |
| `label` | `1` scam, `0` genuine (see `../LABELING.md`) |
| `lang` | `english`, `hindi` or `hinglish` (optional; detected if empty) |
| `group` | A template id: messages made from the same template share a group so they stay in one split (optional) |

Example rows are in `TEMPLATE.csv`. After adding data: `cd ml && python build_corpus.py && python train.py && python evaluate.py && python parity.py`, then run the web tests. The full setup and tuning loop is in `../../ml/TUNING.md`.

## Independent challenge set

`../challenge_team.csv` (columns `text,label,lang`) is read by `build_corpus.py` as an extra challenge set. It must be written by one person who does not touch the training data. It is never trained on and is scored only in the evaluation. Aim for 60 or more unseen scam and tricky genuine messages.

## What the team should collect

Real-world material is the weakest part of the training data, so this is the most valuable thing a team member can add. Each person works alone on their own phone; nothing is shared except the redacted CSV.

| Item | Target | Where it goes |
|---|---|---|
| Genuine messages seen on a real phone: bank debit and credit alerts, UPI confirmations, delivery updates, utility bills, telecom plan notices, government scheme and Aadhaar status notices, service verification codes, appointment and EMI reminders, official-link sale messages | 120 or more across English, Hindi and Hinglish | the collector's own half goes to `real_v2.csv` here (training); the other half goes to `../real/check.csv` (the measuring set, git-ignored, never trained on) |
| Scam messages you actually received | 40 or more | same split |
| An independent set of tricky genuine messages and scams, written by hand by **one** person who does not look at the training data or any generator | 100 or more | `../challenge_team.csv` |
| Acted call clips (consent from everyone in them) | 12 or more | see `../../docs/call_clips.md`; audio stays out of the repository |

**Split by person, not by message.** Everything one person collects goes to one side. Two people's messages from the same bank look alike, and a mix of the same person's messages in training and measuring would make the measuring numbers look better than they are.

## Redaction checklist

Replace every one of these with a made-up value of the **same shape**, and keep everything else exactly as it was (spelling, language mix, punctuation, sender style):

- names and addresses (`Ramesh`, `Raipur`)
- account and card digits (`XX1234`)
- OTP values and reference numbers (`482913`)
- phone numbers (`98765 43210`)
- UPI ids (`name@okaxis`)
- tracking parts of a link (keep the real domain, drop the long id after it)

Never include real Aadhaar, PAN or account numbers, real names, anyone else's private chat without their consent, or any message you are not allowed to share.

## Hand-in checklist

1. The file has the columns `text,label,lang,group` (`lang` is `english`, `hindi` or `hinglish`; `group` names the message type, for example `sbi-debit-alert`).
2. The label was decided with `../LABELING.md`. A message you are unsure about goes to a second person; if you still disagree, drop it and count it.
3. No duplicates, and nothing that appears in the measuring set also appears in the training file.
4. If `ml/redact_check.py` exists in the repository, run `python ml/redact_check.py` and fix everything it reports.
5. Tell the maintainer which file is yours, so it is added to a single side of the split.
