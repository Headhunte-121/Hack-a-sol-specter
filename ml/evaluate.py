"""Evaluate the exported model on the frozen TEST split and the CHALLENGE set (score once, after all choices are made).

Reports overall / per-language / per-source metrics, confusion matrices, three-band table, keyword-only baseline,
calibration (ECE + reliability bins), bias checks (false positives on genuine bank alerts / OTP messages, by language,
length, bank mention), most confident mistakes, model size and scoring time. Writes docs/evaluation.json + evaluation_report.md.
Usage: python evaluate.py
"""
from __future__ import annotations

import json
import re
import time
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.metrics import average_precision_score, confusion_matrix, f1_score, precision_score, recall_score, roc_auc_score

from build_corpus import detect_script
from textpipe import Model, load_signals, tokenize

ROOT = Path(__file__).resolve().parent.parent
PROC = ROOT / "data" / "processed"
MODEL = ROOT / "apps" / "web" / "public" / "model" / "model.json"
DOCS = ROOT / "docs"

KEYWORDS = ["otp", "kyc", "blocked", "block", "lottery", "prize", "arrest", "urgent", "immediately", "winner", "won", "cvv", "pin", "refund", "verify",
            "suspend", "suspended", "apk", "ओटीपी", "केवाईसी", "लॉटरी", "इनाम", "गिरफ्तार", "तुरंत", "अभी", "बंद", "abhi", "turant", "inaam", "jeete", "band", "giraftar"]
BANKS = ["sbi", "hdfc", "icici", "axis", "pnb", "kotak", "canara", "baroda", "union bank", "बैंक", "bank", "paytm", "phonepe", "gpay", "upi"]


def keyword_flag(text: str) -> int:
    toks = {t["t"] for t in tokenize(text)}
    return int(len(toks & set(KEYWORDS)) >= 2)


def metrics(y, pred, p=None) -> dict:
    y, pred = np.asarray(y), np.asarray(pred)
    if len(y) == 0:
        return {"n": 0}
    tn, fp, fn, tp = confusion_matrix(y, pred, labels=[0, 1]).ravel()
    out = {"n": int(len(y)), "scam": int(y.sum()), "accuracy": float((pred == y).mean()),
           "precision": float(precision_score(y, pred, zero_division=0)), "recall": float(recall_score(y, pred, zero_division=0)),
           "f1": float(f1_score(y, pred, zero_division=0)), "tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp),
           "false_alarm_rate": float(fp / max(1, fp + tn))}
    if p is not None and len(set(y)) == 2:
        out["auc_pr"] = float(average_precision_score(y, p)); out["auc_roc"] = float(roc_auc_score(y, p))
    return out


def ece(y, p, bins=10):
    y, p = np.asarray(y), np.asarray(p)
    edges = np.linspace(0, 1, bins + 1); tot, rows = 0.0, []
    for lo, hi in zip(edges[:-1], edges[1:]):
        m = (p >= lo) & (p < hi if hi < 1 else p <= hi)
        if m.sum():
            gap = abs(p[m].mean() - y[m].mean()); tot += gap * m.sum() / len(y)
            rows.append({"bin": f"{lo:.1f}-{hi:.1f}", "n": int(m.sum()), "mean_p": float(p[m].mean()), "frac_scam": float(y[m].mean())})
    return float(tot), rows


def score_df(df: pd.DataFrame, model: Model, sg: dict) -> pd.DataFrame:
    t = time.time()
    res = [model.score(x, sg) for x in df.text]
    df = df.copy()
    df["p"] = [r["p"] for r in res]
    df["signals"] = [",".join(r["signals"]) for r in res]
    df["ms"] = (time.time() - t) / max(1, len(df)) * 1000
    return df


def evaluate_set(name: str, df: pd.DataFrame, thr: dict) -> dict:
    y, p = df.label.values, df.p.values
    pred_half = (p >= 0.5).astype(int)
    pred_susp = (p >= thr["suspicious"]).astype(int)
    band = np.where(p >= thr["scam"], "likely_scam", np.where(p >= thr["suspicious"], "suspicious", "looks_genuine"))
    r = {"name": name, "overall@0.5": metrics(y, pred_half, p), "flag@suspicious_cut": metrics(y, pred_susp, p),
         "bands": {b: {"scam": int(((band == b) & (y == 1)).sum()), "genuine": int(((band == b) & (y == 0)).sum())} for b in ["likely_scam", "suspicious", "looks_genuine"]},
         "keyword_baseline": metrics(y, df.text.map(keyword_flag).values)}
    r["per_language"] = {l: metrics(g.label.values, (g.p.values >= 0.5).astype(int), g.p.values) for l, g in df.groupby("lang")}
    if "source" in df:
        r["per_source"] = {s: metrics(g.label.values, (g.p.values >= 0.5).astype(int), g.p.values) for s, g in df.groupby("source")}
    e, bins = ece(y, p)
    r["calibration"] = {"ece": e, "bins": bins}
    # bias checks on genuine messages
    gen = df[df.label == 0].copy()
    low = gen.text.str.lower()
    gen["bank"] = low.map(lambda s: any(b in s for b in BANKS))
    gen["otp"] = low.str.contains(r"\botp\b|ओटीपी|verification code|code is", regex=True)
    gen["len"] = pd.cut(gen.text.str.len(), [0, 80, 200, 10000], labels=["short", "medium", "long"])
    fp = lambda g: {"n": int(len(g)), "false_alarm_rate": float((g.p >= 0.5).mean()) if len(g) else None}
    r["bias"] = {"genuine_bank_alerts": fp(gen[gen.bank]), "genuine_otp_messages": fp(gen[gen.otp]), "genuine_other": fp(gen[~gen.bank & ~gen.otp]),
                 "by_language": {l: fp(g) for l, g in gen.groupby("lang")}, "by_length": {str(l): fp(g) for l, g in gen.groupby("len", observed=True)}}
    wrong = df[(df.p >= 0.5).astype(int) != df.label].copy()
    wrong["conf"] = (wrong.p - 0.5).abs()
    r["confident_mistakes"] = [{"text": t[:140], "label": int(l), "p": round(float(p_), 3), "lang": lg}
                               for t, l, p_, lg in wrong.sort_values("conf", ascending=False).head(5)[["text", "label", "p", "lang"]].itertuples(index=False)]
    r["ms_per_message_python"] = float(df.ms.iloc[0]) if len(df) else None
    return r


def fmt(m): return f"{m['precision']:.3f} / {m['recall']:.3f} / {m['f1']:.3f}" if m.get("n") else "n/a"


def main():
    sg = load_signals()
    model = Model.load(MODEL); model.signals = sg
    thr = model.d["thresholds"]
    te = pd.read_csv(PROC / "corpus.csv"); te = te[te.split == "test"].reset_index(drop=True)
    ch = pd.read_csv(PROC / "challenge.csv")
    res = {"model_version": model.d["version"], "model_bytes": MODEL.stat().st_size, "thresholds": thr,
           "test": evaluate_set("test (group-aware split)", score_df(te, model, sg), thr),
           "challenge": evaluate_set("challenge (hand-written, never trained on)", score_df(ch, model, sg), thr)}
    DOCS.mkdir(exist_ok=True)
    (DOCS / "evaluation.json").write_text(json.dumps(res, indent=2, ensure_ascii=False), encoding="utf-8")

    L = ["# Scam message detector: evaluation report", "",
         f"Model `{res['model_version']}`, {res['model_bytes']/1e6:.2f} MB, band cuts: suspicious >= {thr['suspicious']:.2f}, likely scam >= {thr['scam']:.2f} (calibrated probability). "
         "Generated by `ml/evaluate.py`; numbers below match the model that ships.", ""]
    for key in ("test", "challenge"):
        r = res[key]; o = r["overall@0.5"]; kb = r["keyword_baseline"]
        L += [f"## {r['name']}", "", f"{o['n']} messages ({o['scam']} scam). Precision / recall / F1 for the scam class at p >= 0.5:", "",
              "| | precision / recall / F1 | TN FP FN TP | false-alarm rate |", "|---|---|---|---|",
              f"| **this model** | {fmt(o)} | {o['tn']} {o['fp']} {o['fn']} {o['tp']} | {o['false_alarm_rate']:.3f} |",
              f"| keyword-only baseline | {fmt(kb)} | {kb['tn']} {kb['fp']} {kb['fn']} {kb['tp']} | {kb['false_alarm_rate']:.3f} |", "",
              f"AUC-PR {o.get('auc_pr', float('nan')):.3f}, AUC-ROC {o.get('auc_roc', float('nan')):.3f}; calibration ECE {r['calibration']['ece']:.3f}.", "",
              "Per language (precision / recall / F1):", "", "| language | n | scam | P / R / F1 | false-alarm rate |", "|---|---|---|---|---|"]
        for l, m in r["per_language"].items():
            L.append(f"| {l} | {m['n']} | {m['scam']} | {fmt(m)} | {m['false_alarm_rate']:.3f} |")
        b = r["bands"]
        L += ["", "Result bands (what the user would see):", "", "| band | scam messages | genuine messages |", "|---|---|---|"] + [f"| {k} | {v['scam']} | {v['genuine']} |" for k, v in b.items()]
        bi = r["bias"]
        L += ["", "Bias check, false-alarm rate on **genuine** messages:", "", "| group | n | false-alarm rate |", "|---|---|---|"]
        for k in ("genuine_bank_alerts", "genuine_otp_messages", "genuine_other"):
            L.append(f"| {k.replace('_', ' ')} | {bi[k]['n']} | {bi[k]['false_alarm_rate'] if bi[k]['false_alarm_rate'] is None else round(bi[k]['false_alarm_rate'], 3)} |")
        for l, v in bi["by_language"].items():
            L.append(f"| language: {l} | {v['n']} | {round(v['false_alarm_rate'], 3)} |")
        for l, v in bi["by_length"].items():
            L.append(f"| length: {l} | {v['n']} | {round(v['false_alarm_rate'], 3)} |")
        L += ["", "Most confident mistakes:", ""] + [f"- ({m['lang']}, true={'scam' if m['label'] else 'genuine'}, p={m['p']}) {m['text']}" for m in r["confident_mistakes"]]
        if "per_source" in r:
            L += ["", "Per source (P / R / F1): " + "; ".join(f"{s}: {fmt(m)} (n={m['n']})" for s, m in r["per_source"].items())]
        L.append("")
    L += ["## How to read this", "",
          "- The **test** split is group-aware (no template shared with training) but most of its text comes from public datasets that look templated and mostly English, so its scores are optimistic.",
          "- The **challenge** set is hand-written but was written by the same authors as the training templates and inspected during development, so it is not a fully blind test. "
          "Independently written messages (`data/challenge_team.csv`) should be added before final numbers are quoted.",
          "- Hindi (Devanagari) training data is small (a few hundred team-written rows); expect weaker results there. Counts are small, so percentages carry wide uncertainty.",
          "- No on-phone timing is reported here; see the Vitest parity/timing test for TypeScript scoring speed.", ""]
    (DOCS / "evaluation_report.md").write_text("\n".join(L), encoding="utf-8")
    print("\n".join(L[:70]))


if __name__ == "__main__":
    main()
