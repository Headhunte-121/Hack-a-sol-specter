"""Generate genuine messages that contain the word "call" and a phone number: missed-call alerts from the phone companies, "I tried calling you", delivery
partners who will call, clinics and shops that give a number for changes.

Why: a live phone showed a genuine Jio missed-call alert ("You have a missed call from +91... Thankyou, Team Jio") as "Looks like a scam, confidence high".
The model had learned that "call" plus a phone number means "call this number or lose your money" (the callback_number signal alone was worth +6.6 points
and the word "call" itself pushed the text score up), because in the training data a phone number next to "call" almost only appeared in scams.
Each template is its own group; every row is checked against the frozen evaluation texts. All numbers are invented (the synthetic prefixes redact_check.py
allows). Writes data/team/telecom_v3.csv (text,label,lang,group).
"""
from __future__ import annotations

import csv
import itertools
import random
import sys
from pathlib import Path

import leak_check

ROOT = Path(__file__).resolve().parent.parent
RNG = random.Random(20261126)

S = dict(
    op=["Jio", "Airtel", "Vi", "BSNL"],
    p=["+91 98765 43210", "9876543210", "99999 12345", "+91 90000 11223", "9123456789", "8000012345", "+91 70000 54321"],
    t=["07:58 PM", "10:15 AM", "6:40 PM", "12:05 PM", "09:30 AM", "11:20 PM"],
    d=["16-Nov-2026", "21-Nov-2026", "22-Nov-2026", "23-Nov-2026"],
    n=["2", "3", "4"],
    who=["Ramesh", "Suresh", "Anita", "Priya"],
    place=["City Clinic", "Sharma Dental Care", "Green Leaf Restaurant", "Shree Tailors", "Laxmi Medical"],
)


def expand(group: str, lang: str, templates: list[str], per: int = 4) -> list[dict]:
    rows = []
    for k, tpl in enumerate(templates):
        names = [s for s in S if "{" + s + "}" in tpl]
        combos = list(itertools.product(*[S[s] for s in names])) or [()]
        RNG.shuffle(combos)
        for combo in combos[:per]:
            rows.append({"text": tpl.format(**dict(zip(names, combo))), "label": 0, "lang": lang, "group": f"telecom:{lang[:2]}:t3{chr(97 + k)}"})
    return rows


def genuine() -> list[dict]:
    R: list[dict] = []
    R += expand("missed", "english", [
        "Dear Customer, You have a missed call from {p} The last missed call was at {t} on {d} Thankyou, Team {op}.",
        "Missed call alert: you have a missed call from {p} at {t}. -{op}",
        "You have {n} missed calls from {p}. Last missed call at {t}. -{op}",
        "{op}: You missed a call from {p} on {d} at {t}.",
        "Missed call from {p} at {t} on {d}. Call back or send a message. -{op}",
        "This is a {op} call alert. {p} tried to reach you at {t}.",
        "Missed voice call from {p} at {t}.",
        "You have a new missed call from {p}. Time {t}. Dial 121 to know more. -{op}",
        "Dear Customer, {n} calls from {p} were missed while your phone was switched off. Last call at {t}. Thank you, Team {op}.",
        "Your friend {who} ({p}) tried calling you at {t} but could not connect. -{op} Call Alert",
    ])
    R += expand("missed", "hinglish", [
        "Dear Customer, aapko {p} se ek missed call mila hai. Samay {t}. -{op}",
        "{op} Alert: {p} ne aapko {t} par call kiya tha, aapne call nahi uthaya.",
        "Aapke phone par {n} missed call aaye hain {p} se. Aakhri call {t} par. -{op}",
        "{who} ne aapko {t} par call kiya tha. Number {p}. Wapas call kar lena.",
    ])
    R += expand("missed", "hindi", [
        "आपके नंबर पर {p} से एक मिस्ड कॉल आई थी। समय {t}। -{op}",
        "प्रिय ग्राहक, आपको {p} से {n} मिस्ड कॉल मिली हैं। अंतिम कॉल {t} पर। धन्यवाद, टीम {op}।",
        "{who} ने आपको {t} पर फोन किया था। नंबर {p}। जब खाली हों तो वापस कॉल कर लीजिए।",
    ])
    R += expand("personal_call", "english", [
        "Hi, I tried calling you but you did not pick up. Call me back on {p} when you are free.",
        "Please call me when you reach. I am on {p}.",
        "Call {who} on {p} if you need the keys, he is home after {t}.",
        "I will call you at {t}. If you cannot talk, message me on {p}.",
        "Missed your call. Call me on {p} when you see this.",
    ])
    R += expand("personal_call", "hinglish", [
        "Maine call kiya tha, aapne uthaya nahi. {p} par wapas call kar lena.",
        "Ghar pahunch kar mujhe call karna, main {p} par hoon.",
        "{who} ko {p} par call kar lo, wo {t} ke baad ghar par hai.",
    ])
    R += expand("personal_call", "hindi", [
        "मैंने फोन किया था, आपने नहीं उठाया। जब खाली हों तो {p} पर बात कर लीजिए।",
        "घर पहुँचकर मुझे फोन करना, मैं {p} पर हूँ।",
    ])
    R += expand("will_call", "english", [
        "Your delivery partner {who} will call you on {p} before delivery. Please keep your phone on.",
        "Your order is out for delivery. {who} ({p}) will call you when he reaches.",
        "Our technician {who} will call you on {p} to confirm the visit time. -{op}",
        "The school office will call you on {p} about the admission form.",
    ])
    R += expand("will_call", "hinglish", [
        "Aapka delivery partner {who} {p} par aapko call karega. Phone chalu rakhein.",
        "Aapka order nikal gaya hai. {who} ({p}) pahunch kar call karega.",
    ])
    R += expand("book_call", "english", [
        "Your appointment is confirmed for {d} at {t}. To reschedule call {place} on {p}.",
        "Table booked for 4 on {d} at {t}. For any change please call the restaurant on {p}.",
        "Your stitching order is ready. Call {place} on {p} before you come, we close at 8 pm.",
        "Thank you for visiting {place}. For any query about your bill call us on {p}.",
    ])
    R += expand("book_call", "hinglish", [
        "Aapki appointment {d} ko {t} par confirm hai. Badalna ho to {place} ko {p} par call karein.",
    ])
    R += expand("book_call", "hindi", [
        "आपकी अपॉइंटमेंट {d} को {t} पर पक्की है। बदलाव के लिए {place} को {p} पर कॉल कीजिए।",
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
    with open(ROOT / "data" / "team" / "telecom_v3.csv", "w", encoding="utf-8", newline="") as fp:
        w = csv.DictWriter(fp, fieldnames=["text", "label", "lang", "group"])
        w.writeheader(); w.writerows(kept)
    print(f"wrote {len(kept)} rows to data/team/telecom_v3.csv")


if __name__ == "__main__":
    main()
