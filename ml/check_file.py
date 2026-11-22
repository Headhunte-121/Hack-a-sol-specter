"""Score a CSV of messages with the shipped model and show what the app would say, and why.

Input columns: text, label (1 scam, 0 genuine). Lists every genuine message shown as suspicious or likely scam (false flag)
and every scam shown as looks genuine (missed), with the rules and text pieces that moved the score. Ends with a summary.
Usage: python check_file.py ../data/real/check.csv [--all]
"""
from __future__ import annotations

import argparse
import math
import sys
from pathlib import Path

import pandas as pd

from textpipe import Model, analyse, load_signals, tokenize

ROOT = Path(__file__).resolve().parent.parent
MODEL = ROOT / "apps" / "web" / "public" / "model" / "model.json"
CORPUS = ROOT / "data" / "processed" / "corpus.csv"


def reasons(model: Model, text: str, sg: dict, k: int = 6) -> tuple[list[str], list[str]]:
    _, _, feats, fired = analyse(text, sg, model.ngram)
    vals = {}
    for f, c in feats.items():
        i = model.idx.get(f)
        if i is not None:
            vals[i] = (1.0 + math.log(c)) * model.idf[i]
    norm = math.sqrt(sum(v * v for v in vals.values())) or 1.0
    parts = sorted(((model.coef[i] * v / norm, model.d["features"][i]) for i, v in vals.items()), reverse=True)
    text_up = [f"{name[:2]}{name[2:]!r} {w:+.2f}" for w, name in parts[:k] if w > 0]
    rules = [f"{s['id']} {model.sig_coef.get(s['id'], 0.0) * model.d['sig_scale']:+.2f}" for s in fired]
    return rules, text_up


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser()
    ap.add_argument("csv")
    ap.add_argument("--all", action="store_true", help="print every message, not only the mistakes")
    args = ap.parse_args()

    sg = load_signals()
    model = Model.load(MODEL)
    model.signals = sg
    cut = model.d["thresholds"]
    df = pd.read_csv(args.csv)
    df["label"] = df.label.astype(int)
    df["p"] = [model.score(t, sg)["p"] for t in df.text.astype(str)]
    df["band"] = ["likely_scam" if p >= cut["scam"] else "suspicious" if p >= cut["suspicious"] else "looks_genuine" for p in df.p]

    for _, r in df.iterrows():
        false_flag = r.label == 0 and r.band != "looks_genuine"
        missed = r.label == 1 and r.band == "looks_genuine"
        if not (args.all or false_flag or missed):
            continue
        tag = "FALSE FLAG" if false_flag else "MISSED SCAM" if missed else "ok"
        rules, text_up = reasons(model, str(r.text), sg)
        print(f"[{tag}] {r.band} p={r.p:.3f}  {str(r.text)[:160]}")
        print(f"    rules: {', '.join(rules) or '-'}")
        print(f"    text pieces pushing towards scam: {', '.join(text_up) or '-'}\n")

    print(f"model {model.d['version']}, cuts: suspicious >= {cut['suspicious']}, likely scam >= {cut['scam']}")
    print(pd.crosstab(df.label.map({0: "genuine", 1: "scam"}), df.band).to_string())
    gen, scam = df[df.label == 0], df[df.label == 1]
    print(f"false flags: {(gen.band != 'looks_genuine').sum()} of {len(gen)} genuine; missed scams: {(scam.band == 'looks_genuine').sum()} of {len(scam)} scams")

    if CORPUS.exists():  # a message the model was trained on says nothing about how it does on new messages
        key = lambda t: " ".join(x["t"] for x in tokenize(str(t)))
        seen = set(pd.read_csv(CORPUS, usecols=["text"]).text.map(key))
        overlap = int(df.text.map(key).isin(seen).sum())
        if overlap:
            print(f"WARNING: {overlap} of these messages (after masking numbers and links) are also in the training corpus")


if __name__ == "__main__":
    main()
