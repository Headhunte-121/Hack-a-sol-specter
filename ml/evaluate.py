"""Evaluate the exported model: the frozen TEST split always, the CHALLENGE set and the blind / probe / OTP / clip / evasion sets only with --measure.

Reports overall / per-language / per-source metrics, confusion matrices, the three-band table, the full precision-recall trade-off curve,
a per-family false-warning table for genuine families, bootstrap 95% confidence intervals (families resampled, not single messages),
keyword-only baseline, calibration (ECE), bias checks, most confident mistakes, model size. The thresholds printed are the ones READ FROM
model.json (the ones the phone uses). Records SHA-256 of model.json, signals.json and every frozen evaluation file in evaluation.json.

Measurement discipline: the challenge set and the frozen evaluation sets must not be tuned on, so `--measure` is logged in
ml/artifacts/measurements.json and refused after MEASUREMENT_BUDGET (3) entries unless --allow-extra-measurement is given.
Usage:
  python evaluate.py                       # development: test split only, writes ml/artifacts/dev_eval/
  python evaluate.py --measure             # + challenge + frozen sets; writes docs/evaluation.json and docs/evaluation_report.md (shipped model only;
                                           # for another --model the report goes to ml/artifacts/candidate_eval/)
  python evaluate.py --model PATH --out-dir DIR [--tag "after round one"]
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import math
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.metrics import average_precision_score, confusion_matrix, f1_score, precision_score, recall_score, roc_auc_score

import leak_check
from textpipe import Model, load_signals, tokenize

ROOT = Path(__file__).resolve().parent.parent
PROC = ROOT / "data" / "processed"
MODEL = ROOT / "apps" / "web" / "public" / "model" / "model.json"
DOCS = ROOT / "docs"
ART = Path(__file__).resolve().parent / "artifacts"
MEASUREMENT_BUDGET = 3
BOOT = 1000
SEED = 7

KEYWORDS = ["otp", "kyc", "blocked", "block", "lottery", "prize", "arrest", "urgent", "immediately", "winner", "won", "cvv", "pin", "refund", "verify",
            "suspend", "suspended", "apk", "ओटीपी", "केवाईसी", "लॉटरी", "इनाम", "गिरफ्तार", "तुरंत", "अभी", "बंद", "abhi", "turant", "inaam", "jeete", "band", "giraftar"]
BANKS = ["sbi", "hdfc", "icici", "axis", "pnb", "kotak", "canara", "baroda", "union bank", "बैंक", "bank", "paytm", "phonepe", "gpay", "upi"]
CURVE_CUTS = [0.05, 0.10, 0.15, 0.20, 0.25, 0.30, 0.40, 0.50, 0.60, 0.70, 0.80, 0.90, 0.95]

# Counts measured on 2026-11-23 with the staged compare_models.py harness on the two saved baseline models (measurement 1 of 3).
# "Flagged" = shown as suspicious or likely scam. Challenge numbers are at p >= 0.5 (the same rows as the committed reports of those models).
BASELINES = {
    "2026-11-23.2 (older, full data)": {"probe": (385, 146), "otp": 8, "clips": (19, 3), "clips_hi": (12, 1), "evasion": 141, "blind": (70, 14),
                                         "challenge": (0.900, 0.911, 0.075)},
    "2026-11-23.3 (merged, 1,184 rows)": {"probe": (387, 25), "otp": 0, "clips": (19, 0), "clips_hi": (12, 1), "evasion": 120, "blind": (75, 1),
                                           "challenge": (0.787, 0.875, 0.013)},
}


def keyword_flag(text: str) -> int:
    toks = {t["t"] for t in tokenize(text)}
    return int(len(toks & set(KEYWORDS)) >= 2)


def sha256(path: Path) -> str:
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def wilson(k: int, n: int, z: float = 1.96) -> tuple[float, float]:
    if n == 0:
        return (0.0, 1.0)
    p = k / n
    d = 1 + z * z / n
    c = (p + z * z / (2 * n)) / d
    h = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return (max(0.0, c - h), min(1.0, c + h))


def metrics(y, pred, p=None) -> dict:
    y, pred = np.asarray(y), np.asarray(pred)
    if len(y) == 0:
        return {"n": 0}
    tn, fp, fn, tp = confusion_matrix(y, pred, labels=[0, 1]).ravel()
    out = {"n": int(len(y)), "scam": int(y.sum()), "accuracy": float((pred == y).mean()),
           "precision": float(precision_score(y, pred, zero_division=0)), "recall": float(recall_score(y, pred, zero_division=0)),
           "f1": float(f1_score(y, pred, zero_division=0)), "tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp),
           "false_alarm_rate": float(fp / max(1, fp + tn))}
    if p is not None and len(set(y)) == 2:
        out["auc_pr"] = float(average_precision_score(y, p)); out["auc_roc"] = float(roc_auc_score(y, p))
    return out


def ece(y, p, bins=10):
    y, p = np.asarray(y), np.asarray(p)
    edges = np.linspace(0, 1, bins + 1); tot, rows = 0.0, []
    for lo, hi in zip(edges[:-1], edges[1:]):
        m = (p >= lo) & (p < hi if hi < 1 else p <= hi)
        if m.sum():
            gap = abs(p[m].mean() - y[m].mean()); tot += gap * m.sum() / len(y)
            rows.append({"bin": f"{lo:.1f}-{hi:.1f}", "n": int(m.sum()), "mean_p": float(p[m].mean()), "frac_scam": float(y[m].mean())})
    return float(tot), rows


def bootstrap_ci(y, pred, groups=None, B: int = BOOT, seed: int = SEED) -> dict:
    """95% percentile intervals for precision / recall / F1 / false-alarm rate. Families (`groups`) are resampled as units when given
    (messages from one template are not independent); otherwise single messages are."""
    y, pred = np.asarray(y), np.asarray(pred)
    g = pd.factorize(np.asarray(groups) if groups is not None else np.arange(len(y)))[0]
    nf = g.max() + 1
    cnt = lambda mask: np.bincount(g[mask], minlength=nf).astype(float)
    tp, fp, fn, tn = cnt((y == 1) & (pred == 1)), cnt((y == 0) & (pred == 1)), cnt((y == 1) & (pred == 0)), cnt((y == 0) & (pred == 0))
    m = np.random.RandomState(seed).multinomial(nf, np.full(nf, 1.0 / nf), size=B).astype(float)
    TP, FP, FN, TN = m @ tp, m @ fp, m @ fn, m @ tn
    prec, rec = TP / np.maximum(TP + FP, 1), TP / np.maximum(TP + FN, 1)
    f1 = 2 * prec * rec / np.maximum(prec + rec, 1e-12)
    fa = FP / np.maximum(FP + TN, 1)
    ci = lambda a: [round(float(np.percentile(a, 2.5)), 4), round(float(np.percentile(a, 97.5)), 4)]
    return {"precision": ci(prec), "recall": ci(rec), "f1": ci(f1), "false_alarm_rate": ci(fa), "families": int(nf), "resamples": B}


def curve(y, p) -> list[dict]:
    y, p = np.asarray(y), np.asarray(p)
    rows = []
    for t in CURVE_CUTS:
        pred = (p >= t).astype(int)
        m = metrics(y, pred)
        rows.append({"cut": t, "precision": m["precision"], "recall": m["recall"], "f1": m["f1"], "false_alarm_rate": m["false_alarm_rate"],
                     "flag_rate": float(pred.mean())})
    return rows


def score_df(df: pd.DataFrame, model: Model, sg: dict) -> pd.DataFrame:
    t = time.time()
    res = [model.score(x, sg) for x in df.text]
    df = df.copy()
    df["p"] = [r["p"] for r in res]
    df["signals"] = [",".join(r["signals"]) for r in res]
    df["ms"] = (time.time() - t) / max(1, len(df)) * 1000
    return df


def evaluate_set(name: str, df: pd.DataFrame, thr: dict, boot_groups=None) -> dict:
    y, p = df.label.values, df.p.values
    pred_half = (p >= 0.5).astype(int)
    pred_susp = (p >= thr["suspicious"]).astype(int)
    band = np.where(p >= thr["scam"], "likely_scam", np.where(p >= thr["suspicious"], "suspicious", "looks_genuine"))
    r = {"name": name, "overall@0.5": metrics(y, pred_half, p), "flag@suspicious_cut": metrics(y, pred_susp, p),
         "bands": {b: {"scam": int(((band == b) & (y == 1)).sum()), "genuine": int(((band == b) & (y == 0)).sum())} for b in ["likely_scam", "suspicious", "looks_genuine"]},
         "keyword_baseline": metrics(y, df.text.map(keyword_flag).values),
         "ci95@0.5": bootstrap_ci(y, pred_half, boot_groups), "ci95@suspicious_cut": bootstrap_ci(y, pred_susp, boot_groups),
         "curve": curve(y, p)}
    r["per_language"] = {l: {**metrics(g.label.values, (g.p.values >= 0.5).astype(int), g.p.values),
                              "flag_recall": float((g.p.values[g.label.values == 1] >= thr["suspicious"]).mean()) if (g.label == 1).any() else None,
                              "flag_false_alarm": float((g.p.values[g.label.values == 0] >= thr["suspicious"]).mean()) if (g.label == 0).any() else None}
                         for l, g in df.groupby("lang")}
    if "source" in df:
        r["per_source"] = {s: metrics(g.label.values, (g.p.values >= 0.5).astype(int), g.p.values) for s, g in df.groupby("source")}
    e, bins = ece(y, p)
    r["calibration"] = {"ece": e, "bins": bins}
    gen = df[df.label == 0].copy()
    low = gen.text.str.lower()
    gen["bank"] = low.map(lambda s: any(b in s for b in BANKS))
    gen["otp"] = low.str.contains(r"\botp\b|ओटीपी|verification code|code is", regex=True)
    gen["len"] = pd.cut(gen.text.str.len(), [0, 80, 200, 10000], labels=["short", "medium", "long"])
    fp = lambda g: {"n": int(len(g)), "false_alarm_rate": float((g.p >= 0.5).mean()) if len(g) else None}
    r["bias"] = {"genuine_bank_alerts": fp(gen[gen.bank]), "genuine_otp_messages": fp(gen[gen.otp]), "genuine_other": fp(gen[~gen.bank & ~gen.otp]),
                 "by_language": {l: fp(g) for l, g in gen.groupby("lang")}, "by_length": {str(l): fp(g) for l, g in gen.groupby("len", observed=True)}}
    wrong = df[(df.p >= 0.5).astype(int) != df.label].copy()
    wrong["conf"] = (wrong.p - 0.5).abs()
    r["confident_mistakes"] = [{"text": t[:140], "label": int(l), "p": round(float(p_), 3), "lang": lg}
                               for t, l, p_, lg in wrong.sort_values("conf", ascending=False).head(5)[["text", "label", "p", "lang"]].itertuples(index=False)]
    r["ms_per_message_python"] = float(df.ms.iloc[0]) if len(df) else None
    return r


def family_table(df: pd.DataFrame, thr: dict) -> dict:
    """Genuine message families (team-written sources, one family per `group`) and how often each triggers a warning."""
    g = df[(df.label == 0) & df.source.str.startswith("team_")]
    rows = []
    for name, s in g.groupby("group"):
        rows.append({"group": name, "source": s.source.iloc[0], "n": int(len(s)), "flagged": int((s.p >= thr["suspicious"]).sum()),
                     "likely_scam": int((s.p >= thr["scam"]).sum())})
    rows.sort(key=lambda r: (-r["flagged"] / r["n"], -r["n"]))
    return {"genuine_families": len(rows), "families_with_a_warning": sum(1 for r in rows if r["flagged"]), "messages": int(len(g)),
            "messages_flagged": int(sum(r["flagged"] for r in rows)), "worst": [r for r in rows if r["flagged"]][:20]}


def read_items(path: Path) -> list[dict]:
    if path.suffix == ".json":
        return [{"text": x["text"], "label": int(x["label"]), "id": x.get("id", "")} for x in json.loads(path.read_text(encoding="utf-8"))]
    with open(path, encoding="utf-8", newline="") as fp:
        return [{"text": r["text"], "label": int(r["label"]), "id": r.get("id", "")} for r in csv.DictReader(fp)]


def frozen_counts(model: Model, sg: dict, thr: dict, fdir: Path) -> dict:
    """Scams caught / genuine flagged on the staged blind, probe, OTP, clip and evasion sets (flagged = p >= the suspicious cut)."""
    files = {"probe_eval_in": "eval_in.json", "otp": "eval_otp_in.json", "clips_asr_40": "voice/cvm_in_asr.json", "clips_hi_24": "voice_hi/cvm_in_orig.json",
             "evasion_274": "eval_evasion_in.json", "blind_v1": "blind_v1.csv"}
    out = {}
    for name, rel in files.items():
        items = read_items(fdir / rel)
        ps =[model.score(x["text"], sg)["p"] for x in items]
        pos = [p for p, x in zip(ps, items) if x["label"] == 1]
        neg = [p for p, x in zip(ps, items) if x["label"] == 0]
        c, f = sum(p >= thr["suspicious"] for p in pos), sum(p >= thr["suspicious"] for p in neg)
        out[name] = {"scams": len(pos), "caught": int(c), "caught_ci95": [round(v, 4) for v in wilson(c, len(pos))] if pos else None,
                     "genuine": len(neg), "flagged": int(f), "flagged_ci95": [round(v, 4) for v in wilson(f, len(neg))] if neg else None,
                     "auc_roc": round(float(roc_auc_score([x["label"] for x in items], ps)), 4) if pos and neg else None}
    return out


def measurement_log() -> list:
    p = ART / "measurements.json"
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else []


def fmt(m): return f"{m['precision']:.3f} / {m['recall']:.3f} / {m['f1']:.3f}" if m.get("n") else "n/a"
def ci_txt(c): return f"[{c[0]:.3f}, {c[1]:.3f}]"


def report_set(L: list, key: str, r: dict, thr: dict):
    o, fl, kb = r["overall@0.5"], r["flag@suspicious_cut"], r["keyword_baseline"]
    ci5, cis = r["ci95@0.5"], r["ci95@suspicious_cut"]
    L += [f"## {r['name']}", "", f"{o['n']} messages ({o['scam']} scam). Precision / recall / F1 for the scam class:", "",
          "| decision rule | precision / recall / F1 | TN FP FN TP | false-alarm rate | 95% CI recall | 95% CI F1 | 95% CI false-alarm |", "|---|---|---|---|---|---|---|",
          f"| **this model, p >= 0.5** | {fmt(o)} | {o['tn']} {o['fp']} {o['fn']} {o['tp']} | {o['false_alarm_rate']:.3f} | {ci_txt(ci5['recall'])} | {ci_txt(ci5['f1'])} | {ci_txt(ci5['false_alarm_rate'])} |",
          f"| this model, flagged (p >= {thr['suspicious']:.2f}, the app's warning) | {fmt(fl)} | {fl['tn']} {fl['fp']} {fl['fn']} {fl['tp']} | {fl['false_alarm_rate']:.3f} | {ci_txt(cis['recall'])} | {ci_txt(cis['f1'])} | {ci_txt(cis['false_alarm_rate'])} |",
          f"| keyword-only baseline | {fmt(kb)} | {kb['tn']} {kb['fp']} {kb['fn']} {kb['tp']} | {kb['false_alarm_rate']:.3f} | | | |", "",
          f"Intervals: 95% bootstrap ({ci5['resamples']} resamples, {ci5['families']} {'families' if key == 'test' else 'messages'} resampled as units). "
          f"AUC-PR {o.get('auc_pr', float('nan')):.3f}, AUC-ROC {o.get('auc_roc', float('nan')):.3f}; calibration ECE {r['calibration']['ece']:.3f}.", "",
          "Trade-off curve (decision rule `p >= cut`):", "", "| cut | precision | recall | F1 | false-alarm rate | share flagged |", "|---|---|---|---|---|---|"]
    L += [f"| {c['cut']:.2f} | {c['precision']:.3f} | {c['recall']:.3f} | {c['f1']:.3f} | {c['false_alarm_rate']:.3f} | {c['flag_rate']:.3f} |" for c in r["curve"]]
    L += ["", "Per language (p >= 0.5; the last two columns use the suspicious cut):", "",
          "| language | n | scam | P / R / F1 | false-alarm rate | recall at the cut | false-alarm at the cut |", "|---|---|---|---|---|---|---|"]
    for l, m in r["per_language"].items():
        fr_ = "n/a" if m["flag_recall"] is None else f"{m['flag_recall']:.3f}"
        ff_ = "n/a" if m["flag_false_alarm"] is None else f"{m['flag_false_alarm']:.3f}"
        L.append(f"| {l} | {m['n']} | {m['scam']} | {fmt(m)} | {m['false_alarm_rate']:.3f} | {fr_} | {ff_} |")
    L += ["", "Result bands (what the user would see):", "", "| band | scam messages | genuine messages |", "|---|---|---|"] + [f"| {k} | {v['scam']} | {v['genuine']} |" for k, v in r["bands"].items()]
    bi = r["bias"]
    L += ["", "Bias check, false-alarm rate (p >= 0.5) on **genuine** messages:", "", "| group | n | false-alarm rate |", "|---|---|---|"]
    for k in ("genuine_bank_alerts", "genuine_otp_messages", "genuine_other"):
        L.append(f"| {k.replace('_', ' ')} | {bi[k]['n']} | {bi[k]['false_alarm_rate'] if bi[k]['false_alarm_rate'] is None else round(bi[k]['false_alarm_rate'], 3)} |")
    for l, v in bi["by_language"].items():
        L.append(f"| language: {l} | {v['n']} | {round(v['false_alarm_rate'], 3)} |")
    for l, v in bi["by_length"].items():
        L.append(f"| length: {l} | {v['n']} | {round(v['false_alarm_rate'], 3)} |")
    if "family_table" in r:
        ft = r["family_table"]
        L += ["", f"Genuine message families that trigger a warning (suspicious or likely scam), test split: {ft['families_with_a_warning']} of {ft['genuine_families']} "
                  f"families, {ft['messages_flagged']} of {ft['messages']} messages.", "", "| family | source | messages | warned | likely scam |", "|---|---|---|---|---|"]
        L += [f"| {w['group']} | {w['source']} | {w['n']} | {w['flagged']} | {w['likely_scam']} |" for w in ft["worst"]]
    L += ["", "Most confident mistakes:", ""] + [f"- ({m['lang']}, true={'scam' if m['label'] else 'genuine'}, p={m['p']}) {m['text']}" for m in r["confident_mistakes"]]
    if "per_source" in r:
        L += ["", "Per source (P / R / F1 at p >= 0.5): " + "; ".join(f"{s}: {fmt(m)} (n={m['n']})" for s, m in r["per_source"].items())]
    L.append("")


def comparison_table(res: dict) -> list[str]:
    f, ch = res["frozen"], res["challenge"]["overall@0.5"]
    b = {k: v for k, v in BASELINES.items()}
    names = list(b) + [f"**{res['model_version']} (this model)**"]

    def row(label, get_base, mine):
        return f"| {label} | " + " | ".join(get_base(v) for v in b.values()) + f" | {mine} |"
    L = ["## Comparison with the two earlier models", "",
         "The two earlier columns are counts measured on 2026-11-23 with the same scoring tool and the model's own tokenizer and signals. "
         "\"Flagged\" means shown as suspicious or likely scam. Probe, OTP, clip, evasion and challenge sets are written by other people and are never trained on; "
         "the blind_v1 set is clean for this model because the leak guard (`ml/leak_check.py`) passes: it was **not** clean for the 2026-11-23.3 column.", "",
         "| Set | " + " | ".join(names) + " |", "|---|" + "---|" * len(names),
         row("probe set (780): scams caught of 399", lambda v: str(v["probe"][0]), f"{f['probe_eval_in']['caught']}"),
         row("probe set: genuine flagged of 381", lambda v: str(v["probe"][1]), f"{f['probe_eval_in']['flagged']} ({f['probe_eval_in']['flagged'] / 381:.1%})"),
         row("OTP / verification (18 genuine): flagged", lambda v: str(v["otp"]), f"{f['otp']['flagged']}"),
         row("clip texts as heard (40): caught of 22 / flagged of 18", lambda v: f"{v['clips'][0]} / {v['clips'][1]}", f"{f['clips_asr_40']['caught']} / {f['clips_asr_40']['flagged']}"),
         row("Hindi/Hinglish clip texts (24): caught of 12 / flagged of 12", lambda v: f"{v['clips_hi'][0]} / {v['clips_hi'][1]}", f"{f['clips_hi_24']['caught']} / {f['clips_hi_24']['flagged']}"),
         row("adversarial evasion (274): caught", lambda v: str(v["evasion"]), f"{f['evasion_274']['caught']}"),
         row("blind_v1 (150): caught of 75 / flagged of 75", lambda v: f"{v['blind'][0]} / {v['blind'][1]}", f"{f['blind_v1']['caught']} / {f['blind_v1']['flagged']}"),
         row("challenge set (160), p >= 0.5: recall / F1 / false-alarm", lambda v: f"{v['challenge'][0]:.3f} / {v['challenge'][1]:.3f} / {v['challenge'][2]:.3f}",
             f"{ch['recall']:.3f} / {ch['f1']:.3f} / {ch['false_alarm_rate']:.3f}"), ""]
    return L


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", type=Path, default=MODEL)
    ap.add_argument("--out-dir", type=Path, default=None, help="default: docs/ with --measure, else ml/artifacts/dev_eval/")
    ap.add_argument("--measure", action="store_true", help="also score the challenge set and the frozen blind/probe/OTP/clip/evasion sets (counts against the budget)")
    ap.add_argument("--tag", default="", help="note stored in the measurement log")
    ap.add_argument("--allow-extra-measurement", action="store_true")
    ap.add_argument("--frozen-dir", type=Path, default=leak_check.DEFAULT_FROZEN)
    a = ap.parse_args(argv)
    shipped = a.model.resolve() == MODEL.resolve()
    out_dir = a.out_dir or (DOCS if (a.measure and shipped) else ART / ("dev_eval" if not a.measure else "candidate_eval"))     # docs/ only ever describe the shipped model
    log = measurement_log()
    if a.measure and len(log) >= MEASUREMENT_BUDGET and not a.allow_extra_measurement:
        print(f"ERROR: {len(log)} measurements are already logged in {ART / 'measurements.json'} (budget {MEASUREMENT_BUDGET}). Refusing to score the frozen sets again.", file=sys.stderr)
        sys.exit(2)
    sg = load_signals()
    model = Model.load(a.model); model.signals = sg
    thr = model.d["thresholds"]
    print(f"model {model.d['version']} ({a.model.stat().st_size / 1e6:.2f} MB, n_train={model.d.get('meta', {}).get('n_train')}): "
          f"thresholds read from model.json: suspicious >= {thr['suspicious']:.2f}, likely scam >= {thr['scam']:.2f}")
    te = pd.read_csv(PROC / "corpus.csv"); te = te[te.split == "test"].reset_index(drop=True)
    res = {"model_version": model.d["version"], "model_bytes": a.model.stat().st_size, "thresholds": thr, "meta": model.d.get("meta", {}),
           "hashes": {"model.json": sha256(a.model), "signals.json": sha256(ROOT / "ml" / "signals.json"), "domains.json": sha256(ROOT / "ml" / "domains.json")}}
    te_scored = score_df(te, model, sg)
    res["test"] = evaluate_set("test (group-aware split)", te_scored, thr, boot_groups=te.group.values)
    res["test"]["family_table"] = family_table(te_scored, thr)
    if a.measure:
        ch = pd.read_csv(PROC / "challenge.csv")
        res["challenge"] = evaluate_set("challenge (hand-written, never trained on)", score_df(ch, model, sg), thr)
        if not a.frozen_dir.is_dir():
            print(f"ERROR: frozen directory {a.frozen_dir} missing", file=sys.stderr); sys.exit(2)
        res["frozen"] = frozen_counts(model, sg, thr, a.frozen_dir)
        frozen_files = {rel: sha256(a.frozen_dir / rel) for _, rel in leak_check.FROZEN_FILES if (a.frozen_dir / rel).is_file()}
        for _, p in leak_check.challenge_files(ROOT):
            if p.is_file():
                frozen_files[str(p.relative_to(ROOT)).replace("\\", "/")] = sha256(p)
        res["hashes"]["frozen_evaluation_files"] = frozen_files
        log.append({"when": datetime.now(timezone.utc).isoformat(timespec="seconds"), "tag": a.tag, "model_sha256": res["hashes"]["model.json"]})
        ART.mkdir(exist_ok=True)
        (ART / "measurements.json").write_text(json.dumps(log, indent=2), encoding="utf-8")
        print(f"MEASUREMENT {len(log)} of {MEASUREMENT_BUDGET} logged")
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "evaluation.json").write_text(json.dumps(res, indent=2, ensure_ascii=False), encoding="utf-8")

    L = ["# Scam message detector: evaluation report", "",
         f"Model `{res['model_version']}`, {res['model_bytes'] / 1e6:.2f} MB, trained on {res['meta'].get('n_train')} messages. Band cuts read from `model.json`: "
         f"**suspicious >= {thr['suspicious']:.2f}**, **likely scam >= {thr['scam']:.2f}** (calibrated probability). Generated by `ml/evaluate.py`; "
         "numbers below match the model that ships. SHA-256 of `model.json`: `" + res["hashes"]["model.json"] + "`.", ""]
    if a.measure:
        L += comparison_table(res)
    keys = ["test"] + (["challenge"] if a.measure else [])
    for key in keys:
        report_set(L, key, res[key], thr)
    if a.measure:
        f = res["frozen"]
        L += ["## Probe, OTP, clip, evasion and blind sets (counts at the suspicious cut)", "",
              "| set | scams caught | 95% CI | genuine flagged | 95% CI | AUC-ROC |", "|---|---|---|---|---|---|"]
        for name, v in f.items():
            cc = f"{v['caught']} of {v['scams']}" if v["scams"] else "-"
            fl = f"{v['flagged']} of {v['genuine']}" if v["genuine"] else "-"
            L.append(f"| {name} | {cc} | {ci_txt(v['caught_ci95']) if v['caught_ci95'] else '-'} | {fl} | {ci_txt(v['flagged_ci95']) if v['flagged_ci95'] else '-'} | {v['auc_roc'] if v['auc_roc'] else '-'} |")
        L.append("")
    L += ["## How to read this", "",
          "- The **test** split is group-aware (no template shared with training) but most of its text comes from public datasets that look templated and mostly English, so its scores are **optimistic**. "
          "The challenge set and the blind, probe, OTP and clip sets (written by other people, never trained on) are the more honest numbers.",
          "- The **challenge** set is hand-written and independent of the training data, but was inspected during development, so it is not a fully blind test. Counts are small, so every percentage carries a wide interval (shown above).",
          "- The generated hard-negative families were written in earlier sessions that had seen failures on some of these evaluation sets; the leak guard removes exact and near copies, but the probe and blind results may still be somewhat flattering.",
          "- Hindi (Devanagari) training data is small (a few hundred team-written rows); expect weaker results there.",
          "- No on-phone timing is reported here; see the Vitest parity/timing test for TypeScript scoring speed.", ""]
    (out_dir / "evaluation_report.md").write_text("\n".join(L), encoding="utf-8")
    print(f"wrote {out_dir / 'evaluation.json'} and {out_dir / 'evaluation_report.md'}")
    t = res["test"]
    print(f"test split ({t['overall@0.5']['n']} messages) at p>=0.5: P/R/F1 {fmt(t['overall@0.5'])}, false-alarm {t['overall@0.5']['false_alarm_rate']:.3f}")
    if a.measure:
        c = res["challenge"]["overall@0.5"]
        print(f"challenge ({c['n']}) at p>=0.5: P/R/F1 {fmt(c)}, false-alarm {c['false_alarm_rate']:.3f}")
        for k, v in res["frozen"].items():
            print(f"  {k:16} caught {v['caught']}/{v['scams']}  flagged {v['flagged']}/{v['genuine']}")


if __name__ == "__main__":
    main()
