"""Generate high-quality synthetic team data for trap-genuine and scam-gap mitigation.

Produces:
  data/team/trap_genuine_v1.csv (>= 300 genuine rows, label 0)
  data/team/scam_gap_v1.csv (>= 150 scam rows, label 1)

Deterministic generation with fixed random seeds.
Columns: text, label, lang, group

FROZEN-TEXT FILTER: after generating, every row is checked against the frozen evaluation texts with leak_check (exact masked key,
first-6+last-4 signature, token-set Jaccard >= 0.85) and matching rows are removed before anything is written. The generator reads the
frozen texts ONLY to filter them out; nothing here was written by looking at them. If the frozen directory is missing the generator
refuses to run (use --allow-missing-frozen only for tests): otherwise a regeneration would silently bring the leaked rows back.

The original template families (group ids ending :1, :2) use RNG, in a fixed order, so existing rows never change. The "v2" variants
added after the leak removal (group ids with a v2 suffix) use RNG2 and are new sentence structures, written without reference to any
evaluation text, to refill the families that lost every variant to the filter.

Hard-negative loop (at most two rounds, driven only by the training and validation splits and the group-held-out family tables):
  round 1 (suffix h1, RNG3): genuine families still flagged on validation / when their wording was held out (OTP delivery, promotions,
          credit-card statements, awareness tips, periodic-KYC branch notices, Aadhaar status, genuine refunds, card blocked on request),
          scam families still missed (wrong-payment / collect-request tricks, loan-app photo threats, new-number family emergencies);
  round 2 (suffix h2, RNG4): the families still flagged after round 1 (awareness in all three languages, Hindi statements and bills,
          Hindi KYC / card-block notices) plus more wrong-payment wording. English card-control confirmations (online / international /
          contactless / ATM controls) were added to this batch after the repo's golden regression suite showed a false flag there.
Every row of every batch goes through the frozen-text filter above. Nothing was written by looking at an evaluation text.
"""

from __future__ import annotations

import argparse
import csv
import itertools
import random
import sys
from pathlib import Path

import leak_check

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "data" / "team"

SEED = 20261123
RNG = random.Random(SEED)
RNG2 = random.Random(SEED + 1)         # stream for the v2 variants, independent of RNG
RNG3 = random.Random(SEED + 2)         # stream for the hard-negative round 1 variants (group ids with an h1 suffix)
RNG4 = random.Random(SEED + 3)         # stream for the hard-negative round 2 variants (group ids with an h2 suffix)
HARD_NEGATIVE_ROUNDS = 2               # at most two rounds: round 1 = h1 variants, round 2 adds the h2 variants

BANKS = ["HDFC Bank", "SBI", "ICICI Bank", "Axis Bank", "Kotak Bank", "PNB"]
MERCHANTS = ["Amazon", "Flipkart", "Swiggy", "Zomato", "Myntra", "JioMart", "Zepto", "Blinkit"]
OFFICIAL_DOMAINS = ["sbi.co.in", "hdfcbank.com", "icicibank.com", "axisbank.com", "myntra.com", "amazon.in", "flipkart.com", "pmkisan.gov.in", "uidai.gov.in", "irctc.co.in"]
SCAM_DOMAINS = ["sbi-kyc-update.top", "hdfc-secure-verify.xyz", "pan-link-status.club", "fast-loan-instant.link", "upi-reward-claim.site", "pmkisan-bonus.top", "customs-duty-clear.xyz"]
PHONE_SYNTH = ["9876543210", "9999912345", "9000011223", "9123456789", "8000012345", "7000054321", "6000098765"]

DATES = ["28 Nov", "30 Nov", "05 Dec", "15 Dec", "31 Dec", "10 Jan"]
AMOUNTS = ["450", "1,250", "2,000", "3,500", "5,000", "8,200", "12,000", "15,500"]
DIGITS4 = ["1234", "4821", "9012", "5541", "3312", "7789", "6623"]


def make_genuine() -> list[dict[str, str | int]]:
    rows: list[dict[str, str | int]] = []

    # 1. OTP Delivery (Short & Standard)
    # en
    for i in range(10):
        c = f"{RNG.randint(100000, 999999)}"
        s = RNG.choice(["Google", "Microsoft", "WhatsApp", "Instagram", "Uber", "Amazon"])
        rows.append({"text": f"{c} is your {s} verification code.", "label": 0, "lang": "english", "group": "otp_delivery:en:1"})
    for i in range(10):
        c = f"{RNG.randint(100000, 999999)}"
        b = RNG.choice(BANKS)
        rows.append({"text": f"{b}: Your OTP for login is {c}. Valid for 10 mins. Do not share this OTP with anyone.", "label": 0, "lang": "english", "group": "otp_delivery:en:2"})
    for i in range(10):
        c = f"{RNG.randint(100000, 999999)}"
        b = RNG.choice(BANKS)
        a = RNG.choice(AMOUNTS)
        rows.append({"text": f"OTP for transaction of Rs {a} on your {b} card is {c}. Valid for 5 minutes. Never share OTP with anyone.", "label": 0, "lang": "english", "group": "otp_delivery:en:3"})
    # hi
    for i in range(10):
        c = f"{RNG.randint(100000, 999999)}"
        s = RNG.choice(["गूगल", "व्हाट्सएप", "इंस्टाग्राम", "अमेज़न"])
        rows.append({"text": f"{c} आपका {s} सत्यापन कोड है।", "label": 0, "lang": "hindi", "group": "otp_delivery:hi:1"})
    for i in range(10):
        c = f"{RNG.randint(100000, 999999)}"
        b = RNG.choice(["एसबीआई", "एचडीएफसी बैंक", "आईसीआईसीआई बैंक"])
        rows.append({"text": f"{b}: लॉगिन के लिए आपका ओटीपी {c} है। यह 10 मिनट के लिए मान्य है। किसी के साथ साझा न करें।", "label": 0, "lang": "hindi", "group": "otp_delivery:hi:2"})
    # hinglish
    for i in range(10):
        c = f"{RNG.randint(100000, 999999)}"
        s = RNG.choice(["Google", "WhatsApp", "Amazon", "Flipkart"])
        rows.append({"text": f"{c} aapka {s} verification code hai. Kisi se share na karein.", "label": 0, "lang": "hinglish", "group": "otp_delivery:hinglish:1"})
    for i in range(10):
        c = f"{RNG.randint(100000, 999999)}"
        b = RNG.choice(BANKS)
        rows.append({"text": f"{b}: Aapke login ka OTP {c} hai. Ise kisi ke saath share na karein. Valid for 5 mins.", "label": 0, "lang": "hinglish", "group": "otp_delivery:hinglish:2"})

    # 2. Bank Debit and Credit Alerts
    # en
    for i in range(10):
        a = RNG.choice(AMOUNTS); d = RNG.choice(DIGITS4); m = RNG.choice(MERCHANTS); dt = RNG.choice(DATES)
        rows.append({"text": f"Rs {a} debited from A/c XX{d} on {dt} to {m}. Avl Bal: Rs 45,210. If not you, call the number on the back of your card. -HDFC Bank", "label": 0, "lang": "english", "group": "bank_alert:en:1"})
    for i in range(10):
        a = RNG.choice(AMOUNTS); d = RNG.choice(DIGITS4); dt = RNG.choice(DATES)
        rows.append({"text": f"Your A/c XX{d} is credited with Rs {a} on {dt} by salary transfer. Clear Bal: Rs 68,000. -SBI", "label": 0, "lang": "english", "group": "bank_alert:en:2"})
    # hi
    for i in range(10):
        a = RNG.choice(AMOUNTS); d = RNG.choice(DIGITS4); m = RNG.choice(["अमेज़न", "फ्लिपकार्ट", "जोमैटो"])
        rows.append({"text": f"खाता XX{d} से {a} रुपये {m} को ट्रांसफर किए गए। शेष राशि: 32,500 रुपये। यदि आपने नहीं किया तो बैंक हेल्पलाइन पर संपर्क करें।", "label": 0, "lang": "hindi", "group": "bank_alert:hi:1"})
    for i in range(10):
        a = RNG.choice(AMOUNTS); d = RNG.choice(DIGITS4)
        rows.append({"text": f"आपके खाते XX{d} में {a} रुपये जमा किए गए हैं। उपलब्ध शेष: 54,000 रुपये। -आईसीआईसीआई बैंक", "label": 0, "lang": "hindi", "group": "bank_alert:hi:2"})
    # hinglish
    for i in range(10):
        a = RNG.choice(AMOUNTS); d = RNG.choice(DIGITS4); m = RNG.choice(MERCHANTS)
        rows.append({"text": f"Aapke account XX{d} se Rs {a} debited hue hain to {m}. Available balance Rs 24,150. Not you? Contact bank helpline.", "label": 0, "lang": "hinglish", "group": "bank_alert:hinglish:1"})
    for i in range(10):
        a = RNG.choice(AMOUNTS); d = RNG.choice(DIGITS4)
        rows.append({"text": f"Aapke A/c XX{d} mein Rs {a} credit ho gaya hai. Total balance Rs 35,400. -Axis Bank", "label": 0, "lang": "hinglish", "group": "bank_alert:hinglish:2"})

    # 3. Card Blocked/Unblocked at Customer Request (user_initiated)
    # en
    for i in range(10):
        d = RNG.choice(DIGITS4); b = RNG.choice(BANKS)
        rows.append({"text": f"Your card ending {d} has been blocked as per your request. To unblock, visit the nearest branch or call customer care. -{b}", "label": 0, "lang": "english", "group": "card_block_user:en:1"})
    for i in range(10):
        d = RNG.choice(DIGITS4); b = RNG.choice(BANKS)
        rows.append({"text": f"At your request, your debit card XX{d} has been temporarily blocked. Visit branch with photo ID to reactivate. -{b}", "label": 0, "lang": "english", "group": "card_block_user:en:2"})
    # hi
    for i in range(10):
        d = RNG.choice(DIGITS4); b = RNG.choice(["एसबीआई", "एचडीएफसी कार्ड"])
        rows.append({"text": f"आपका कार्ड आपके अनुरोध पर ब्लॉक कर दिया गया है। दोबारा चालू करने के लिए नजदीकी शाखा में जाएं। -{b}", "label": 0, "lang": "hindi", "group": "card_block_user:hi:1"})
    # hinglish
    for i in range(10):
        d = RNG.choice(DIGITS4); b = RNG.choice(BANKS)
        rows.append({"text": f"Aapka card aapki request par block kar diya gaya hai. Dobara chalu karne ke liye branch jayein. -{b}", "label": 0, "lang": "hinglish", "group": "card_block_user:hinglish:1"})

    # 4. KYC-Due Branch-Visit Notice
    # en
    for i in range(10):
        dt = RNG.choice(DATES); b = RNG.choice(BANKS)
        rows.append({"text": f"Dear customer, your periodic KYC is due. Please visit your nearest {b} branch with Aadhaar and PAN before {dt} to avoid restrictions.", "label": 0, "lang": "english", "group": "kyc_branch:en:1"})
    # hi
    for i in range(10):
        dt = RNG.choice(DATES); b = RNG.choice(["एक्सिस बैंक", "एसबीआई", "पीएनबी"])
        rows.append({"text": f"प्रिय ग्राहक, आपका केवाईसी बाकी है। कृपया {dt} से पहले आधार और पैन लेकर नजदीकी {b} शाखा में आएं।", "label": 0, "lang": "hindi", "group": "kyc_branch:hi:1"})
    # hinglish
    for i in range(10):
        dt = RNG.choice(DATES); b = RNG.choice(BANKS)
        rows.append({"text": f"Dear customer, KYC ke liye {dt} se pehle nazdeeki {b} branch mein Aadhaar aur PAN ke saath aayein.", "label": 0, "lang": "hinglish", "group": "kyc_branch:hinglish:1"})

    # 5. Government Scheme Credit Notices (PM-Kisan, Fasal Bima)
    # en
    for i in range(10):
        rows.append({"text": "PM-Kisan installment of Rs 2,000 has been credited to your bank account. Check your status at pmkisan.gov.in", "label": 0, "lang": "english", "group": "gov_scheme:en:1"})
    for i in range(10):
        a = RNG.choice(["8,500", "12,000", "16,400"])
        rows.append({"text": f"Crop insurance claim of Rs {a} under Fasal Bima Yojana credited to your account. Check details at pmfby.gov.in", "label": 0, "lang": "english", "group": "gov_scheme:en:2"})
    # hi
    for i in range(10):
        rows.append({"text": "पीएम किसान सम्मान निधि की 2,000 रुपये की किस्त आपके खाते में जमा हो गई है। स्थिति देखें: pmkisan.gov.in", "label": 0, "lang": "hindi", "group": "gov_scheme:hi:1"})
    for i in range(10):
        a = RNG.choice(["8,500", "12,000", "16,400"])
        rows.append({"text": f"आपकी फसल बीमा की {a} रुपये की राशि बैंक खाते में भेज दी गई है। स्थिति चेक करें।", "label": 0, "lang": "hindi", "group": "gov_scheme:hi:2"})
    # hinglish
    for i in range(10):
        rows.append({"text": "PM-Kisan ki Rs 2,000 ki kist aapke account mein aa gayi hai. Status dekhein: pmkisan.gov.in", "label": 0, "lang": "hinglish", "group": "gov_scheme:hinglish:1"})
    for i in range(10):
        a = RNG.choice(["8,500", "12,000", "16,400"])
        rows.append({"text": f"Aapki fasal bima ki Rs {a} ki rashi bank account mein bhej di gayi hai.", "label": 0, "lang": "hinglish", "group": "gov_scheme:hinglish:2"})

    # 6. Aadhaar / PAN Update Status (.gov.in link)
    # en
    for i in range(10):
        rows.append({"text": "Your Aadhaar update request has been successfully processed. Download e-Aadhaar or check status at uidai.gov.in", "label": 0, "lang": "english", "group": "aadhaar_status:en:1"})
    # hi
    for i in range(10):
        rows.append({"text": "आपका आधार अपडेट हो गया है। स्थिति देखने के लिए uidai.gov.in पर जाएँ।", "label": 0, "lang": "hindi", "group": "aadhaar_status:hi:1"})
    # hinglish
    for i in range(10):
        rows.append({"text": "Aapka Aadhaar update ho gaya hai. Status dekhne ke liye uidai.gov.in par jayein.", "label": 0, "lang": "hinglish", "group": "aadhaar_status:hinglish:1"})

    # 7. Telecom Plan Expiry
    # en
    for i in range(10):
        dt = RNG.choice(DATES); tel = RNG.choice(["Jio", "Airtel", "Vi"])
        rows.append({"text": f"Your {tel} plan expires on {dt}. To enjoy unlimited calls and data, recharge in the official {tel} app.", "label": 0, "lang": "english", "group": "telecom_expiry:en:1"})
    # hi
    for i in range(10):
        dt = RNG.choice(DATES); tel = RNG.choice(["जियो", "एयरटेल"])
        rows.append({"text": f"आपका {tel} प्लान {dt} को समाप्त हो रहा है। सेवाओं को जारी रखने के लिए ऐप में जाकर रिचार्ज करें।", "label": 0, "lang": "hindi", "group": "telecom_expiry:hi:1"})
    # hinglish
    for i in range(10):
        dt = RNG.choice(DATES); tel = RNG.choice(["Jio", "Airtel"])
        rows.append({"text": f"Aapka {tel} plan {dt} ko expire ho raha hai. Recharge ke liye MyJio app kholein.", "label": 0, "lang": "hinglish", "group": "telecom_expiry:hinglish:1"})

    # 8. Order and Delivery Updates with Official Link
    # en
    for i in range(10):
        m = RNG.choice(["Amazon", "Flipkart"]); dt = RNG.choice(DATES)
        dom = "amazon.in" if m == "Amazon" else "flipkart.com"
        rows.append({"text": f"Your {m} package has been dispatched and will arrive by {dt}. Track your order at https://www.{dom}", "label": 0, "lang": "english", "group": "delivery_update:en:1"})
    # hi
    for i in range(10):
        dt = RNG.choice(DATES)
        rows.append({"text": f"आपका अमेज़न पार्सल भेज दिया गया है और {dt} तक पहुंचेगा। विवरण ऐप में देखें।", "label": 0, "lang": "hindi", "group": "delivery_update:hi:1"})
    # hinglish
    for i in range(10):
        dt = RNG.choice(DATES)
        rows.append({"text": f"Aapka Flipkart order dispatch ho gaya hai aur {dt} tak deliver hoga. Track karein app mein.", "label": 0, "lang": "hinglish", "group": "delivery_update:hinglish:1"})

    # 9. Sale / Marketing Messages from Official Brand Domains
    # en
    for i in range(10):
        rows.append({"text": "Myntra End of Reason Sale is live! Up to 60% off. Shop now at https://www.myntra.com/sale", "label": 0, "lang": "english", "group": "brand_sale:en:1"})
    for i in range(10):
        rows.append({"text": "Great Indian Festival starts now on Amazon! Top deals on mobiles and electronics: https://www.amazon.in", "label": 0, "lang": "english", "group": "brand_sale:en:2"})
    # hi
    for i in range(10):
        rows.append({"text": "फ्लिपकार्ट बिग बिलियन डेज सेल शुरू हो गई है! भारी छूट का लाभ उठाने के लिए ऐप खोलें।", "label": 0, "lang": "hindi", "group": "brand_sale:hi:1"})
    # hinglish
    for i in range(10):
        rows.append({"text": "Amazon Mega Sale live ho gayi hai. 50% tak discounts paane ke liye visit karein: https://www.amazon.in", "label": 0, "lang": "hinglish", "group": "brand_sale:hinglish:1"})

    # 10. Awareness Warnings (Police / Cyber Cell / Bank tips)
    # en
    for i in range(10):
        rows.append({"text": "Cyber safety tip from Police: never share OTP, PIN or card details. Police will never ask for money on a call. Report fraud: 1930", "label": 0, "lang": "english", "group": "awareness:en:1"})
    for i in range(10):
        b = RNG.choice(BANKS)
        rows.append({"text": f"Security alert from {b}: Never share your confidential banking credentials with anyone. Report suspicious calls on 1930.", "label": 0, "lang": "english", "group": "awareness:en:2"})
    # hi
    for i in range(10):
        rows.append({"text": "साइबर सुरक्षा सलाह: कभी भी अपना ओटीपी, पासवर्ड या पिन किसी को न बताएं। पुलिस कभी कॉल पर पैसे ट्रांसफर करने को नहीं कहती। हेल्पलाइन: 1930", "label": 0, "lang": "hindi", "group": "awareness:hi:1"})
    # hinglish
    for i in range(10):
        b = RNG.choice(BANKS)
        rows.append({"text": f"{b} security tip: Apna OTP, PIN ya password kisi ke saath share na karein. Bank aisi jaankari kabhi nahi maangta.", "label": 0, "lang": "hinglish", "group": "awareness:hinglish:1"})

    # 11. Genuine Refund Initiated
    # en
    for i in range(10):
        a = RNG.choice(AMOUNTS); d = RNG.choice(DIGITS4)
        rows.append({"text": f"Your refund of Rs {a} for order #{d} has been initiated to original payment method. Expected in 5 to 7 business days.", "label": 0, "lang": "english", "group": "refund_genuine:en:1"})
    # hi
    for i in range(10):
        a = RNG.choice(AMOUNTS); d = RNG.choice(DIGITS4)
        rows.append({"text": f"ऑर्डर #{d} के लिए {a} रुपये का रिफंड शुरू कर दिया गया है। 5-7 कार्य दिवसों में आपके खाते में आ जाएगा।", "label": 0, "lang": "hindi", "group": "refund_genuine:hi:1"})
    # hinglish
    for i in range(10):
        a = RNG.choice(AMOUNTS); d = RNG.choice(DIGITS4)
        rows.append({"text": f"Order #{d} ka refund Rs {a} initiate ho gaya hai. 5-7 dino me aapke account mein credit ho jayega.", "label": 0, "lang": "hinglish", "group": "refund_genuine:hinglish:1"})

    # 12. Utility Bills (Official App)
    # en
    for i in range(10):
        a = RNG.choice(AMOUNTS); d = RNG.choice(DIGITS4); dt = RNG.choice(DATES)
        rows.append({"text": f"Electricity bill for Consumer ID {d} of Rs {a} is due on {dt}. Pay securely on the official electricity board app.", "label": 0, "lang": "english", "group": "utility_bill:en:1"})
    # hi
    for i in range(10):
        a = RNG.choice(AMOUNTS); d = RNG.choice(DIGITS4); dt = RNG.choice(DATES)
        rows.append({"text": f"उपभोक्ता संख्या {d} का बिजली बिल {a} रुपये {dt} तक देय है। आधिकारिक पोर्टल या ऐप पर भुगतान करें।", "label": 0, "lang": "hindi", "group": "utility_bill:hi:1"})
    # hinglish
    for i in range(10):
        a = RNG.choice(AMOUNTS); d = RNG.choice(DIGITS4); dt = RNG.choice(DATES)
        rows.append({"text": f"Consumer ID {d} ka electricity bill Rs {a} {dt} tak bharein. Official app par payment karein.", "label": 0, "lang": "hinglish", "group": "utility_bill:hinglish:1"})

    # 13. UPI Payment Confirmation
    # en
    for i in range(10):
        a = RNG.choice(AMOUNTS); m = RNG.choice(MERCHANTS); ref = f"40{RNG.randint(1000000000, 9999999999)}"
        rows.append({"text": f"Paid Rs {a} to {m} via UPI. Ref No {ref}. Available balance: Rs 15,200.", "label": 0, "lang": "english", "group": "upi_confirm:en:1"})
    # hi
    for i in range(10):
        a = RNG.choice(AMOUNTS); ref = f"40{RNG.randint(1000000000, 9999999999)}"
        rows.append({"text": f"यूपीआई द्वारा {a} रुपये का भुगतान सफल रहा। संदर्भ संख्या {ref}। शेष राशि: 18,400 रुपये।", "label": 0, "lang": "hindi", "group": "upi_confirm:hi:1"})
    # hinglish
    for i in range(10):
        a = RNG.choice(AMOUNTS); m = RNG.choice(MERCHANTS); ref = f"40{RNG.randint(1000000000, 9999999999)}"
        rows.append({"text": f"Aapke khate se Rs {a} UPI dwara {m} ko transfer ho gaye hain. Ref No {ref}. Balance Rs 22,100.", "label": 0, "lang": "hinglish", "group": "upi_confirm:hinglish:1"})

    # 14. Appointment Reminders
    # en
    for i in range(8):
        dt = RNG.choice(DATES)
        rows.append({"text": f"Reminder: Your doctor appointment is confirmed for {dt} at 10:30 AM at City Clinic. Thank you.", "label": 0, "lang": "english", "group": "appointment:en:1"})
    # hi
    for i in range(8):
        dt = RNG.choice(DATES)
        rows.append({"text": f"अनुस्मारक: आपकी डॉक्टर अपॉइंटमेंट {dt} को सुबह 11 बजे तय है। धन्यवाद।", "label": 0, "lang": "hindi", "group": "appointment:hi:1"})
    # hinglish
    for i in range(8):
        dt = RNG.choice(DATES)
        rows.append({"text": f"Reminder: Aapka appointment {dt} ko 10:00 AM par schedule hai. Dhanyavad.", "label": 0, "lang": "hinglish", "group": "appointment:hinglish:1"})

    # 15. EMI Reminders
    # en
    for i in range(8):
        a = RNG.choice(AMOUNTS); d = RNG.choice(DIGITS4); dt = RNG.choice(DATES)
        rows.append({"text": f"Dear customer, EMI of Rs {a} for your loan A/c XX{d} is due on {dt}. Maintain balance to avoid charges. -HDFC Bank", "label": 0, "lang": "english", "group": "emi_reminder:en:1"})
    # hi
    for i in range(8):
        a = RNG.choice(AMOUNTS); d = RNG.choice(DIGITS4); dt = RNG.choice(DATES)
        rows.append({"text": f"ऋण खाता XX{d} की ईएमआई {a} रुपये {dt} को देय है। कृपया खाते में पर्याप्त बैलेंस रखें। -एसबीआई", "label": 0, "lang": "hindi", "group": "emi_reminder:hi:1"})
    # hinglish
    for i in range(8):
        a = RNG.choice(AMOUNTS); d = RNG.choice(DIGITS4); dt = RNG.choice(DATES)
        rows.append({"text": f"Aapke loan account XX{d} ki EMI Rs {a} {dt} ko due hai. Khate me paryapt balance rakhein. -Kotak Bank", "label": 0, "lang": "hinglish", "group": "emi_reminder:hinglish:1"})

    return rows


def make_scam() -> list[dict[str, str | int]]:
    rows: list[dict[str, str | int]] = []

    # 1. Wrong-Payment / Collect-Request Trick
    # en
    for i in range(8):
        a = RNG.choice(AMOUNTS)
        rows.append({"text": f"Sorry, I sent Rs {a} to your number by mistake. Please return it. I am sending you a collect request now.", "label": 1, "lang": "english", "group": "refund_trick:en:1"})
    for i in range(8):
        a = RNG.choice(AMOUNTS)
        rows.append({"text": f"Mistakenly transferred Rs {a} to your GPay account. Kindly send back the money or accept collect request.", "label": 1, "lang": "english", "group": "refund_trick:en:2"})
    # hi
    for i in range(8):
        a = RNG.choice(AMOUNTS)
        rows.append({"text": f"आपके खाते में गलती से {a} रुपये आ गए हैं। कृपया वापस भेज दें, मैं कलेक्ट रिक्वेस्ट भेज रहा हूँ।", "label": 1, "lang": "hindi", "group": "refund_trick:hi:1"})
    for i in range(8):
        a = RNG.choice(AMOUNTS)
        rows.append({"text": f"भाई धोखे से आपके फोनपे पर {a} रुपये चले गए हैं। पैसे वापस लौटा दो, कलेक्ट रिक्वेस्ट एक्सेप्ट करो।", "label": 1, "lang": "hindi", "group": "refund_trick:hi:2"})
    # hinglish
    for i in range(8):
        a = RNG.choice(AMOUNTS)
        rows.append({"text": f"Bhai galti se aapke number par Rs {a} bhej diye. Kripya wapas bhej do, main collect request bhej raha hoon.", "label": 1, "lang": "hinglish", "group": "refund_trick:hinglish:1"})
    for i in range(8):
        a = RNG.choice(AMOUNTS)
        rows.append({"text": f"Sorry mistakenly transferred Rs {a} to your account. Return the money please, collect request accept karein.", "label": 1, "lang": "hinglish", "group": "refund_trick:hinglish:2"})

    # 2. "New Number" Family Emergency Scam
    # en
    for i in range(8):
        a = RNG.choice(["8,000", "12,000", "15,000"])
        rows.append({"text": f"Hi dad, this is my new number. My old phone broke. Please urgently send Rs {a} to this account, will call you later.", "label": 1, "lang": "english", "group": "new_number:en:1"})
    # hi
    for i in range(8):
        a = RNG.choice(["8,000", "12,000", "15,000"])
        rows.append({"text": f"हेलो पापा, यह मेरा नया नंबर है। फोन टूट गया। जल्दी से {a} रुपये इस खाते में भेज दो, बाद में बताऊँगा।", "label": 1, "lang": "hindi", "group": "new_number:hi:1"})
    # hinglish
    for i in range(8):
        a = RNG.choice(["8,000", "12,000", "15,000"])
        rows.append({"text": f"Hello mummy, yeh mera naya number hai. Emergency hai, turant Rs {a} is account me transfer kar do, call baad me karunga.", "label": 1, "lang": "hinglish", "group": "new_number:hinglish:1"})

    # 3. Part-Time Job / Telegram Scam
    # en
    for i in range(8):
        a1 = RNG.choice(["2,000", "3,000", "4,000"])
        a2 = RNG.choice(["5,000", "6,000", "8,000"])
        plat = RNG.choice(["YouTube videos", "hotel reviews", "Google maps places", "movie ratings"])
        dom = RNG.choice(["job-earn-fast.xyz", "daily-income-task.top", "home-parttime.club", "online-cash-work.site"])
        rows.append({"text": f"Earn Rs {a1} to {a2} daily from home by liking {plat}. No investment needed. Contact on Telegram: http://{dom}/apply", "label": 1, "lang": "english", "group": "job_scam:en:1"})
    # hi
    for i in range(8):
        a1 = RNG.choice(["2,000", "3,000", "4,000"])
        a2 = RNG.choice(["5,000", "6,000", "8,000"])
        task = RNG.choice(["यूट्यूब वीडियो लाइक", "होटल रिव्यू देने", "गूगल मैप रेटिंग"])
        dom = RNG.choice(["daily-parttime-job.club", "ghar-baithe-kamai.xyz", "online-parttime-task.top"])
        rows.append({"text": f"घर बैठे रोजाना {a1} से {a2} रुपये कमाएं। केवल {task} का काम। टेलीग्राम पर संपर्क करें: http://{dom}/join", "label": 1, "lang": "hindi", "group": "job_scam:hi:1"})
    # hinglish
    for i in range(8):
        a = RNG.choice(["2,500", "3,000", "4,500", "5,000"])
        task = RNG.choice(["YouTube like tasks", "Google review tasks", "hotel rating tasks"])
        dom = RNG.choice(["online-task-earning.top", "daily-cash-job.xyz", "parttime-home-work.club"])
        rows.append({"text": f"Ghar baithe part time work karke daily Rs {a} kamayein. Simple {task}. Join Telegram: http://{dom}/apply", "label": 1, "lang": "hinglish", "group": "job_scam:hinglish:1"})

    # 4. Electricity Disconnection Threat
    # en
    for i in range(8):
        ph = RNG.choice(PHONE_SYNTH)
        tm = RNG.choice(["8:00 PM", "9:30 PM", "10:00 PM", "tonight"])
        rows.append({"text": f"Dear customer, your electric power service will be disconnected {tm} due to unpaid bill. Immediately contact officer at {ph}.", "label": 1, "lang": "english", "group": "electricity_scam:en:1"})
    # hi
    for i in range(8):
        ph = RNG.choice(PHONE_SYNTH)
        tm = RNG.choice(["आज रात 9 बजे", "आज शाम", "आज रात 9:30 बजे"])
        rows.append({"text": f"प्रिय उपभोक्ता, आपका बिजली कनेक्शन {tm} काट दिया जाएगा क्योंकि पुराना बिल बाकी है। तुरंत अधिकारी से बात करें: {ph}", "label": 1, "lang": "hindi", "group": "electricity_scam:hi:1"})
    # hinglish
    for i in range(8):
        ph = RNG.choice(PHONE_SYNTH)
        tm = RNG.choice(["aaj raat 9:30 PM", "aaj raat 8:00 PM", "aaj sham"])
        rows.append({"text": f"Aapka bijli connection {tm} par disconnect kar diya jayega. Call electricity officer now: {ph}", "label": 1, "lang": "hinglish", "group": "electricity_scam:hinglish:1"})

    # 5. Loan App Processing Fee / Threats
    # en
    for i in range(8):
        a1 = RNG.choice(["2,00,000", "5,00,000", "10,00,000"])
        fee = RNG.choice(["1,500", "2,500", "3,000"])
        dom = RNG.choice(["instant-loan-disburse.top", "quick-personal-loan.xyz", "fast-cash-india.club"])
        rows.append({"text": f"Your pre-approved personal loan of Rs {a1} is ready. Deposit Rs {fee} file processing fee now to disburse: http://{dom}/pay", "label": 1, "lang": "english", "group": "loan_scam:en:1"})
    # hi
    for i in range(8):
        a1 = RNG.choice(["2 लाख", "3 लाख", "5 लाख"])
        fee = RNG.choice(["1,200", "1,500", "2,200"])
        dom = RNG.choice(["quick-loan-india.xyz", "instant-loan-sewa.top", "aasan-loan-suvidha.club"])
        rows.append({"text": f"आपका {a1} का लोन पास हो गया है। राशि तुरंत खाते में पाने के लिए {fee} रुपये फाइल चार्ज जमा करें: http://{dom}/fee", "label": 1, "lang": "hindi", "group": "loan_scam:hi:1"})
    # hinglish
    for i in range(8):
        a1 = RNG.choice(["2,00,000", "3,50,000", "5,00,000"])
        fee = RNG.choice(["1,000", "1,500", "2,000"])
        dom = RNG.choice(["easy-loan-approval.club", "fast-instant-loan.top", "quick-cash-disbursal.site"])
        rows.append({"text": f"Aapka instant personal loan Rs {a1} approve ho gaya hai. Disbursal ke liye processing fee Rs {fee} pay karein: http://{dom}/pay", "label": 1, "lang": "hinglish", "group": "loan_scam:hinglish:1"})

    # 6. Reward / Cashback Link Asking for PIN
    # en
    for i in range(8):
        a = RNG.choice(AMOUNTS)
        rows.append({"text": f"Congratulations! You received a scratch card reward of Rs {a}. Click link and enter your UPI PIN to transfer to bank: http://reward-upi-cash.site/claim", "label": 1, "lang": "english", "group": "reward_scam:en:1"})
    # hi
    for i in range(8):
        a = RNG.choice(AMOUNTS)
        rows.append({"text": f"आपको {a} रुपये का कैशबैक रिवॉर्ड मिला है। क्लेम करने के लिए अपना यूपीआई पिन डालें: http://upi-reward-paisa.link/reward", "label": 1, "lang": "hindi", "group": "reward_scam:hi:1"})
    # hinglish
    for i in range(8):
        a = RNG.choice(AMOUNTS)
        rows.append({"text": f"Aapko PhonePe par Rs {a} ka cashback mila hai. Paise lene ke liye link kholein aur UPI PIN enter karein: http://upi-refund-cash.top/pay", "label": 1, "lang": "hinglish", "group": "reward_scam:hinglish:1"})

    # 7. Courier / Customs Contraband Threat
    # en
    for i in range(8):
        c = RNG.choice(["FedEx", "DHL", "Customs department", "Speed Post"])
        a = RNG.choice(["3,500", "5,000", "8,200", "12,500"])
        dom = RNG.choice(["customs-parcel-clear.xyz", "courier-customs-fee.link", "customs-duty-clear.top"])
        rows.append({"text": f"Your {c} package has been seized by Customs containing contraband and prohibited items. Pay clearance fine of Rs {a} now: http://{dom}/fine", "label": 1, "lang": "english", "group": "courier_scam:en:1"})
    # hi
    for i in range(8):
        c = RNG.choice(["कस्टम विभाग", "डीएचएल कूरियर", "फेडेक्स कूरियर"])
        a = RNG.choice(["3,500", "5,000", "8,200"])
        dom = RNG.choice(["customs-duty-pay.top", "customs-clearance-india.xyz", "parcel-customs-seized.club"])
        rows.append({"text": f"आपके नाम से {c} द्वारा आया पार्सल सीज कर लिया गया है जिसमें अवैध सामान मिला है। {a} रुपये जुर्माना भरें: http://{dom}/fine", "label": 1, "lang": "hindi", "group": "courier_scam:hi:1"})
    # hinglish
    for i in range(8):
        c = RNG.choice(["FedEx", "DHL", "Customs"])
        a = RNG.choice(["3,500", "5,000", "8,200"])
        dom = RNG.choice(["customs-charge.link", "courier-duty-pay.top", "parcel-hold-fine.xyz"])
        rows.append({"text": f"Aapka {c} parcel hold par hai jisme prohibited contraband mila hai. Police case se bachne ke liye Rs {a} fine pay karein: http://{dom}/pay", "label": 1, "lang": "hinglish", "group": "courier_scam:hinglish:1"})

    # 8. Fake KYC Link (contrast with genuine branch visit)
    # en
    for i in range(8):
        b = RNG.choice(BANKS)
        dom = RNG.choice(["bank-kyc-verify.top", "secure-kyc-update.xyz", "online-kyc-portal.site"])
        rows.append({"text": f"Dear customer your {b} account will be blocked today. Immediately click here to complete your online KYC: http://{dom}/login", "label": 1, "lang": "english", "group": "fake_kyc_link:en:1"})
    # hi
    for i in range(8):
        b = RNG.choice(["एसबीआई", "एचडीएफसी बैंक", "आईसीआईसीआई बैंक"])
        dom = RNG.choice(["bank-kyc-update.xyz", "sbi-kyc-seva.top", "aadhar-kyc-link.club"])
        rows.append({"text": f"प्रिय ग्राहक आपका {b} खाता आज बंद हो जाएगा। खाता चालू रखने के लिए तुरंत केवाईसी अपडेट करें: http://{dom}/pan", "label": 1, "lang": "hindi", "group": "fake_kyc_link:hi:1"})
    # hinglish
    for i in range(8):
        b = RNG.choice(BANKS)
        dom = RNG.choice(["sbi-kyc-update.top", "bank-kyc-pan.xyz", "account-kyc-verify.club"])
        rows.append({"text": f"Dear customer aapka {b} account aaj block ho jayega. Turant apna KYC update karein: http://{dom}/verify", "label": 1, "lang": "hinglish", "group": "fake_kyc_link:hinglish:1"})

    # 9. Fake Card Blocked with Phishing Link / Callback
    # en
    for i in range(8):
        d = RNG.choice(DIGITS4); ph = RNG.choice(PHONE_SYNTH)
        rows.append({"text": f"Your debit card ending {d} is blocked due to suspicious activity. Call customer executive at {ph} immediately to unblock.", "label": 1, "lang": "english", "group": "fake_card_scam:en:1"})
    # hi
    for i in range(8):
        d = RNG.choice(DIGITS4)
        dom = RNG.choice(["card-unblock-verify.club", "atm-card-help.top", "secure-card-update.xyz"])
        rows.append({"text": f"आपका एटीएम कार्ड XX{d} ब्लॉक कर दिया गया है। चालू करने के लिए लिंक पर अपना पिन डालें: http://{dom}/login", "label": 1, "lang": "hindi", "group": "fake_card_scam:hi:1"})
    # hinglish
    for i in range(8):
        d = RNG.choice(DIGITS4); ph = RNG.choice(PHONE_SYNTH)
        rows.append({"text": f"Aapka ATM card XX{d} block ho gaya hai. Dobara chalu karne ke liye abhi call karein {ph} aur card number batayein.", "label": 1, "lang": "hinglish", "group": "fake_card_scam:hinglish:1"})

    # 10. Lottery / Prize Scam with Fee
    # en
    for i in range(8):
        prize = RNG.choice(["Rs 25,00,000", "Rs 15,00,000", "Rs 50,00,000"])
        lot = RNG.choice(["KBC Lucky Draw", "Jio Mega Lottery", "All India Prize Contest"])
        fee = RNG.choice(["2,500", "3,000", "4,500"])
        ph = RNG.choice(PHONE_SYNTH)
        rows.append({"text": f"Congratulations! You have won {prize} in the {lot}. Pay Rs {fee} processing fee to claim prize. Call {ph}", "label": 1, "lang": "english", "group": "lottery_scam:en:1"})
    # hi
    for i in range(8):
        prize = RNG.choice(["25 लाख", "15 लाख", "50 लाख"])
        fee = RNG.choice(["2,500", "3,000", "4,500"])
        ph = RNG.choice(PHONE_SYNTH)
        rows.append({"text": f"बधाई हो! आपने केबीसी लॉटरी में {prize} रुपये जीते हैं। इनाम पाने के लिए {fee} रुपये शुल्क जमा करें। संपर्क करें: {ph}", "label": 1, "lang": "hindi", "group": "lottery_scam:hi:1"})
    # hinglish
    for i in range(8):
        prize = RNG.choice(["Rs 25 Lakh", "Rs 15 Lakh", "Rs 50 Lakh"])
        fee = RNG.choice(["Rs 2,500", "Rs 3,000", "Rs 4,500"])
        ph = RNG.choice(PHONE_SYNTH)
        rows.append({"text": f"Congratulations! Aapne KBC lottery mein {prize} jeeta hai. Prize pane ke liye processing fee {fee} pay karein. Call {ph}", "label": 1, "lang": "hinglish", "group": "lottery_scam:hinglish:1"})

    # 11. Contrast versions of Scheme / Aadhaar / Telecom / OTP
    # en
    for i in range(8):
        amt = RNG.choice(["6,000", "8,000", "10,000"])
        fee = RNG.choice(["399", "499", "699"])
        dom = RNG.choice(["pmkisan-bonus-claim.top", "scheme-bonus-portal.xyz", "gov-bonus-claim.club"])
        rows.append({"text": f"PM-Kisan bonus of Rs {amt} approved for your account. Pay Rs {fee} verification fee to claim bonus: http://{dom}/pay", "label": 1, "lang": "english", "group": "scam_contrast:en:1"})
    for i in range(8):
        dom = RNG.choice(["myaadhaar-update-pan.xyz", "uidai-pan-verify.top", "aadhaar-card-auth.site"])
        rows.append({"text": f"Your Aadhaar is suspended due to fraud. To avoid arrest warrant click here to verify identity: http://{dom}/auth", "label": 1, "lang": "english", "group": "scam_contrast:en:2"})
    # hi
    for i in range(8):
        ph = RNG.choice(PHONE_SYNTH)
        rows.append({"text": f"आपका सिम कार्ड 2 घंटे में बंद हो जाएगा। आधार लिंक करने के लिए तुरंत {ph} पर कॉल करें और ओटीपी बताएं।", "label": 1, "lang": "hindi", "group": "scam_contrast:hi:1"})
    # hinglish
    for i in range(8):
        amt = RNG.choice(["15,000", "22,000", "35,000"])
        rows.append({"text": f"Rs {amt} transaction initiated on your card. Share OTP with bank executive to cancel transaction immediately.", "label": 1, "lang": "hinglish", "group": "scam_contrast:hinglish:1"})

    return rows


def expand(group: str, lang: str, label: int, templates: list[str], slots: dict[str, list[str]], per_template: int = 6, tag: str = "v2",
           rng: random.Random | None = None) -> list[dict[str, str | int]]:
    """One group id per template (`group:v2a`, `group:v2b`, ...; `tag` names the batch) so that every new sentence structure can land in a
    different split. Up to `per_template` slot combinations per template, chosen with the batch's own random stream."""
    rows: list[dict[str, str | int]] = []
    rng = rng or RNG2
    for k, tpl in enumerate(templates):
        names = [s for s in slots if "{" + s + "}" in tpl]
        combos = list(itertools.product(*[slots[s] for s in names]))
        rng.shuffle(combos)
        for combo in combos[:per_template]:
            rows.append({"text": tpl.format(**dict(zip(names, combo))), "label": label, "lang": lang, "group": f"{group}:{tag}{chr(97 + k)}"})
    return rows


def make_v2_genuine() -> list[dict[str, str | int]]:
    """New wording for the genuine families that the frozen-text filter emptied (and a few more OTP structures)."""
    R: list[dict[str, str | int]] = []
    # Aadhaar update status (Hindi / Hinglish): request logged, update complete, work in progress
    R += expand("aadhaar_status:hi", "hindi", 0, [
        "यूआईडीएआई: आपके {f} में बदलाव का अनुरोध दर्ज हो गया है। इसे पूरा होने में {d} दिन तक लग सकते हैं। स्थिति देखें: {site}",
        "आपका आधार {f} अपडेट पूरा हो चुका है। नया ई-आधार {site} से डाउनलोड किया जा सकता है। यह एक स्वचालित संदेश है।",
        "आधार सेवा: {f} सुधार के आपके आवेदन पर कार्रवाई जारी है। कृपया {d} कार्य दिवस प्रतीक्षा करें। किसी से ओटीपी या पिन साझा न करें।",
    ], {"f": ["पते", "मोबाइल नंबर", "ईमेल", "नाम", "जन्मतिथि"], "d": ["3", "5", "7", "10", "14"], "site": ["uidai.gov.in", "myaadhaar.uidai.gov.in"]})
    R += expand("aadhaar_status:hinglish", "hinglish", 0, [
        "UIDAI update: aapke {f} badalne ki request mil gayi hai. Process hone mein {d} din lag sakte hain. Status {site} par dekh sakte hain.",
        "Aapka Aadhaar {f} update complete ho chuka hai. Naya e-Aadhaar {site} se download karein. Yeh ek automatic message hai.",
        "Aadhaar seva: {f} sudhaar ki application par kaam chal raha hai. Kripya {d} working din intezaar karein. Apna OTP kisi se share na karein.",
    ], {"f": ["address", "mobile number", "email", "naam", "date of birth"], "d": ["3", "5", "7", "10", "14"], "site": ["uidai.gov.in", "myaadhaar.uidai.gov.in"]})

    # Police / bank awareness tips (English)
    R += expand("awareness:en", "english", 0, [
        "Fraud alert from {org}: scammers pose as officials on calls. Genuine officials never ask for OTP, PIN or money transfers over the phone. Dial 1930 to report.",
        "{org} advisory: do not click unknown links or install apps sent by strangers. If you get a suspicious call, hang up and report it at cybercrime.gov.in",
        "Reminder from {org}: your bank will never call to ask for your card number, CVV or OTP. If someone does, end the call and tell your branch.",
        "Awareness: a call saying you will be arrested unless you pay at once is a scam. {org} does not demand money on a call. Report it on 1930.",
    ], {"org": ["Delhi Police", "Cyber Cell", "Mumbai Police", "State Police", "RBI"]})

    # Brand sale / promotion with the brand's own link (English)
    brands = [("Myntra", "https://www.myntra.com"), ("Flipkart", "https://www.flipkart.com"), ("Amazon", "https://www.amazon.in"),
              ("Swiggy", "https://www.swiggy.com"), ("Zomato", "https://www.zomato.com"), ("JioMart", "https://www.jiomart.com")]
    sale_rows = []
    for k, tpl in enumerate([
        "{b} {sale} sale starts {day}! Enjoy up to {pct}% off on {cat}. Browse the offers in the {b} app or at {u}",
        "New arrivals at {b}: {cat} from top labels, free delivery on orders above Rs 499. T&C apply. Visit {u}",
        "Your {b} coupon expires on {day}. Use it on your next order in the app. Terms apply. Reply STOP to unsubscribe.",
    ]):
        combos = list(itertools.product(brands, ["Big Savings", "Festive", "Weekend", "Mid-Season"], ["28 Nov", "01 Dec", "05 Dec", "12 Dec"], ["30", "40", "50", "70"],
                                        ["fashion", "kitchen essentials", "mobiles", "groceries"]))
        RNG2.shuffle(combos)
        for (b, u), sale, day, pct, cat in combos[:6]:
            sale_rows.append({"text": tpl.format(b=b, u=u, sale=sale, day=day, pct=pct, cat=cat), "label": 0, "lang": "english", "group": f"brand_sale:en:v2{chr(97 + k)}"})
    R += sale_rows

    # Card blocked at the customer's own request (Hindi / Hinglish)
    d4 = ["1234", "4821", "9012", "5541", "3312", "7789"]
    R += expand("card_block_user:hi", "hindi", 0, [
        "{bank}: आपके अनुरोध के अनुसार कार्ड XX{d} की ऑनलाइन खरीद सुविधा बंद कर दी गई है। फिर से चालू करने के लिए {bank} मोबाइल ऐप में जाएं।",
        "आपने कार्ड XX{d} को अस्थायी रूप से रोकने का अनुरोध किया था, जो पूरा हो गया है। यह केवल आपकी जानकारी के लिए है। -{bank}",
        "{bank} ग्राहक सेवा: आपके कहने पर कार्ड XX{d} ब्लॉक किया गया है। नया कार्ड 7 कार्य दिवस में आपके पते पर भेजा जाएगा।",
    ], {"bank": ["एसबीआई", "एचडीएफसी बैंक", "आईसीआईसीआई बैंक", "एक्सिस बैंक", "कोटक बैंक"], "d": d4})
    R += expand("card_block_user:hinglish", "hinglish", 0, [
        "{bank}: Aapki request par card XX{d} ki online kharidari band kar di gayi hai. Dobara chalu karne ke liye {bank} mobile app kholein.",
        "Aapne card XX{d} ko kuch samay ke liye rokne ko kaha tha, woh ho gaya hai. Yeh sirf aapki jaankari ke liye hai. -{bank}",
        "{bank} customer care: Aapke kehne par card XX{d} block kiya gaya hai. Naya card 7 working din mein aapke address par bheja jayega.",
    ], {"bank": ["SBI", "HDFC Bank", "ICICI Bank", "Axis Bank", "Kotak Bank"], "d": d4})

    # Government scheme credit / eligibility notices (Hindi / Hinglish)
    R += expand("gov_scheme:hi", "hindi", 0, [
        "{s} के तहत {a} रुपये की सहायता राशि आपके बैंक खाते में जमा कर दी गई है। विवरण के लिए नजदीकी सीएससी केंद्र या {site} देखें।",
        "{s}: आपकी किस्त जारी हो चुकी है और 2 से 3 दिन में खाते में दिखेगी। राशि निकालने के लिए बैंक या ग्राम पंचायत केंद्र पर जाएं।",
        "सूचना: {s} की पात्रता सूची में आपका नाम शामिल है। अधिक जानकारी के लिए ग्राम पंचायत कार्यालय से संपर्क करें। कोई शुल्क नहीं देना है।",
    ], {"s": ["पीएम किसान योजना", "रसोई गैस सब्सिडी", "मनरेगा मजदूरी", "छात्रवृत्ति योजना"], "a": ["2,000", "4,000", "6,500", "1,200"],
        "site": ["pmkisan.gov.in", "nrega.nic.in", "scholarships.gov.in"]})
    R += expand("gov_scheme:hinglish", "hinglish", 0, [
        "{s} ke tahat Rs {a} ki sahayata rashi aapke bank account mein jama kar di gayi hai. Detail ke liye CSC kendra ya {site} dekhein.",
        "{s}: aapki kist jaari ho chuki hai aur 2-3 din mein account mein dikhegi. Paisa nikalne ke liye bank ya gram panchayat kendra jayein.",
        "Suchna: {s} ki patrata list mein aapka naam hai. Adhik jaankari ke liye gram panchayat office se sampark karein. Koi fees nahi deni hai.",
    ], {"s": ["PM Kisan yojana", "gas subsidy", "MNREGA mazdoori", "scholarship yojana"], "a": ["2,000", "4,000", "6,500", "1,200"],
        "site": ["pmkisan.gov.in", "nrega.nic.in", "scholarships.gov.in"]})

    # A few more OTP / verification structures (English): the group the older model flagged most often
    brands_otp = ["Google", "Microsoft", "WhatsApp", "Instagram", "Uber", "Amazon", "Zomato", "Swiggy", "Paytm", "PhonePe", "Flipkart"]
    R += expand("otp_delivery:en", "english", 0, [
        "Use {c} to log in to your {b} account. It expires in 10 minutes.",
        "{b} security code: {c}. Do not give this code to anyone, including {b} staff.",
        "Your one-time password for {b} is {c}. If you did not request it, ignore this message.",
    ], {"b": brands_otp, "c": [str(RNG2.randint(100000, 999999)) for _ in range(3)]}, per_template=8)
    return R


def make_v2_scam() -> list[dict[str, str | int]]:
    """New wording for the scam families that the frozen-text filter emptied."""
    R: list[dict[str, str | int]] = []
    amt = ["8,000", "12,000", "15,000", "25,000"]
    R += expand("new_number:hi", "hindi", 1, [
        "भैया, मेरा पुराना सिम बंद हो गया है इसलिए यह नया नंबर सेव कर लो। अभी एक बिल भरना है और खाते में दिक्कत है, {a} रुपये इस नंबर पर फोनपे कर दो, शाम को लौटा दूंगा।",
        "माँ, मैं नए फोन से बात कर रहा हूँ। पुराना नंबर काम नहीं कर रहा। मेरी फीस जमा करनी है, कृपया {a} रुपये इस यूपीआई आईडी पर तुरंत भेजो। किसी को बताना मत।",
        "नमस्ते अंकल, मैं {n} बोल रहा हूँ, यह मेरा नया नंबर है। अस्पताल में एडवांस देना है, तुरंत {a} रुपये भेज दीजिए। फोन बंद है इसलिए कॉल मत करना।",
    ], {"a": amt, "n": ["रोहित", "अमित", "सुनील", "विकास", "मोहित"]})
    R += expand("refund_trick:en", "english", 1, [
        "{g}, I accidentally paid Rs {a} to your number instead of my friend's. Can you please send it back to the same number? I will confirm once received.",
        "Sir, an amount of Rs {a} reached your {app} account in error from my side. Kindly refund to this number today, I am in a hurry. Thanks.",
        "Sorry to trouble you. My cousin typed the wrong number and Rs {a} came to you on {app}. Please return it through {app} on this number, I will message you the details.",
    ], {"g": ["Hi", "Hello sir", "Hello madam", "Dear friend"], "a": ["3,000", "5,000", "9,500", "14,000"], "app": ["PhonePe", "GPay", "Paytm", "BHIM"]})
    R += expand("refund_trick:hi", "hindi", 1, [
        "नमस्ते, मैंने गलती से आपके {app} पर {a} रुपये भेज दिए हैं। कृपया इसी नंबर पर वापस कर दें, बहुत जरूरी है।",
        "भाई साहब, मेरे दोस्त का नंबर समझकर आपके खाते में {a} रुपये डाल दिए। उसे लौटा दीजिए, मैं आपको स्क्रीनशॉट भेज रहा हूं।",
        "माफ कीजिए, गलत नंबर पर {a} रुपये चले गए हैं। यह पैसा {app} से वापस भेज दें, नहीं तो मेरी बड़ी परेशानी हो जाएगी।",
    ], {"a": ["3,000", "5,000", "9,500", "14,000"], "app": ["फोनपे", "गूगल पे", "पेटीएम", "भीम"]})
    return R


def make_h1_genuine() -> list[dict[str, str | int]]:
    """Hard-negative round 1 (genuine). Families that the retrained model still flagged on the VALIDATION split, or when a family's wording
    was held out (group-wise check on the training split): OTP delivery, promotions / coupons / shipping, credit-card statements, awareness
    tips, periodic-KYC branch notices, Aadhaar status, genuine refunds, card blocked on request. New sentence structures, one group each."""
    R: list[dict[str, str | int]] = []
    kw = {"tag": "h1", "rng": RNG3}
    codes = [str(RNG3.randint(100000, 999999)) for _ in range(4)]
    brands_otp = ["Google", "Microsoft", "WhatsApp", "Instagram", "Uber", "Amazon", "Zomato", "Swiggy", "Paytm", "PhonePe", "Flipkart", "Ola"]
    brands_hi = ["गूगल", "व्हाट्सएप", "इंस्टाग्राम", "अमेज़न", "पेटीएम", "फोनपे", "जोमैटो"]
    banks_en = ["HDFC Bank", "SBI", "ICICI Bank", "Axis Bank", "Kotak Bank", "PNB"]
    banks_hi = ["एसबीआई", "एचडीएफसी बैंक", "आईसीआईसीआई बैंक", "एक्सिस बैंक", "कोटक बैंक", "पीएनबी"]
    amounts = ["450", "1,250", "2,000", "3,500", "8,200"]
    shops = ["Amazon", "Flipkart", "Swiggy", "Zomato", "BigBasket"]
    days = ["28 Nov", "01 Dec", "05 Dec", "12 Dec", "20 Dec"]

    R += expand("otp_delivery:en", "english", 0, [
        "{c} is the one-time code for your {b} sign-in. It is valid for 5 minutes.",
        "Enter {c} to verify your phone number on {b}. Do not share this code.",
        "Your {b} login code is {c}. Never forward it to anyone.",
        "{b}: {c} is your OTP for the payment of Rs {a} to {m}. Do not share it with anyone.",
        "Here is the password reset code for your {b} account: {c}. Ignore this message if you did not ask for a reset.",
        "{c} - verification code for {b}. It will expire in 3 minutes.",
    ], {"b": brands_otp + banks_en, "c": codes, "a": amounts, "m": shops}, per_template=8, **kw)
    R += expand("otp_delivery:hinglish", "hinglish", 0, [
        "Aapka {b} login code {c} hai. Ise kisi ko na batayein.",
        "{b} par sign in karne ke liye {c} daalein. Yeh 10 minute mein expire ho jayega.",
        "{b}: Rs {a} ke payment ke liye aapka OTP {c} hai. Kisi se share na karein.",
    ], {"b": brands_otp, "c": codes, "a": amounts}, per_template=6, **kw)
    R += expand("otp_delivery:hi", "hindi", 0, [
        "{b} में साइन इन करने के लिए कोड {c} दर्ज करें। यह 10 मिनट में समाप्त हो जाएगा।",
        "आपका {b} पासवर्ड रीसेट कोड {c} है। यह अनुरोध आपने नहीं किया तो इसे अनदेखा करें।",
        "{b}: {a} रुपये के भुगतान के लिए आपका ओटीपी {c} है। इसे किसी को न बताएं।",
    ], {"b": brands_hi, "c": codes, "a": amounts}, per_template=6, **kw)

    R += expand("brand_sale:en", "english", 0, [
        "Flat {pct}% off on your next order with code {code}. Valid till {day}. Order in the {b} app.",
        "Your {b} order has been shipped and will reach you by {day}. Track it in the app under My Orders.",
        "Hurry! The {b} sale ends tonight. Open the app to see deals picked for you.",
        "Rate your recent {b} order and help other shoppers. Open the app and tap Review.",
    ], {"b": ["Myntra", "Flipkart", "Amazon", "Swiggy", "Zomato", "JioMart"], "pct": ["20", "30", "40", "60"], "code": ["SAVE20", "FESTIVE", "NEWUSER", "WEEKEND"], "day": days}, per_template=6, **kw)
    R += expand("brand_sale:hinglish", "hinglish", 0, [
        "{b} sale mein {pct}% tak ki chhoot! Offers dekhne ke liye app kholein.",
        "Aapka {b} coupon {day} ko expire ho raha hai. Agle order mein use karein. Terms apply.",
        "Aapka {b} order ship ho gaya hai aur {day} tak pahunch jayega. Track karne ke liye app kholein.",
    ], {"b": ["Myntra", "Flipkart", "Amazon", "Swiggy", "Zomato", "JioMart"], "pct": ["20", "30", "40", "60"], "day": days}, per_template=6, **kw)
    R += expand("brand_sale:hi", "hindi", 0, [
        "{b} पर सेल शुरू: {pct}% तक की छूट। ऑफर देखने के लिए ऐप खोलें।",
        "आपका {b} कूपन {day} को समाप्त हो रहा है। अगले ऑर्डर में इस्तेमाल करें।",
        "आपका {b} ऑर्डर भेज दिया गया है और {day} तक पहुंचेगा। ट्रैक करने के लिए ऐप खोलें।",
    ], {"b": ["अमेज़न", "फ्लिपकार्ट", "मिंत्रा", "स्विगी", "जोमैटो"], "pct": ["20", "30", "40", "60"], "day": days}, per_template=6, **kw)

    R += expand("card_statement:en", "english", 0, [
        "Your {bank} credit card statement for {month} is ready. Total due Rs {a}, due date {day}. View it in the {bank} app.",
        "{bank}: payment of Rs {a} received on your credit card. Thank you. Your available limit is now Rs 80,000.",
        "Reminder: your {bank} card bill of Rs {a} is due on {day}. Pay on time through the bank app or net banking to avoid late fees.",
    ], {"bank": banks_en, "month": ["October", "November"], "a": amounts, "day": days}, per_template=6, **kw)
    R += expand("card_statement:hinglish", "hinglish", 0, [
        "Aapke {bank} credit card ka {month} ka statement taiyaar hai. Kul baaki Rs {a}, antim tithi {day}. App mein dekhein.",
        "{bank}: aapke credit card par Rs {a} ka payment mil gaya. Dhanyavad.",
        "Yaad dilana: {bank} card ka bill Rs {a} {day} ko due hai. Late fees se bachne ke liye bank app se samay par bharein.",
    ], {"bank": banks_en, "month": ["October", "November"], "a": amounts, "day": days}, per_template=6, **kw)
    R += expand("card_statement:hi", "hindi", 0, [
        "{bank} क्रेडिट कार्ड का {month} का स्टेटमेंट तैयार है। कुल देय राशि {a} रुपये, अंतिम तिथि {day}। ऐप में देखें।",
        "{bank}: आपके क्रेडिट कार्ड पर {a} रुपये का भुगतान मिल गया है। धन्यवाद।",
        "अनुस्मारक: {bank} कार्ड का बिल {a} रुपये {day} को देय है। विलंब शुल्क से बचने के लिए बैंक ऐप से समय पर भरें।",
    ], {"bank": banks_hi, "month": ["अक्टूबर", "नवंबर"], "a": amounts, "day": days}, per_template=6, **kw)

    orgs = ["Delhi Police", "Cyber Cell", "Mumbai Police", "State Police", "RBI", "Your bank"]
    R += expand("awareness:en", "english", 0, [
        "{org}: Never share your PIN or password with anyone, not even bank staff. Genuine banks never ask for them. Call 1930 if you are targeted.",
        "Safety tip from {org}: before paying a stranger, check the request by calling the person on a number you already know.",
        "{org} reminder: courier or customs officials do not ask for payment over WhatsApp. Report such messages at cybercrime.gov.in",
        "Beware of callers claiming to be police or CBI. {org} will never ask you to stay on a video call or move money to another account.",
        "Public notice from {org}: loan apps that ask for photo and contact access and then threaten you are illegal. You can report them on 1930.",
    ], {"org": orgs}, per_template=5, **kw)
    R += expand("awareness:hinglish", "hinglish", 0, [
        "{org} salah: Koi bhi bank aapse OTP ya PIN nahi maangta. Shak ho to call kaat dein aur 1930 par report karein.",
        "{org} chetavni: Police kabhi phone par paise nahi maangti. Aise call aaye to 1930 par batayein.",
    ], {"org": ["Delhi Police", "Cyber Cell", "RBI", "Aapka bank"]}, per_template=4, **kw)
    R += expand("awareness:hi", "hindi", 0, [
        "{org} सलाह: कोई भी बैंक आपसे ओटीपी या पिन नहीं मांगता। संदिग्ध कॉल की सूचना 1930 पर दें।",
        "{org} चेतावनी: पुलिस कभी फोन पर पैसे नहीं मांगती। ऐसा कॉल आए तो 1930 पर बताएं।",
    ], {"org": ["दिल्ली पुलिस", "साइबर सेल", "आरबीआई", "आपका बैंक"]}, per_template=4, **kw)

    R += expand("kyc_branch:en", "english", 0, [
        "Periodic KYC refresh: please carry an ID proof to your {bank} home branch before {day}. We will not send any link for this.",
        "{bank} notice: your KYC documents are due for renewal. Visit the branch during working hours. No online form is needed.",
    ], {"bank": banks_en, "day": days}, per_template=6, **kw)
    R += expand("kyc_branch:hi", "hindi", 0, [
        "{bank}: आपकी केवाईसी अपडेट की अवधि पूरी होने वाली है। कृपया पहचान पत्र लेकर अपनी शाखा में आएं। कोई लिंक नहीं भेजा जाएगा।",
        "{bank} सूचना: आवधिक केवाईसी के लिए {day} तक शाखा में दस्तावेज जमा करें। ऑनलाइन फॉर्म की जरूरत नहीं है।",
    ], {"bank": banks_hi, "day": days}, per_template=6, **kw)
    R += expand("kyc_branch:hinglish", "hinglish", 0, [
        "{bank}: aapki KYC renew karni hai. Pehchaan patra lekar {day} se pehle apni branch aayein. Koi link nahi bheja jayega.",
    ], {"bank": banks_en, "day": days}, per_template=6, **kw)

    fields_en = ["address", "mobile number", "email", "name", "date of birth"]
    sites = ["uidai.gov.in", "myaadhaar.uidai.gov.in"]
    R += expand("aadhaar_status:en", "english", 0, [
        "UIDAI: your request to change {f} has been received and is being processed. You can check the status on {site}.",
        "Your updated e-Aadhaar is ready and can be downloaded from {site} using your enrolment number. This is an automated message.",
        "Aadhaar service request closed: your {f} correction is complete. Details are available on {site}.",
    ], {"f": fields_en, "site": sites}, per_template=6, **kw)
    R += expand("aadhaar_status:hinglish", "hinglish", 0, [
        "UIDAI: aapke {f} badalne ki request process ho rahi hai. Status {site} par dekhein.",
        "Aapka updated e-Aadhaar taiyaar hai. Enrolment number se {site} par download karein. Yeh automatic message hai.",
    ], {"f": fields_en, "site": sites}, per_template=6, **kw)
    R += expand("aadhaar_status:hi", "hindi", 0, [
        "यूआईडीएआई: आपके {f} बदलने का अनुरोध प्रक्रिया में है। स्थिति {site} पर देखें।",
        "आपका अपडेटेड ई-आधार तैयार है। नामांकन संख्या से {site} पर डाउनलोड करें। यह स्वचालित संदेश है।",
    ], {"f": ["पते", "मोबाइल नंबर", "ईमेल", "नाम", "जन्मतिथि"], "site": sites}, per_template=6, **kw)

    R += expand("refund_genuine:en", "english", 0, [
        "Refund of Rs {a} for your cancelled {b} order has been processed. It will show in your original payment method in 3 to 5 days.",
        "Your return request is approved. Pickup is scheduled for {day} and the refund will be issued once the item is received.",
    ], {"a": amounts, "b": shops, "day": days}, per_template=6, **kw)
    R += expand("refund_genuine:hinglish", "hinglish", 0, [
        "Aapke cancel kiye gaye {b} order ka Rs {a} ka refund process ho gaya hai. 3-5 din mein original payment method mein dikhega.",
        "Aapki return request approve ho gayi hai. Pickup {day} ko hoga, item milte hi refund issue hoga.",
    ], {"a": amounts, "b": shops, "day": days}, per_template=6, **kw)
    R += expand("refund_genuine:hi", "hindi", 0, [
        "आपके रद्द किए गए {b} ऑर्डर का {a} रुपये का रिफंड प्रोसेस हो गया है। 3 से 5 दिन में मूल भुगतान माध्यम में दिखेगा।",
        "आपकी रिटर्न रिक्वेस्ट मंजूर हो गई है। पिकअप {day} को होगा, सामान मिलते ही रिफंड जारी होगा।",
    ], {"a": amounts, "b": ["अमेज़न", "फ्लिपकार्ट", "मिंत्रा", "स्विगी"], "day": days}, per_template=6, **kw)

    R += expand("card_block_user:hi", "hindi", 0, [
        "{bank}: कार्ड XX{d} आपकी मांग पर बंद कर दिया गया है। नया कार्ड चाहिए तो शाखा में आवेदन दें।",
        "आपके अनुरोध पर {bank} ने कार्ड XX{d} पर विदेश में उपयोग की सुविधा बंद कर दी है।",
    ], {"bank": banks_hi, "d": ["1234", "4821", "9012", "5541", "3312", "7789"]}, per_template=6, **kw)
    return R


def make_h1_scam() -> list[dict[str, str | int]]:
    """Hard-negative round 1 (scam): families still missed on validation or when held out: wrong-payment / collect-request tricks, loan-app
    photo threats, a second 'new number' shape."""
    R: list[dict[str, str | int]] = []
    kw = {"tag": "h1", "rng": RNG3}
    amts = ["3,000", "5,000", "9,500", "14,000"]
    R += expand("refund_trick:en", "english", 1, [
        "Hello, please check your account. I transferred Rs {a} to you by mistake while paying someone else. Kindly return the same amount at once.",
        "I am really sorry, the money I sent you today was meant for my landlord. Please send back Rs {a} to this number, I will share my UPI details.",
        "Wrong transfer from my side: Rs {a} credited to you. Return it on {app} within the hour or I will have to file a complaint.",
        "Accept the collect request I just sent for Rs {a}, it will cancel my wrong transfer and refund your balance.",
    ], {"a": amts, "app": ["PhonePe", "GPay", "Paytm", "BHIM"]}, per_template=5, **kw)
    R += expand("refund_trick:hi", "hindi", 1, [
        "नमस्ते, मेरे खाते से गलती से आपके खाते में {a} रुपये चले गए हैं। कृपया वही रकम तुरंत लौटा दें।",
        "मैंने अभी आपको कलेक्ट रिक्वेस्ट भेजी है, उसे एक्सेप्ट करें ताकि गलती से भेजी गई {a} रुपये की रकम वापस हो जाए।",
    ], {"a": amts}, per_template=4, **kw)
    R += expand("refund_trick:hinglish", "hinglish", 1, [
        "Hello, galti se aapke account mein Rs {a} chale gaye hain. Please wahi amount turant wapas bhej dijiye.",
        "Maine abhi aapko collect request bheji hai, use accept kijiye taaki galti se gaye Rs {a} wapas ho jayein.",
    ], {"a": amts}, per_template=4, **kw)
    R += expand("loan_threat:en", "english", 1, [
        "Repay the loan today or your photos will be sent to all your contacts. Last warning.",
        "Your loan of Rs {a} is overdue. Pay now or we will call every number in your phone and tell them you are a fraud.",
    ], {"a": ["4,500", "7,000", "12,000", "20,000"]}, per_template=4, **kw)
    R += expand("loan_threat:hi", "hindi", 1, [
        "लोन आज ही चुकाओ वरना आपकी फोटो आपके सभी कॉन्टैक्ट्स को भेज दी जाएगी। आखिरी चेतावनी।",
        "आपका {a} रुपये का लोन बकाया है। अभी भुगतान करें वरना आपके फोन के हर नंबर पर आपको धोखेबाज बताया जाएगा।",
    ], {"a": ["4,500", "7,000", "12,000", "20,000"]}, per_template=4, **kw)
    R += expand("loan_threat:hinglish", "hinglish", 1, [
        "Loan aaj hi chukao warna aapki photo aapke sabhi contacts ko bhej di jayegi. Last warning.",
        "Aapka Rs {a} ka loan overdue hai. Abhi pay karein warna aapke phone ke har number par aapko fraud bataya jayega.",
    ], {"a": ["4,500", "7,000", "12,000", "20,000"]}, per_template=4, **kw)
    R += expand("new_number:en", "english", 1, [
        "Mom, it is me. My phone fell in water so I am using a friend's number. Can you send Rs {a} to this UPI right now? I will explain later.",
    ], {"a": ["8,000", "12,000", "15,000", "25,000"]}, per_template=4, **kw)
    R += expand("new_number:hinglish", "hinglish", 1, [
        "Papa, mera phone kharab ho gaya hai isliye dost ke number se message kar raha hoon. Abhi Rs {a} is UPI par bhej do, baad mein samjhaunga.",
    ], {"a": ["8,000", "12,000", "15,000", "25,000"]}, per_template=4, **kw)
    return R


def make_h2_genuine() -> list[dict[str, str | int]]:
    """Hard-negative round 2 (genuine): families still flagged on the validation split after round 1: awareness tips (all three languages),
    Hindi card statements / bills (English bank names inside Hindi sentences), periodic-KYC branch notices (Hindi), card blocked on request (Hindi)."""
    R: list[dict[str, str | int]] = []
    kw = {"tag": "h2", "rng": RNG4}
    banks_mix = ["HDFC", "SBI", "ICICI", "Axis", "Kotak", "PNB", "Canara", "Union Bank"]
    banks_hi = ["एसबीआई", "एचडीएफसी बैंक", "आईसीआईसीआई बैंक", "एक्सिस बैंक", "कोटक बैंक", "पीएनबी"]
    amounts = ["450", "1,250", "2,000", "3,500", "8,200"]
    days = ["28 Nov", "01 Dec", "05 Dec", "12 Dec", "20 Dec"]
    orgs = ["Delhi Police", "Cyber Cell", "Mumbai Police", "State Police", "RBI", "Your bank"]
    R += expand("card_statement:hi", "hindi", 0, [
        "आपके {bank} क्रेडिट कार्ड का स्टेटमेंट तैयार है। देय राशि Rs {a}। अंतिम तिथि {day}।",
        "{bank} कार्ड: Rs {a} का न्यूनतम भुगतान {day} तक करें। ऐप या नेट बैंकिंग से भुगतान कर सकते हैं।",
        "आपके कार्ड XX{d} पर Rs {a} की खरीदारी हुई। यदि यह आप नहीं थे तो बैंक की हेल्पलाइन पर संपर्क करें।",
        "{bank}: आपके कार्ड की लिमिट बढ़ाने का अनुरोध स्वीकार हुआ। नई लिमिट ऐप में देखें।",
        "आपका मोबाइल बिल Rs {a} तैयार है, अंतिम तिथि {day}। अपने ऑपरेटर के ऐप में देखें।",
    ], {"bank": banks_mix, "a": amounts, "day": days, "d": ["1234", "4821", "9012", "5541"]}, per_template=6, **kw)
    R += expand("awareness:en", "english", 0, [
        "{org} advisory: fake customer-care numbers often show up in search results. Always take the number from your bank's official website or card.",
        "Never scan a QR code to receive money. A QR code is only for paying. - {org}",
        "{org}: if a caller says your account will be blocked and asks for a code, it is a fraud call. Disconnect and report on 1930.",
        "Awareness: installing apps from links sent on WhatsApp can give fraudsters control of your phone. Install apps only from the official store. - {org}",
        "{org} tip: your bank will never ask you to share the OTP you receive. If you did share it by mistake, call 1930 right away.",
        "{org} warning: a stranger who says you won a prize and asks for a small fee first is cheating you. Do not pay and report the number.",
    ], {"org": orgs}, per_template=5, **kw)
    R += expand("awareness:hinglish", "hinglish", 0, [
        "{org} salah: QR code sirf paise dene ke liye hota hai, paise lene ke liye nahi. Kisi ke kehne par QR scan na karein.",
        "{org}: agar koi call kare ki aapka account band ho jayega aur code maange, to woh fraud hai. Call kaat dein aur 1930 par batayein.",
        "{org} tip: WhatsApp par aaye link se app install na karein. Sirf official store se app lein.",
    ], {"org": ["Delhi Police", "Cyber Cell", "RBI", "Aapka bank"]}, per_template=4, **kw)
    R += expand("awareness:hi", "hindi", 0, [
        "{org} सलाह: कस्टमर केयर के नाम पर आए अनजान नंबर पर भरोसा न करें। बैंक की आधिकारिक वेबसाइट से नंबर लें।",
        "{org}: अनजान लिंक से ऐप इंस्टॉल न करें। केवल आधिकारिक ऐप स्टोर का उपयोग करें।",
        "{org} चेतावनी: ओटीपी गलती से बता दिया हो तो तुरंत 1930 पर कॉल करें।",
        "{org} सूचना: इनाम का लालच देकर पहले शुल्क मांगने वाला ठग है। पैसे न दें और नंबर की शिकायत करें।",
    ], {"org": ["दिल्ली पुलिस", "साइबर सेल", "आरबीआई", "आपका बैंक"]}, per_template=4, **kw)
    R += expand("kyc_branch:hi", "hindi", 0, [
        "{bank}: आपके खाते की केवाईसी जांच की तारीख {day} है। कृपया मूल पहचान पत्र के साथ शाखा आएं। फोन या लिंक पर कोई जानकारी न दें।",
        "प्रिय ग्राहक, {bank} की ओर से सूचना: केवाईसी नवीनीकरण केवल शाखा में होता है। कृपया {day} से पहले आएं।",
    ], {"bank": banks_hi, "day": days}, per_template=6, **kw)
    # English had only two card-block-on-request structures (Hindi and Hinglish had seven): added after the repo's golden regression suite
    # showed a false flag on this message type. Card-control confirmations in different shapes; the golden text itself is not used.
    R += expand("card_block_user:en", "english", 0, [
        "Card ending {d}: online purchases are now disabled, as you asked. Turn them on again anytime from your {bank} app.",
        "Your {bank} debit card XX{d} is on hold following your instruction. A replacement can be requested at any branch.",
        "{bank} confirms that the contactless limit on card XX{d} was lowered to Rs {a} on your instruction.",
        "Your instruction to freeze card XX{d} has been completed. {bank} will never ask you for card details to undo this.",
        "Request received: usage abroad on your {bank} card XX{d} is now switched off. To change it, open card settings in the app.",
        "{bank}: {ctl} on your card ending {d} have been disabled as requested. You can enable them again in the mobile app.",
        "Card ending {d}: {ctl} turned off on your request. {bank} will not ask for card details to turn them back on.",
        "{bank} update: your instruction to restrict {ctl} on debit card XX{d} is complete.",
        "Per your instruction, {ctl} on your {bank} card XX{d} stay blocked until you re-enable them in the app.",
    ], {"bank": ["HDFC Bank", "SBI", "ICICI Bank", "Axis Bank", "Kotak Bank", "PNB"], "d": ["1234", "4821", "9012", "5541", "3312", "7789"], "a": amounts,
        "ctl": ["online transactions", "international transactions", "contactless payments", "ATM withdrawals", "e-commerce usage"]}, per_template=6, **kw)
    R += expand("card_block_user:hi", "hindi", 0, [
        "आपके कहने पर {bank} ने कार्ड XX{d} पर ऑनलाइन लेनदेन अस्थायी रूप से बंद कर दिए हैं। चालू करने के लिए ऐप की कार्ड सेटिंग्स में जाएं।",
        "{bank}: कार्ड XX{d} आपके निर्देश पर ब्लॉक हुआ। अनुरोध की पुष्टि आपके मोबाइल पर भेजी गई है।",
    ], {"bank": banks_hi, "d": ["1234", "4821", "9012", "5541", "3312", "7789"]}, per_template=6, **kw)
    return R


def make_h2_scam() -> list[dict[str, str | int]]:
    """Hard-negative round 2 (scam): the wrong-payment trick in more shapes (still missed on validation)."""
    kw = {"tag": "h2", "rng": RNG4}
    R = expand("refund_trick:en", "english", 1, [
        "My brother used the wrong number and Rs {a} went to your {app}. Please transfer it back to the same number and I will thank you.",
        "I got a bank message that Rs {a} was sent to the wrong person, you. Kindly reverse the payment to me, my number is the one I am messaging from.",
        "Friend, a payment of Rs {a} meant for my tutor reached your {app} instead. Please send it back to me today, it is very urgent.",
    ], {"a": ["3,000", "5,000", "9,500", "14,000"], "app": ["PhonePe", "GPay", "Paytm", "BHIM"]}, per_template=5, **kw)
    # Fake-QR "receive money" scams. The round-2 awareness tips say "never scan a QR code to receive money"; n-grams cannot see the negation,
    # so the scam side of that contrast needs its own variants (the fake_qr category of data/LABELING.md was missing from the scam data).
    R += expand("qr_receive:en", "english", 1, [
        "I have sent the payment. To receive the money, scan this QR code and enter your {pin}.",
        "Your refund of Rs {a} is on hold. Scan the QR code below and enter your {pin} to receive it.",
        "Payment done from my side, just scan this QR and put your {pin} to get the Rs {a}.",
    ], {"a": ["2,000", "4,500", "8,000", "15,000"], "pin": ["UPI PIN", "PIN", "bank PIN"]}, per_template=5, **kw)
    R += expand("qr_receive:hi", "hindi", 1, [
        "मैंने आपको पेमेंट भेज दिया है। रकम रिसीव करने के लिए यह क्यूआर कोड स्कैन करिए और अपना यूपीआई पिन दर्ज कीजिए।",
        "आपके {a} रुपये अटके हुए हैं। उन्हें पाने के लिए यह क्यूआर कोड स्कैन करके पिन डालें।",
        "पेमेंट सफल रहा है, बस पैसे लेने के लिए क्यूआर स्कैन करके अपना पिन डाल दीजिए।",
    ], {"a": ["2,000", "4,500", "8,000", "15,000"]}, per_template=4, **kw)
    R += expand("qr_receive:hinglish", "hinglish", 1, [
        "Maine payment kar diya hai. Paise receive karne ke liye ye QR code scan karke apna PIN daaliye.",
        "Aapka Rs {a} ka refund ruka hua hai. Paisa lene ke liye QR scan karein aur UPI PIN enter karein.",
    ], {"a": ["2,000", "4,500", "8,000", "15,000"]}, per_template=4, **kw)
    return R


def filter_frozen(rows: list[dict[str, str | int]], index: "leak_check.FrozenIndex", label: str) -> list[dict[str, str | int]]:
    """Drop every row that matches a frozen evaluation text under any leak_check rule; print counts only (never the text)."""
    kept, by_rule = [], {r: 0 for r in leak_check.RULES}
    for r in rows:
        hits = index.match(str(r["text"]))
        if hits:
            by_rule[min(hits, key=lambda h: leak_check.RULES.index(h.rule)).rule] += 1
        else:
            kept.append(r)
    print(f"frozen-text filter ({label}): kept {len(kept)} of {len(rows)} rows; removed {len(rows) - len(kept)} (first rule hit: {by_rule})")
    return kept


def main(argv: list[str] | None = None) -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--allow-missing-frozen", action="store_true", help="tests only: run although the frozen directory is absent")
    args = ap.parse_args(argv)
    index, warns = leak_check.build_index(leak_check.DEFAULT_FROZEN, ROOT)
    if not leak_check.DEFAULT_FROZEN.is_dir() and not args.allow_missing_frozen:
        print(f"ERROR: frozen evaluation directory {leak_check.DEFAULT_FROZEN} is missing, so the filter cannot run; refusing to write generated data "
              "(create the data/real junction, see ml/TUNING.md).", file=sys.stderr)
        sys.exit(2)
    for w in warns:
        print(f"WARNING: {w}", file=sys.stderr)
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    genuine_rows = make_genuine() + make_v2_genuine() + make_h1_genuine()
    scam_rows = make_scam() + make_v2_scam() + make_h1_scam()
    if HARD_NEGATIVE_ROUNDS >= 2:
        genuine_rows += make_h2_genuine()
        scam_rows += make_h2_scam()

    # Deduplicate within generated rows
    seen_gen = set()
    unique_gen = []
    for r in genuine_rows:
        if r["text"] not in seen_gen:
            seen_gen.add(r["text"])
            unique_gen.append(r)

    seen_scam = set()
    unique_scam = []
    for r in scam_rows:
        if r["text"] not in seen_scam:
            seen_scam.add(r["text"])
            unique_scam.append(r)

    unique_gen = filter_frozen(unique_gen, index, "trap_genuine")
    unique_scam = filter_frozen(unique_scam, index, "scam_gap")

    trap_file = OUT_DIR / "trap_genuine_v1.csv"
    with open(trap_file, "w", encoding="utf-8", newline="") as fp:
        writer = csv.DictWriter(fp, fieldnames=["text", "label", "lang", "group"])
        writer.writeheader()
        writer.writerows(unique_gen)

    scam_file = OUT_DIR / "scam_gap_v1.csv"
    with open(scam_file, "w", encoding="utf-8", newline="") as fp:
        writer = csv.DictWriter(fp, fieldnames=["text", "label", "lang", "group"])
        writer.writeheader()
        writer.writerows(unique_scam)

    print(f"Generated {len(unique_gen)} genuine rows in {trap_file}")
    print(f"Generated {len(unique_scam)} scam rows in {scam_file}")


if __name__ == "__main__":
    main()
