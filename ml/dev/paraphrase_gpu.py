"""GPU paraphrase augmentation: a small open instruction model (Qwen2.5-1.5B-Instruct, Apache-2.0) rewrites team-written training messages in other
words, so the linear model sees the same scam / genuine intent in many phrasings instead of one template. This is what scammers do to dodge
fixed wording (the adversarial rewrite test caught only 44% with the shipped model).

Safeguards:
  - parents are rows of data/team/*.csv only (team-written, never frozen / dev / public data); a child keeps its parent's group id, so it always
    lands in the same train / validation / test split as the parent (no leakage across splits);
  - the language and script must match the parent (Hindi stays Devanagari, Hinglish stays Latin letters, English stays English);
  - label consistency: the fine-tuned e5 teacher (ml/dev/teacher_gpu.py) must still agree with the parent's label (scam child p >= 0.5,
    genuine child p <= 0.5), otherwise the child is dropped; length ratio 0.5 to 1.8 of the parent; no emoji; no copy of the parent;
  - every row goes through the frozen-text leak filter.
Usage: python dev/paraphrase_gpu.py [--per-class 450] [--variants 2]  ->  data/team/paraphrase_v3.csv (text,label,lang,group)
"""
from __future__ import annotations

import argparse
import csv
import random
import re
import sys
import time
from pathlib import Path

import numpy as np
import pandas as pd
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

HERE = Path(__file__).resolve().parent
ML = HERE.parent
ROOT = ML.parent
sys.path.insert(0, str(ML))
import leak_check  # noqa: E402
from teacher_gpu import Teacher  # noqa: E402

MID = "Qwen/Qwen2.5-1.5B-Instruct"
SYSTEM = ("You rewrite short SMS or WhatsApp messages. Rewrite the message in different words, keeping exactly the same meaning, intent and level of urgency, "
          "in the same language and the same script as the original (Hindi stays in Devanagari, Hinglish stays in Latin letters, English stays English). "
          "Do not add new facts, links or phone numbers. Do not explain. Output only the rewritten message, nothing else.")
LANG_NOTE = {"english": "English", "hindi": "Hindi in Devanagari script", "hinglish": "Hinglish (Hindi written in Latin letters)"}
EMOJI = re.compile("[\U0001F000-\U0001FFFF☀-➿]")


HINGLISH_MARKERS = set("hai hain ka ki ke ko aap aapka aapki aapke karein kijiye kare karo kar nahi abhi turant bhej bhejiye bhejo mat batao bataiye ho hoon main mera tum tumhara se me mein par ya aur to bhi hi liye wala wali".split())


def script_ok(lang: str, text: str) -> bool:
    """Hindi and Hinglish: the 1.5B model writes poor Hindi and often drifts from Hinglish to English, so Hindi children are not accepted at all and a
    Hinglish child must still contain Hindi function words."""
    letters = [c for c in text if c.isalpha()]
    if not letters:
        return False
    dev = sum("ऀ" <= c <= "ॿ" for c in letters) / len(letters)
    if lang == "hindi":
        return False
    if lang == "hinglish":
        return dev <= 0.05 and len(set(re.findall(r"[a-z]+", text.lower())) & HINGLISH_MARKERS) >= 2
    return dev <= 0.05


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--per-class", type=int, default=450)
    ap.add_argument("--variants", type=int, default=2)
    ap.add_argument("--batch", type=int, default=24)
    ap.add_argument("--seed", type=int, default=3)
    ap.add_argument("--per-group", type=int, default=1, help="parents taken from each template group")
    ap.add_argument("--append", action="store_true", help="add the new children to the existing data/team/paraphrase_v3.csv")
    ap.add_argument("--dev", action="store_true", help="rewrite the DEV sets instead (robustness probe, ml/dev/dev_rewrite_v1.csv); no teacher filter, never used for training")
    args = ap.parse_args()
    random.seed(11 + args.seed); torch.manual_seed(11 + args.seed)
    t0 = time.time()
    index, _ = leak_check.build_index(leak_check.DEFAULT_FROZEN, ROOT)
    if not leak_check.DEFAULT_FROZEN.is_dir():
        sys.exit("frozen evaluation directory missing; refusing to generate data")

    if args.dev:
        D1 = pd.read_csv(HERE / "dev_stress_v1.csv")[["text", "label", "lang"]]
        D2 = pd.read_csv(HERE / "dev_sms_v1.csv")[["text", "label"]].assign(lang=lambda d: np.where(d.text.str.contains("[ऀ-ॿ]"), "hindi", "english"))
        P = pd.concat([D1, D2], ignore_index=True)
        P["group"] = ["dev%d" % i for i in range(len(P))]
        parents = []
    else:
        parents = []
    for f in sorted((ROOT / "data" / "team").glob("*.csv")) if not args.dev else []:
        if f.stem in ("TEMPLATE", "paraphrase_v3"):
            continue
        d = pd.read_csv(f)
        if {"text", "label", "lang", "group"} <= set(d.columns):
            d["src"] = f.stem
            parents.append(d)
    if not args.dev:
        P = pd.concat(parents, ignore_index=True).drop_duplicates("text")
    P = P[P.text.str.len().between(30, 260)].reset_index(drop=True)
    pick = []
    for label in (0, 1) if not args.dev else ():
        for lang in ("english", "hindi", "hinglish"):
            s = P[(P.label == label) & (P.lang == lang)]
            # one parent per group first (diversity), then fill
            first = s.sample(frac=1.0, random_state=args.seed).groupby("group").head(args.per_group)
            n = int(args.per_class * {"english": 0.55, "hindi": 0.0, "hinglish": 0.45}[lang])
            pick.append(first.sample(n=min(n, len(first)), random_state=args.seed))
    if not args.dev:
        P = pd.concat(pick, ignore_index=True)
    print(f"{len(P)} parent rows ({int(P.label.sum())} scam), languages {P.lang.value_counts().to_dict()}", flush=True)

    tok = AutoTokenizer.from_pretrained(MID, padding_side="left")
    lm = AutoModelForCausalLM.from_pretrained(MID, dtype=torch.bfloat16).to("cuda").eval()

    def prompt(text, lang):
        msgs = [{"role": "system", "content": SYSTEM}, {"role": "user", "content": f"Language: {LANG_NOTE[lang]}\nMessage: {text}\nRewritten message:"}]
        return tok.apply_chat_template(msgs, tokenize=False, add_generation_prompt=True)

    out = []
    order = np.argsort(P.text.str.len().values)
    for v in range(args.variants):
        for i in range(0, len(order), args.batch):
            idx = order[i:i + args.batch]
            enc = tok([prompt(P.text.iloc[j], P.lang.iloc[j]) for j in idx], return_tensors="pt", padding=True).to("cuda")
            with torch.no_grad():
                g = lm.generate(**enc, max_new_tokens=110, do_sample=True, temperature=0.9, top_p=0.95, repetition_penalty=1.05)
            texts = tok.batch_decode(g[:, enc.input_ids.shape[1]:], skip_special_tokens=True)
            for j, t in zip(idx, texts):
                out.append((j, t.strip().split("\n")[0].strip().strip('"').strip()))
        print(f"variant {v + 1}/{args.variants} generated ({(time.time() - t0) / 60:.1f} min)", flush=True)
    del lm; torch.cuda.empty_cache()

    if args.dev:
        rows, seen = [], set()
        for j, t in out:
            r = P.iloc[j]
            if not t or t == r.text or EMOJI.search(t) or not script_ok(r.lang, t) or not 0.5 <= len(t) / len(r.text) <= 1.8 or re.search(r"(?i)rewritten|here is|message:|language:", t) or t in seen:
                continue
            seen.add(t); rows.append({"text": t, "label": int(r.label), "lang": r.lang, "family": "rewrite"})
        with open(HERE / "dev_rewrite_v1.csv", "w", encoding="utf-8", newline="") as fp:
            wr = csv.DictWriter(fp, fieldnames=["text", "label", "lang", "family"]); wr.writeheader(); wr.writerows(rows)
        k = pd.DataFrame(rows)
        print(f"dev rewrites: {len(rows)} rows {k.groupby('label').size().to_dict()} ({(time.time() - t0) / 60:.1f} min)")
        for r in k.sample(min(10, len(k)), random_state=2).itertuples(): print(f"  [{r.lang} {r.label}] {r.text[:150]}")
        return
    # label-consistency judge: the fine-tuned teacher, trained here on the corpus rows (train + val only)
    corpus = pd.read_csv(ROOT / "data" / "processed" / "corpus.csv")
    corpus = corpus[corpus.split.isin(["train", "val"])].reset_index(drop=True)
    y = corpus.label.values.astype(np.float32)
    w = (np.where(y == 1, (y == 0).sum() / (y == 1).sum(), 1.0) ** 0.5 * np.where(corpus.lang.values != "english", 1.5, 1.0)).astype(np.float32)
    T = Teacher(seed=5); T.fit(corpus.text.tolist(), y, w / w.mean(), 2)
    cand = []
    for j, t in out:
        r = P.iloc[j]
        if not t or t == r.text or EMOJI.search(t) or not script_ok(r.lang, t):
            continue
        ratio = len(t) / len(r.text)
        if not 0.5 <= ratio <= 1.8 or re.search(r"(?i)rewritten|here is|message:|language:", t):
            continue
        cand.append((r, t))
    p = T.predict([t for _, t in cand])
    rows, seen = [], set()
    for (r, t), pi in zip(cand, p):
        if (r.label == 1 and pi < 0.5) or (r.label == 0 and pi > 0.5):
            continue
        if t in seen or index.match(t):
            continue
        seen.add(t)
        rows.append({"text": t, "label": int(r.label), "lang": r.lang, "group": f"{r.group}:pp"})
    outp = ROOT / "data" / "team" / "paraphrase_v3.csv"
    if args.append and outp.exists():
        old = pd.read_csv(outp)
        have = set(old.text)
        rows = [r for r in rows if r["text"] not in have]
        rows = old.to_dict("records") + rows
    with open(outp, "w", encoding="utf-8", newline="") as fp:
        wr = csv.DictWriter(fp, fieldnames=["text", "label", "lang", "group"]); wr.writeheader(); wr.writerows(rows)
    kept = pd.DataFrame(rows)
    print(f"generated {len(out)}, plausible {len(cand)}, kept {len(rows)} after the teacher and leak filters: {kept.groupby(['lang', 'label']).size().to_dict()}  ({(time.time() - t0) / 60:.1f} min)")
    for r in kept.sample(min(8, len(kept)), random_state=1).itertuples():
        print(f"  [{r.lang} {r.label}] {r.text[:140]}")


if __name__ == "__main__":
    main()
