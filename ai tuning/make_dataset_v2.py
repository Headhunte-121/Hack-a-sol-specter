"""Second synthetic set: more VARIED genuine messages (hard negatives: OTPs, EMI, flights, subsidies, receipts)
and scams with new wording/topics. Written after error analysis of the first benchmark; topics were chosen to
differ from the 160-message test set (wording written independently), but some topical overlap is unavoidable
(e.g. OTP, KYC), so treat scores on wild_big as slightly optimistic for models trained on this."""
import csv, random
from pathlib import Path

random.seed(11)
OUT = Path(__file__).parent / "data"
BANKS = ["SBI", "HDFC Bank", "ICICI", "Axis Bank", "Canara Bank", "Union Bank"]
MERCH = ["Swiggy", "Zomato", "Flipkart", "Ola", "BookMyShow", "Myntra", "Uber"]
LINKS = ["bit.ly/rwd-claim", "http://upd8-card.top", "http://gov-benefit.in.net", "tinyurl.com/x7Kq2", "http://crypto-win.xyz", "https://cutt.ly/fr33"]
PHONES = ["9811122233", "7788990011", "9090909090", "8123456789"]
AMTS = ["499", "1,250", "3,800", "6,000", "15,000", "42,000", "2,999"]
DATES = {"en": ["5 Dec", "18 Jan", "02-Feb", "27 Mar"], "hi": ["5 दिसंबर", "18 जनवरी", "2 फरवरी", "27 मार्च"], "hinglish": ["5 Dec", "18 Jan", "2 Feb", "27 Mar"]}
TIMES = {"en": ["6:30 pm", "8 pm", "10:15 am", "4 pm"], "hi": ["शाम 6:30 बजे", "रात 8 बजे", "सुबह 10:15 बजे", "शाम 4 बजे"], "hinglish": ["shaam 6:30 baje", "raat 8 baje", "subah 10:15 baje", "shaam 4 baje"]}
CITIES = {"en": ["Mumbai", "Pune", "Bengaluru", "Raipur"], "hi": ["मुंबई", "पुणे", "बेंगलुरु", "रायपुर"], "hinglish": ["Mumbai", "Pune", "Bengaluru", "Raipur"]}
NAMES = ["Rahul", "Priya", "Amit", "Sneha", "Neha", "Karan"]

T = []
def add(lang, label, typ, text): T.append((lang, label, typ, text))

# ============ ENGLISH genuine ============
add("en",0,"otp","Your {merchant} OTP is {otp}. It is valid for 10 minutes. Please do not share it with anyone.")
add("en",0,"upi","Payment of Rs {amt} to {merchant} was successful via UPI on {date}. Ref no {order}.")
add("en",0,"flight","Your flight 6E{num} from Delhi to {city} is on time. Boarding starts at {time}. Web check-in is open.")
add("en",0,"emi","EMI of Rs {amt} for your loan is due on {date}. Please keep sufficient balance in your account. - {bank}")
add("en",0,"premium","Your LIC premium of Rs {amt} is due on {date}. Pay through the official LIC website or any branch.")
add("en",0,"ride","Your {merchant} ride has ended. Total fare Rs {amt}. Thanks for riding with us.")
add("en",0,"reset","Request received: you asked to reset your {merchant} password. Use code {otp}. If you did not request this, ignore this message.")
add("en",0,"school","School notice: Parent-teacher meeting on {date} at {time}. Kindly attend.")
add("en",0,"subsidy","Your gas subsidy of Rs {amt} has been credited to your account ending 1234 on {date}.")
add("en",0,"courier","Your courier {order} was delivered today at {time}. Rate your experience in the app.")
add("en",0,"holiday","Bank holiday notice: our branches will remain closed on {date}. Net banking and UPI remain available. - {bank}")
add("en",0,"table","Hi {name}, your table for 4 at {merchant} is booked for {time} tonight.")
add("en",0,"fastag","Your FASTag has been recharged with Rs {amt}. Current balance is updated. - {bank}")
add("en",0,"chat","Thanks for the update {name}, I will check and reply by evening.")
# ============ ENGLISH scam ============
add("en",1,"netflix","Dear {name}, your Netflix payment failed. Update your card details at {link} within 24 hours or your plan will be cancelled.")
add("en",1,"subsidy","Your electricity subsidy is stopped. Share your Aadhaar and bank account number on {phone} to restart it.")
add("en",1,"scheme","Dear beneficiary, Rs {amt} has been approved under the new government scheme. Register at {link} with your bank details to receive it.")
add("en",1,"jobfee","Congratulations! You are shortlisted for a {merchant} delivery job. Pay Rs {amt} registration fee to confirm your joining.")
add("en",1,"bonus","Your insurance policy bonus of Rs {amt} is ready. Call {phone} and share the OTP to release the amount.")
add("en",1,"limit","Hello, I am from the bank credit card department. We are increasing your limit, kindly tell the 6 digit code sent to you.")
add("en",1,"crypto","Earn double in 3 days with our crypto trading group. Deposit Rs {amt} on {link}, withdrawals guaranteed.")
add("en",1,"recharge","Free recharge of Rs {amt} for all users today only. Claim at {link}.")
add("en",1,"pension","Your pension has been suspended. Verify your life certificate immediately at {link} or lose benefits.")
add("en",1,"tax","Your account is under investigation by the Income Tax department. Pay Rs {amt} penalty now to avoid arrest. Call {phone}.")
# ============ HINDI genuine ============
add("hi",0,"otp","आपका {merchant} ओटीपी {otp} है। यह 10 मिनट तक मान्य है। कृपया इसे किसी के साथ साझा न करें।")
add("hi",0,"upi","{merchant} को Rs {amt} का भुगतान {date} को यूपीआई से सफल रहा। संदर्भ संख्या {order}।")
add("hi",0,"flight","आपकी उड़ान 6E{num} दिल्ली से {city} समय पर है। बोर्डिंग {time} शुरू होगी। वेब चेक-इन खुला है।")
add("hi",0,"emi","आपके लोन की Rs {amt} की ईएमआई {date} को देय है। कृपया खाते में पर्याप्त शेष रखें। - {bank}")
add("hi",0,"premium","आपके एलआईसी प्रीमियम Rs {amt} की देय तिथि {date} है। आधिकारिक एलआईसी वेबसाइट या किसी शाखा में भुगतान करें।")
add("hi",0,"ride","आपकी {merchant} राइड समाप्त हुई। कुल किराया Rs {amt}। हमारे साथ यात्रा करने के लिए धन्यवाद।")
add("hi",0,"reset","अनुरोध प्राप्त: आपने अपना {merchant} पासवर्ड रीसेट करने को कहा है। कोड {otp} का उपयोग करें। यदि आपने अनुरोध नहीं किया तो इसे अनदेखा करें।")
add("hi",0,"school","स्कूल सूचना: अभिभावक-शिक्षक बैठक {date} को {time} है। कृपया उपस्थित रहें।")
add("hi",0,"subsidy","आपकी गैस सब्सिडी Rs {amt} {date} को खाता संख्या 1234 में जमा कर दी गई है।")
add("hi",0,"courier","आपका कूरियर {order} आज {time} डिलीवर हो गया। ऐप में अपना अनुभव बताएं।")
add("hi",0,"holiday","बैंक अवकाश सूचना: {date} को हमारी शाखाएँ बंद रहेंगी। नेट बैंकिंग और यूपीआई सेवाएँ चालू रहेंगी। - {bank}")
add("hi",0,"table","नमस्ते {name}, आज रात {time} {merchant} में 4 लोगों की टेबल बुक हो गई है।")
add("hi",0,"fastag","आपका फास्टैग Rs {amt} से रिचार्ज हो गया है। शेष राशि अपडेट हो गई है। - {bank}")
add("hi",0,"chat","धन्यवाद {name}, मैं देखकर शाम तक जवाब दूँगा।")
# ============ HINDI scam ============
add("hi",1,"netflix","प्रिय {name}, आपका नेटफ्लिक्स भुगतान विफल हो गया। 24 घंटे में {link} पर कार्ड विवरण अपडेट करें वरना आपका प्लान रद्द हो जाएगा।")
add("hi",1,"subsidy","आपकी बिजली सब्सिडी बंद हो गई है। चालू करने के लिए {phone} पर अपना आधार और बैंक खाता नंबर बताएं।")
add("hi",1,"scheme","प्रिय लाभार्थी, नई सरकारी योजना में आपके लिए Rs {amt} मंजूर हुए हैं। पाने के लिए {link} पर बैंक विवरण के साथ पंजीकरण करें।")
add("hi",1,"jobfee","बधाई हो! आपका {merchant} डिलीवरी जॉब के लिए चयन हुआ है। जॉइनिंग पक्की करने के लिए Rs {amt} पंजीकरण शुल्क जमा करें।")
add("hi",1,"bonus","आपकी बीमा पॉलिसी का Rs {amt} बोनस तैयार है। राशि पाने के लिए {phone} पर कॉल करें और ओटीपी बताएं।")
add("hi",1,"limit","नमस्ते, मैं बैंक के क्रेडिट कार्ड विभाग से बोल रहा हूँ। आपकी लिमिट बढ़ाई जा रही है, कृपया आपको आया 6 अंकों का कोड बताइए।")
add("hi",1,"crypto","हमारे क्रिप्टो ट्रेडिंग ग्रुप से 3 दिन में पैसा दोगुना करें। {link} पर Rs {amt} जमा करें, निकासी की गारंटी।")
add("hi",1,"recharge","सभी यूज़र्स के लिए आज ही Rs {amt} का मुफ्त रिचार्ज। {link} पर क्लेम करें।")
add("hi",1,"pension","आपकी पेंशन रोक दी गई है। तुरंत {link} पर जीवन प्रमाण पत्र सत्यापित करें वरना लाभ बंद हो जाएगा।")
add("hi",1,"tax","आपका खाता आयकर विभाग की जांच में है। गिरफ्तारी से बचने के लिए अभी Rs {amt} जुर्माना भरें। कॉल करें {phone}।")
# ============ HINGLISH genuine ============
add("hinglish",0,"otp","Aapka {merchant} OTP {otp} hai. Ye 10 minute tak valid hai. Kripya ise kisi ke saath share na karein.")
add("hinglish",0,"upi","{merchant} ko Rs {amt} ka payment {date} ko UPI se successful raha. Ref no {order}.")
add("hinglish",0,"flight","Aapki flight 6E{num} Delhi se {city} time par hai. Boarding {time} shuru hogi. Web check-in open hai.")
add("hinglish",0,"emi","Aapke loan ki Rs {amt} ki EMI {date} ko due hai. Kripya account me sufficient balance rakhein. - {bank}")
add("hinglish",0,"premium","Aapke LIC premium Rs {amt} ki due date {date} hai. Official LIC website ya kisi branch me pay karein.")
add("hinglish",0,"ride","Aapki {merchant} ride khatam hui. Total fare Rs {amt}. Humare saath safar karne ke liye thanks.")
add("hinglish",0,"reset","Request mili: aapne apna {merchant} password reset karne ko kaha hai. Code {otp} use karein. Agar aapne request nahi ki to ise ignore karein.")
add("hinglish",0,"school","School notice: Parent-teacher meeting {date} ko {time} hai. Kripya attend karein.")
add("hinglish",0,"subsidy","Aapki gas subsidy Rs {amt} {date} ko account number 1234 me credit ho gayi hai.")
add("hinglish",0,"courier","Aapka courier {order} aaj {time} deliver ho gaya. App me apna experience rate karein.")
add("hinglish",0,"holiday","Bank holiday notice: {date} ko hamari branches band rahengi. Net banking aur UPI chalu rahenge. - {bank}")
add("hinglish",0,"table","Hi {name}, aaj {time} {merchant} me 4 logo ki table book ho gayi hai.")
add("hinglish",0,"fastag","Aapka FASTag Rs {amt} se recharge ho gaya hai. Balance update ho gaya hai. - {bank}")
add("hinglish",0,"chat","Thanks {name}, main dekh kar shaam tak reply karunga.")
# ============ HINGLISH scam ============
add("hinglish",1,"netflix","Dear {name}, aapka Netflix payment fail ho gaya. 24 ghante me {link} par card details update karo warna plan cancel ho jayega.")
add("hinglish",1,"subsidy","Aapki bijli subsidy band ho gayi hai. Chalu karne ke liye {phone} par apna Aadhaar aur bank account number batao.")
add("hinglish",1,"scheme","Dear beneficiary, nayi sarkari yojana me aapke liye Rs {amt} approve hue hain. Lene ke liye {link} par bank details ke saath register karo.")
add("hinglish",1,"jobfee","Congratulations! Aapka {merchant} delivery job ke liye selection hua hai. Joining pakki karne ke liye Rs {amt} registration fee jama karo.")
add("hinglish",1,"bonus","Aapki insurance policy ka Rs {amt} bonus ready hai. Paisa pane ke liye {phone} par call karo aur OTP batao.")
add("hinglish",1,"limit","Hello, main bank ke credit card department se bol raha hu. Aapki limit badh rahi hai, kripya aapko aaya 6 digit code batao.")
add("hinglish",1,"crypto","Hamare crypto trading group se 3 din me paisa double karo. {link} par Rs {amt} deposit karo, withdrawal guaranteed.")
add("hinglish",1,"recharge","Sabhi users ke liye aaj hi Rs {amt} ka free recharge. {link} par claim karo.")
add("hinglish",1,"pension","Aapki pension rok di gayi hai. Turant {link} par life certificate verify karo warna benefit band ho jayega.")
add("hinglish",1,"tax","Aapka account Income Tax department ki jaanch me hai. Giraftari se bachne ke liye abhi Rs {amt} penalty bharo. Call karo {phone}.")


def fill(lang, t):
    return t.format(bank=random.choice(BANKS), merchant=random.choice(MERCH), link=random.choice(LINKS), phone=random.choice(PHONES),
                    amt=random.choice(AMTS), date=random.choice(DATES[lang]), time=random.choice(TIMES[lang]), city=random.choice(CITIES[lang]),
                    name=random.choice(NAMES), order="OD" + str(random.randint(10**8, 10**9 - 1)), otp=str(random.randint(100000, 999999)),
                    num=random.randint(100, 999))


rows = []
for tid, (lang, label, typ, text) in enumerate(T, start=1000):
    seen = set()
    for _ in range(80):
        s = fill(lang, text)
        if s not in seen:
            seen.add(s); rows.append({"text": s, "label": label, "lang": lang, "type": typ, "template_id": tid})
        if len(seen) >= 22: break
with open(OUT / "synthetic_v2.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=["text", "label", "lang", "type", "template_id"]); w.writeheader(); w.writerows(rows)
print(f"templates={len(T)} rows={len(rows)}")
