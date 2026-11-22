"""Build the training corpus: load sources, harmonise labels, dedupe, assign template groups, split 70/15/15 by group.

Outputs (git-ignored, regenerate): data/processed/corpus.csv and data/processed/challenge.csv.
External datasets are read from "ai tuning/data/ext" (downloaded locally, licences unverified -> local training only).
Usage: python build_corpus.py
"""
from __future__ import annotations

import glob
import hashlib
import json
import random
import re
from pathlib import Path

import pandas as pd

from textpipe import tokenize

ROOT = Path(__file__).resolve().parent.parent
AI = ROOT / "ai tuning" / "data"
OUT = ROOT / "data" / "processed"
SEED = 20261122
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


def assign_splits(df: pd.DataFrame) -> pd.Series:
    """Group-aware 70/15/15 split, stratified by (source, majority label): a whole group always lands in one split."""
    rng = random.Random(SEED)
    g = df.groupby("group").agg(source=("source", "first"), label=("label", lambda s: int(round(s.mean()))), n=("label", "size")).reset_index()
    tag_of = {}
    for (src, lab), sub in g.groupby(["source", "label"]):
        groups = sorted(sub.group)
        rng.shuffle(groups)
        sizes = dict(zip(sub.group, sub.n))
        total, acc = int(sub.n.sum()), 0
        for name in groups:
            frac = acc / total
            tag_of[name] = "train" if frac < 0.70 else ("val" if frac < 0.85 else "test")
            acc += sizes[name]
    return df.group.map(tag_of)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    ext, team = load_external(), load_team()
    ext["group"] = [group_of(s, t) for s, t in zip(ext.source, ext.text)]
    df = pd.concat([ext, team], ignore_index=True)
    df["text"] = df.text.astype(str)
    df["key"] = df.text.map(key_of)
    n0 = len(df)
    df = df[df.key.str.len() > 0].drop_duplicates("key").reset_index(drop=True)

    ch = pd.read_csv(AI / "wild_big.csv")
    ch["source"] = "challenge_v1"
    extra = ROOT / "data" / "challenge_team.csv"      # independent challenge set written by one person; never trained on
    if extra.exists():
        e = pd.read_csv(extra)
        e["source"] = "challenge_team"
        if "lang" not in e:
            e["lang"] = ""
        ch = pd.concat([ch, e[["text", "label", "lang", "source"]]], ignore_index=True)
    ch["key"] = ch.text.map(key_of)
    df = df[~df.key.isin(set(ch.key))].reset_index(drop=True)  # challenge messages can never be trained on
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


if __name__ == "__main__":
    main()
