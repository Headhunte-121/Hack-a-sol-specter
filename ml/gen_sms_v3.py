"""Generate realistic Indian SMS-inbox formats: many genuine service / transaction / promo / reminder messages (some with ordinary links), and phishing
messages written in the same formats, so that "looks like an SMS from a bank or shop" and "contains a link" stop being scam cues by themselves.

Why: the live-SMS feature reads a whole inbox, which is mostly genuine text in odd formats (Rs.1,200.00, A/c *1234, ref numbers, T&C lines, -Sender
signatures, links to brand sites the app does not list). The model gave 0.98 to a plain "complaint received" notice and +4 points to any ordinary link.
Every template is its own group; every row is checked against the frozen evaluation texts. Invented names, numbers and accounts only.
Written without looking at ml/dev/dev_sms_v1.csv. Writes data/team/sms_v3_genuine.csv and data/team/sms_v3_scam.csv (text,label,lang,group).
"""
from __future__ import annotations

import csv
import itertools
import random
import sys
from pathlib import Path

import leak_check

ROOT = Path(__file__).resolve().parent.parent
RNG = random.Random(20261125)

S = dict(
    b=["SBI", "HDFC Bank", "ICICI Bank", "Axis Bank", "Kotak Mahindra Bank", "Canara Bank", "Bank of Baroda", "Union Bank", "IDFC First Bank"],
    m=["Amazon", "Flipkart", "Myntra", "Swiggy", "Zomato", "BigBasket", "Meesho", "Nykaa", "Ajio"],
    t=["Airtel", "Jio", "Vi", "BSNL"],
    a=["99", "250", "499", "1,200", "2,350", "4,500", "8,999", "12,400", "25,000"],
    a2=["1,200.00", "2,350.50", "499.00", "7,800.00", "15,000.00"],
    d=["23-Nov", "25-Nov", "28-Nov", "01-Dec", "05-Dec", "12-Dec", "15-Dec"],
    r=["4821", "9912", "3307", "7745", "1029"],
    ref=["41239876501", "10887766554", "55223344110", "31724685900"],
    ac=["XX1234", "X4821", "*7745", "XXXX3307"],
    t2=["11:30 AM", "4:15 PM", "9:00 AM", "6:45 PM"],
    gl=["https://www.axismf.com", "https://www.bigbasket.com/orders", "https://www.tatapower.com/pay", "https://www.myntra.com/track", "https://www.airtel.in/app",
        "https://www.zomato.com/order", "https://www.nykaa.com/offers", "https://www.hdfclife.com/policy", "https://www.licindia.in/pay", "https://www.bsnl.co.in/recharge",
        "https://www.makemytrip.com/trip", "https://www.practo.com/appointment"],
    ph=["98XXXXXX10", "70XXXXXX55", "81XXXXXX47"],
    bl=["http://sbi-kyc-update.top/login", "http://hdfc-secure-verify.xyz", "http://bit.ly/3kXz9", "http://paytm-kyc-now.cc", "http://amazon-prize-claim.club", "http://upi-reward.site/claim",
        "http://tinyurl.com/4abx7", "http://fastag-recharge.link", "http://refund-india.online", "http://sbi-update-kyc.com/login"],
)


def expand(group: str, lang: str, label: int, templates: list[str], per: int = 3) -> list[dict]:
    rows = []
    for k, tpl in enumerate(templates):
        names = [s for s in S if "{" + s + "}" in tpl]
        combos = list(itertools.product(*[S[s] for s in names])) or [()]
        RNG.shuffle(combos)
        for combo in combos[:per]:
            rows.append({"text": tpl.format(**dict(zip(names, combo))), "label": label, "lang": lang, "group": f"{group}:{lang[:2]}:s3{chr(97 + k // 26) if k >= 26 else ''}{chr(97 + k % 26)}"})
    return rows


def genuine() -> list[dict]:
    R: list[dict] = []
    R += expand("bank_txn", "english", 0, [
        "Dear Customer, INR {a2} debited from A/c {ac} on {d} and credited to VPA shop@okaxis (UPI Ref No {ref}). If not done by you, call the bank helpline. -{b}",
        "Rs.{a2} spent on {b} Card x4321 at {m} on {d}. Avl Lmt Rs.45,000. Not you? Call the number on the back of your card.",
        "Your A/c {ac} is credited with Rs {a2} on {d} by UPI Ref {ref}. Avl Bal Rs 31,250.55. -{b}",
        "A/c {ac} debited by {a2} on {d} trf to {m} Ref {ref}. Not you? Call your bank immediately.",
        "{b}: Rs {a} withdrawn at ATM on {d}. Avl Bal Rs 12,400.55. If not you call the bank helpline.",
        "Salary of Rs {a2} credited to your A/c {ac} on {d}. Avl Bal Rs 48,260.10. -{b}",
        "Dear Customer, your cheque no {r} for Rs {a} has been cleared on {d}. -{b}",
        "Your standing instruction of Rs {a} to {m} was executed on {d}. Ref {ref}. -{b}",
    ])
    R += expand("bank_notice", "english", 0, [
        "Dear Customer, your EMI of Rs {a} for loan A/c {r} is due on {d}. Please ensure sufficient balance. -{b}",
        "Your {b} credit card statement of Rs {a} is generated. Minimum due Rs 450 by {d}. Pay through the official app only.",
        "A new payee has been added to your account. If you did not do this, visit your nearest branch. -{b}",
        "Your debit card ending {r} will expire on {d}. A new card has been sent to your registered address. -{b}",
        "Mutual fund SIP of Rs {a} has been processed on {d}. Units allotted 31.254. Statement: {gl}",
        "Your fixed deposit of Rs {a} matures on {d}. Visit the branch or the official app to renew. -{b}",
        "Your PAN has been linked to your Aadhaar successfully. -Income Tax Department",
        "We have received your complaint no {r}. We will resolve it within 3 working days. -Customer Care",
        "Your service request {r} has been resolved. Thank you for banking with {b}.",
        "Your cheque book request has been received and will be delivered in 7 working days. -{b}",
    ])
    R += expand("otp_sms", "english", 0, [
        "<#> {r}12 is your {m} verification code. Do not share it with anyone. xkF9sd2",
        "{r}00 is the OTP for your {m} login. Valid for 10 mins. Do not share it with anyone.",
        "OTP for your transaction of Rs {a} on {b} card {ac} is {r}56. Never share OTP with anyone. -{b}",
        "Use {r}34 as your login code for {m}. Do not share this with anyone, our team will never ask for it.",
        "{m}: {r} is your delivery OTP. Share it only with the delivery partner when the order arrives.",
        "Your one time password for {b} NetBanking is {r}77. Valid for 5 minutes. Please do not share with anyone.",
    ])
    R += expand("promo", "english", 0, [
        "Flat 50% OFF on fashion at {m}! Use code END50. Shop now: {gl} T&C apply. Reply STOP to opt out.",
        "{m}: Your cart is waiting. Complete your order today and get free delivery: {gl}",
        "Big Sale on {m} this weekend. Up to 70% off on mobiles and laptops. Visit {gl} T&C apply.",
        "{t}: Recharge with Rs {a} and get extra data this week. Recharge on the app or {gl}",
        "Enjoy 20% cashback on your next order with {m}. Offer valid till {d}. T&C apply.",
        "Hi, your {m} order has been shipped and will arrive by {d}. Track here: {gl}",
        "Your {m} order {r} has been delivered. Rate your experience: {gl}",
        "{m} Pay Later: your bill of Rs {a} is due on {d}. Pay in the app to avoid late fee.",
    ])
    R += expand("telecom", "english", 0, [
        "{t}: Rs {a} recharge successful. Validity 28 days, 2GB/day. Download the {t} app: {gl}",
        "{t}: You have used 80% of your daily data. Recharge with Rs 19 for 1 GB more on the app.",
        "{t}: Your plan will expire on {d}. Recharge on the app or {gl} to continue services.",
        "Your {t} postpaid bill of Rs {a} is generated. Due date {d}. Pay on the app. Ignore if paid.",
        "Dear customer, your DTH recharge is due. Recharge on the app to avoid disconnection. Balance Rs 12.",
    ])
    R += expand("appointment", "english", 0, [
        "Your appointment with Dr. Sharma is confirmed for {d} at {t2}. Reply 1 to confirm, 2 to cancel. -Clinic",
        "Reminder: your lab test is scheduled on {d} at {t2}. Please come fasting. -Diagnostics",
        "Your IRCTC PNR 24{r}678 is confirmed. Train 12345 departs {t2} on {d}. Happy journey.",
        "Your flight booking is confirmed for {d}. Web check-in opens 48 hours before departure: {gl}",
        "Your cab is arriving in 3 minutes. Vehicle MP09AB1234. Driver Suresh. OTP {r}.",
        "Parent teacher meeting on {d} at {t2}. Please attend. -Principal",
        "Your parcel is out for delivery today. Delivery partner will call you. No payment is needed.",
        "Your electricity bill of Rs {a} is due on {d}. Pay on the official app or website. Ignore if already paid.",
    ])
    R += expand("govt", "english", 0, [
        "UIDAI: Your Aadhaar update request has been received. URN 1234/56789/{r}. Track at https://uidai.gov.in",
        "Your income tax return has been processed. Refund of Rs {a} will be credited within 15 days. -Income Tax Department",
        "Your LPG cylinder booking is confirmed. Delivery code {r} will be needed at delivery, share it only with the delivery person.",
        "Your driving licence renewal is due on {d}. Apply at the official parivahan portal.",
        "Your vaccination slot is booked for {d} at {t2}. Please carry your ID. -Health Department",
    ])
    R += expand("hinglish_sms", "hinglish", 0, [
        "Aapke A/c {ac} se Rs {a} debit hue hain {d} ko. Agar aapne nahi kiya to bank ko turant batayein. -{b}",
        "Aapka OTP {r}21 hai. Ise kisi ke saath share na karein. -{b}",
        "{m}: Aapka order {d} tak pahunch jayega. Track karein: {gl}",
        "{t}: Aapka Rs {a} ka recharge safal raha. Validity 28 din. Dhanyavad.",
        "Aapki EMI Rs {a} {d} ko debit hogi. Account me balance rakhein. -{b}",
        "Aapka bijli bill Rs {a} hai, last date {d}. App se bharein. Agar bhar diya hai to ignore karein.",
        "Aapki appointment {d} ko {t2} par confirm ho gayi hai. Reply 1 to confirm.",
    ])
    R += expand("hindi_sms", "hindi", 0, [
        "आपके खाते {ac} से {a} रुपये डेबिट हुए हैं। यदि आपने नहीं किए तो बैंक को तुरंत बताएं। -{b}",
        "आपका ओटीपी {r}21 है। इसे किसी को न बताएं। -{b}",
        "आपका ऑर्डर {d} तक पहुंच जाएगा। ट्रैक करें: {gl}",
        "आपकी किस्त {a} रुपये {d} को कटेगी। खाते में राशि रखें। -{b}",
        "आपका बिजली बिल {a} रुपये का है, अंतिम तिथि {d}। ऐप से भरें। भर दिया हो तो अनदेखा करें।",
    ])
    return R


def scam() -> list[dict]:
    R: list[dict] = []
    R += expand("phish_bank", "english", 1, [
        "Dear {b} user, your account is blocked. Update PAN now: {bl}",
        "{b}: Your net banking will be suspended today. Complete KYC at {bl} or call {ph}",
        "Dear customer, your {b} debit card is deactivated. Verify immediately: {bl}",
        "{b} ALERT: Unusual activity detected on A/c {ac}. Confirm your details now: {bl}",
        "Your {b} account has been limited. Restore access within 24 hours: {bl}",
        "Dear user your KYC is expired. Share the OTP sent to you with our agent on {ph} to keep your account active.",
    ])
    R += expand("phish_other", "english", 1, [
        "Congratulations! You have won Rs 25 Lakh in {t} Lucky Draw. Claim here: {bl}",
        "Your Income Tax refund of Rs {a} is approved. Submit bank details: {bl}",
        "Dear customer your electricity will be disconnected tonight 9:30 PM. Call {ph} for officer.",
        "Your parcel is held at customs. Pay Rs 75 clearance here: {bl}",
        "URGENT: Your FASTag is blocked. Recharge now: {bl}",
        "Dear {m} user your account has unusual sign-in. Verify at {bl}",
        "You are selected for a job at {m}. Earn Rs 5,000 per day. WhatsApp {ph} with your Aadhaar and bank details.",
        "Sir your SIM will be blocked in 2 hours. Complete Aadhaar verification: {bl}",
        "Dear customer, your gas subsidy of Rs {a} is pending. Update bank details: {bl}",
        "A request of Rs {a} from {m} Support is pending on your UPI app. Approve it to receive your refund.",
        "Your {m} order is on hold. Pay the redelivery fee of Rs 49 here: {bl}",
        "Dear customer, you are eligible for a pre-approved loan of Rs {a}. Pay Rs 999 processing fee to {ph} to get it today.",
    ])
    R += expand("phish_hinglish", "hinglish", 1, [
        "Aapka {b} account aaj band ho jayega. Turant KYC update karein: {bl}",
        "{m}: Aapka reward claim karne ke liye ye link kholein aur card details daalein: {bl}",
        "Aapka bijli connection aaj raat kat jayega. Turant {ph} par call karein.",
        "Aapko {t} lucky draw me Rs 25 lakh mile hain. Claim karne ke liye processing fee bhejein: {bl}",
    ])
    R += expand("phish_hindi", "hindi", 1, [
        "आपका {b} खाता आज बंद हो जाएगा। केवाईसी अपडेट करें: {bl}",
        "आपको {t} लकी ड्रॉ में 25 लाख रुपये मिले हैं। इनाम पाने के लिए यह लिंक खोलें: {bl}",
        "आपका बिजली कनेक्शन आज रात कट जाएगा। तुरंत {ph} पर कॉल करें।",
    ])
    return R


def main() -> None:
    index, warns = leak_check.build_index(leak_check.DEFAULT_FROZEN, ROOT)
    if not leak_check.DEFAULT_FROZEN.is_dir():
        print("ERROR: frozen evaluation directory missing; refusing to write generated data.", file=sys.stderr)
        sys.exit(2)
    for name, rows in (("sms_v3_genuine", genuine()), ("sms_v3_scam", scam())):
        seen, uniq = set(), []
        for r in rows:
            if r["text"] not in seen:
                seen.add(r["text"]); uniq.append(r)
        kept = [r for r in uniq if not index.match(r["text"])]
        print(f"frozen-text filter ({name}): kept {len(kept)} of {len(uniq)} rows")
        with open(ROOT / "data" / "team" / f"{name}.csv", "w", encoding="utf-8", newline="") as fp:
            w = csv.DictWriter(fp, fieldnames=["text", "label", "lang", "group"])
            w.writeheader(); w.writerows(kept)
        print(f"wrote {len(kept)} rows to data/team/{name}.csv")


if __name__ == "__main__":
    main()
