"""Train on synthetic, evaluate on the 160-message hand-written set with bootstrap CIs."""
import re, warnings
from pathlib import Path
import numpy as np, pandas as pd, torch
from scipy.sparse import hstack, csr_matrix
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.naive_bayes import ComplementNB
from sklearn.metrics import f1_score
from sklearn.pipeline import make_union
from transformers import AutoModel, AutoTokenizer

warnings.filterwarnings("ignore")
D = Path(__file__).parent / "data"
syn = pd.read_csv(D / "synthetic.csv"); wild = pd.read_csv(D / "wild_big.csv")
y = wild.label.values

MID = "intfloat/multilingual-e5-small"
tok = AutoTokenizer.from_pretrained(MID); enc = AutoModel.from_pretrained(MID).eval()

@torch.no_grad()
def embed(texts, bs=32):
    out = []
    for i in range(0, len(texts), bs):
        b = tok(["query: " + t for t in texts[i:i+bs]], padding=True, truncation=True, max_length=128, return_tensors="pt")
        h = enc(**b).last_hidden_state; m = b["attention_mask"].unsqueeze(-1)
        out.append(torch.nn.functional.normalize((h*m).sum(1)/m.sum(1), dim=-1).numpy())
    return np.vstack(out)

E_syn, E_w = embed(syn.text.tolist()), embed(wild.text.tolist())

def norm(s):
    s = s.lower()
    s = re.sub(r"https?://\S+|\b\S+\.(com|in|xyz|top|co\.in)\S*|\b(bit\.ly|tinyurl\.com|rb\.gy|cutt\.ly)\S*", " urltok ", s)
    return re.sub(r"\d+", "0", s)
def ch(lo, hi): return TfidfVectorizer(preprocessor=norm, analyzer="char_wb", ngram_range=(lo, hi), sublinear_tf=True)
def wd(): return TfidfVectorizer(preprocessor=norm, ngram_range=(1, 2), sublinear_tf=True)

def sk(vec_fn, clf_fn):
    def f():
        v = vec_fn(); X = v.fit_transform(syn.text); c = clf_fn().fit(X, syn.label)
        return c.predict(v.transform(wild.text))
    return f
def emb(C):
    return lambda: LogisticRegression(max_iter=3000, C=C).fit(E_syn, syn.label).predict(E_w)
def hybrid(C=10):
    def f():
        v = ch(1, 3); X = hstack([v.fit_transform(syn.text), csr_matrix(E_syn)]).tocsr()
        c = LogisticRegression(max_iter=3000, C=C).fit(X, syn.label)
        return c.predict(hstack([v.transform(wild.text), csr_matrix(E_w)]).tocsr())
    return f

LR = lambda: LogisticRegression(max_iter=2000, C=10)
MODELS = {
    "TF-IDF char(1-3)+LR": sk(lambda: ch(1, 3), LR),
    "TF-IDF char(2-5)+LR": sk(lambda: ch(2, 5), LR),
    "TF-IDF word+char+LR": sk(lambda: make_union(wd(), ch(2, 5)), LR),
    "TF-IDF word+CNB": sk(wd, lambda: ComplementNB(alpha=0.1)),
    "e5-small emb+LR": emb(10),
    "hybrid char(1-3)+e5": hybrid(10),
}

rng = np.random.default_rng(0)
idx = [rng.integers(0, len(y), len(y)) for _ in range(2000)]
preds, rows = {}, []
for name, fn in MODELS.items():
    p = fn(); preds[name] = p
    f = f1_score(y, p, average="macro")
    ci = np.percentile([f1_score(y[i], p[i], average="macro") for i in idx], [2.5, 97.5])
    scam, gen = y == 1, y == 0
    r = {"model": name, "F1": f, "CI95": f"{ci[0]:.3f}-{ci[1]:.3f}", "errors": int((p != y).sum()),
         "scam_recall": (p[scam] == 1).mean(), "false_pos_rate": (p[gen] == 1).mean()}
    for l in ["en", "hi", "hinglish"]:
        m = (wild.lang == l).values; r[l] = (p[m] == y[m]).mean()
    rows.append(r)
df = pd.DataFrame(rows).sort_values("F1", ascending=False)
pd.set_option("display.width", 250)
print(f"n={len(y)}  scam={int((y==1).sum())}  genuine={int((y==0).sum())}")
print(df.round(3).to_string(index=False))
df.to_csv(D / "results_wild_big.csv", index=False)

# paired comparison: hybrid vs best classic
a, b = preds["hybrid char(1-3)+e5"], preds["TF-IDF char(1-3)+LR"]
print(f"\nhybrid right & tfidf wrong: {int(((a==y)&(b!=y)).sum())} | tfidf right & hybrid wrong: {int(((a!=y)&(b==y)).sum())}")

print("\nHybrid errors:")
for i in np.where(a != y)[0]:
    print(f"  [{wild.lang[i]} true={y[i]} pred={a[i]}] {wild.text[i][:110]}")
