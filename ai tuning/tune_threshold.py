"""Threshold tuning on wild_big WITHOUT peeking: group-aware 5-fold cross-fitting.
Messages that are translations/paraphrases of each other (close in multilingual-e5 space) share a group,
so a threshold picked on 4 folds is scored on a fold whose content it never saw."""
import warnings
from pathlib import Path
import numpy as np, pandas as pd
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components
from sklearn.metrics import f1_score, fbeta_score, roc_auc_score, average_precision_score
from sklearn.model_selection import GroupKFold

warnings.filterwarnings("ignore")
D = Path(__file__).parent / "data"
wild = pd.read_csv(D / "wild_big.csv"); y = wild.label.values
E = np.load(D / "emb_wild.npy"); S = E @ E.T
np.fill_diagonal(S, 0)
for thr in np.arange(0.84, 0.99, 0.01):
    n, lab = connected_components(coo_matrix(S >= thr), directed=False)
    if np.bincount(lab).max() <= 8: break
groups = lab
print(f"groups={n} (link thr={thr:.2f}, largest group={np.bincount(lab).max()}) over {len(y)} messages")

P = {k: v for k, v in np.load(D / "probs_frozen.npz").items()}
ft = D / "probs_finetuned.npy"
if ft.exists(): P["finetuned"] = np.load(ft)
GRID = np.round(np.arange(0.02, 0.99, 0.02), 2)

def pick(p, yy, policy):
    if policy == "recall>=95%":     # strictest threshold that still catches >=95% of scams in the selection data
        ok = [t for t in GRID if (p[yy == 1] >= t).mean() >= 0.95]
        return max(ok) if ok else GRID[0]
    return max(GRID, key=lambda t: fbeta_score(yy, p >= t, beta=2))   # F2 weights recall 2x

rng = np.random.default_rng(0)
boot = [rng.integers(0, len(y), len(y)) for _ in range(1000)]
rows, pooled = [], {}
for name, p in P.items():
    auc = roc_auc_score(y, p); ap = average_precision_score(y, p)
    ci = np.percentile([roc_auc_score(y[i], p[i]) for i in boot if len(set(y[i])) == 2], [2.5, 97.5])
    base = {"model": name, "AUC": auc, "AUC_CI": f"{ci[0]:.3f}-{ci[1]:.3f}", "AP": ap}
    def rec(tag, pred):
        r = dict(base); r.update({"threshold": tag, "F1": f1_score(y, pred, average="macro"), "errors": int((pred != y).sum()),
                                  "scam_recall": pred[y == 1].mean(), "false_pos": pred[y == 0].mean()})
        for l in ["en", "hi", "hinglish"]:
            m = (wild.lang == l).values; r[l] = (pred[m] == y[m]).mean()
        rows.append(r)
    rec("fixed 0.50", p >= 0.5)
    for policy in ["recall>=95%", "max F2"]:
        pred = np.zeros(len(y), bool); ts = []
        for tr, te in GroupKFold(5).split(p, y, groups):
            t = pick(p[tr], y[tr], policy); ts.append(t); pred[te] = p[te] >= t
        rec(f"{policy} (cross-fit, t~{np.mean(ts):.2f})", pred)
        pooled[(name, policy)] = pred

df = pd.DataFrame(rows)
pd.set_option("display.width", 260)
print(df.drop(columns=["AP"]).round(3).to_string(index=False))
df.to_csv(D / "results_threshold.csv", index=False)

best = max(P, key=lambda k: roc_auc_score(y, P[k]))
print(f"\nTrade-off curve for best-AUC model ({best}) — in-sample, for reading the trade-off only:")
for t in [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7]:
    pr = P[best] >= t
    print(f"  t={t:.1f}  scam caught={pr[y==1].mean():.2f}  genuine flagged={pr[y==0].mean():.2f}")
