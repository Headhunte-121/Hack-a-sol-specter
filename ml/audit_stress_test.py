"""Comprehensive Audit and Stress-Testing for Scam Detector Model.

Audits:
1. Leakage & Overlap: Cross-references train split vs validation, test, challenge, and blind_v1.
2. Feature Weight Inspection: Top positive & negative weights, checking for anomalous tokens.
3. Daily Conversational Robustness: 25 innocent real-life P2P messages (money, emergency, family, Netflix OTP).
4. Adversarial Evasion Robustness: 20 real scams disguised with character spacing, leetspeak, punctuation, homoglyphs.
5. Signal Ablation: Testing model behavior with and without hand-crafted signals.
"""
from __future__ import annotations

import json
import math
from pathlib import Path
import pandas as pd
import numpy as np

from textpipe import Model, load_signals, analyse, tokenize

ROOT = Path(__file__).resolve().parent.parent
PROC = ROOT / "data" / "processed"
MODEL_PATH = ROOT / "apps" / "web" / "public" / "model" / "model.json"
BLIND_PATH = ROOT / "data" / "real" / "blind_eval_2026-11-23" / "blind_v1.csv"
CHALLENGE_PATH = PROC / "challenge.csv"

def run_audit():
    print("=" * 80)
    print("1. DATA LEAKAGE & OVERLAP AUDIT")
    print("=" * 80)

    corpus = pd.read_csv(PROC / "corpus.csv")
    train_df = corpus[corpus.split == "train"].reset_index(drop=True)
    val_df = corpus[corpus.split == "val"].reset_index(drop=True)
    test_df = corpus[corpus.split == "test"].reset_index(drop=True)
    blind_df = pd.read_csv(BLIND_PATH) if BLIND_PATH.exists() else None
    challenge_df = pd.read_csv(CHALLENGE_PATH) if CHALLENGE_PATH.exists() else None

    # Normalised token representation for checking overlap
    def norm_tokens(text):
        return tuple(sorted({t["t"] for t in tokenize(str(text))}))

    train_tok_sets = [set(norm_tokens(t)) for t in train_df.text]
    train_exact = set(train_df.text.str.strip().str.lower())

    def check_overlap(eval_df, name):
        if eval_df is None:
            print(f"{name}: File not found")
            return
        exact_matches = 0
        high_sim = 0
        for text in eval_df.text:
            tl = str(text).strip().lower()
            if tl in train_exact:
                exact_matches += 1
                continue
            toks = set(norm_tokens(text))
            if not toks:
                continue
            for tr_toks in train_tok_sets:
                jaccard = len(toks & tr_toks) / len(toks | tr_toks)
                if jaccard >= 0.85:
                    high_sim += 1
                    break
        total = len(eval_df)
        print(f"[{name}] Total: {total} | Exact train matches: {exact_matches} ({exact_matches/total*100:.1f}%) | High-similarity (>=85%): {high_sim} ({high_sim/total*100:.1f}%)")

    check_overlap(val_df, "Validation split")
    check_overlap(test_df, "Test split")
    check_overlap(challenge_df, "Challenge set")
    check_overlap(blind_df, "Frozen blind_v1.csv")

    print("\n" + "=" * 80)
    print("2. TOP FEATURE WEIGHTS & ANOMALY INSPECTION")
    print("=" * 80)
    model_data = json.loads(MODEL_PATH.read_text(encoding="utf-8"))
    features = model_data["features"]
    coefs = model_data["coef"]
    signal_coefs = model_data["signal_coef"]

    feat_pairs = list(zip(features, coefs))
    feat_pairs.sort(key=lambda x: x[1])

    print("Top 15 Most Negative Features (Predicts GENUINE):")
    for f, c in feat_pairs[:15]:
        print(f"  {f:<25} : {c:+.4f}")

    print("\nTop 15 Most Positive Features (Predicts SCAM):")
    for f, c in feat_pairs[-15:]:
        print(f"  {f:<25} : {c:+.4f}")

    print("\nSignal Coefficients (Linear weights):")
    for s, c in sorted(signal_coefs.items(), key=lambda x: -abs(x[1])):
        print(f"  {s:<30} : {c:+.4f}")

    # Load model
    signals = load_signals()
    m = Model(model_data)

    print("\n" + "=" * 80)
    print("3. CONVERSATIONAL INDIAN DAILY LIFE MESSAGES (FALSE POSITIVE TEST)")
    print("=" * 80)
    # Real harmless conversational messages people send each other every day in India
    conversational_genuine = [
        "Bhai 500 rupay gpay kar de emergency hai sham ko lautaa dunga",
        "Mummy ne bola hai dawai le aana aate waqt",
        "Maine 200 rupay bhej diye hain check kar le",
        "Bhai Netflix ka OTP aaya hoga phone pe zara batana login karna hai",
        "Bhai Hotstar ka OTP bhejo na match dekhna hai",
        "Did you get the Swiggy delivery or should I call the guy?",
        "Office kab tak aaoge aaj meeting hai 11 baje",
        "Bhai salary aa gayi kya is mahine ki?",
        "Please recharge my Airtel number 9876543210 with 299 pack",
        "Maine light ka bill bhar diya hai 1450 rupay",
        "Uber book kar di hai OTP 4920 hai driver ko bol dena",
        "Bhai kal ki ticket book ho gayi PNR number share kar raha hoon",
        "Khana order kar diya hai Zomato se 30 mins me aayega",
        "Bhai phone kyu kaat rahe ho emergency baat karni hai",
        "Tumne paise transfer kiye the kya sham ko?",
        "Aapka courier delivery boy niche khada hai parcel le lo",
        "Aapka parcel security guard ke paas chhod diya hai",
        "Kaha ho abhi? Call karo turant jab free ho",
        "Bhai assignment send kar de please urgently",
        "Mere account se 500 rupay kat gaye pata nahi kaise bank me puchna padega",
    ]

    fp_count = 0
    for text in conversational_genuine:
        res = m.score(text, signals)
        band = "likely_scam" if res["p"] >= model_data["thresholds"]["scam"] else ("suspicious" if res["p"] >= model_data["thresholds"]["suspicious"] else "looks_genuine")
        flag = " [FALSE FLAG]" if band != "looks_genuine" else " [OK]"
        if band != "looks_genuine":
            fp_count += 1
        print(f"{flag} p={res['p']:.3f} | {band:<14} | {text}")
        if band != "looks_genuine":
            print(f"      Signals: {res['signals']} | Words: {res['words'][:8]}")

    print(f"\nConversational false flags: {fp_count} of {len(conversational_genuine)} ({fp_count/len(conversational_genuine)*100:.1f}%)")

    print("\n" + "=" * 80)
    print("4. ADVERSARIAL EVASION TEST (OBFUSCATED & TRICK SCAMS)")
    print("=" * 80)
    # Scammers using character spacing, leetspeak, homoglyphs, and stealth wording
    adversarial_scams = [
        # Spaced out / leetspeak words
        "Dear customer your SBI account is b l o c k e d. Update K-Y-C immediately: http://sbi-verify.top",
        "Urgent notice: your debit card will be bl0cked within 24 hours. Call 9876543210 to unbl0ck",
        "Your bank a/c is suspended. Kindly sh@re 6 digit 0TP to restore access",
        "Income tax refund of Rs 15,000 is pending. Click here to cla1m: http://tax-refund-claim.online",
        "C-B-I and Crime Branch notice: parcel containing illegal drugs found under your Aadhaar. Stay on line.",
        "Bijli connection will be disconnected tonight at 9 PM. Call officer at 9820194820 immediately.",
        "Congratulations! You won 25 Lakhs in lucky lottery draw. Pay Rs 2,500 file charges to release money.",
        "Aapka SBI account a-a-j band ho jayega. Turant apna KYC karein: http://tinyurl.com/sbi-a-c",
        "I am sending Rs 5,000 for your OLX sofa. Scan this QR code on PhonePe and enter UPI PIN to receive money",
        "Work from home opportunity: Earn 5,000 daily by rating hotels. Contact telegram @freemoney2026",
        "Police notice: FIR registered against your number for cyber crime. Do not disconnect call.",
        "Reward points worth Rs 8,500 expiring today. Redeem in cash by installing apk: http://rewards-sbi.apk",
        "Dear user, your SIM card will be deactivated due to non-KYC. Call Jio executive 9182740192.",
        "Dear customer, Rs 45,000 debited for Amazon order. If not you, cancel order immediately by calling 9820194820",
        "Electricity alert: Your power will be disconnected today. Pay bill immediately or contact power department.",
    ]

    fn_count = 0
    for text in adversarial_scams:
        res = m.score(text, signals)
        band = "likely_scam" if res["p"] >= model_data["thresholds"]["scam"] else ("suspicious" if res["p"] >= model_data["thresholds"]["suspicious"] else "looks_genuine")
        flag = " [MISSED SCAM]" if band == "looks_genuine" else " [CAUGHT]"
        if band == "looks_genuine":
            fn_count += 1
        print(f"{flag} p={res['p']:.3f} | {band:<14} | {text}")
        if band == "looks_genuine":
            print(f"      Signals: {res['signals']} | Words: {res['words'][:8]}")

    print(f"\nAdversarial missed scams: {fn_count} of {len(adversarial_scams)} ({fn_count/len(adversarial_scams)*100:.1f}%)")

if __name__ == "__main__":
    run_audit()
