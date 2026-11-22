"""multilingual-e5-small (frozen embeddings) + LR, vs the best TF-IDF model, same eval protocol."""
import random
import time
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
import torch
from scipy.sparse import hstack, csr_matrix
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, f1_score
from transformers import AutoModel, AutoTokenizer

warnings.filterwarnings("ignore")
import re
D = Path(__file__).parent / "data"
syn = pd.read_csv(D / "synthetic.csv")
wild = pd.read_csv(D / "wild.csv")

MID = "intfloat/multilingual-e5-small"
tok = AutoTokenizer.from_pretrained(MID)
enc = AutoModel.from_pretrained(MID).eval()


@torch.no_grad()
def embed(texts, bs=32):
    out = []
    for i in range(0, len(texts), bs):
        b = tok(["query: " + t for t in texts[i:i + bs]], padding=True, truncation=True, max_length=128, return_tensors="pt")
        h = enc(**b).last_hidden_state
        m = b["attention_mask"].unsqueeze(-1)
        e = (h * m).sum(1) / m.sum(1)
        out.append(torch.nn.functional.normalize(e, dim=-1).numpy())
    return np.vstack(out)


t0 = time.time()
E_syn = embed(syn.text.tolist())
E_wild = embed(wild.text.tolist())
print(f"embedded {len(syn)+len(wild)} texts in {time.time()-t0:.0f}s ({(time.time()-t0)/(len(syn)+len(wild))*1000:.0f} ms/text on CPU)")


def norm(s):
    s = s.lower()
    s = re.sub(r"https?://\S+|\b\S+\.(com|in|xyz|top|co\.in)\S*|\b(bit\.ly|tinyurl\.com|rb\.gy|cutt\.ly)\S*", " urltok ", s)
    return re.sub(r"\d+", "0", s)


def tfidf(): return TfidfVectorizer(preprocessor=norm, analyzer="char_wb", ngram_range=(1, 3), sublinear_tf=True)


def split(seed, frac=0.25):
    rng = random.Random(seed)
    ids = set()
    for (_, _), g in syn.groupby(["lang", "label"]):
        u = sorted(g.template_id.unique())
        ids |= set(rng.sample(u, max(1, round(len(u) * frac))))
    return ~syn.template_id.isin(ids).values


def f1(y, p): return f1_score(y, p, average="macro")


# model variants: (name, fit_predict(train_idx_mask or None, X_text_train, E_train, y_train, X_text_test, E_test))
def run_tfidf(tr_t, tr_e, y, te_t, te_e):
    v = tfidf(); X = v.fit_transform(tr_t)
    return LogisticRegression(max_iter=2000, C=10).fit(X, y).predict(v.transform(te_t))


def run_emb(C):
    def f(tr_t, tr_e, y, te_t, te_e):
        return LogisticRegression(max_iter=3000, C=C).fit(tr_e, y).predict(te_e)
    return f


def run_hybrid(tr_t, tr_e, y, te_t, te_e):
    v = tfidf(); X = hstack([v.fit_transform(tr_t), csr_matrix(tr_e)]).tocsr()
    Xt = hstack([v.transform(te_t), csr_matrix(te_e)]).tocsr()
    return LogisticRegression(max_iter=3000, C=10).fit(X, y).predict(Xt)


VARIANTS = {
    "TF-IDF char(1-3)+LR (best classic)": run_tfidf,
    "e5-small emb + LR (C=1)": run_emb(1),
    "e5-small emb + LR (C=10)": run_emb(10),
    "e5-small emb + LR (C=100)": run_emb(100),
    "hybrid TF-IDF + e5 emb + LR": run_hybrid,
}

rows = []
for name, fn in VARIANTS.items():
    fs = []
    for seed in range(5):
        m = split(seed)
        p = fn(syn.text[m].tolist(), E_syn[m], syn.label[m].values, syn.text[~m].tolist(), E_syn[~m])
        fs.append(f1(syn.label[~m].values, p))
    pw = fn(syn.text.tolist(), E_syn, syn.label.values, wild.text.tolist(), E_wild)
    per = {l: accuracy_score(wild.label[(wild.lang == l).values], pw[(wild.lang == l).values]) for l in ["en", "hi", "hinglish"]}
    rows.append({"model": name, "heldout_tpl_F1": np.mean(fs), "std": np.std(fs), "wild_acc": accuracy_score(wild.label, pw),
                 "wild_F1": f1(wild.label, pw), "wild_en": per["en"], "wild_hi": per["hi"], "wild_hinglish": per["hinglish"]})

df = pd.DataFrame(rows)
pd.set_option("display.width", 220)
print(df.round(3).to_string(index=False))
df.to_csv(D / "results_transformer.csv", index=False)
