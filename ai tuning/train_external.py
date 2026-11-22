"""Train on downloaded public datasets (+ optional synthetic), test on hand-written wild_big (160).
Dedupes on a digit/url-masked key so templated rows don't dominate. Time-boxed; prints timings."""
import glob, json, re, time, warnings
from pathlib import Path
import numpy as np, pandas as pd, torch
from scipy.sparse import hstack, csr_matrix
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import f1_score
from sklearn.naive_bayes import ComplementNB
from sklearn.pipeline import make_union
from transformers import AutoModel, AutoTokenizer

warnings.filterwarnings("ignore")
T0 = time.time()
D = Path(__file__).parent / "data"; X = D / "ext"
DEV = re.compile(r"[ऀ-ॿ]")

def norm(s):
    s = s.lower()
    s = re.sub(r"https?://\S+|\b\S+\.(com|in|xyz|top|co\.in)\S*|\b(bit\.ly|tinyurl\.com|rb\.gy|cutt\.ly)\S*", " urltok ", s)
    return re.sub(r"\d+", "0", s)

# ---------- load sources ----------
parts = []
s = pd.read_csv(X / "scam-classification-multiclass/sentinel_dataset_multiclass_clean.csv")
parts.append(pd.DataFrame({"text": s.text, "label": (s.label != 0).astype(int), "src": "shade63"}))
c = pd.read_parquet(glob.glob(str(X / "india-spam-sms/data/*.parquet"))[0])
parts.append(pd.DataFrame({"text": c.text, "label": c.label.astype(int), "src": "clove"}))
b = json.load(open(X / "hinglish-scam-text-dataset/data.json", encoding="utf-8"))
b = pd.DataFrame(b["rows"] if isinstance(b, dict) and "rows" in b else b)
if "row" in b.columns: b = pd.DataFrame(list(b["row"]))
elif "rows" in b.columns: b = pd.DataFrame(list(b["rows"]))
parts.append(pd.DataFrame({"text": b.text, "label": b.label.astype(int), "src": "bolewara"}))
y = pd.read_csv(X / "Indian_Cyber_Scam_PhoneCall_Hinglish_Dataset/India_Cyber_Scam_Hinglish_Dataset.csv")
parts.append(pd.DataFrame({"text": y.text, "label": y.label.astype(int), "src": "ysangam_calls"}))
ext = pd.concat(parts, ignore_index=True)
ext["text"] = ext.text.astype(str)
ext["key"] = ext.text.map(norm)
ext = ext.drop_duplicates("key").reset_index(drop=True)
syn = pd.read_csv(D / "synthetic.csv"); syn["src"] = "synthetic"
wild = pd.read_csv(D / "wild_big.csv")
print("external after masked dedupe:\n", ext.groupby("src").label.agg(["count", "mean"]).round(2).to_string())
print(f"devanagari rows in external: {int(ext.text.str.contains(DEV).sum())}")

# ---------- embeddings (cached) ----------
MID = "intfloat/multilingual-e5-small"
tok = AutoTokenizer.from_pretrained(MID); enc = AutoModel.from_pretrained(MID).eval()
torch.set_num_threads(max(1, torch.get_num_threads()))

@torch.no_grad()
def embed(texts, bs=64):
    out = []
    order = np.argsort([len(t) for t in texts])  # length-bucket for speed
    for i in range(0, len(texts), bs):
        idx = order[i:i + bs]
        b = tok(["query: " + texts[j] for j in idx], padding=True, truncation=True, max_length=96, return_tensors="pt")
        h = enc(**b).last_hidden_state; m = b["attention_mask"].unsqueeze(-1)
        out.append(torch.nn.functional.normalize((h * m).sum(1) / m.sum(1), dim=-1).numpy())
    E = np.vstack(out); R = np.empty_like(E); R[order] = E
    return R

t = time.time()
E_ext, E_syn, E_w = embed(ext.text.tolist()), embed(syn.text.tolist()), embed(wild.text.tolist())
print(f"embedded {len(ext)+len(syn)+len(wild)} texts in {time.time()-t:.0f}s")

# ---------- training configs ----------
yw = wild.label.values
def ch(lo, hi): return TfidfVectorizer(preprocessor=norm, analyzer="char_wb", ngram_range=(lo, hi), sublinear_tf=True, max_features=200000)
def wd(): return TfidfVectorizer(preprocessor=norm, ngram_range=(1, 2), sublinear_tf=True, max_features=200000)
LR = lambda: LogisticRegression(max_iter=1000, C=10)

def run(kind, tr_text, tr_E, tr_y):
    if kind == "emb":
        return LogisticRegression(max_iter=2000, C=10).fit(tr_E, tr_y).predict(E_w)
    if kind == "hybrid":
        v = ch(1, 3); Xt = hstack([v.fit_transform(tr_text), csr_matrix(tr_E)]).tocsr()
        return LogisticRegression(max_iter=2000, C=10).fit(Xt, tr_y).predict(hstack([v.transform(wild.text), csr_matrix(E_w)]).tocsr())
    v = {"char13": lambda: ch(1, 3), "char25": lambda: ch(2, 5), "word+char": lambda: make_union(wd(), ch(2, 5)), "word_cnb": wd}[kind]()
    clf = ComplementNB(alpha=0.1) if kind == "word_cnb" else LR()
    return clf.fit(v.fit_transform(tr_text), tr_y).predict(v.transform(wild.text))

CONFIGS = {
    "external only": (ext.text.tolist(), E_ext, ext.label.values),
    "synthetic only": (syn.text.tolist(), E_syn, syn.label.values),
    "external+synthetic": (ext.text.tolist() + syn.text.tolist(), np.vstack([E_ext, E_syn]), np.concatenate([ext.label.values, syn.label.values])),
}
KINDS = ["char13", "word+char", "word_cnb", "emb", "hybrid"]

rows = []
for cname, (tt, te, ty) in CONFIGS.items():
    for k in KINDS:
        t = time.time(); p = run(k, tt, te, ty)
        r = {"train": cname, "model": k, "F1": f1_score(yw, p, average="macro"), "errors": int((p != yw).sum()),
             "scam_recall": (p[yw == 1] == 1).mean(), "false_pos": (p[yw == 0] == 1).mean()}
        for l in ["en", "hi", "hinglish"]:
            m = (wild.lang == l).values; r[l] = (p[m] == yw[m]).mean()
        r["sec"] = time.time() - t; rows.append(r)
        print(f"{cname:20s} {k:10s} F1={r['F1']:.3f} err={r['errors']:3d} recall={r['scam_recall']:.2f} FP={r['false_pos']:.2f} en={r['en']:.2f} hi={r['hi']:.2f} hing={r['hinglish']:.2f} ({r['sec']:.0f}s, total {time.time()-T0:.0f}s)", flush=True)
pd.DataFrame(rows).to_csv(D / "results_external.csv", index=False)
print(f"DONE in {time.time()-T0:.0f}s")
