"""Frozen-model probabilities on wild_big (train = external + synthetic). Saves data/probs_frozen.npz + embeddings."""
import time, warnings
import numpy as np, torch
from scipy.sparse import hstack, csr_matrix
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from transformers import AutoModel, AutoTokenizer
from common import D, load_all, norm

warnings.filterwarnings("ignore")
t0 = time.time()
ext, syn, wild = load_all()
train_text = ext.text.tolist() + syn.text.tolist()
train_y = np.concatenate([ext.label.values, syn.label.values])

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

E_tr, E_w = embed(train_text), embed(wild.text.tolist())
np.save(D / "emb_wild.npy", E_w)
print(f"embedded in {time.time()-t0:.0f}s", flush=True)

emb = LogisticRegression(max_iter=2000, C=10).fit(E_tr, train_y)
v = TfidfVectorizer(preprocessor=norm, analyzer="char_wb", ngram_range=(1, 3), sublinear_tf=True, max_features=200000)
Xtr = hstack([v.fit_transform(train_text), csr_matrix(E_tr)]).tocsr()
hyb = LogisticRegression(max_iter=2000, C=10).fit(Xtr, train_y)
np.savez(D / "probs_frozen.npz",
         emb=emb.predict_proba(E_w)[:, 1],
         hybrid=hyb.predict_proba(hstack([v.transform(wild.text), csr_matrix(E_w)]).tocsr())[:, 1])
print(f"saved probs, total {time.time()-t0:.0f}s")
