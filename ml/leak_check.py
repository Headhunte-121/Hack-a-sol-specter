"""Leak guard: no frozen evaluation text may be in (or near) the training data.

Frozen evaluation texts (read-only, never trained on, never tuned on):
  - the blind / probe / OTP / evasion / clip sets in a frozen directory (default data/real/blind_eval_2026-11-23/), and
  - the independent challenge sets (ai tuning/data/wild_big.csv and data/challenge_team.csv when present).

A training row is a LEAK when its masked-token form matches a frozen text under any of three rules (masking = `textpipe.tokenize`,
which turns links, phone numbers, amounts and long numbers into placeholders):
  exact      the masked-token key (" ".join(token texts)) is equal
  signature  the first six + last four masked tokens are equal (near duplicate with a changed middle)
  jaccard    the masked token SETS have Jaccard similarity >= 0.85 (reordered / lightly edited copy)

Training sources scanned: every CSV in data/team/, the synthetic CSVs in "ai tuning/data/" and data/processed/corpus.csv.
Texts are never printed. The report names file, data-row number (1-based, header excluded), template group, frozen set and rule.

Usage:
  python leak_check.py [--frozen-dir DIR] [--drop] [--files F [F ...]]
Exit status: 0 = clean, 1 = leaks found (also after --drop, which rewrites the CSVs without the leaked rows: re-run to confirm), 2 = bad setup.
"""
from __future__ import annotations

import argparse
import csv
import io
import json
import sys
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path

from textpipe import tokenize

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_FROZEN = ROOT / "data" / "real" / "blind_eval_2026-11-23"

# (frozen set name, path relative to the frozen directory). A missing file is reported, not silently skipped.
FROZEN_FILES = (
    ("blind_v1", "blind_v1.csv"),
    ("probe_eval_in", "eval_in.json"),
    ("otp_eval", "eval_otp_in.json"),
    ("evasion_eval", "eval_evasion_in.json"),
    ("clips_text", "voice/cvm_in.json"),
    ("clips_asr", "voice/cvm_in_asr.json"),
    ("clips_hi_orig", "voice_hi/cvm_in_orig.json"),
    ("clips_hi_asr", "voice_hi/cvm_in_asr.json"),
)
JACCARD_NUM, JACCARD_DEN = 17, 20      # 0.85 as an exact fraction (no float rounding at the boundary)
RULES = ("exact", "signature", "jaccard")


# ---------------------------------------------------------------- masking helpers
def mask_tokens(text) -> list[str]:
    return [t["t"] for t in tokenize(str(text))]


def mask_key(tokens: list[str]) -> str:
    return " ".join(tokens)


def signature(tokens: list[str]) -> str:
    return " ".join(tokens[:6]) + "|" + " ".join(tokens[-4:])


def jaccard_ok(a: frozenset, b: frozenset) -> bool:
    inter = len(a & b)
    union = len(a) + len(b) - inter
    return union > 0 and inter * JACCARD_DEN >= JACCARD_NUM * union


def _ceil_frac(n: int) -> int:
    return -(-JACCARD_NUM * n // JACCARD_DEN)           # ceil(0.85 * n) in integers


def prefix_len(n: int) -> int:
    """Length of the prefix filter for a set of n tokens: two sets with Jaccard >= 0.85 must share a token inside it."""
    return n - _ceil_frac(n) + 1


@dataclass(frozen=True)
class Hit:
    frozen_set: str
    rule: str


@dataclass(frozen=True)
class Finding:
    file: str
    row: int            # 1-based data row (header excluded)
    group: str
    frozen_set: str
    rule: str


# ---------------------------------------------------------------- frozen text loading
def _texts_from_json(path: Path) -> list[str]:
    d = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(d, dict):
        d = d.get("rows") or d.get("items") or []
    return [str(x["text"]) for x in d if isinstance(x, dict) and x.get("text")]


def _texts_from_csv(path: Path) -> list[str]:
    with open(path, encoding="utf-8", newline="") as fp:
        return [r["text"] for r in csv.DictReader(fp) if r.get("text")]


def load_texts(path: Path) -> list[str]:
    return _texts_from_json(path) if path.suffix.lower() == ".json" else _texts_from_csv(path)


def challenge_files(root: Path = ROOT) -> list[tuple[str, Path]]:
    return [("challenge_v1", root / "ai tuning" / "data" / "wild_big.csv"), ("challenge_team", root / "data" / "challenge_team.csv")]


def load_frozen(frozen_dir: Path | None = DEFAULT_FROZEN, root: Path = ROOT) -> tuple[dict[str, list[str]], list[str]]:
    """Return ({set name: texts}, [warnings]). The challenge sets are always read; the blind/probe/clip sets only when the directory exists."""
    sets: dict[str, list[str]] = {}
    warnings: list[str] = []
    for name, p in challenge_files(root):
        if p.is_file():
            sets[name] = load_texts(p)
        elif name == "challenge_v1":
            warnings.append(f"challenge file missing: {p}")
    if frozen_dir is not None and Path(frozen_dir).is_dir():
        for name, rel in FROZEN_FILES:
            p = Path(frozen_dir) / rel
            if p.is_file():
                sets[name] = load_texts(p)
            else:
                warnings.append(f"frozen file missing: {rel}")
    else:
        warnings.append(f"frozen directory not found ({frozen_dir}): only the challenge sets are protected")
    return sets, warnings


# ---------------------------------------------------------------- the index
class FrozenIndex:
    """Fast matcher for the three leak rules. Build once, then call `match(text)` for each training row."""

    def __init__(self, frozen: dict[str, list[str]]):
        self.sizes = {name: len(v) for name, v in frozen.items()}
        self._key: dict[str, set[str]] = defaultdict(set)
        self._sig: dict[str, set[str]] = defaultdict(set)
        entries: list[tuple[str, frozenset]] = []
        for name, texts in frozen.items():
            for t in texts:
                toks = mask_tokens(t)
                if not toks:
                    continue
                self._key[mask_key(toks)].add(name)
                self._sig[signature(toks)].add(name)
                entries.append((name, frozenset(toks)))
        df: dict[str, int] = defaultdict(int)
        for _, s in entries:
            for tok in s:
                df[tok] += 1
        self._df = df
        self._sets = entries
        self._post: dict[str, list[int]] = defaultdict(list)   # prefix token -> ids of frozen sets
        for i, (_, s) in enumerate(entries):
            for tok in self._ordered(s)[:prefix_len(len(s))]:
                self._post[tok].append(i)

    def _ordered(self, s) -> list[str]:
        return sorted(s, key=lambda t: (self._df.get(t, 0), t))   # rarest first; tokens unseen in the frozen sets sort first

    def match_tokens(self, toks: list[str]) -> list[Hit]:
        if not toks:
            return []
        hits: set[Hit] = set()
        for n in self._key.get(mask_key(toks), ()):
            hits.add(Hit(n, "exact"))
        for n in self._sig.get(signature(toks), ()):
            hits.add(Hit(n, "signature"))
        s = frozenset(toks)
        cand: set[int] = set()
        for tok in self._ordered(s)[:prefix_len(len(s))]:
            cand.update(self._post.get(tok, ()))
        for i in cand:
            name, f = self._sets[i]
            if jaccard_ok(s, f):
                hits.add(Hit(name, "jaccard"))
        return sorted(hits, key=lambda h: (RULES.index(h.rule), h.frozen_set))

    def match(self, text) -> list[Hit]:
        return self.match_tokens(mask_tokens(text))


def build_index(frozen_dir: Path | None = DEFAULT_FROZEN, root: Path = ROOT) -> tuple[FrozenIndex, list[str]]:
    sets, warnings = load_frozen(frozen_dir, root)
    return FrozenIndex(sets), warnings


# ---------------------------------------------------------------- scanning training data
def training_sources(root: Path = ROOT) -> list[Path]:
    files = sorted((root / "data" / "team").glob("*.csv")) + sorted((root / "ai tuning" / "data").glob("synthetic*.csv"))
    corpus = root / "data" / "processed" / "corpus.csv"
    if corpus.is_file():
        files.append(corpus)
    return files


def _read_rows(path: Path) -> tuple[list[str], list[list[str]], str]:
    raw = path.read_bytes().decode("utf-8")
    eol = "\r\n" if "\r\n" in raw else "\n"
    rows = list(csv.reader(io.StringIO(raw, newline="")))
    return rows[0], rows[1:], eol


def scan_csv(path: Path, index: FrozenIndex) -> tuple[list[Finding], set[int]]:
    """Findings for one CSV (needs a `text` column) and the set of leaked data-row numbers."""
    header, rows, _ = _read_rows(path)
    ti = header.index("text")
    gi = header.index("group") if "group" in header else None
    out: list[Finding] = []
    bad: set[int] = set()
    for n, r in enumerate(rows, start=1):
        if len(r) <= ti:
            continue
        for h in index.match(r[ti]):
            out.append(Finding(str(path), n, r[gi] if gi is not None and len(r) > gi else "", h.frozen_set, h.rule))
            bad.add(n)
    return out, bad


def drop_rows(path: Path, bad: set[int]) -> int:
    """Rewrite a CSV without the given data rows; the header, the remaining rows and the line-ending style are kept."""
    header, rows, eol = _read_rows(path)
    kept = [r for n, r in enumerate(rows, start=1) if n not in bad]
    buf = io.StringIO(newline="")
    w = csv.writer(buf, lineterminator=eol)
    w.writerow(header)
    w.writerows(kept)
    path.write_bytes(buf.getvalue().encode("utf-8"))
    return len(rows) - len(kept)


def scan_dataframe(df, index: FrozenIndex):
    """(boolean array of leaked rows, {row label: [Hit, ...]}) for a DataFrame with a `text` column."""
    detail: dict = {}
    for i, t in zip(df.index, df["text"].astype(str)):
        h = index.match(t)
        if h:
            detail[i] = h
    return df.index.isin(list(detail)), detail


def summarise(findings: list[Finding]) -> dict[str, dict[str, int]]:
    """{file: {rule: number of distinct leaked rows first caught by that rule}} (a row is counted once, under its strongest rule)."""
    first: dict[tuple[str, int], Finding] = {}
    for f in findings:                                   # findings are ordered exact < signature < jaccard per row
        first.setdefault((f.file, f.row), f)
    out: dict[str, dict[str, int]] = {}
    for (file, _), f in first.items():
        out.setdefault(file, dict.fromkeys(RULES, 0))[f.rule] += 1
    return out


def run(frozen_dir: Path | None, files: list[Path] | None = None, drop: bool = False, root: Path = ROOT, out=sys.stdout) -> int:
    index, warnings = build_index(frozen_dir, root)
    for w in warnings:
        print(f"WARNING: {w}", file=out)
    print("frozen texts: " + ", ".join(f"{k}={v}" for k, v in index.sizes.items()), file=out)
    files = files if files is not None else training_sources(root)
    all_findings: list[Finding] = []
    for f in files:
        found, bad = scan_csv(f, index)
        all_findings += found
        by_row: dict[int, list[Finding]] = {}
        for x in found:
            by_row.setdefault(x.row, []).append(x)
        shown = Path(f).relative_to(root) if Path(f).is_relative_to(root) else Path(f)
        for n, xs in by_row.items():                      # one line per leaked row: rule -> frozen sets that matched
            rules = {r: sorted({x.frozen_set for x in xs if x.rule == r}) for r in RULES}
            print(f"LEAK {shown}: row {n} group={xs[0].group or '-'} " + "; ".join(f"{r}: {','.join(v)}" for r, v in rules.items() if v), file=out)
        if bad and drop:
            n = drop_rows(f, bad)
            print(f"dropped {n} rows from {f.name}", file=out)
    summ = summarise(all_findings)
    print(f"scanned {len(files)} file(s)", file=out)
    for file, c in summ.items():
        print(f"  {Path(file).name}: {sum(c.values())} leaked rows  (exact {c['exact']}, signature {c['signature']}, jaccard {c['jaccard']})", file=out)
    if not all_findings:
        print("OK: no frozen evaluation text found in the training data", file=out)
        return 0
    print(f"FAILED: {sum(sum(c.values()) for c in summ.values())} leaked rows" + (" (rewritten without them; re-run to confirm)" if drop else " (use --drop to remove them)"), file=out)
    return 1


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--frozen-dir", type=Path, default=None, help=f"directory with the frozen evaluation files (default {DEFAULT_FROZEN})")
    ap.add_argument("--drop", action="store_true", help="rewrite the offending CSVs without the leaked rows")
    ap.add_argument("--files", type=Path, nargs="*", help="scan only these CSVs (default: data/team/*.csv, synthetic CSVs, data/processed/corpus.csv)")
    a = ap.parse_args(argv)
    if a.frozen_dir is not None and not a.frozen_dir.is_dir():
        print(f"ERROR: --frozen-dir {a.frozen_dir} does not exist", file=sys.stderr)
        return 2
    return run(a.frozen_dir or DEFAULT_FROZEN, a.files or None, a.drop)


if __name__ == "__main__":
    sys.exit(main())
