"""Translate a balanced sample of English external messages to Hindi (Devanagari) with Helsinki-NLP/opus-mt-en-hi.
Also writes a romanised 'Hinglish-ish' variant (rule-based Devanagari->Latin). Output: data/mt_hi.csv
Quality is machine-translation quality: noisy. Used as extra TRAINING data only, never for testing."""
import re, sys, time, warnings
import pandas as pd, torch
from transformers import MarianMTModel, MarianTokenizer
from common import D, load_external

warnings.filterwarnings("ignore")
N_PER_CLASS = int(sys.argv[1]) if len(sys.argv) > 1 else 1200
CAP_MIN = float(sys.argv[2]) if len(sys.argv) > 2 else 12
t0 = time.time()

ext = load_external()
ext = ext[(ext.src != "ysangam_calls") & (ext.text.str.len().between(25, 220))]   # call scripts are already Hinglish
pick = pd.concat([ext[ext.label == c].sample(n=min(N_PER_CLASS, (ext.label == c).sum()), random_state=1) for c in (0, 1)]).reset_index(drop=True)
print(f"translating {len(pick)} messages", flush=True)

MID = "Helsinki-NLP/opus-mt-en-hi"
tok = MarianTokenizer.from_pretrained(MID); mt = MarianMTModel.from_pretrained(MID).eval()
order = pick.text.str.len().argsort().values
out = [None] * len(pick); BS = 24
with torch.no_grad():
    for i in range(0, len(order), BS):
        idx = order[i:i + BS]
        b = tok(pick.text.iloc[idx].tolist(), return_tensors="pt", padding=True, truncation=True, max_length=128)
        g = mt.generate(**b, num_beams=2, max_new_tokens=128)
        for j, s in zip(idx, tok.batch_decode(g, skip_special_tokens=True)): out[j] = s
        if (i // BS) % 10 == 0:
            print(f"  {i+len(idx)}/{len(pick)}  {(time.time()-t0)/60:.1f} min", flush=True)
        if time.time() - t0 > CAP_MIN * 60:
            print("TIME CAP HIT", flush=True); break

res = pick.assign(hi=out).dropna(subset=["hi"])
res = res[res.hi.str.contains(r"[ऀ-ॿ]")]
res.to_csv(D / "mt_hi_raw.csv", index=False, encoding="utf-8")
print(f"done: {len(res)} translated in {(time.time()-t0)/60:.1f} min")
for t in res.sample(4, random_state=0).itertuples(): print(" EN:", t.text[:90], "\n HI:", t.hi[:90])
