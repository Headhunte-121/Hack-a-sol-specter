"""Generate genuine promotional and reminder messages from phone companies, streaming services and shops, in English, Hindi and Hinglish.

Why: a live phone scanned a real inbox and showed many genuine Jio messages as "Looks like a scam": "Recharge now your Jio no. ... with Rs.899 plan & enjoy
JioHotstar", "Your plan ... is expiring today. Recharge IMMEDIATELY", the same in Hindi, "Congratulations! You are now getting a FREE 12-month Canva Pro
Lite subscription", "Great news! Your complimentary JioHotstar subscription is now active", "Dear User, You've earned ... Earbuds ... redeem". The words
that make a scam (Congratulations, FREE, immediately, now, expiring, offer) are also the words of marketing, and the training data had almost no marketing
from the real companies. Every message here has an official link or none, asks for nothing secret and nobody to pay at a person's number.
Each template is its own group; every row is checked against the frozen evaluation texts. All numbers are invented. Writes data/team/promo_v3.csv.
"""
from __future__ import annotations

import csv
import itertools
import random
import sys
from pathlib import Path

import leak_check

ROOT = Path(__file__).resolve().parent.parent
RNG = random.Random(20261127)

S = dict(
    op=["Jio", "Airtel", "Vi"],
    ott=["JioHotstar", "Netflix", "Amazon Prime", "Canva Pro Lite", "SonyLIV", "Disney+ Hotstar", "YouTube Premium"],
    ophi=["जियो", "एयरटेल", "वीआई", "Jio", "Airtel", "Vi"],
    ott_hi=["जियो हॉटस्टार", "नेटफ्लिक्स", "अमेज़न प्राइम", "कैनवा प्रो", "सोनी लिव"],
    a=["199", "239", "299", "349", "399", "719", "899", "3599"],
    a2=["3499", "3999", "4499", "5999"],
    brand=["Gadget Lane", "Campus Shoes", "Myntra", "Reliance Digital", "Croma", "Nykaa", "Lenskart"],
    gift=["Exclusive Earbuds", "a Smart Watch", "a Backpack", "a Power Bank", "Sports Shoes"],
    url=["jio.com/r/ab12", "airtel.in/offer", "myvi.in/recharge", "www.jio.com", "amazon.in/deals", "myjio.com/p"],
    when=["today", "tomorrow", "in 2 days", "on 25-Nov"],
    when_hi=["आज", "कल", "दो दिन में"],
    d=["25-Nov", "28-Nov", "02-Dec", "10-Dec"],
    p=["+91 98765 43210", "9876543210", "99999 12345", "90000 11223", "9123456789"],
    n=["1", "2", "3"],
)


def expand(group: str, lang: str, templates: list[str], per: int = 8) -> list[dict]:
    rows = []
    for k, tpl in enumerate(templates):
        names = [s for s in S if "{" + s + "}" in tpl]
        combos = list(itertools.product(*[S[s] for s in names])) or [()]
        RNG.shuffle(combos)
        for combo in combos[:per]:
            rows.append({"text": tpl.format(**dict(zip(names, combo))), "label": 0, "lang": lang, "group": f"promo:{lang[:2]}:p3{chr(97 + k // 26) if k >= 26 else ''}{chr(97 + k % 26)}"})
    return rows


def genuine() -> list[dict]:
    R: list[dict] = []
    R += expand("telecom_promo", "english", [
        "Recharge now your {op} no. {p} with Rs.{a} plan & enjoy {op} Benefits - {ott}, unlimited 5G & more. Recharge at {url}",
        "Your plan for {op} number {p} is expiring {when}. Recharge IMMEDIATELY to continue enjoying uninterrupted services. Visit {url}",
        "Your {op} plan will expire on {d}. Recharge now to avoid interruption of services. {url}",
        "Congratulations! You are now getting a FREE 12-month {ott} subscription with your {op} recharge of Rs.{a}. Activate in the {op} app. T&C apply.",
        "Great news! Your complimentary {ott} Mobile subscription is now active on {p}. Enjoy! T&C apply.",
        "Recharge your {op} no {p} with Rs.{a} Plan & Enjoy {op}'s Mega Anniversary offer - 5G, {ott} and more. {url}",
        "Hurry! {op} festive offer ends {when}. Recharge with Rs.{a} and get extra 3GB data per day. {url}",
        "Dear Customer, your daily data limit is almost over. Add a data booster of Rs 19 for 1GB. Open the {op} app.",
        "Welcome to {op}! Your new SIM {p} is active. Download the {op} app to manage your plan.",
        "Dear Customer, you have used 90% of your monthly data. Upgrade to the Rs.{a} plan for unlimited 5G data. {url}",
        "Dear Customer, your recharge of Rs.{a} is successful. Plan valid till {d}. Thank you for choosing {op}.",
        "Your {ott} subscription will renew on {d} at Rs {a}. Manage it in the app. -{ott}",
        "{op}: Your plan expires {when}. Stay connected with the Rs.{a} plan and enjoy free {ott}. Recharge: {url}",
        "Last day! Get {ott} free for 3 months with {op} recharge of Rs.{a}. Offer ends {when}. T&C apply.",
        "Your {op} number {p} has unlimited 5G now. Check your balance in the {op} app.",
    ])
    R += expand("shop_promo", "english", [
        "Dear User, You've earned {brand} {gift} at Rs {a} (MRP Rs {a2}). Redeem on {url} T&C apply.",
        "TRENDS: Great news! You can now redeem your coupon earlier. Shop for Rs 1500 and get Rs 300 off. T&C apply.",
        "Congratulations! Your coupon worth Rs {a} is ready to use on {brand}. Valid till {d}. Shop now {url}",
        "{brand}: Flash sale! Up to 70% off on selected items. Shop now: {url} T&C apply. Reply STOP to opt out.",
        "Hi, your {brand} wishlist item is back in stock and the price has dropped. Order now before it sells out: {url}",
        "Exclusive for you: Extra 20% off at {brand} this weekend. Use code SAVE20. Shop now {url}",
        "Your {brand} reward points worth Rs {a} will expire on {d}. Use them on your next order in the app.",
        "Great news! Your {brand} order has been upgraded to free express delivery. Track it in the app.",
    ])
    R += expand("telecom_promo", "hindi", [
        "आपका {ophi} नंबर {p} का प्लान जल्द समाप्त होने वाला है। ₹{a} से रिचार्ज करें और पाएं अनलिमिटेड 5G और {ott_hi}। अभी रिचार्ज करें: {url}",
        "आपके {ophi} नंबर {p} के प्लान की वैधता जल्द ही समाप्त हो जाएगी। सेवाओं के बंद होने से बचने के लिए अभी रिचार्ज करें। {url}",
        "बधाई हो! आपको {ophi} रिचार्ज के साथ 12 महीने का {ott_hi} सब्सक्रिप्शन मुफ़्त मिल रहा है। शर्तें लागू।",
        "रिचार्ज प्लान {d} को समाप्त हो रहा है। {ophi} नंबर: {p}। ₹{a} का रिचार्ज करें और पाएं {ott_hi}।",
        "शानदार खबर! आपका {ott_hi} मोबाइल सब्सक्रिप्शन अब {p} पर चालू है। आनंद लीजिए! शर्तें लागू।",
        "प्रिय ग्राहक, आपका ₹{a} का रिचार्ज सफल रहा। प्लान {d} तक मान्य है। {ophi} चुनने के लिए धन्यवाद।",
        "{ophi} का त्योहारी ऑफर {when_hi} खत्म हो रहा है। ₹{a} के रिचार्ज पर रोज़ 3GB अतिरिक्त डेटा पाएं। {url}",
    ])
    R += expand("telecom_promo", "hinglish", [
        "Aapka {op} plan {d} ko khatam ho raha hai. Abhi Rs.{a} ka recharge karein aur unlimited 5G paayein. {url}",
        "Dhamaka offer! {op} recharge Rs.{a} par 12 mahine ka {ott} free. Abhi recharge karein. Sharten lagu.",
        "Dear Customer, aapka {op} number {p} ka plan kal expire ho raha hai. Services band hone se bachne ke liye abhi recharge karein.",
        "Badhai ho! Aapko {brand} ka coupon mila hai Rs {a} ka. {d} tak valid. Abhi shop karein: {url}",
    ])
    return R


def main() -> None:
    index, _ = leak_check.build_index(leak_check.DEFAULT_FROZEN, ROOT)
    if not leak_check.DEFAULT_FROZEN.is_dir():
        print("ERROR: frozen evaluation directory missing; refusing to write generated data.", file=sys.stderr)
        sys.exit(2)
    seen, uniq = set(), []
    for r in genuine():
        if r["text"] not in seen:
            seen.add(r["text"]); uniq.append(r)
    kept = [r for r in uniq if not index.match(r["text"])]
    print(f"frozen-text filter: kept {len(kept)} of {len(uniq)} rows")
    with open(ROOT / "data" / "team" / "promo_v3.csv", "w", encoding="utf-8", newline="") as fp:
        w = csv.DictWriter(fp, fieldnames=["text", "label", "lang", "group"])
        w.writeheader(); w.writerows(kept)
    print(f"wrote {len(kept)} rows to data/team/promo_v3.csv")


if __name__ == "__main__":
    main()
