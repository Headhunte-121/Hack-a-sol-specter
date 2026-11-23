# Reviewing the Hindi and Chhattisgarhi text

Every Hindi and Chhattisgarhi string in the app was drafted with AI help and must be reviewed by a native speaker: a mistranslated instruction in a safety app is worse than none. This is the whole process; it needs no programming.

## For the reviewer

1. The maintainer sends you a spreadsheet (`review_sheet.csv`). Open it in Excel or Google Sheets (File, Import, UTF-8).
2. Each row is one piece of text. Read the English (`en`), then the Hindi (`hi`) and the Chhattisgarhi (`cg`).
3. In `hi_verdict` and `cg_verdict` write one of:
   - `ok`: it is correct, natural and easy for a first-time smartphone user to understand;
   - `fix`: write the corrected text in `hi_correction` or `cg_correction`;
   - `unsure`: you cannot tell; say why in `notes`.
4. Rules for corrections: keep placeholders such as `{n}` or `{pct}` exactly as they are; write English words and abbreviations in Devanagari (ओटीपी, पिन, केवाईसी, यूपीआई), never in Latin letters; keep instructions short and in the polite form the rest of the app uses; never blame the person who was scammed.
5. Send the file back. Rows you leave empty are simply skipped, so you can review in several sittings.

## For the maintainer

From `apps/web`:

```bash
python -X utf8 scripts/review.py status                       # how many strings are reviewed
python -X utf8 scripts/review.py export --out ../../review_sheet.csv --only-open
python -X utf8 scripts/review.py import ../../review_sheet.csv --by "Reviewer name"
```

- `import` records each verdict in `apps/web/src/i18n/review.json`. A `fix` is written straight into the right `scripts/strings_*.py` file and the language files are regenerated; the import refuses a correction that changes the placeholders or contains Latin letters.
- A review is tied to the exact English and translated text it was given for. If either changes later, the string shows as **changed since review** and appears in the next export.
- Do not commit the spreadsheet; commit `review.json` and the corrected strings.
- Run `python -X utf8 -m pytest -q scripts/test_review.py` after changing the tool.

## What the app may claim

Until `status` shows every Chhattisgarhi string as reviewed, say so honestly (README, deck): "Chhattisgarhi text is a working translation, partly reviewed" and name the reviewer and date for the part that is.
