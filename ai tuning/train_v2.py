"""Ablation: baseline -> +varied/hard-negative templates -> +MT Hindi/translit -> +rule features.
Models: e5 emb + LR, hybrid (char TF-IDF + e5), hybrid + rule features. Test: wild_big (160, hand-written, never trained on).
Reports AUC, F1@0.5 and group-aware cross-fitted thresholds. Saves per-config probabilities for later analysis."""
import time, warnings
from pathlib import Path
import numpy as np, pandas as pd, torch
from scipy.sparse import coo_matrix, hstack, csr_matrix
from scipy.sparse.csgraph import connected_components
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import f1_score, fbeta_score, roc_auc_score
from sklearn.model_selection import GroupKFold
from transformers import AutoModel, AutoTokenizer
from common import D, load_all, norm
from features import matrix
from translit import to_latin

warnings.filterwarnings("ignore")
T0 = time.time()
ext, syn1, wild = load_all()
syn2 = pd.read_csv(D / "synthetic_v2.csv")
mt = pd.read_csv(D / "mt_hi_raw.csv")
mt_hi = pd.DataFrame({"text": mt.hi, "label": mt.label})
mt_tl = pd.DataFrame({"text": mt.hi.map(to_latin), "label": mt.label})
y = wild.label.values
print(f"ext={len(ext)} syn1={len(syn1)} syn2={len(syn2)} mt_hi={len(mt_hi)} mt_translit={len(mt_tl)}", flush=True)
print("MT sample:", mt_hi.text.iloc[0][:80], "|", mt_tl.text.iloc[0][:80], flush=True)

MID = "intfloat/multilingual-e5-small"
tok = AutoTokenizer.from_pretrained(MID); enc = AutoModel.from_pretrained(MID).eval()

@torch.no_grad()
def embed(texts, bs=64):
    order = np.argsort([len(t) for t in texts]); out = []
    for i in range(0, len(texts), bs):
        idx = order[i:i + bs]
        b = tok(["query: " + texts[j] for j in idx], padding=True, truncation=True, max_length=96, return_tensors="pt")
        h = enc(**b).last_hidden_state; m = b["attention_mask"].unsqueeze(-1)
        out.append(torch.nn.functional.normalize((h * m).sum(1) / m.sum(1), dim=-1).numpy())
    E = np.vstack(out); R = np.empty_like(E); R[order] = E
    return R

SETS = {"ext": ext[["text", "label"]], "syn1": syn1[["text", "label"]], "syn2": syn2[["text", "label"]], "mt_hi": mt_hi, "mt_tl": mt_tl}
EMB = {}
cache = D / "emb_cache_v2.npz"
for k, df in SETS.items():
    EMB[k] = embed(df.text.tolist()); print(f"embedded {k} ({len(df)}) t={time.time()-T0:.0f}s", flush=True)
E_w = embed(wild.text.tolist())
RULE = {k: matrix(df.text.tolist()) for k, df in SETS.items()}; RULE_w = matrix(wild.text.tolist())

CONFIGS = {
    "A baseline (ext+syn1)": ["ext", "syn1"],
    "B +varied templates (syn2)": ["ext", "syn1", "syn2"],
    "C +MT Hindi & romanised": ["ext", "syn1", "syn2", "mt_hi", "mt_tl"],
}

def build(keys):
    text = sum([SETS[k].text.tolist() for k in keys], [])
    return text, np.vstack([EMB[k] for k in keys]), np.vstack([RULE[k] for k in keys]), np.concatenate([SETS[k].label.values for k in keys])

def fit_predict(kind, text, E, Rr, yy):
    if kind == "emb":
        return LogisticRegression(max_iter=2000, C=10).fit(E, yy).predict_proba(E_w)[:, 1]
    v = TfidfVectorizer(preprocessor=norm, analyzer="char_wb", ngram_range=(1, 3), sublinear_tf=True, max_features=200000)
    parts, parts_w = [v.fit_transform(text), csr_matrix(E)], None
    tw = [v.transform(wild.text), csr_matrix(E_w)]
    if kind == "hybrid+rules":
        parts.append(csr_matrix(Rr * 2.0)); tw.append(csr_matrix(RULE_w * 2.0))
    return LogisticRegression(max_iter=3000, C=10).fit(hstack(parts).tocsr(), yy).predict_proba(hstack(tw).tocsr())[:, 1]

# ---- group-aware cross-fitted thresholds (same protocol as tune_threshold.py) ----
S = E_w @ E_w.T; np.fill_diagonal(S, 0)
for thr in np.arange(0.84, 0.99, 0.01):
    ng, groups = connected_components(coo_matrix(S >= thr), directed=False)
    if np.bincount(groups).max() <= 8: break
GRID = np.round(np.arange(0.02, 0.99, 0.02), 2)
def pick(p, yy, policy):
    if policy == "recall>=95%":
        ok = [t for t in GRID if (p[yy == 1] >= t).mean() >= 0.95]; return max(ok) if ok else GRID[0]
    return max(GRID, key=lambda t: fbeta_score(yy, p >= t, beta=2))
def crossfit(p, policy):
    pred = np.zeros(len(y), bool)
    for tr, te in GroupKFold(5).split(p, y, groups): pred[te] = p[te] >= pick(p[tr], y[tr], policy)
    return pred

rng = np.random.default_rng(0); boot = [rng.integers(0, len(y), len(y)) for _ in range(1000)]
rows, probs = [], {}
for cname, keys in CONFIGS.items():
    text, E, Rr, yy = build(keys)
    for kind in ["emb", "hybrid", "hybrid+rules"]:
        p = fit_predict(kind, text, E, Rr, yy); probs[f"{cname}|{kind}"] = p
        auc = roc_auc_score(y, p); ci = np.percentile([roc_auc_score(y[i], p[i]) for i in boot], [2.5, 97.5])
        r = {"config": cname, "model": kind, "n_train": len(yy), "AUC": auc, "AUC_CI": f"{ci[0]:.3f}-{ci[1]:.3f}",
             "F1@0.5": f1_score(y, p >= 0.5, average="macro"), "recall@0.5": (p[y == 1] >= .5).mean(), "FP@0.5": (p[y == 0] >= .5).mean()}
        for pol, tag in [("recall>=95%", "R95"), ("max F2", "F2")]:
            pr = crossfit(p, pol)
            r[f"F1_{tag}"] = f1_score(y, pr, average="macro"); r[f"recall_{tag}"] = pr[y == 1].mean(); r[f"FP_{tag}"] = pr[y == 0].mean()
            for l in ["en", "hi", "hinglish"]:
                m = (wild.lang == l).values; r[f"{l}_{tag}"] = (pr[m] == y[m]).mean()
        rows.append(r)
        print(f"{cname:28s} {kind:13s} AUC={auc:.3f} F1@.5={r['F1@0.5']:.3f} | R95: F1={r['F1_R95']:.3f} rec={r['recall_R95']:.2f} FP={r['FP_R95']:.2f} | F2: F1={r['F1_F2']:.3f} rec={r['recall_F2']:.2f} FP={r['FP_F2']:.2f} | t={time.time()-T0:.0f}s", flush=True)

pd.DataFrame(rows).to_csv(D / "results_v2.csv", index=False)
np.savez(D / "probs_v2.npz", **{k.replace("|", "__"): v for k, v in probs.items()})
ft = D / "probs_finetuned.npy"
if ft.exists():
    p = np.load(ft); print(f"\nfine-tuned e5 (earlier run, ext+syn1 subsample): AUC={roc_auc_score(y, p):.3f} F1@.5={f1_score(y, p >= .5, average='macro'):.3f}")
print(f"DONE {time.time()-T0:.0f}s")
