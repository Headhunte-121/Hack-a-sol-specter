"""Generate high-quality synthetic team data for trap-genuine and scam-gap mitigation.

Produces:
  data/team/trap_genuine_v1.csv (>= 300 genuine rows, label 0)
  data/team/scam_gap_v1.csv (>= 150 scam rows, label 1)

Deterministic generation with fixed random seed.
Columns: text, label, lang, group
"""

from __future__ import annotations

import csv
import random
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "data" / "team"

SEED = 20261123
RNG = random.Random(SEED)

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


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    genuine_rows = make_genuine()
    scam_rows = make_scam()

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
