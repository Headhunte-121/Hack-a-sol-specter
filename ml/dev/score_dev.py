"""Score a model.json on dev/dev_stress_v1.csv: development numbers only (see make_dev_stress.py).
Usage: python dev/score_dev.py [model.json] [signals.json]"""
import csv, json, sys
from collections import defaultdict
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
from textpipe import Model, load_signals  # noqa: E402

args = [a for a in sys.argv[1:] if not a.startswith("-")]
model_path = Path(args[0]) if args else HERE.parent.parent / "apps/web/public/model/model.json"
sig_path = Path(args[1]) if len(args) > 1 else None
sg = load_signals(sig_path)
m = Model.load(model_path); m.signals = sg
th = m.d["thresholds"]
DS = "dev_sms_v1.csv" if "--sms" in sys.argv else "dev_stress_v1.csv"
rows = list(csv.DictReader(open(HERE / DS, encoding="utf-8")))
for r in rows: r.setdefault("family", "sms"); r.setdefault("lang", "sms")
def clean_rows(rows, thr=0.7):
    """--clean: drop dev rows that are near-duplicates (token-set Jaccard >= thr) of any training / validation corpus row, so the dev numbers
    are not inflated by templates written after the dev set was seen."""
    import csv as _csv
    from collections import defaultdict
    from textpipe import tokenize
    corpus = [r for r in _csv.DictReader(open(HERE.parent.parent / "data/processed/corpus.csv", encoding="utf-8")) if r["split"] in ("train", "val")]
    sets = [frozenset(t["t"] for t in tokenize(r["text"])) for r in corpus]
    inv = defaultdict(list)
    for i, st in enumerate(sets):
        for w in st: inv[w].append(i)
    kept = []; dropped = 0
    for r in rows:
        a = frozenset(t["t"] for t in tokenize(r["text"]))
        cand = defaultdict(int)
        for w in a:
            for i in inv.get(w, ()): cand[i] += 1
        best = max((c / (len(a) + len(sets[i]) - c) for i, c in cand.items()), default=0.0)
        if best >= thr: dropped += 1
        else: kept.append(r)
    print(f"--clean: dropped {dropped} of {len(rows)} dev rows that are near-duplicates (Jaccard >= {thr}) of corpus rows; scoring the other {len(kept)}")
    return kept


def band(p): return "scam" if p >= th["scam"] else "susp" if p >= th["suspicious"] else "ok"
if "--clean" in sys.argv: rows = clean_rows(rows)
tp = fn = fp = tn = 0; flag_s = flag_g = 0
fam = defaultdict(lambda: [0, 0]); miss = []; fa = []; lang = defaultdict(lambda: [0, 0])
for r in rows:
    y = int(r["label"]); s = m.score(r["text"], sg); b = band(s["p"])
    if y:
        fam[r["family"]][1] += 1; lang[r["lang"]][1] += 1
        if b == "scam": tp += 1
        else: fn += 1
        if b != "ok": flag_s += 1; fam[r["family"]][0] += 1; lang[r["lang"]][0] += 1
        if b != "scam": miss.append((round(s["p"], 3), b, r["family"], r["text"][:90]))
    else:
        if b == "scam": fp += 1
        else: tn += 1
        if b != "ok": flag_g += 1; fa.append((round(s["p"], 3), b, r["family"], r["text"][:90]))
n1 = tp + fn; n0 = fp + tn
print(f"{model_path.parent.name}/{model_path.name} v={m.d['version']} cuts={th}")
print(f"scams {n1}: likely_scam {tp} ({tp/n1:.1%}), flagged at least suspicious {flag_s} ({flag_s/n1:.1%});  genuine {n0}: flagged likely_scam {fp}, at least suspicious {flag_g}")
print("by language (flagged>=suspicious / scams):", {k: f"{v[0]}/{v[1]}" for k, v in lang.items()})
print("by family (flagged>=suspicious / scams):", {k: f"{v[0]}/{v[1]}" for k, v in fam.items() if v[1] and v[0] < v[1]})
if "-v" in sys.argv:
    print("\nNOT likely_scam:"); [print(" ", x) for x in sorted(miss)]
    print("\nGENUINE flagged:"); [print(" ", x) for x in sorted(fa, reverse=True)]
