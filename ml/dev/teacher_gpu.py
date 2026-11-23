"""GPU teacher: fine-tune multilingual-e5-small on the training corpus with group-aware cross-fitting, and write out-of-fold probabilities.

Purpose (the on-device model stays a small linear model; the teacher never ships):
  1. label audit: corpus rows whose out-of-fold teacher probability strongly disagrees with their label (public data is partly LLM-generated
     and partly UCI promo spam) -> candidates to drop from the on-device model's training set;
  2. soft targets: the teacher's cross-lingual knowledge, used by train.py as blended labels for the linear model;
  3. an accuracy ceiling to compare the linear model against on the dev stress set.
Only corpus rows (training / validation / test splits) are used. No frozen evaluation text is read.
Usage: python dev/teacher_gpu.py [--folds 4] [--epochs 2]     -> ml/artifacts/teacher_oof.csv (row, p_oof) and ml/artifacts/teacher_dev.csv
"""
from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

import numpy as np
import pandas as pd
import torch
from sklearn.metrics import average_precision_score, roc_auc_score
from sklearn.model_selection import GroupKFold
from transformers import AutoModel, AutoTokenizer

HERE = Path(__file__).resolve().parent
ML = HERE.parent
ROOT = ML.parent
ART = ML / "artifacts"
MID = "intfloat/multilingual-e5-small"
DEV = "cuda" if torch.cuda.is_available() else "cpu"
MAXLEN, BS = 96, 32


class Teacher:
    def __init__(self, seed: int):
        torch.manual_seed(seed)
        self.tok = AutoTokenizer.from_pretrained(MID)
        self.enc = AutoModel.from_pretrained(MID).to(DEV)
        self.enc.embeddings.word_embeddings.weight.requires_grad = False
        self.head = torch.nn.Linear(self.enc.config.hidden_size, 1).to(DEV)

    def forward(self, texts):
        b = self.tok(["query: " + t for t in texts], padding=True, truncation=True, max_length=MAXLEN, return_tensors="pt").to(DEV)
        with torch.autocast(DEV, dtype=torch.bfloat16, enabled=(DEV == "cuda")):
            h = self.enc(**b).last_hidden_state
        h = h.float(); m = b["attention_mask"].unsqueeze(-1)
        return self.head(torch.nn.functional.normalize((h * m).sum(1) / m.sum(1), dim=-1) * 8.0).squeeze(-1)

    def fit(self, texts, y, w, epochs):
        params = [{"params": [p for p in self.enc.parameters() if p.requires_grad], "lr": 3e-5}, {"params": self.head.parameters(), "lr": 2e-3}]
        opt = torch.optim.AdamW(params, weight_decay=0.01)
        n = len(texts); steps = epochs * ((n + BS - 1) // BS); step = 0
        sched = torch.optim.lr_scheduler.LambdaLR(opt, lambda s: min(1.0, (s + 1) / 50) * max(0.05, 1 - s / steps))
        rng = np.random.default_rng(0)
        self.enc.train()
        for _ in range(epochs):
            order = rng.permutation(n)
            for i in range(0, n, BS):
                idx = order[i:i + BS]
                logit = self.forward([texts[j] for j in idx])
                loss = (torch.nn.functional.binary_cross_entropy_with_logits(logit, torch.tensor(y[idx], device=DEV), reduction="none") * torch.tensor(w[idx], device=DEV)).mean()
                opt.zero_grad(); loss.backward(); torch.nn.utils.clip_grad_norm_(self.enc.parameters(), 1.0); opt.step(); sched.step(); step += 1

    @torch.no_grad()
    def predict(self, texts):
        self.enc.eval(); out = []
        order = np.argsort([len(t) for t in texts])
        for i in range(0, len(texts), 128):
            idx = order[i:i + 128]
            out.append((idx, torch.sigmoid(self.forward([texts[j] for j in idx])).float().cpu().numpy()))
        p = np.zeros(len(texts))
        for idx, v in out: p[idx] = v
        return p


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--folds", type=int, default=4)
    ap.add_argument("--epochs", type=int, default=2)
    args = ap.parse_args()
    if DEV != "cuda":
        print("WARNING: no GPU found, this will be slow", file=sys.stderr)
    t0 = time.time()
    df = pd.read_csv(ROOT / "data" / "processed" / "corpus.csv")
    df = df[df.split.isin(["train", "val"])].reset_index(drop=True)   # the test split stays untouched
    texts = df.text.tolist(); y = df.label.values.astype(np.float32)
    # weights: class balance, and Hindi / Hinglish rows count a little more (they are few)
    w = np.where(y == 1, (y == 0).sum() / (y == 1).sum(), 1.0) ** 0.5 * np.where(df.lang.values != "english", 1.5, 1.0)
    w = (w / w.mean()).astype(np.float32)
    oof = np.zeros(len(df))
    gkf = GroupKFold(n_splits=args.folds)
    for k, (tr, te) in enumerate(gkf.split(texts, y, groups=df.group.values)):
        T = Teacher(seed=k)
        T.fit([texts[i] for i in tr], y[tr], w[tr], args.epochs)
        oof[te] = T.predict([texts[i] for i in te])
        print(f"fold {k + 1}/{args.folds}: AUC {roc_auc_score(y[te], oof[te]):.4f} AP {average_precision_score(y[te], oof[te]):.4f}  ({(time.time() - t0) / 60:.1f} min)", flush=True)
        del T; torch.cuda.empty_cache()
    pd.DataFrame({"text": df.text, "label": df.label, "source": df.source, "lang": df.lang, "group": df.group, "p_oof": oof}).to_csv(ART / "teacher_oof.csv", index=False, encoding="utf-8")
    print(f"out-of-fold AUC {roc_auc_score(y, oof):.4f}; wrote artifacts/teacher_oof.csv")
    # full teacher (all train+val) scored on the dev stress set: the accuracy ceiling for a transformer on this data
    T = Teacher(seed=99); T.fit(texts, y, w, args.epochs)
    dev = pd.read_csv(HERE / "dev_stress_v1.csv")
    dev["p_teacher"] = T.predict(dev.text.tolist())
    dev.to_csv(ART / "teacher_dev.csv", index=False, encoding="utf-8")
    s, g = dev[dev.label == 1].p_teacher, dev[dev.label == 0].p_teacher
    print(f"dev stress (teacher): scams caught at 0.5: {(s >= .5).sum()}/{len(s)}; genuine flagged at 0.5: {(g >= .5).sum()}/{len(g)}; AUC {roc_auc_score(dev.label, dev.p_teacher):.4f}")
    torch.save({"head": T.head.state_dict(), "enc": T.enc.state_dict()}, ART / "teacher_full.pt")
    print(f"done in {(time.time() - t0) / 60:.1f} min")


if __name__ == "__main__":
    main()
