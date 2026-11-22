"""Compare classic text classifiers for scam detection in en / hi / hinglish.

Eval 1: template-grouped splits (test templates never seen in training), 5 seeds.
Eval 2: train on all synthetic, test on the hand-written 'wild' set.
"""
import re
import random
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression, SGDClassifier
from sklearn.metrics import f1_score, accuracy_score
from sklearn.naive_bayes import ComplementNB
from sklearn.pipeline import make_pipeline, make_union
from sklearn.svm import LinearSVC

warnings.filterwarnings("ignore")
D = Path(__file__).parent / "data"


def norm(s: str) -> str:
    s = s.lower()
    s = re.sub(r"https?://\S+|\b\S+\.(com|in|xyz|top|co\.in)\S*|\b(bit\.ly|tinyurl\.com|rb\.gy|cutt\.ly)\S*", " urltok ", s)
    s = re.sub(r"\d+", "0", s)
    return s


def word(): return TfidfVectorizer(preprocessor=norm, ngram_range=(1, 2), sublinear_tf=True, min_df=1)
def char(lo=2, hi=5): return TfidfVectorizer(preprocessor=norm, analyzer="char_wb", ngram_range=(lo, hi), sublinear_tf=True, min_df=1)


MODELS = {
    "word(1-2)+LR":        lambda: make_pipeline(word(), LogisticRegression(max_iter=2000, C=10)),
    "char_wb(2-5)+LR":     lambda: make_pipeline(char(), LogisticRegression(max_iter=2000, C=10)),
    "char_wb(1-3)+LR":     lambda: make_pipeline(char(1, 3), LogisticRegression(max_iter=2000, C=10)),
    "char_wb(3-6)+LR":     lambda: make_pipeline(char(3, 6), LogisticRegression(max_iter=2000, C=10)),
    "word+char+LR":        lambda: make_pipeline(make_union(word(), char()), LogisticRegression(max_iter=2000, C=10)),
    "char_wb(2-5)+SVM":    lambda: make_pipeline(char(), LinearSVC(C=1)),
    "word+char+SVM":       lambda: make_pipeline(make_union(word(), char()), LinearSVC(C=1)),
    "char_wb(2-5)+SGDmh":  lambda: make_pipeline(char(), SGDClassifier(loss="modified_huber", alpha=1e-5, random_state=0)),
    "char_wb(2-5)+CNB":    lambda: make_pipeline(char(), ComplementNB(alpha=0.1)),
    "word(1-2)+CNB":       lambda: make_pipeline(word(), ComplementNB(alpha=0.1)),
}

syn = pd.read_csv(D / "synthetic.csv")
wild = pd.read_csv(D / "wild.csv")


def template_split(seed, frac=0.25):
    rng = random.Random(seed)
    test_ids = set()
    for (lang, label), g in syn.groupby(["lang", "label"]):
        ids = sorted(g.template_id.unique())
        k = max(1, round(len(ids) * frac))
        test_ids |= set(rng.sample(ids, k))
    te = syn.template_id.isin(test_ids)
    return syn[~te], syn[te]


def score(y, p): return accuracy_score(y, p), f1_score(y, p, average="macro")


rows = []
for name, mk in MODELS.items():
    # Eval 1
    acc1, f11 = [], []
    for seed in range(5):
        tr, te = template_split(seed)
        m = mk().fit(tr.text, tr.label)
        a, f = score(te.label, m.predict(te.text))
        acc1.append(a); f11.append(f)
    # Eval 2
    m = mk().fit(syn.text, syn.label)
    pw = m.predict(wild.text)
    a2, f2 = score(wild.label, pw)
    per = {}
    for lang in ["en", "hi", "hinglish"]:
        mask = (wild.lang == lang).values
        per[lang] = accuracy_score(wild.label[mask], pw[mask])
    rows.append({
        "model": name,
        "heldout_tpl_F1": np.mean(f11), "heldout_tpl_std": np.std(f11),
        "wild_acc": a2, "wild_F1": f2,
        "wild_en": per["en"], "wild_hi": per["hi"], "wild_hinglish": per["hinglish"],
    })

df = pd.DataFrame(rows).sort_values("wild_F1", ascending=False)
pd.set_option("display.width", 200)
print(df.round(3).to_string(index=False))
df.to_csv(D / "results_classic.csv", index=False)
