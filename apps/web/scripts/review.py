"""Translation review tool for the Hindi and Chhattisgarhi strings.

A native speaker reviews every string; this tool makes that quick and keeps a record of what has been reviewed.

    python -X utf8 scripts/review.py export --out review_sheet.csv [--only-open]
        Writes a spreadsheet (opens in Excel or Google Sheets): key, English, Hindi, Chhattisgarhi and a state per language
        (ok / needs review / changed since review / unsure). The reviewer fills `hi_verdict` and `cg_verdict` with
        ok, fix or unsure, and writes the corrected text in `hi_correction` / `cg_correction` when the verdict is fix.

    python -X utf8 scripts/review.py import review_sheet.csv --by "Reviewer name"
        Records the verdicts in src/i18n/review.json. A fix is written straight into the strings_*.py source file and the
        language files are regenerated with i18n_add.py.

    python -X utf8 scripts/review.py status [--fail-on-open]
        Counts per language. A string whose English or translated text changed after it was reviewed counts as changed
        and needs a new review.

Run all commands from apps/web.
"""
from __future__ import annotations

import argparse
import ast
import csv
import hashlib
import json
import re
import subprocess
import sys
from datetime import date
from pathlib import Path

HERE = Path(__file__).resolve().parent
I18N = HERE.parent / "src" / "i18n"
REVIEW = I18N / "review.json"
LANGS = ("hi", "cg")
PLACEHOLDER = re.compile(r"\{[A-Za-z_]+\}")
LATIN = re.compile(r"[A-Za-z]")


def load_lang(lang: str) -> dict[str, str]:
    return json.loads((I18N / f"{lang}.json").read_text(encoding="utf-8"))


def load_review() -> dict:
    if REVIEW.exists():
        return json.loads(REVIEW.read_text(encoding="utf-8"))
    return {"version": 1, "entries": {}}


def save_review(r: dict) -> None:
    REVIEW.write_text(json.dumps(r, ensure_ascii=False, indent=1, sort_keys=True) + "\n", encoding="utf-8")


def digest(en: str, text: str) -> str:
    """Ties a review to the exact English source and translated text it was given for."""
    return hashlib.sha1((en + "\x1f" + text).encode("utf-8")).hexdigest()[:12]


def state_of(review: dict, key: str, lang: str, en: str, text: str) -> str:
    e = review["entries"].get(key, {}).get(lang)
    if not e:
        return "needs review"
    if e.get("status") == "unsure":
        return "unsure"
    return "ok" if e.get("hash") == digest(en, text) else "changed since review"


def _offset(raw: str, lineno: int, col_bytes: int) -> int:
    lines = raw.split("\n")
    before = sum(len(x) + 1 for x in lines[: lineno - 1])
    return before + len(lines[lineno - 1].encode("utf-8")[:col_bytes].decode("utf-8"))


def check_correction(key: str, lang: str, en: str, new: str) -> None:
    if set(PLACEHOLDER.findall(new)) != set(PLACEHOLDER.findall(en)):
        raise SystemExit(f"{key} [{lang}]: the correction must keep exactly the placeholders of the English text {sorted(set(PLACEHOLDER.findall(en)))}")
    if LATIN.search(PLACEHOLDER.sub("", new)):
        raise SystemExit(f"{key} [{lang}]: Hindi and Chhattisgarhi text must not contain Latin letters (write UPI, OTP, KYC in Devanagari)")


def apply_fix(key: str, idx: int, new: str, search_dir: Path = HERE) -> Path:
    """Replace the translation at tuple position idx (1 = Hindi, 2 = Chhattisgarhi) of `key` in its strings_*.py file."""
    for path in sorted(search_dir.glob("strings_*.py")):
        raw = path.read_bytes().decode("utf-8")
        for node in ast.walk(ast.parse(raw)):
            if not isinstance(node, ast.Dict):
                continue
            for k, v in zip(node.keys, node.values):
                if isinstance(k, ast.Constant) and k.value == key and isinstance(v, ast.Tuple) and len(v.elts) == 3:
                    c = v.elts[idx]
                    start, end = _offset(raw, c.lineno, c.col_offset), _offset(raw, c.end_lineno, c.end_col_offset)
                    path.write_bytes((raw[:start] + json.dumps(new, ensure_ascii=False) + raw[end:]).encode("utf-8"))
                    return path
    raise SystemExit(f"key not found in any strings file: {key}")


def cmd_export(a: argparse.Namespace) -> None:
    en, hi, cg = load_lang("en"), load_lang("hi"), load_lang("cg")
    review = load_review()
    rows = []
    for key in sorted(en):
        st = {"hi": state_of(review, key, "hi", en[key], hi[key]), "cg": state_of(review, key, "cg", en[key], cg[key])}
        if a.only_open and st["hi"] == "ok" and st["cg"] == "ok":
            continue
        rows.append([key, en[key], hi[key], st["hi"], "", "", cg[key], st["cg"], "", "", ""])
    with open(a.out, "w", encoding="utf-8-sig", newline="") as f:  # BOM so Excel shows Devanagari correctly
        w = csv.writer(f)
        w.writerow(["key", "en", "hi", "hi_state", "hi_verdict", "hi_correction", "cg", "cg_state", "cg_verdict", "cg_correction", "notes"])
        w.writerows(rows)
    print(f"wrote {len(rows)} rows to {a.out}")


def cmd_import(a: argparse.Namespace) -> None:
    en = load_lang("en")
    cur = {l: load_lang(l) for l in LANGS}
    review = load_review()
    touched: set[Path] = set()
    counts = {"ok": 0, "fixed": 0, "unsure": 0}
    with open(a.file, encoding="utf-8-sig", newline="") as f:
        for r in csv.DictReader(f):
            key = r["key"]
            if key not in en:
                raise SystemExit(f"unknown key in the sheet: {key}")
            for lang in LANGS:
                verdict = (r.get(f"{lang}_verdict") or "").strip().lower()
                if not verdict:
                    continue
                corr = (r.get(f"{lang}_correction") or "").strip()
                entry = {"by": a.by, "date": a.date, "note": (r.get("notes") or "").strip()}
                if verdict == "fix":
                    if not corr:
                        raise SystemExit(f"{key} [{lang}]: verdict is fix but there is no correction")
                    check_correction(key, lang, en[key], corr)
                    touched.add(apply_fix(key, LANGS.index(lang) + 1, corr))
                    cur[lang][key] = corr
                    entry.update(status="fixed", hash=digest(en[key], corr))
                    counts["fixed"] += 1
                elif verdict == "ok":
                    entry.update(status="ok", hash=digest(en[key], cur[lang][key]))
                    counts["ok"] += 1
                elif verdict == "unsure":
                    entry.update(status="unsure", hash=digest(en[key], cur[lang][key]))
                    counts["unsure"] += 1
                else:
                    raise SystemExit(f"{key} [{lang}]: verdict must be ok, fix or unsure (got '{verdict}')")
                review["entries"].setdefault(key, {})[lang] = entry
    save_review(review)
    for p in sorted(touched):  # regenerate the language files from the edited strings sources
        subprocess.check_call([sys.executable, "-X", "utf8", str(HERE / "i18n_add.py"), str(p)], cwd=HERE.parent)
    print(f"recorded {counts['ok']} ok, {counts['fixed']} fixed, {counts['unsure']} unsure; strings files changed: {[p.name for p in sorted(touched)]}")


def cmd_status(a: argparse.Namespace) -> None:
    en = load_lang("en")
    review = load_review()
    total_open = 0
    for lang in LANGS:
        d = load_lang(lang)
        tally: dict[str, int] = {}
        for key in en:
            s = state_of(review, key, lang, en[key], d[key])
            tally[s] = tally.get(s, 0) + 1
        total_open += sum(v for k, v in tally.items() if k != "ok")
        print(f"{lang}: {len(en)} strings | " + ", ".join(f"{k}: {v}" for k, v in sorted(tally.items())))
    if a.fail_on_open and total_open:
        raise SystemExit(1)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    e = sub.add_parser("export")
    e.add_argument("--out", default="review_sheet.csv")
    e.add_argument("--only-open", action="store_true", help="skip strings already reviewed and unchanged")
    e.set_defaults(fn=cmd_export)
    i = sub.add_parser("import")
    i.add_argument("file")
    i.add_argument("--by", required=True, help="the reviewer's name")
    i.add_argument("--date", default=str(date.today()))
    i.set_defaults(fn=cmd_import)
    s = sub.add_parser("status")
    s.add_argument("--fail-on-open", action="store_true")
    s.set_defaults(fn=cmd_status)
    a = ap.parse_args()
    a.fn(a)


if __name__ == "__main__":
    main()
