"""Generate a SYNTHETIC multilingual scam/genuine message dataset.

Each row carries a template_id so train/test can be split by template
(avoids leakage from paraphrases of the same template).
Also writes a hand-written "wild" set with phrasing NOT used in any template.
"""
import csv
import random
from pathlib import Path

random.seed(7)
OUT = Path(__file__).parent / "data"

BANKS = ["SBI", "HDFC Bank", "ICICI", "Axis Bank", "PNB", "Bank of Baroda", "Kotak"]
LINKS = ["bit.ly/kyc-upd8", "tinyurl.com/sbi-verify", "http://hdfc-secure.co.in/login",
         "http://bit.ly/3xAbc9", "https://rb.gy/k9p2", "http://kyc-update-now.xyz",
         "cutt.ly/claim-now", "http://sbi-online.top/auth"]
PHONES = ["9876543210", "8800112233", "7011223344", "9123456780", "8899776655"]
AMTS = ["4,999", "25,000", "50,000", "1,00,000", "9,800", "2,50,000", "12,500", "75,000"]
DATES = ["12-Nov", "03/12/2025", "5 Dec", "21-Jan", "28 Feb"]
NAMES = ["Rahul", "Priya", "Amit", "Sneha", "Vikram", "Anita", "Rohan"]
ORDERS = ["OD4837261", "AMZ-99213", "FK7712093", "ZP118822"]

# (lang, label, type, text)
T = []
def add(lang, label, typ, text):
    T.append((lang, label, typ, text))

# ---------------- ENGLISH SCAM ----------------
add("en", 1, "kyc", "Dear customer, your {bank} account will be blocked today. Update your KYC immediately: {link}")
add("en", 1, "kyc", "{bank} ALERT: KYC pending. Your account will be suspended in 24 hours. Click {link} to verify PAN now.")
add("en", 1, "otp", "Sir I am calling from {bank} head office. Please share the OTP you just received to stop the unauthorized transaction of Rs {amt}.")
add("en", 1, "lottery", "Congratulations! You have won Rs {amt} in the KBC lottery. Pay processing fee to claim. Contact {phone}")
add("en", 1, "loan", "Instant loan Rs {amt} approved without documents. Install app {link} now. Pay back within 7 days or your contacts will be informed.")
add("en", 1, "courier", "Your parcel is held at customs. A fine of Rs {amt} is due. Pay at {link} or legal action will be taken.")
add("en", 1, "arrest", "This is CBI officer. A parcel in your name contains illegal items. You are under digital arrest. Stay on video call and do not tell anyone.")
add("en", 1, "electricity", "Dear consumer, your electricity will be disconnected tonight 9:30 pm as previous bill is unpaid. Call {phone} immediately.")
add("en", 1, "job", "Work from home and earn Rs {amt} daily by liking videos. Join our Telegram {link} limited seats only.")
add("en", 1, "refund", "You have a refund of Rs {amt} pending. Scan this QR code or enter your UPI PIN to receive the money.")
add("en", 1, "card", "{bank}: Your debit card is blocked. Share card number, CVV and OTP to reactivate immediately.")
add("en", 1, "sim", "Your SIM will be deactivated in 2 hours. Call {phone} now to complete re-verification.")
# ---------------- ENGLISH GENUINE ----------------
add("en", 0, "otp", "Your OTP for login is {otp}. Do not share it with anyone. - {bank}")
add("en", 0, "debit", "Rs {amt} debited from A/c XX1234 on {date}. If not you, call the number on the back of your card. - {bank}")
add("en", 0, "order", "Your order {order} has been shipped and will arrive by {date}.")
add("en", 0, "chat", "Hi {name}, are we still meeting at 5 pm today?")
add("en", 0, "bill", "Your electricity bill of Rs {amt} for last month is generated. Due date {date}. Pay via the official app.")
add("en", 0, "credit", "Rs {amt} credited to your account on {date}. Available balance has been updated.")
add("en", 0, "appt", "Reminder: your appointment with Dr {name} is on {date} at 11 am.")
add("en", 0, "recharge", "Your recharge of Rs {amt} was successful. Validity 28 days.")
add("en", 0, "stmt", "Thanks for banking with {bank}. Your statement for this month is available in the app.")
add("en", 0, "chat", "{name}: Don't forget to buy vegetables on your way back.")
add("en", 0, "otp", "Your OTP {otp} is for a transaction of Rs {amt} at Amazon. Valid for 10 mins. Never share it with anyone.")
add("en", 0, "chat", "Class timing changed to 10 am tomorrow. Please inform the others.")

# ---------------- HINDI (Devanagari) SCAM ----------------
add("hi", 1, "kyc", "प्रिय ग्राहक, आपका {bank} खाता आज बंद हो जाएगा। तुरंत अपना केवाईसी अपडेट करें: {link}")
add("hi", 1, "kyc", "{bank} अलर्ट: आपका केवाईसी बाकी है। 24 घंटे में खाता बंद कर दिया जाएगा। पैन वेरिफाई करने के लिए {link} पर क्लिक करें।")
add("hi", 1, "otp", "सर मैं {bank} मुख्यालय से बोल रहा हूँ। Rs {amt} के गलत लेन-देन को रोकने के लिए अभी आए ओटीपी बताइए।")
add("hi", 1, "lottery", "बधाई हो! आपने केबीसी लॉटरी में Rs {amt} जीते हैं। इनाम पाने के लिए प्रोसेसिंग फीस जमा करें। संपर्क करें {phone}")
add("hi", 1, "loan", "बिना दस्तावेज़ Rs {amt} का तुरंत लोन मंजूर। अभी ऐप इंस्टॉल करें {link}। 7 दिन में न चुकाने पर आपके कॉन्टैक्ट्स को बताया जाएगा।")
add("hi", 1, "courier", "आपका पार्सल कस्टम में रोका गया है। Rs {amt} जुर्माना देना होगा। {link} पर भुगतान करें वरना कानूनी कार्रवाई होगी।")
add("hi", 1, "arrest", "मैं सीबीआई अधिकारी बोल रहा हूँ। आपके नाम के पार्सल में अवैध सामान मिला है। आप डिजिटल अरेस्ट में हैं। वीडियो कॉल पर रहें और किसी को न बताएं।")
add("hi", 1, "electricity", "प्रिय उपभोक्ता, पिछला बिल बाकी होने से आज रात 9:30 बजे आपकी बिजली काट दी जाएगी। तुरंत {phone} पर कॉल करें।")
add("hi", 1, "job", "घर बैठे वीडियो लाइक करके रोज़ Rs {amt} कमाएं। हमारे टेलीग्राम {link} से जुड़ें, सीमित सीटें।")
add("hi", 1, "refund", "आपका Rs {amt} का रिफंड बाकी है। पैसे पाने के लिए यह क्यूआर कोड स्कैन करें या अपना यूपीआई पिन डालें।")
add("hi", 1, "card", "{bank}: आपका डेबिट कार्ड ब्लॉक हो गया है। चालू करने के लिए कार्ड नंबर, सीवीवी और ओटीपी भेजें।")
add("hi", 1, "sim", "आपका सिम 2 घंटे में बंद हो जाएगा। दोबारा वेरिफिकेशन के लिए अभी {phone} पर कॉल करें।")
# ---------------- HINDI GENUINE ----------------
add("hi", 0, "otp", "आपके लॉगिन के लिए ओटीपी {otp} है। इसे किसी के साथ साझा न करें। - {bank}")
add("hi", 0, "debit", "आपके खाते XX1234 से {date} को Rs {amt} डेबिट हुए। यदि आपने नहीं किया तो कार्ड के पीछे दिए नंबर पर कॉल करें। - {bank}")
add("hi", 0, "order", "आपका ऑर्डर {order} भेज दिया गया है और {date} तक पहुँच जाएगा।")
add("hi", 0, "chat", "नमस्ते {name}, क्या हम आज शाम 5 बजे मिल रहे हैं?")
add("hi", 0, "bill", "पिछले महीने का आपका बिजली बिल Rs {amt} बन गया है। अंतिम तिथि {date}। आधिकारिक ऐप से भुगतान करें।")
add("hi", 0, "credit", "आपके खाते में {date} को Rs {amt} जमा हुए। उपलब्ध शेष राशि अपडेट हो गई है।")
add("hi", 0, "appt", "याद दिलाना: डॉ {name} के साथ आपकी अपॉइंटमेंट {date} को सुबह 11 बजे है।")
add("hi", 0, "recharge", "आपका Rs {amt} का रिचार्ज सफल रहा। वैधता 28 दिन।")
add("hi", 0, "stmt", "{bank} के साथ बैंकिंग के लिए धन्यवाद। इस माह का स्टेटमेंट ऐप में उपलब्ध है।")
add("hi", 0, "chat", "{name}: लौटते समय सब्ज़ी लाना मत भूलना।")
add("hi", 0, "otp", "Amazon पर Rs {amt} के लेन-देन के लिए आपका ओटीपी {otp} है। 10 मिनट तक मान्य। इसे किसी को न बताएं।")
add("hi", 0, "chat", "कल कक्षा का समय सुबह 10 बजे कर दिया गया है। बाकी लोगों को बता देना।")

# ---------------- HINGLISH SCAM ----------------
add("hinglish", 1, "kyc", "Dear customer aapka {bank} account aaj block ho jayega. Turant apna KYC update karein: {link}")
add("hinglish", 1, "kyc", "{bank} ALERT: Aapka KYC pending hai. 24 ghante me account suspend ho jayega. PAN verify karne ke liye {link} par click karein.")
add("hinglish", 1, "otp", "Sir main {bank} head office se bol raha hu. Rs {amt} ka galat transaction rokne ke liye abhi aaya hua OTP bataiye.")
add("hinglish", 1, "lottery", "Badhai ho! Aapne KBC lottery me Rs {amt} jeete hain. Inaam pane ke liye processing fee jama karein. Contact {phone}")
add("hinglish", 1, "loan", "Bina documents ke Rs {amt} ka instant loan approved. Abhi app install karo {link}. 7 din me paisa wapas nahi diya to contacts ko bata denge.")
add("hinglish", 1, "courier", "Aapka parcel customs me ruka hua hai. Rs {amt} fine dena hoga. {link} par payment karo warna legal action hoga.")
add("hinglish", 1, "arrest", "Main CBI officer bol raha hu. Aapke naam ke parcel me illegal saamaan mila hai. Aap digital arrest me hain. Video call par raho aur kisi ko mat batana.")
add("hinglish", 1, "electricity", "Dear consumer, pichla bill pending hone se aaj raat 9:30 baje aapki bijli kaat di jayegi. Turant {phone} par call karein.")
add("hinglish", 1, "job", "Ghar baithe videos like karke roz Rs {amt} kamayein. Hamara Telegram {link} join karo, limited seats.")
add("hinglish", 1, "refund", "Aapka Rs {amt} ka refund pending hai. Paisa pane ke liye ye QR code scan karo ya apna UPI PIN daalo.")
add("hinglish", 1, "card", "{bank}: Aapka debit card block ho gaya hai. Chalu karne ke liye card number, CVV aur OTP bhejiye.")
add("hinglish", 1, "sim", "Aapka SIM 2 ghante me band ho jayega. Re-verification ke liye abhi {phone} par call karein.")
# ---------------- HINGLISH GENUINE ----------------
add("hinglish", 0, "otp", "Aapke login ka OTP {otp} hai. Ise kisi ke saath share na karein. - {bank}")
add("hinglish", 0, "debit", "Aapke A/c XX1234 se {date} ko Rs {amt} debit hue. Agar aapne nahi kiya to card ke peeche diye number par call karein. - {bank}")
add("hinglish", 0, "order", "Aapka order {order} ship ho gaya hai aur {date} tak pahunch jayega.")
add("hinglish", 0, "chat", "Hi {name}, kya hum aaj shaam 5 baje mil rahe hain?")
add("hinglish", 0, "bill", "Pichle mahine ka aapka bijli bill Rs {amt} ban gaya hai. Last date {date}. Official app se pay karein.")
add("hinglish", 0, "credit", "Aapke account me {date} ko Rs {amt} credit hue. Available balance update ho gaya hai.")
add("hinglish", 0, "appt", "Reminder: Dr {name} ke saath aapki appointment {date} ko subah 11 baje hai.")
add("hinglish", 0, "recharge", "Aapka Rs {amt} ka recharge successful raha. Validity 28 din.")
add("hinglish", 0, "stmt", "{bank} ke saath banking karne ke liye thanks. Is mahine ka statement app me available hai.")
add("hinglish", 0, "chat", "{name}: Wapas aate time sabzi lana mat bhoolna.")
add("hinglish", 0, "otp", "Amazon par Rs {amt} ke transaction ke liye aapka OTP {otp} hai. 10 min tak valid. Ise kisi ko na bataye.")
add("hinglish", 0, "chat", "Kal class ka time subah 10 baje kar diya gaya hai. Baaki logo ko bata dena.")


def fill(t):
    return t.format(
        bank=random.choice(BANKS), link=random.choice(LINKS), phone=random.choice(PHONES),
        amt=random.choice(AMTS), date=random.choice(DATES), name=random.choice(NAMES),
        order=random.choice(ORDERS), otp=str(random.randint(100000, 999999)))


# ---------------- WILD SET: hand-written, phrasing differs from templates ----------------
WILD = [
    # english scam
    ("en", 1, "URGENT: Unusual login detected on your net banking. Verify identity at http://secure-bank-login.top or account will be frozen."),
    ("en", 1, "Dear user your Aadhaar is linked to illegal activity, police case registered. Contact officer on 9988776655 right now to avoid arrest."),
    ("en", 1, "Hello, I accidentally sent Rs 5000 to your UPI, please return it. Also kindly approve the collect request I sent."),
    ("en", 1, "Your KBC winner ticket number 4421 has won 25 lakh. Send Rs 3000 as tax to claim prize today."),
    ("en", 1, "Part time job offer: earn 3000 per day just by rating hotels on Google Maps. WhatsApp us to start."),
    ("en", 1, "Your electricity connection will be cut tonight. Last bill not updated. Call our officer now."),
    # english genuine
    ("en", 0, "Your HDFC credit card ending 4821 statement of Rs 12,340 is due on 15 Dec. Pay through the official app."),
    ("en", 0, "Hey, I'll reach by 8. Can you save me a seat at the cafe?"),
    ("en", 0, "Your Swiggy order is on the way. Delivery partner Ravi will reach in 10 minutes."),
    ("en", 0, "123456 is your OTP for Zomato login. Do not share this code with anyone."),
    ("en", 0, "Salary of Rs 54,200 has been credited to your account ending 7788 on 01 Dec."),
    ("en", 0, "Your Jio plan expires tomorrow. Recharge via MyJio app to continue enjoying services."),
    # hindi scam
    ("hi", 1, "आपके बैंक खाते में संदिग्ध गतिविधि मिली है। खाता फ्रीज होने से बचाने के लिए तुरंत इस लिंक पर लॉगिन करें।"),
    ("hi", 1, "आपका आधार नंबर अपराध में इस्तेमाल हुआ है। गिरफ्तारी से बचना है तो अभी इस नंबर पर बात करें और किसी को न बताएं।"),
    ("hi", 1, "गलती से आपके खाते में 5000 रुपये चले गए हैं, कृपया वापस भेज दें और मेरा कलेक्ट रिक्वेस्ट मंज़ूर करें।"),
    ("hi", 1, "बधाई हो आपकी लॉटरी निकली है 25 लाख की। इनाम पाने के लिए पहले 3000 रुपये टैक्स भेजिए।"),
    ("hi", 1, "पार्ट टाइम नौकरी: गूगल मैप पर रेटिंग देकर रोज़ 3000 कमाएं। अभी व्हाट्सऐप करें।"),
    ("hi", 1, "आपका बिजली कनेक्शन आज रात कट जाएगा क्योंकि बिल अपडेट नहीं है। तुरंत अधिकारी को फोन करें।"),
    # hindi genuine
    ("hi", 0, "आपके एचडीएफसी क्रेडिट कार्ड 4821 का Rs 12,340 का बिल 15 दिसंबर तक देय है। आधिकारिक ऐप से भुगतान करें।"),
    ("hi", 0, "मैं 8 बजे तक पहुँच जाऊँगा। क्या आप कैफ़े में मेरे लिए सीट रख सकते हैं?"),
    ("hi", 0, "आपका स्विगी ऑर्डर रास्ते में है। डिलीवरी पार्टनर रवि 10 मिनट में पहुँचेंगे।"),
    ("hi", 0, "जोमैटो लॉगिन के लिए 123456 आपका ओटीपी है। यह कोड किसी को न बताएं।"),
    ("hi", 0, "आपके खाते 7788 में 01 दिसंबर को Rs 54,200 वेतन जमा हुआ।"),
    ("hi", 0, "आपका जियो प्लान कल समाप्त हो रहा है। सेवा जारी रखने के लिए माईजियो ऐप से रिचार्ज करें।"),
    # hinglish scam
    ("hinglish", 1, "Aapke net banking me suspicious login mila hai. Account freeze hone se bachane ke liye is link par verify karo http://secure-bank-login.top"),
    ("hinglish", 1, "Aapka Aadhaar kisi illegal kaam me use hua hai, police case ho gaya hai. Giraftari se bachna hai to abhi is number par baat karo aur kisi ko mat batana."),
    ("hinglish", 1, "Bhai galti se tumhare UPI me 5000 chale gaye, please wapas bhej do aur meri collect request accept kar lo."),
    ("hinglish", 1, "Congrats! Aapki 25 lakh ki lottery lagi hai. Prize lene ke liye pehle 3000 rupaye tax bhejo."),
    ("hinglish", 1, "Part time job hai, Google Maps pe rating dekar roz 3000 kamao. Abhi WhatsApp karo."),
    ("hinglish", 1, "Aapka bijli connection aaj raat cut ho jayega kyunki bill update nahi hai. Turant officer ko call karo."),
    ("hinglish", 1, "Sir aapka SBI YONO block ho gaya hai, reward points expire ho rahe hain, apk download karke redeem karein."),
    ("hinglish", 1, "Dear customer aapka pan card update nahi hai, aaj hi link par click karke update karein warna account band."),
    # hinglish genuine
    ("hinglish", 0, "Aapke HDFC credit card 4821 ka Rs 12,340 ka bill 15 Dec tak due hai. Official app se pay karein."),
    ("hinglish", 0, "Main 8 baje tak pahunch jaunga. Cafe me mere liye seat rakh sakte ho?"),
    ("hinglish", 0, "Aapka Swiggy order raste me hai. Delivery partner Ravi 10 minute me pahunchenge."),
    ("hinglish", 0, "Zomato login ke liye 123456 aapka OTP hai. Ye code kisi ko share na karein."),
    ("hinglish", 0, "Aapke account 7788 me 01 Dec ko Rs 54,200 salary credit hui."),
    ("hinglish", 0, "Bhai kal ki meeting 11 baje shift ho gayi hai, notes bhej dena."),
    ("hinglish", 0, "Aapka Jio plan kal expire ho raha hai. MyJio app se recharge kar lijiye."),
    ("hinglish", 0, "Happy birthday yaar! Party kab de raha hai?"),
]


def main():
    per_template = 25
    rows = []
    for tid, (lang, label, typ, text) in enumerate(T):
        seen = set()
        for _ in range(per_template * 3):
            s = fill(text)
            if s in seen:
                continue
            seen.add(s)
            rows.append({"text": s, "label": label, "lang": lang, "type": typ, "template_id": tid})
            if len(seen) >= per_template:
                break
    with open(OUT / "synthetic.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["text", "label", "lang", "type", "template_id"])
        w.writeheader()
        w.writerows(rows)
    with open(OUT / "wild.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["text", "label", "lang"])
        for lang, label, text in WILD:
            w.writerow([text, label, lang])
    print(f"templates={len(T)} synthetic_rows={len(rows)} wild_rows={len(WILD)}")


if __name__ == "__main__":
    main()
