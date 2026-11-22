"""Team-written Hindi (Devanagari) and Hinglish message templates, expanded with fake slot values.

Why: public data has almost no Hindi/Hinglish, and the spec's collection targets (100+ Hindi scams, 150+ Hinglish scams,
150+ scary-looking genuine messages) are met with this file. All messages are written from patterns, contain no real
numbers/names/accounts, and each template is one split group. Drafted with Claude Code (AI-tool disclosure in README);
a native speaker should review wording. Output: data/team/messages_v3.csv
"""
import csv
import random
from pathlib import Path

random.seed(33)
OUT = Path(__file__).resolve().parent.parent / "data" / "team"
BANKS = ["SBI", "HDFC", "ICICI", "Axis", "Canara", "PNB", "Bank of Baroda"]
MERCH = ["Swiggy", "Zomato", "Amazon", "Flipkart", "Ola", "Uber", "Myntra"]
LINKS = ["bit.ly/k9xQ2", "tinyurl.com/p8Lm3", "http://claim-now.top", "http://secure-verify.xyz", "cutt.ly/g7Rt", "http://upd-kyc.in.net", "rb.gy/z4Yn1"]
PHONES = ["9812345670", "7000011122", "8899001122", "9123450987", "6001234567"]
AMTS = ["999", "1,500", "4,200", "8,000", "12,500", "25,000", "60,000"]
NAMES = ["राहुल", "प्रिया", "अमित", "नेहा", "कमल"]
NAMES_L = ["Rahul", "Priya", "Amit", "Neha", "Kamal"]
T = []


def add(label, typ, hi, hing):
    T.append((label, typ, hi, hing))


# ------------------------------ scam: (hi, hinglish) ------------------------------
add(1, "sim_block", "आपका आधार से जुड़ा सिम 2 घंटे में बंद हो जाएगा। अभी {phone} पर कॉल करें।", "Aapka Aadhaar se juda SIM 2 ghante me band ho jayega. Abhi {phone} par call karein.")
add(1, "fake_debit", "आपके खाते से Rs {amt} कटने वाले हैं। रोकने के लिए {link} पर क्लिक करें।", "Aapke account se Rs {amt} katne wale hain. Rokne ke liye {link} par click karein.")
add(1, "refund_link", "आपके पेमेंट का Rs {amt} रिफंड अटका है। रिफंड पाने के लिए यह लिंक खोलें {link}", "Aapke payment ka Rs {amt} refund atka hai. Refund pane ke liye ye link kholein {link}")
add(1, "wedding_apk", "शादी का निमंत्रण पत्र देखें: {link} (एपीके डाउनलोड करें)", "Shaadi ka invitation card dekhein: {link} (apk download karein)")
add(1, "echallan", "आपके वाहन का ई-चालान Rs {amt} जारी हुआ है। अभी भुगतान करें {link}", "Aapke vehicle ka e-challan Rs {amt} jari hua hai. Abhi payment karein {link}")
add(1, "scheme_ids", "प्रधानमंत्री योजना में आपका नाम चयनित हुआ। Rs {amt} पाने के लिए आधार और खाता नंबर भेजें।", "PM yojana me aapka naam select hua. Rs {amt} pane ke liye Aadhaar aur account number bhejein.")
add(1, "meter_kyc", "बिजली विभाग: आपका मीटर केवाईसी बाकी है, कनेक्शन कट जाएगा। {phone} पर संपर्क करें।", "Bijli vibhag: aapka meter KYC baaki hai, connection kat jayega. {phone} par sampark karein.")
add(1, "telegram_task", "टेलीग्राम पर टास्क पूरा करें और रोज़ Rs {amt} कमाएं। जुड़ें {link}", "Telegram par task poora karein aur roz Rs {amt} kamayein. Join karein {link}")
add(1, "fake_helpline", "आपका {bank} अकाउंट सस्पेंड हो गया है। हेल्पलाइन {phone} पर कॉल करके ओटीपी बताएं।", "Aapka {bank} account suspend ho gaya hai. Helpline {phone} par call karke OTP batayein.")
add(1, "policy_maturity", "आपकी पॉलिसी मैच्योर हो गई है। Rs {amt} पाने के लिए प्रोसेसिंग फीस जमा करें।", "Aapki policy mature ho gayi hai. Rs {amt} pane ke liye processing fee jama karein.")
add(1, "card_upgrade", "आपके कार्ड की लिमिट बढ़ाई जा रही है। कन्फर्म करने के लिए ओटीपी और सीवीवी बताएं।", "Aapke card ki limit badhai ja rahi hai. Confirm karne ke liye OTP aur CVV batayein.")
add(1, "new_number_mom", "मम्मी, मेरा फोन टूट गया, यह नया नंबर है। अभी Rs {amt} भेज दो, बाद में बताऊँगा।", "Mummy, mera phone toot gaya, ye naya number hai. Abhi Rs {amt} bhej do, baad me bataunga.")
add(1, "ed_notice", "ईडी नोटिस: आपके खिलाफ मनी लॉन्ड्रिंग का केस दर्ज है। जमानत के लिए अभी Rs {amt} ट्रांसफर करें।", "ED notice: aapke khilaf money laundering ka case darj hai. Bail ke liye abhi Rs {amt} transfer karein.")
add(1, "courier_drugs", "कूरियर: आपके पार्सल में प्रतिबंधित सामान मिला है। कस्टम फीस Rs {amt} अभी भेजें वरना गिरफ्तारी होगी।", "Courier: aapke parcel me prohibited saamaan mila hai. Customs fee Rs {amt} abhi bhejein warna giraftari hogi.")
add(1, "loan_threat", "लोन चुकाओ वरना आपकी फोटो आपके सभी कॉन्टैक्ट्स को भेज दी जाएगी। {phone}", "Loan chukao warna aapki photo aapke sabhi contacts ko bhej di jayegi. {phone}")
add(1, "kbc", "KBC लॉटरी में आपका नंबर चुना गया है, इनाम Rs {amt}। {phone} पर व्हाट्सऐप करें।", "KBC lottery me aapka number chuna gaya hai, inaam Rs {amt}. {phone} par WhatsApp karein.")
add(1, "stock_group", "शेयर मार्केट टिप्स VIP ग्रुप: 1 हफ्ते में दोगुना पैसा, गारंटी। जुड़ें {link}", "Share market tips VIP group: 1 hafte me double paisa, guarantee. Join karein {link}")
add(1, "card_expired", "आपका {bank} डेबिट कार्ड एक्सपायर हो गया है। नया कार्ड पाने के लिए कार्ड नंबर और पिन भेजें।", "Aapka {bank} debit card expire ho gaya hai. Naya card pane ke liye card number aur PIN bhejein.")
add(1, "job_training_fee", "{merchant} में नौकरी पक्की! ट्रेनिंग फीस Rs {amt} जमा करें और जॉइनिंग लेटर पाएं।", "{merchant} me naukri pakki! Training fee Rs {amt} jama karein aur joining letter payein.")
add(1, "free_voucher", "आपके लिए Rs {amt} का फ्री गिफ्ट वाउचर, अभी क्लेम करें {link}", "Aapke liye Rs {amt} ka free gift voucher, abhi claim karein {link}")
add(1, "bill_link", "आपका बिजली बिल Rs {amt} बाकी है, आज रात कनेक्शन कटेगा। भुगतान करें {link}", "Aapka bijli bill Rs {amt} baaki hai, aaj raat connection katega. Payment karein {link}")
add(1, "account_delete", "आपका {merchant} अकाउंट 24 घंटे में डिलीट हो जाएगा। अभी वेरिफाई करें {link}", "Aapka {merchant} account 24 ghante me delete ho jayega. Abhi verify karein {link}")
add(1, "qr_receive", "पैसे पाने के लिए यह क्यूआर कोड स्कैन करें और अपना यूपीआई पिन डालें।", "Paise pane ke liye ye QR code scan karein aur apna UPI PIN daalein.")
add(1, "scholarship", "छात्रवृत्ति Rs {amt} स्वीकृत हुई है। पाने के लिए बैंक विवरण यहाँ भरें {link}", "Scholarship Rs {amt} approve hui hai. Pane ke liye bank details yahan bharein {link}")
add(1, "fake_officer_call", "मैं {bank} का मैनेजर बोल रहा हूँ। आपके खाते में गड़बड़ी है, अभी आए हुए कोड बताइए।", "Main {bank} ka manager bol raha hu. Aapke account me gadbadi hai, abhi aaye hue code bataiye.")
add(1, "aadhaar_misuse", "आपका आधार अवैध गतिविधि में मिला है। गिरफ्तारी से बचने के लिए अभी {phone} पर कॉल करें, किसी को न बताएं।", "Aapka Aadhaar illegal activity me mila hai. Giraftari se bachne ke liye abhi {phone} par call karein, kisi ko mat batana.")
# ------------------------------ genuine (scary-looking and ordinary) ------------------------------
add(0, "debit_alert", "{bank}: आपके खाते से Rs {amt} डेबिट हुए। आपने नहीं किया? कार्ड पर छपे नंबर पर तुरंत कॉल करें।", "{bank}: Aapke account se Rs {amt} debit hue. Aapne nahi kiya? Card par chhape number par turant call karein.")
add(0, "login_otp", "{merchant} लॉगिन के लिए आपका ओटीपी {otp} है। इसे किसी को न बताएं, कंपनी का कर्मचारी भी नहीं मांगता।", "{merchant} login ke liye aapka OTP {otp} hai. Ise kisi ko na batayein, company ka karmchari bhi nahi maangta.")
add(0, "upi_received", "आपको {name} से Rs {amt} प्राप्त हुए। यूपीआई संदर्भ संख्या {otp}।", "Aapko {name_l} se Rs {amt} prapt hue. UPI reference number {otp}.")
add(0, "bill_reminder", "आपका बिजली बिल Rs {amt} है। अंतिम तिथि 20 तारीख। आधिकारिक वेबसाइट या ऐप से भुगतान करें।", "Aapka bijli bill Rs {amt} hai. Last date 20 tarikh. Official website ya app se payment karein.")
add(0, "pnr", "आपका टिकट कन्फर्म है। पीएनआर {otp}। यात्रा से पहले आईडी साथ रखें।", "Aapka ticket confirm hai. PNR {otp}. Yatra se pehle ID saath rakhein.")
add(0, "delivery_otp", "आपका ऑर्डर आज पहुँचेगा। डिलीवरी के समय डिलीवरी पार्टनर को ओटीपी {otp} बताएं।", "Aapka order aaj pahunchega. Delivery ke samay delivery partner ko OTP {otp} batayein.")
add(0, "card_statement", "आपके {bank} क्रेडिट कार्ड का स्टेटमेंट तैयार है। देय राशि Rs {amt}। अंतिम तिथि 15 तारीख।", "Aapke {bank} credit card ka statement taiyar hai. Due amount Rs {amt}. Last date 15 tarikh.")
add(0, "recharge_ok", "आपका Rs {amt} का रिचार्ज सफल रहा। धन्यवाद।", "Aapka Rs {amt} ka recharge safal raha. Dhanyavaad.")
add(0, "lab_report", "आपकी लैब रिपोर्ट तैयार है। कृपया अस्पताल की आधिकारिक वेबसाइट से डाउनलोड करें।", "Aapki lab report taiyar hai. Kripya hospital ki official website se download karein.")
add(0, "exam_notice", "परीक्षा सूचना: कल की परीक्षा सुबह 10 बजे शुरू होगी। प्रवेश पत्र साथ लाएं।", "Exam notice: kal ki pariksha subah 10 baje shuru hogi. Admit card saath layein.")
add(0, "premium_receipt", "आपका प्रीमियम Rs {amt} प्राप्त हुआ। पॉलिसी सक्रिय है। धन्यवाद।", "Aapka premium Rs {amt} prapt hua. Policy active hai. Dhanyavaad.")
add(0, "kyc_branch", "{bank}: आपके खाते का केवाईसी अपडेट बाकी है। कृपया दस्तावेज़ों के साथ अपनी शाखा में आएं। लिंक या ओटीपी साझा न करें।", "{bank}: Aapke account ka KYC update baaki hai. Kripya documents ke saath apni branch me aayein. Link ya OTP share na karein.")
add(0, "cab_otp", "आपकी राइड आ रही है। यात्रा शुरू करने के लिए ड्राइवर को ओटीपी {otp} बताएं।", "Aapki ride aa rahi hai. Trip shuru karne ke liye driver ko OTP {otp} batayein.")
add(0, "family_chat", "{name}: मैं थोड़ा देर से आऊँगा, खाना खा लेना।", "{name_l}: Main thoda der se aaunga, khana kha lena.")
add(0, "uidai_otp", "आपके आधार के लिए ओटीपी {otp} है। यह 10 मिनट के लिए मान्य है। इसे किसी से साझा न करें।", "Aapke Aadhaar ke liye OTP {otp} hai. Ye 10 minute ke liye valid hai. Ise kisi se share na karein.")
add(0, "gas_booked", "आपका गैस सिलेंडर बुक हो गया है। 3 दिन में डिलीवरी होगी। अतिरिक्त पैसे न दें।", "Aapka gas cylinder book ho gaya hai. 3 din me delivery hogi. Extra paise na dein.")
add(0, "emi_due", "आपके लोन की Rs {amt} की ईएमआई कल देय है। खाते में पर्याप्त राशि रखें। - {bank}", "Aapke loan ki Rs {amt} ki EMI kal due hai. Account me sufficient balance rakhein. - {bank}")
add(0, "salary", "आपके खाते में Rs {amt} वेतन जमा हुआ। उपलब्ध शेष राशि देखने के लिए ऐप खोलें। - {bank}", "Aapke account me Rs {amt} salary credit hui. Available balance dekhne ke liye app kholein. - {bank}")
add(0, "kisan_credit", "पीएम किसान की किस्त Rs {amt} आपके खाते में जमा कर दी गई है।", "PM Kisan ki kist Rs {amt} aapke account me jama kar di gayi hai.")
add(0, "branch_notice", "{bank} शाखा सूचना: कल बैंक अवकाश रहेगा। नेट बैंकिंग और यूपीआई चालू रहेंगे।", "{bank} branch notice: kal bank holiday rahega. Net banking aur UPI chalu rahenge.")


def fill(t, lang):
    n = random.randrange(len(NAMES))
    return t.format(bank=random.choice(BANKS), merchant=random.choice(MERCH), link=random.choice(LINKS), phone=random.choice(PHONES),
                    amt=random.choice(AMTS), otp=str(random.randint(100000, 999999)), name=NAMES[n], name_l=NAMES_L[n])


rows = []
for tid, (label, typ, hi, hing) in enumerate(T):
    for lang, tpl in (("hindi", hi), ("hinglish", hing)):
        seen = set()
        for _ in range(60):
            s = fill(tpl, lang)
            if s not in seen:
                seen.add(s); rows.append({"text": s, "label": label, "lang": lang, "type": typ, "group": f"team_v3:{tid}:{lang}"})
            if len(seen) >= 18:
                break
OUT.mkdir(parents=True, exist_ok=True)
with open(OUT / "messages_v3.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=["text", "label", "lang", "type", "group"]); w.writeheader(); w.writerows(rows)
sc = sum(1 for r in rows if r["label"] == 1)
print(f"templates={len(T)} rows={len(rows)} scam={sc} genuine={len(rows)-sc}")
