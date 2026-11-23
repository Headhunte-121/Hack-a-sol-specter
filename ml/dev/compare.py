"""Compare candidate models side by side on the development sets (and the corpus test split).
Usage: python dev/compare.py model_a.json model_b.json ...      (each file is scored with ml/signals.json)
Dev sets are DEVELOPMENT numbers: written by the same author as the v3 training templates, so they flatter the v3 models; the "clean" columns drop
dev rows that are near-duplicates (token-set Jaccard >= 0.7) of any training / validation row, which removes the most direct overlap but not style.
"""
import csv
import sys
from collections import defaultdict
from pathlib import Path

import numpy as np
from sklearn.metrics import average_precision_score, roc_auc_score

HERE = Path(__file__).resolve().parent
import os
sys.path.insert(0, os.environ.get("PIPELINE_DIR") or str(HERE.parent))   # PIPELINE_DIR: score with another copy of textpipe.py + signals.json (the old pipeline)
from textpipe import Model, load_signals, tokenize  # noqa: E402

sg = load_signals()
corpus = list(csv.DictReader(open(HERE.parent.parent / "data/processed/corpus.csv", encoding="utf-8")))
trainval = [r for r in corpus if r["split"] in ("train", "val")]
test = [r for r in corpus if r["split"] == "test"]
sets = [frozenset(t["t"] for t in tokenize(r["text"])) for r in trainval]
inv = defaultdict(list)
for i, st in enumerate(sets):
    for w in st: inv[w].append(i)


def near_dup(text, thr=0.7):
    a = frozenset(t["t"] for t in tokenize(text))
    cand = defaultdict(int)
    for w in a:
        for i in inv.get(w, ()): cand[i] += 1
    return max((c / (len(a) + len(sets[i]) - c) for i, c in cand.items()), default=0.0) >= thr


DEV = {name: list(csv.DictReader(open(HERE / f, encoding="utf-8"))) for name, f in (("stress", "dev_stress_v1.csv"), ("sms", "dev_sms_v1.csv"), ("rewrite", "dev_rewrite_v1.csv"), ("evasion", "dev_evasion_v1.csv")) if (HERE / f).exists()}
CLEAN = {name: [r for r in rows if not near_dup(r["text"])] for name, rows in DEV.items()}


def flags(m, rows, cuts):
    y = np.array([int(r["label"]) for r in rows]); p = np.array([m.score(r["text"], sg)["p"] for r in rows])
    s, g = p[y == 1], p[y == 0]
    return dict(n=(len(s), len(g)), red=(int((s >= cuts["scam"]).sum()), int((g >= cuts["scam"]).sum())), amber_up=(int((s >= cuts["suspicious"]).sum()), int((g >= cuts["suspicious"]).sum())),
                auc=roc_auc_score(y, p), ap=average_precision_score(y, p), p=p, y=y)


print(f"{'model':28} {'cuts':>11} | {'set':14} scams red/amber+  genuine red/amber+   AUC     AP")
for path in sys.argv[1:]:
    m = Model.load(Path(path)); m.signals = sg
    cuts = m.d["thresholds"]; tag = f"{Path(path).parent.name}/{Path(path).stem}"[:28]
    for dname in DEV:
        for kind, rows in (("full", DEV[dname]), ("clean", CLEAN[dname])):
            f = flags(m, rows, cuts)
            print(f"{tag:28} {cuts['suspicious']:.2f}/{cuts['scam']:.2f} | {dname + ' ' + kind:14} {f['red'][0]:>3}/{f['n'][0]:<3} {f['amber_up'][0]:>3}/{f['n'][0]:<3}   {f['red'][1]:>3}/{f['n'][1]:<3} {f['amber_up'][1]:>3}/{f['n'][1]:<3}   {f['auc']:.4f} {f['ap']:.4f}")
            tag = ""
    f = flags(m, test, cuts)
    print(f"{'':28} {'':11} | {'corpus test':14} AUC {f['auc']:.4f} AP {f['ap']:.4f}; scams red {f['red'][0]}/{f['n'][0]}, genuine red {f['red'][1]}/{f['n'][1]} amber+ {f['amber_up'][1]}")
