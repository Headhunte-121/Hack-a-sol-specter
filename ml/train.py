"""Train the on-device scam classifier: TF-IDF (char n-grams inside words + word 1-2 grams) + signal flags -> logistic regression.

Everything that is chosen (C, pruning size, calibration, band thresholds) is chosen on the VALIDATION split only.
The test split and the challenge set are scored by evaluate.py, once, afterwards.
Writes apps/web/public/model/model.json and signals.json (the files the phone reads).
Usage: python train.py
"""
from __future__ import annotations

import json
import math
import random
import re
import shutil
import time
from collections import Counter
from pathlib import Path

import numpy as np
import pandas as pd
from scipy.sparse import csr_matrix, hstack
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import average_precision_score, roc_auc_score

from textpipe import analyse, load_signals

ROOT = Path(__file__).resolve().parent.parent
PROC = ROOT / "data" / "processed"
OUT = ROOT / "apps" / "web" / "public" / "model"
ART = Path(__file__).resolve().parent / "artifacts"
NGRAM = (2, 5)
MIN_DF = 3
KEEP = 60000          # features kept after pruning (model-size control)
SIG_SCALE = 1.0
LANG_WEIGHT = 3.0
VERSION = "2026-11-23.2"
rng = random.Random(7)


# ---- training-set-only augmentation: Hinglish has no standard spelling -------------------------------
def spell_variant(text: str) -> str:
    subs = [("aa", "a"), ("ee", "i"), ("oo", "u"), ("kh", "k"), ("ph", "f"), ("ai", "ay"), ("hai", "he"), ("nahi", "nahin"), ("karein", "karen"),
            ("aapka", "apka"), ("aapki", "apki"), ("abhi", "abi"), ("turant", "turant"), ("bhejo", "bhejiye")]
    out = text
    for a, b in rng.sample(subs, k=3):
        if rng.random() < 0.7:
            out = out.replace(a, b)
    if rng.random() < 0.3:
        out = out.replace(" ", "  ", 1)
    return out


def sigmoid(x):
    return 1.0 / (1.0 + np.exp(-x))


def main():
    t0 = time.time()
    df = pd.read_csv(PROC / "corpus.csv")
    sg = load_signals()
    sig_ids = [s["id"] for s in sg["signals"]]

    tr = df[df.split == "train"].reset_index(drop=True)
    aug = tr[tr.lang == "hinglish"].sample(frac=0.6, random_state=1).copy()
    aug["text"] = aug.text.map(spell_variant)
    tr_aug = pd.concat([tr, aug], ignore_index=True)
    va = df[df.split == "val"].reset_index(drop=True)
    print(f"train={len(tr)} (+{len(aug)} spelling variants) val={len(va)}", flush=True)

    def prep(texts):
        feats, sigs = [], []
        for t in texts:
            _, _, f, s = analyse(t, sg, NGRAM)
            feats.append(f); sigs.append({x["id"] for x in s})
        return feats, sigs

    F_tr, S_tr = prep(tr_aug.text)
    F_va, S_va = prep(va.text)
    print(f"analysed in {time.time()-t0:.0f}s", flush=True)

    # vocabulary and idf: fit on the training set only
    dfc: Counter = Counter()
    for f in F_tr:
        dfc.update(f.keys())
    N = len(F_tr)
    vocab_all = sorted(k for k, c in dfc.items() if c >= MIN_DF)
    idf_all = {k: math.log((1 + N) / (1 + dfc[k])) + 1.0 for k in vocab_all}

    def build(F, S, vocab):
        idx = {k: i for i, k in enumerate(vocab)}
        rows, cols, vals = [], [], []
        for r, f in enumerate(F):
            items = [(idx[k], (1.0 + math.log(c)) * idf_all[k]) for k, c in f.items() if k in idx]
            nrm = math.sqrt(sum(v * v for _, v in items)) or 1.0
            for j, v in items:
                rows.append(r); cols.append(j); vals.append(v / nrm)
        X = csr_matrix((vals, (rows, cols)), shape=(len(F), len(vocab)))
        D = np.array([[1.0 if s in row else 0.0 for s in sig_ids] for row in S]) * SIG_SCALE
        return hstack([X, csr_matrix(D)]).tocsr()

    y_tr, y_va = tr_aug.label.values, va.label.values
    w_tr = np.where(tr_aug.lang.values == 'english', 1.0, LANG_WEIGHT)   # Hindi/Hinglish data is scarce: upweight it
    # 1) choose C on validation (full vocabulary)
    X_tr, X_va = build(F_tr, S_tr, vocab_all), build(F_va, S_va, vocab_all)
    best = None
    for C in (0.3, 1, 3, 10, 30):
        m = LogisticRegression(C=C, class_weight="balanced", max_iter=3000, solver="liblinear").fit(X_tr, y_tr, sample_weight=w_tr)
        ap = average_precision_score(y_va, m.decision_function(X_va))
        print(f"  C={C:<5} val AP={ap:.4f}", flush=True)
        if best is None or ap > best[0]:
            best = (ap, C, m)
    _, C, m_full = best
    # 2) prune to the KEEP strongest text features, rebuild (norm changes), refit
    nt = len(vocab_all)
    order = np.argsort(-np.abs(m_full.coef_[0][:nt]))[:KEEP]
    vocab = sorted(vocab_all[i] for i in order)
    X_tr, X_va = build(F_tr, S_tr, vocab), build(F_va, S_va, vocab)
    m = LogisticRegression(C=C, class_weight="balanced", max_iter=3000, solver="liblinear").fit(X_tr, y_tr, sample_weight=w_tr)
    z_va = m.decision_function(X_va)
    print(f"pruned to {len(vocab)} features; val AP={average_precision_score(y_va, z_va):.4f} AUC={roc_auc_score(y_va, z_va):.4f}", flush=True)

    # 3) calibrate on validation (Platt scaling on the raw score)
    cal = LogisticRegression(C=1e6, max_iter=1000).fit(z_va.reshape(-1, 1), y_va)
    a, b = float(cal.coef_[0][0]), float(cal.intercept_[0])
    p_va = sigmoid(a * z_va + b)

    # 4) band thresholds on validation. The public-data part of validation is easy (templated), so cuts are tuned on the
    #    realistic part: team-written rows and all Hindi/Hinglish rows. Scam cut = high precision, suspicious cut = high recall.
    real = (va.source.str.startswith("team_") | (va.lang != "english")).values
    yr, pr_ = y_va[real], p_va[real]
    print(f"threshold-tuning subset: {real.sum()} of {len(va)} validation rows")
    grid = np.round(np.arange(0.02, 0.99, 0.01), 2)
    def prec(t): s = pr_ >= t; return (yr[s] == 1).mean() if s.sum() else 1.0
    def rec(t): return (pr_[yr == 1] >= t).mean()
    ok_p = [t for t in grid if prec(t) >= 0.97]
    scam_cut = min(ok_p) if ok_p else 0.85
    ok_r = [t for t in grid if rec(t) >= 0.97]
    susp_cut = max(ok_r) if ok_r else 0.15
    if susp_cut >= scam_cut - 0.15:          # keep a real "suspicious" band so uncertain cases are never shown as certain
        susp_cut = max(0.05, round(scam_cut - 0.25, 2))
    print(f"calibration a={a:.3f} b={b:.3f}; suspicious cut={susp_cut:.2f} (recall {rec(susp_cut):.3f}), scam cut={scam_cut:.2f} (precision {prec(scam_cut):.3f})")

    # 5) export
    coef = m.coef_[0]
    model = {
        "version": VERSION, "signals_version": sg["version"], "char_ngrams": list(NGRAM), "sig_scale": SIG_SCALE,
        "intercept": round(float(m.intercept_[0]), 6), "calibration": {"a": round(a, 6), "b": round(b, 6)},
        "thresholds": {"suspicious": float(susp_cut), "scam": float(scam_cut)},
        "features": vocab, "idf": [round(idf_all[k], 5) for k in vocab], "coef": [round(float(c), 6) for c in coef[:len(vocab)]],
        "signal_coef": {s: round(float(c), 6) for s, c in zip(sig_ids, coef[len(vocab):])},
        "meta": {"C": C, "min_df": MIN_DF, "keep": KEEP, "n_train": int(len(tr)), "n_aug": int(len(aug)), "n_val": int(len(va))},
    }
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "model.json").write_text(json.dumps(model, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    shutil.copy(Path(__file__).parent / "signals.json", OUT / "signals.json")
    size = (OUT / "model.json").stat().st_size
    ART.mkdir(exist_ok=True)
    (ART / "train_report.json").write_text(json.dumps({"C": C, "features": len(vocab), "model_bytes": size, "val_ap": float(average_precision_score(y_va, z_va)),
                                                          "val_auc": float(roc_auc_score(y_va, z_va)), "thresholds": model["thresholds"]}, indent=2))
    print(f"exported model.json: {size/1e6:.2f} MB ({len(vocab)} features) in {time.time()-t0:.0f}s")

    # rounding check: reload through the reference scorer and compare with sklearn on a sample
    from textpipe import Model
    mm = Model(model)
    chk = va.sample(200, random_state=0)
    zs = np.array([mm.score(t, sg)["z"] for t in chk.text])
    zs_sk = z_va[chk.index.values]
    print(f"reference-scorer vs sklearn max |dz| on 200 val messages: {np.abs(zs - zs_sk).max():.2e}")


if __name__ == "__main__":
    main()
