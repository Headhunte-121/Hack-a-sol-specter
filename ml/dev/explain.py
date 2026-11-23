"""Show what pushes a message's score: python dev/explain.py model.json "text" ..."""
import math, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from textpipe import Model, analyse, load_signals
m = Model.load(Path(sys.argv[1])); sg = load_signals(); m.signals = sg
for text in sys.argv[2:]:
    toks, words, feats, fired = analyse(text, sg, tuple(m.d["char_ngrams"]))
    vals = {}
    for k, c in feats.items():
        i = m.idx.get(k)
        if i is not None: vals[i] = (1 + math.log(c)) * m.idf[i]
    norm = math.sqrt(sum(v * v for v in vals.values())) or 1
    contrib = sorted(((m.coef[i] * v / norm, m.d["features"][i]) for i, v in vals.items()), reverse=True)
    sigs = {s["id"]: m.sig_coef.get(s["id"], 0) for s in fired}
    r = m.score(text, sg)
    print(f"p={r['p']:.3f} z={r['z']:.2f} intercept={m.d['intercept']:.2f} text={sum(c for c,_ in contrib):.2f} signals={sigs}\n  {text}")
    print("  top +:", [(round(c, 2), f) for c, f in contrib[:8]])
    print("  top -:", [(round(c, 2), f) for c, f in contrib[-4:]])
