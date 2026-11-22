"""Write apps/web/public/model/parity.json: >= 200 team-written / edge-case messages with the Python tokens, signals and scores.
The TypeScript test (apps/web/src/detector/parity.test.ts) must reproduce them within a small tolerance.
Only team-written text is used here, so the file can be committed. Usage: python parity.py
"""
import json
import random
from pathlib import Path

import pandas as pd

from textpipe import Model, load_signals

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "apps" / "web" / "public" / "model"
random.seed(5)

EDGE = [
    "", " ", "   \n\t  ", "a", "OTP", "ओटीपी", "😀😀😀", "pleaseeeeee sharreee otpppp", "<script>alert(1)</script> your OTP is 123456",
    "आपका ओटीपी ४८२९१३ है। किसी को न बताएं।", "Your KYC is pending. Click http://sbi-kyc.top/verify?id=1 now or account blocked",
    "Call +91 98765 43210 or 9876543210 immediately", "Pay Rs.5,000 or ₹ 2500 or 3 lakh rupees now", "refund of 5000 rs and 12,000 रुपये pending",
    "visit www.uidai.gov.in. Thanks.", "bit.ly/abc123 aur tinyurl.com/x", "http://192.168.1.1/login", "MiXeD CaSe KyC UpDaTe KaRo",
    "आपका account block हो जाएगा, KYC update karo abhi", "a" * 600, "word " * 300, "1234567 98765 12", "UPI: abc@okhdfcbank pay now", "don't share OTP with anyone",
    "Do NOT share this OTP. - SBI", "Rs 500 debited from A/c XX1234. If not you call 1800 1234.", "​z​er​o wi​dth",
]


def main():
    sg = load_signals()
    model = Model.load(OUT / "model.json"); model.signals = sg
    texts = list(EDGE)
    ch = pd.read_csv(ROOT / "data" / "processed" / "challenge.csv").text.tolist()
    team = pd.concat([pd.read_csv(ROOT / "ai tuning" / "data" / "synthetic_v2.csv").text, pd.read_csv(ROOT / "data" / "team" / "messages_v3.csv").text]).tolist()
    texts += ch + random.sample(team, 60)
    rows = []
    for t in texts:
        r = model.score(t, sg)
        rows.append({"text": t, "words": r["words"], "signals": r["signals"], "z": r["z"], "p": r["p"]})
    (ROOT / "apps" / "web" / "src" / "detector" / "__fixtures__" / "parity.json").write_text(json.dumps(rows, ensure_ascii=False), encoding="utf-8")
    print(f"wrote {len(rows)} parity examples")


if __name__ == "__main__":
    main()
