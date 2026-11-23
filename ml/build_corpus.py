"""Build the training corpus: load sources, harmonise labels, dedupe, assign template groups, split 70/15/15 by group.

Outputs (git-ignored, regenerate): data/processed/corpus.csv and data/processed/challenge.csv.
External datasets are read from "ai tuning/data/ext" (downloaded locally, licences unverified -> local training only).

Two safety nets (added after a worktree without the git-ignored datasets silently trained on 5% of the data):
  - ENVIRONMENT GUARD: fewer than MIN_EXTERNAL_ROWS usable external rows, a missing external source, or a missing challenge file
    (wild_big.csv) stops the run with exit status 2. `--allow-small` disables it (unit tests only). The numbers are printed every run.
  - LEAK GUARD: every frozen evaluation text (challenge sets plus the blind/probe/OTP/evasion/clip sets in FROZEN) is removed from the
    training corpus under three rules (exact masked key, first-6+last-4 signature, token-set Jaccard >= 0.85); see leak_check.py.
Usage: python build_corpus.py [--allow-small]
"""
from __future__ import annotations

import argparse
import glob
import hashlib
import json
import random
import re
import sys
from pathlib import Path

import pandas as pd

import leak_check
from textpipe import tokenize

ROOT = Path(__file__).resolve().parent.parent
AI = ROOT / "ai tuning" / "data"
OUT = ROOT / "data" / "processed"
FROZEN = leak_check.DEFAULT_FROZEN       # data/real/blind_eval_2026-11-23 (git-ignored; absent on a fresh clone)
SEED = 20261122
MIN_EXTERNAL_ROWS = 15000                # the real number is about 22,000 after dedupe
EXTERNAL_SOURCES = ("shade63", "cloveai", "bolewara_uci", "ysangam_calls")
HINDI_FUNC = {"hai", "hain", "aapka", "aapki", "aapke", "aap", "karein", "karo", "kijiye", "nahi", "nahin", "hoga", "gaya", "gayi", "raha",
              "rahi", "rahe", "tum", "tumhara", "tumhare", "mera", "hum", "abhi", "turant", "kripya", "apna", "apni", "batao", "bataiye",
              "bhejo", "karna", "kiya", "wapas", "paisa", "jama", "kisi", "mat", "bhai", "yaar", "hoon", "hu"}


def detect_script(text: str) -> str:
    letters = [c for c in text if c.isalpha()]
    if not letters:
        return "english"
    dev = sum(1 for c in letters if "ऀ" <= c <= "ॿ")
    if dev / len(letters) > 0.3:
        return "hindi"
    words = re.findall(r"[a-z]+", text.lower())
    return "hinglish" if any(w in HINDI_FUNC for w in words) else "english"


def key_of(text: str) -> str:
    return " ".join(t["t"] for t in tokenize(text))


def group_of(src: str, text: str) -> str:
    return src + ":" + " ".join(t["t"] for t in tokenize(text)[:6])


def load_external() -> pd.DataFrame:
    X = AI / "ext"
    parts = []
    p = X / "scam-classification-multiclass" / "sentinel_dataset_multiclass_clean.csv"
    if p.exists():
        s = pd.read_csv(p)
        parts.append(pd.DataFrame({"text": s.text, "label": (s.label != 0).astype(int), "source": "shade63"}))
    g = glob.glob(str(X / "india-spam-sms" / "data" / "*.parquet"))
    if g:
        c = pd.read_parquet(g[0])
        parts.append(pd.DataFrame({"text": c.text, "label": c.label.astype(int), "source": "cloveai"}))
    p = X / "hinglish-scam-text-dataset" / "data.json"
    if p.exists():
        b = json.load(open(p, encoding="utf-8"))
        b = pd.DataFrame(b["rows"] if isinstance(b, dict) and "rows" in b else b)
        if "row" in b.columns:
            b = pd.DataFrame(list(b["row"]))
        parts.append(pd.DataFrame({"text": b.text, "label": b.label.astype(int), "source": "bolewara_uci"}))
    p = X / "Indian_Cyber_Scam_PhoneCall_Hinglish_Dataset" / "India_Cyber_Scam_Hinglish_Dataset.csv"
    if p.exists():
        y = pd.read_csv(p)
        parts.append(pd.DataFrame({"text": y.text, "label": y.label.astype(int), "source": "ysangam_calls"}))
    return pd.concat(parts, ignore_index=True) if parts else pd.DataFrame(columns=["text", "label", "source"])


def load_team() -> pd.DataFrame:
    rows = []
    for name, f in (("team_syn1", "synthetic.csv"), ("team_syn2", "synthetic_v2.csv")):
        d = pd.read_csv(AI / f)
        rows.append(pd.DataFrame({"text": d.text, "label": d.label, "source": name, "group": name + ":" + d.template_id.astype(str)}))
    for f in sorted((ROOT / "data" / "team").glob("*.csv")):   # extra team-written messages: text,label,(lang),group
        if f.stem.upper() == "TEMPLATE":
            continue
        d = pd.read_csv(f)
        rows.append(pd.DataFrame({"text": d.text, "label": d.label, "source": "team_" + f.stem, "group": d.group if "group" in d else f.stem + ":" + d.index.astype(str)}))
    return pd.concat(rows, ignore_index=True)


GENERATED_SOURCES = ("team_trap_genuine_v1", "team_scam_gap_v1")      # gen_team_data.py output: groups look like "family:lang:structure"


def family_of(source: str, group: str) -> str:
    """Message family of a generated group ('card_block_user:en' for 'card_block_user:en:v2a'); empty for every other source."""
    return group.rsplit(":", 1)[0] if source in GENERATED_SOURCES else ""


def assign_splits(df: pd.DataFrame) -> pd.Series:
    """Group-aware 70/15/15 split, stratified by (source, majority label): a whole group always lands in one split.
    Generated groups (one per sentence structure) are stratified by message family as well, so every family keeps about 70% of its
    structures in training instead of a whole family landing in validation or test by chance."""
    g = df.groupby("group").agg(source=("source", "first"), label=("label", lambda s: int(round(s.mean()))), n=("label", "size")).reset_index()
    g["family"] = [family_of(s, n) for s, n in zip(g.source, g.group)]
    tag_of = {}
    for (src, lab, fam), sub in g.groupby(["source", "label", "family"]):
        groups = sorted(sub.group)
        random.Random(f"{SEED}|{src}|{lab}|{fam}").shuffle(groups)        # one seeded stream per stratum: adding rows to one source never reshuffles another
        sizes = dict(zip(sub.group, sub.n))
        total, acc = int(sub.n.sum()), 0
        for name in groups:
            frac = acc / total
            tag_of[name] = "train" if frac < 0.70 else ("val" if frac < 0.85 else "test")
            acc += sizes[name]
    return df.group.map(tag_of)


def check_environment(ext_counts: dict, challenge_present: bool, allow_small: bool = False) -> list[str]:
    """Problems that make the corpus unusable (empty list = fine). `ext_counts` = usable external rows per source."""
    problems = []
    total = sum(ext_counts.values())
    if total < MIN_EXTERNAL_ROWS:
        problems.append(f"only {total} usable external rows (need at least {MIN_EXTERNAL_ROWS})")
    for s in EXTERNAL_SOURCES:
        if ext_counts.get(s, 0) == 0:
            problems.append(f"external source '{s}' loaded 0 rows")
    if not challenge_present:
        problems.append(f"challenge file missing: {AI / 'wild_big.csv'}")
    return [] if allow_small else problems


def main(argv: list[str] | None = None):
    ap = argparse.ArgumentParser(description="Build data/processed/corpus.csv and challenge.csv")
    ap.add_argument("--allow-small", action="store_true", help="skip the environment guard (unit tests only; never for a real model)")
    args = ap.parse_args(argv)

    OUT.mkdir(parents=True, exist_ok=True)
    ext, team = load_external(), load_team()
    ext["group"] = [group_of(s, t) for s, t in zip(ext.source, ext.text)]
    df = pd.concat([ext, team], ignore_index=True)
    df["text"] = df.text.astype(str)
    df["key"] = df.text.map(key_of)
    n0 = len(df)
    df = df[df.key.str.len() > 0].drop_duplicates("key").reset_index(drop=True)

    challenge_present = (AI / "wild_big.csv").is_file()
    ext_counts = {s: int(n) for s, n in df[df.source.isin(EXTERNAL_SOURCES)].groupby("source").size().items()}
    problems = check_environment(ext_counts, challenge_present, args.allow_small)
    print(f"environment guard: usable external rows = {sum(ext_counts.values())} (minimum {MIN_EXTERNAL_ROWS}); "
          f"by source {ext_counts or '{}'}; challenge file wild_big.csv: {'present' if challenge_present else 'MISSING'}"
          + ("; guard disabled by --allow-small" if args.allow_small else ""))
    if problems:
        print("ERROR: the training data is incomplete, refusing to build a corpus:\n  - " + "\n  - ".join(problems)
              + "\nThe external datasets live in the git-ignored folder 'ai tuning/data/ext' (and data/real). A git worktree does not contain them:"
                " create directory junctions to the main checkout's folders (see ml/TUNING.md). Do not train on what is missing.", file=sys.stderr)
        sys.exit(2)

    ch = pd.read_csv(AI / "wild_big.csv") if challenge_present else pd.DataFrame(columns=["text", "label", "lang"])
    ch["source"] = "challenge_v1"
    extra = ROOT / "data" / "challenge_team.csv"      # independent challenge set written by one person; never trained on
    if extra.exists():
        e = pd.read_csv(extra)
        e["source"] = "challenge_team"
        if "lang" not in e:
            e["lang"] = ""
        ch = pd.concat([ch, e[["text", "label", "lang", "source"]]], ignore_index=True)
    ch["key"] = ch.text.map(key_of)

    # Frozen evaluation texts (challenge sets + blind/probe/OTP/evasion/clip sets) can never be trained on: exact, signature and Jaccard rules.
    index, warns = leak_check.build_index(FROZEN, ROOT)
    for w in warns:
        print(f"WARNING: {w}", file=sys.stderr)
    mask, detail = leak_check.scan_dataframe(df, index)
    by_rule = {r: 0 for r in leak_check.RULES}
    by_source: dict[str, int] = {}
    for i, hits in detail.items():
        by_rule[min(hits, key=lambda h: leak_check.RULES.index(h.rule)).rule] += 1
        by_source[df.at[i, "source"]] = by_source.get(df.at[i, "source"], 0) + 1
    print(f"leak guard: frozen texts {index.sizes}; dropped {int(mask.sum())} training rows "
          f"(first rule hit: {by_rule}); by source {by_source}")
    df = df[~mask].reset_index(drop=True)
    df["lang"] = df.text.map(detect_script)
    df["split"] = assign_splits(df)
    ch["lang"] = ch.text.map(detect_script)

    df.drop(columns=["key"]).to_csv(OUT / "corpus.csv", index=False)
    ch.drop(columns=["key"]).to_csv(OUT / "challenge.csv", index=False)
    meta = {"seed": SEED, "rows_before_dedupe": n0, "rows": len(df), "challenge_rows": len(ch),
            "corpus_sha256": hashlib.sha256((OUT / "corpus.csv").read_bytes()).hexdigest(),
            "challenge_sha256": hashlib.sha256((OUT / "challenge.csv").read_bytes()).hexdigest()}
    (OUT / "split_meta.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")
    print(json.dumps(meta, indent=2))
    print(df.groupby(["split", "label"]).size().unstack().to_string())
    print(df.groupby(["lang", "label"]).size().unstack().to_string())
    # leakage guard: no group may appear in two splits
    bad = df.groupby("group").split.nunique()
    assert (bad == 1).all(), "template group leaked across splits"
    print("group leakage check: OK (every group is in exactly one split)")
    assert not leak_check.scan_dataframe(df, index)[1], "frozen evaluation text survived the leak guard"
    print("frozen-text leak check on the final corpus: OK (zero matches under all three rules)")


if __name__ == "__main__":
    main()
