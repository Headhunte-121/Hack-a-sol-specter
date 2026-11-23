"""Generate the v3 gap data: scam families the shipped model missed and the matching genuine look-alikes, in English, Hindi and Hinglish.

Why this exists: every hard-negative family in the training data (PM Kisan credit notices, credit-card statements, genuine refunds, OTP
deliveries, links in family chats) pushed its topic words towards "genuine", while the scams that use the same topic words had no matching
rows, so a PM Kisan or credit-card scam scored low. Here each topic has BOTH sides, so the model has to learn the ACTION (share an OTP,
install an apk, pay a fee, scan to receive) and not the topic. Also covers: QR-to-receive tricks, wrong-payment / collect requests, investment
and task-for-money lures, polite Hindi digital-arrest calls, "Aadhaar verification expired" notices, redelivery fees, plus genuine messages
that contain an ordinary link (the has_link signal had learned that any link means scam).

Every template is its own group (group ids end :g3a, :g3b ...), so no template can leak across the train / validation / test split, and every
row is checked against the frozen evaluation texts with leak_check (rows that match are removed). Nothing here was written by looking at a
frozen evaluation text or at the dev stress set (ml/dev); all names, numbers and accounts are invented.

Writes data/team/gap_v3_scam.csv and data/team/gap_v3_genuine.csv (columns text,label,lang,group).
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
RNG = random.Random(20261124)

BANK = ["SBI", "HDFC Bank", "ICICI Bank", "Axis Bank", "Bank of Baroda", "Canara Bank", "PNB", "Union Bank"]
BANK_HI = ["एसबीआई", "एचडीएफसी बैंक", "आईसीआईसी बैंक", "एक्सिस बैंक", "बैंक ऑफ बड़ौदा", "पंजाब नेशनल बैंक"]
APP = ["PhonePe", "GPay", "Paytm", "BHIM"]
APP_HI = ["फोनपे", "गूगल पे", "पेटीएम", "भीम"]
AMT = ["2,500", "4,200", "7,500", "10,000", "18,000", "25,000", "40,000", "1,20,000"]
SMALL = ["49", "99", "150", "300", "499", "750"]
PH = ["98XXXXXX10", "70XXXXXX55", "90XXXXXX21", "81XXXXXX47"]
BADLINK = ["http://bit.ly/3kXz9", "http://sbi-update-kyc.top/login", "http://pm-kisan-claim.xyz/verify", "http://bank-secure-reward.club/redeem", "http://tinyurl.com/4abx7"]
GOODLINK = ["https://pmkisan.gov.in", "https://uidai.gov.in", "https://www.irctc.co.in", "https://www.amazon.in/orders", "https://www.sbi.co.in", "https://www.hdfcbank.com"]
DAYS = ["Monday", "Tuesday", "Friday", "Saturday"]
NAME = ["Rohit", "Amit", "Sunil", "Vikas", "Neha", "Pooja", "Ramesh", "Sita"]
NAME_HI = ["रोहित", "अमित", "सुनील", "विकास", "नेहा", "पूजा", "रमेश", "सीता"]


def expand(group: str, lang: str, label: int, templates: list[str], slots: dict[str, list[str]], per: int = 4) -> list[dict]:
    rows = []
    for k, tpl in enumerate(templates):
        names = [s for s in slots if "{" + s + "}" in tpl]
        combos = list(itertools.product(*[slots[s] for s in names])) or [()]
        RNG.shuffle(combos)
        for combo in combos[:per]:
            rows.append({"text": tpl.format(**dict(zip(names, combo))), "label": label, "lang": lang, "group": f"{group}:{lang[:2]}:g3{chr(97 + k)}"})
    return rows


S = dict(b=BANK, bh=BANK_HI, app=APP, apph=APP_HI, a=AMT, sm=SMALL, ph=PH, bl=BADLINK, gl=GOODLINK, d=DAYS, n=NAME, nh=NAME_HI)


def scam() -> list[dict]:
    R: list[dict] = []
    # --- QR code to RECEIVE money (a QR code is only ever for paying)
    R += expand("qr_receive", "english", 1, [
        "Scan this QR code to receive Rs {a} from our company for your resume selection. Enter your UPI PIN to accept.",
        "Your refund of Rs {a} is ready. Scan the QR sent below with {app} and put your PIN to receive the money.",
        "Congratulations, you are selected for cashback. Scan this QR to receive Rs {a} in your account, PIN required.",
        "To receive the advance payment for your item, scan my QR and approve the request on {app}.",
    ], S)
    R += expand("qr_receive", "hinglish", 1, [
        "Aapka Rs {a} ka refund aaya hai. Paisa receive karne ke liye ye QR scan karein aur {app} me apna PIN daalein.",
        "Bhai tumhara payment bhejna hai, ye QR scan karke PIN daal do, paisa turant aa jayega.",
        "Aapko cashback mila hai. QR code scan kijiye aur UPI PIN dalkar Rs {a} paiye.",
        "Item ka advance dene ke liye main QR bhej raha hoon, scan karke approve kar dijiye, paisa aapke account me aa jayega.",
    ], S)
    R += expand("qr_receive", "hindi", 1, [
        "आपके खाते में {a} रुपये का रिफंड आया है। पैसे पाने के लिए यह क्यूआर कोड स्कैन करें और अपना यूपीआई पिन डालें।",
        "बधाई हो, आपको कैशबैक मिला है। {apph} में यह क्यूआर स्कैन करके पिन डालिए और {a} रुपये रिसीव कीजिए।",
        "सामान का एडवांस भेजने के लिए मैं क्यूआर कोड भेज रहा हूँ, इसे स्कैन करके मंजूर कर दीजिए, पैसा आपके खाते में आ जाएगा।",
    ], S)
    # --- wrong payment / collect request
    R += expand("wrong_pay", "english", 1, [
        "Hello, sorry, I sent Rs {a} to your {app} by mistake. Please return it and also approve the collect request I have just sent.",
        "Sir I have accidentally transferred Rs {a} to you. Kindly send it back today, my father is in the hospital.",
        "Hi, the amount of Rs {a} that landed in your account was meant for my friend. Please refund it to this number and accept the request.",
    ], S)
    R += expand("wrong_pay", "hinglish", 1, [
        "Bhaiya galti se aapke number par Rs {a} chale gaye hain, please wapas bhej do aur meri collect request approve kar dena.",
        "Sir {app} par ghalat number daalne se {a} aapko chale gaye. Kripya wapas kar dijiye, bahut zaroori hai.",
        "Namaste, mere dost ke bajaye aapko {a} rupaye transfer ho gaye. Refund kar do aur request accept kar lo please.",
    ], S)
    R += expand("wrong_pay", "hindi", 1, [
        "नमस्ते, गलती से आपके {apph} पर {a} रुपये चले गए हैं। कृपया वापस कर दें और मेरी कलेक्ट रिक्वेस्ट मंजूर कर दें।",
        "भाई साहब, गलत नंबर पर {a} रुपये भेज दिए। पैसे लौटा दीजिए, मेरे पिताजी अस्पताल में हैं।",
    ], S)
    # --- investment / task / telegram lures
    R += expand("invest", "hindi", 1, [
        "निवेश करें {a} रुपये और 7 दिन में पाएं दोगुना, गारंटीड रिटर्न। हमारे वीआईपी स्टॉक ग्रुप से अभी जुड़ें।",
        "घर बैठे रोज कमाएं 3,000 रुपये। बस वीडियो लाइक करें और रेटिंग दें। पहले {sm} रुपये रजिस्ट्रेशन फीस जमा करें।",
        "शेयर बाजार की सीक्रेट टिप्स चाहिए? हमारे टेलीग्राम ग्रुप में जुड़ें, 100 प्रतिशत गारंटीड मुनाफा, पहले {a} रुपये जमा करें।",
    ], S)
    R += expand("invest", "hinglish", 1, [
        "Sirf {a} lagao aur 10 din me double paisa kamao, 100% guaranteed profit. Hamare VIP trading group se jud jao.",
        "Work from home! Roz 4000 kamao, bas YouTube videos like karo. Pehle {sm} rupaye task deposit bhejna hoga.",
        "Crypto plan me invest karo Rs {a}, har hafte 30% return guaranteed. Abhi slot book karo, limited seats.",
    ], S)
    R += expand("invest", "english", 1, [
        "Invest Rs {a} in our stock tips group and get guaranteed returns of 60% in two weeks. Join the VIP Telegram channel now.",
        "Part time job: earn Rs 4,000 daily by rating hotels on Google Maps. Pay the Rs {sm} task deposit to start, refundable with profit.",
        "Earn from home, no experience needed. Complete simple tasks, withdraw daily. First deposit Rs {a} to unlock your account.",
    ], S)
    # --- government scheme / PM Kisan style (no link needed): share bank details or OTP to receive money
    R += expand("scheme", "hinglish", 1, [
        "Aapki PM Kisan ki agli kist ruki hui hai. Release karne ke liye apni bank details aur OTP is number par bhejein.",
        "Ladli Behna yojana ka paisa aapke account me aane wala hai. Pehle ye link kholkar apna ATM PIN daalein: {bl}",
        "Sarkari subsidy ke Rs {a} aapke naam hain. Paisa pane ke liye Aadhaar number aur account number turant batayein.",
        "Aapka ration card band ho jayega. Abhi {bl} par jaakar e-KYC karein aur OTP daalein.",
    ], S)
    R += expand("scheme", "hindi", 1, [
        "आपकी पीएम किसान की अगली किस्त रुकी हुई है। जारी करने के लिए अपना बैंक खाता नंबर और ओटीपी इस नंबर पर भेजें।",
        "लाडली बहना योजना का पैसा आपके खाते में आने वाला है। पहले अपना एटीएम पिन इस लिंक पर डालें: {bl}",
        "सरकारी सब्सिडी के {a} रुपये आपके नाम हैं। पैसा पाने के लिए आधार नंबर और खाता नंबर तुरंत बताएं।",
    ], S)
    R += expand("scheme", "english", 1, [
        "Your PM Kisan instalment is on hold. To release it, send your bank account number and the OTP you receive to this number.",
        "Government subsidy of Rs {a} is pending in your name. Share your Aadhaar and account number now to receive it.",
    ], S)
    # --- credit card reward points + apk
    R += expand("card_apk", "hinglish", 1, [
        "Aapke credit card ke 5000 reward points aaj expire ho rahe hain. Ye apk download karke redeem karein: {bl}",
        "Dear customer aapke {b} card ka reward redeem karne ke liye ye app install karein aur card number aur CVV bharein.",
        "Aapka credit card limit badh gaya hai. Is link se app download karke OTP verify karein.",
    ], S)
    R += expand("card_apk", "hindi", 1, [
        "आपके क्रेडिट कार्ड के 5000 रिवॉर्ड पॉइंट आज समाप्त हो रहे हैं। एपीके डाउनलोड करके रिडीम करें: {bl}",
        "प्रिय ग्राहक, आपके {bh} कार्ड का रिवॉर्ड पाने के लिए यह ऐप इंस्टॉल करें और कार्ड नंबर तथा सीवीवी डालें।",
    ], S)
    R += expand("card_apk", "english", 1, [
        "Your {b} credit card reward points will expire today. Download the app from {bl} and enter your card number and CVV to redeem.",
        "Dear customer, your card limit is increased. Install this apk and verify with the OTP to activate: {bl}",
    ], S)
    # --- polite Hindi / English digital arrest, cyber cell, narcotics, customs
    R += expand("arrest", "hindi", 1, [
        "मैं मुंबई साइबर सेल से बोल रहा हूँ। आपके आधार से मनी लॉन्ड्रिंग हुई है। कृपया कॉल मत काटिए और वीडियो कॉल पर बने रहिए।",
        "आपके नाम से एक पार्सल पकड़ा गया है जिसमें ड्रग्स मिले हैं। आप डिजिटल अरेस्ट में हैं, किसी को कुछ मत बताइए और जांच के लिए पैसे जमा कीजिए।",
        "यह नारकोटिक्स विभाग है। आपके खिलाफ गैर जमानती वारंट जारी हुआ है। गिरफ्तारी से बचना है तो सत्यापन राशि सुरक्षित खाते में ट्रांसफर करें।",
        "मैं सीबीआई अधिकारी बोल रहा हूँ। आपके खाते से अवैध लेनदेन हुआ है। कॉल न काटें और अपनी बैंक जानकारी अभी बताएं।",
    ], S)
    R += expand("arrest", "hinglish", 1, [
        "Main Delhi police cyber cell se bol raha hoon. Aapke Aadhaar par drugs ka parcel pakda gaya hai. Call mat kaatiye, video call par rahiye.",
        "Aapke khilaaf arrest warrant nikla hai. Digital arrest se bachna hai to safe account me verification amount transfer kijiye aur kisi ko mat bataiye.",
        "Yeh customs department hai. Aapke parcel me illegal saamaan mila hai. Jaanch ke liye turant Rs {a} jama kariye warna case darj hoga.",
    ], S)
    R += expand("arrest", "english", 1, [
        "This is the cyber crime branch. Money laundering case is registered on your Aadhaar. Stay on the video call and do not tell anyone, or you will be arrested.",
        "We are from the narcotics bureau. A non bailable warrant is issued against you. Transfer the verification amount to the RBI safe account immediately.",
    ], S)
    # --- Aadhaar / KYC / SIM / PAN verification expired + call or link
    R += expand("kyc_exp", "hinglish", 1, [
        "Sir aapka Aadhaar verification expire ho gaya hai. Is number par call karke apni details confirm kijiye warna SIM band ho jayegi.",
        "Aapka PAN card aapke {b} account se link nahi hai. Aaj raat tak update karein nahi to account freeze ho jayega: {bl}",
        "Aapki KYC adhuri hai. Turant {ph} par call karein aur OTP batayein, warna account block ho jayega.",
    ], S)
    R += expand("kyc_exp", "hindi", 1, [
        "आपका आधार सत्यापन समाप्त हो गया है। इस नंबर पर कॉल करके अपनी जानकारी बताएं वरना सिम बंद हो जाएगी।",
        "आपका केवाईसी अधूरा है। आज रात तक {bl} पर जाकर अपडेट करें, नहीं तो खाता बंद हो जाएगा।",
    ], S)
    R += expand("kyc_exp", "english", 1, [
        "Your Aadhaar verification has expired. Call {ph} and confirm your details today or your mobile number will be deactivated.",
        "Your {b} KYC is incomplete. Update at {bl} within 24 hours to avoid account suspension.",
    ], S)
    # --- parcel redelivery fee / customs
    R += expand("parcel_fee", "hinglish", 1, [
        "Aapka parcel aaya hai lekin address adhura hai. Delivery ke liye Rs {sm} is link par pay karein: {bl}",
        "Courier company: aapka package rok diya gaya hai. Redelivery charge Rs {sm} abhi UPI se bhejiye.",
    ], S)
    R += expand("parcel_fee", "hindi", 1, [
        "आपका पार्सल पहुंच गया है पर पता अधूरा है। डिलीवरी के लिए {sm} रुपये इस लिंक पर जमा करें: {bl}",
        "कूरियर कंपनी: आपका पैकेज रोक लिया गया है। रीडिलीवरी शुल्क {sm} रुपये अभी यूपीआई से भेजें।",
    ], S)
    R += expand("parcel_fee", "english", 1, [
        "Your parcel is on hold due to an incomplete address. Pay the Rs {sm} redelivery fee here to release it: {bl}",
    ], S)
    # --- family emergency / new number
    R += expand("family_sos", "hinglish", 1, [
        "Papa main hoon, ye mera naya number hai. Mera accident ho gaya hai, abhi turant Rs {a} bhej do, kisi ko mat batana.",
        "Mummy phone kharab ho gaya isliye naye number se message kar raha hoon. Fees bharni hai, {a} rupaye abhi UPI kar do.",
    ], S)
    R += expand("family_sos", "hindi", 1, [
        "पापा मैं बोल रहा हूँ, यह मेरा नया नंबर है। मेरा एक्सीडेंट हो गया है, अभी तुरंत {a} रुपये भेजो, किसी को मत बताना।",
        "माँ फोन खराब हो गया है इसलिए नए नंबर से लिख रहा हूँ। फीस भरनी है, {a} रुपये अभी यूपीआई कर दो।",
    ], S)
    R += expand("family_sos", "english", 1, [
        "Hi dad, this is my new number as my phone broke. I am in trouble, please send Rs {a} right now and do not tell mom.",
    ], S)
    # --- electricity / gas / SIM block with callback
    R += expand("utility_cut", "hinglish", 1, [
        "Aapka bijli bill pending hai. Aaj raat 9:30 baje connection kat jayega. Turant is number par sampark karein: {ph}",
        "Aapka gas connection band hone wala hai. Abhi {ph} par call karke KYC karwayein aur OTP batayein.",
    ], S)
    R += expand("utility_cut", "hindi", 1, [
        "आपका बिजली कनेक्शन आज रात काट दिया जाएगा क्योंकि पिछला बिल जमा नहीं हुआ। अभी इस नंबर पर बात करें: {ph}",
    ], S)
    R += expand("utility_cut", "english", 1, [
        "Dear consumer, your power connection will be cut tonight as last bill is unpaid. Call the officer on {ph} now to avoid disconnection.",
    ], S)
    # --- loan / insurance fee
    R += expand("loan_fee", "hinglish", 1, [
        "Aapka personal loan approve ho gaya hai. Bas Rs {sm} processing fee jama karein, 10 minute me paisa account me.",
        "Instant loan Rs {a} bina document ke. Pehle insurance charge bhejiye, phir amount release hoga.",
    ], S)
    R += expand("loan_fee", "hindi", 1, [
        "आपका लोन मंजूर हो गया है। राशि पाने के लिए पहले {sm} रुपये प्रोसेसिंग शुल्क भेजें।",
    ], S)
    R += expand("loan_fee", "english", 1, [
        "Instant loan of Rs {a} approved without documents. Pay the Rs {sm} insurance charge first to release the amount.",
    ], S)
    # --- marketplace advance, remote access, lottery, tax refund
    R += expand("market", "hinglish", 1, [
        "Maine aapka saamaan khareedne ka advance bhej diya hai. Ye QR scan karke paisa le lijiye, bas UPI PIN daalna hoga.",
        "Main army me hoon, payment {app} se karunga. Aap ye link kholkar apna PIN daal dijiye taaki paisa aa jaye.",
    ], S)
    R += expand("remote", "hinglish", 1, [
        "Aapka refund process karne ke liye AnyDesk install karein aur 9 digit code mujhe bata dijiye.",
    ], S)
    R += expand("remote", "english", 1, [
        "Our technician will fix your phone. Install AnyDesk, share the 9 digit code with us and we will process your refund.",
    ], S)
    R += expand("lottery", "hinglish", 1, [
        "Badhai ho! Aapko KBC lucky draw me Rs {a} ka inaam mila hai. Claim karne ke liye Rs {sm} processing fee bhejiye.",
    ], S)
    R += expand("tax", "hindi", 1, [
        "आयकर विभाग से आपको {a} रुपये का रिफंड मिलेगा। इसके लिए अपना खाता नंबर और ओटीपी बताएं।",
    ], S)
    return R


def genuine() -> list[dict]:
    R: list[dict] = []
    # --- government scheme credits and notices (official link or no ask)
    R += expand("scheme_ok", "english", 0, [
        "PM Kisan: Rs 2,000 has been credited to your account. Check your status only on the official portal {gl}.",
        "Your ration card e-KYC is complete. For any query visit your nearest ration shop. No further action is needed.",
        "Subsidy of Rs {a} has been credited to your {b} account on {d}. Check your passbook for details.",
    ], S)
    R += expand("scheme_ok", "hinglish", 0, [
        "PM Kisan ki kist aapke khate me jama ho gayi hai. Adhik jankari ke liye apne bank se sampark karein.",
        "Aapke ration card ka e-KYC pura ho gaya hai. Kisi aur kaam ki zaroorat nahi hai.",
        "Sarkari subsidy ke Rs {a} aapke account me credit ho gaye hain. Passbook check kar lein.",
    ], S)
    R += expand("scheme_ok", "hindi", 0, [
        "पीएम किसान की किस्त आपके खाते में जमा हो गई है। अधिक जानकारी के लिए अपने बैंक से संपर्क करें।",
        "आपके राशन कार्ड का ई-केवाईसी पूरा हो गया है। अब किसी कार्रवाई की आवश्यकता नहीं है।",
        "सरकारी सब्सिडी के {a} रुपये आपके खाते में जमा हो गए हैं। पासबुक में देख लें।",
    ], S)
    # --- credit card statements, genuine reward notices, EMI
    R += expand("card_ok", "english", 0, [
        "Your {b} credit card statement of Rs {a} is generated. Minimum due Rs 450 by {d}. Pay through the official app only.",
        "You have earned 500 reward points on your {b} card. View and redeem them in the official app. Never share your OTP or CVV.",
        "Your {b} card ending 4821 was used for Rs {a}. If this was not you, call the number on the back of your card.",
    ], S)
    R += expand("card_ok", "hinglish", 0, [
        "Aapke {b} credit card ka statement Rs {a} ka ban gaya hai. Last date {d}. Official app se hi pay karein.",
        "Aapko {b} card par 500 reward points mile hain. Official app me dekhein. OTP ya CVV kisi ko na batayein.",
        "Aapka EMI Rs {a} kal debit hoga. Account me paryapt balance rakhein.",
    ], S)
    R += expand("card_ok", "hindi", 0, [
        "आपके {bh} क्रेडिट कार्ड का स्टेटमेंट {a} रुपये का बना है। अंतिम तिथि {d}। भुगतान केवल आधिकारिक ऐप से करें।",
        "आपको {bh} कार्ड पर 500 रिवॉर्ड पॉइंट मिले हैं। आधिकारिक ऐप में देखें। ओटीपी या सीवीवी किसी को न बताएं।",
    ], S)
    # --- OTP deliveries and awareness, Hinglish and Hindi
    R += expand("otp_ok", "hinglish", 0, [
        "Aapka OTP 482913 hai. Ise kisi ke saath share na karein. Bank kabhi OTP nahi maangta. - {b}",
        "{b}: UPI registration ke liye aapka OTP 665544 hai. Kisi ko na batayein, bank staff ko bhi nahi.",
    ], S)
    R += expand("otp_ok", "hindi", 0, [
        "आपका ओटीपी 774512 है। इसे किसी को न बताएं, बैंक कर्मचारी को भी नहीं। - {bh}",
    ], S)
    R += expand("awareness", "hinglish", 0, [
        "Savdhan rahein! Koi bhi bank ya police aapse OTP, PIN ya CVV nahi maangti. Fraud call aaye to 1930 par shikayat karein.",
        "Dhyan dein: QR code sirf paisa dene ke liye hota hai, paisa lene ke liye kabhi PIN ya QR scan nahi karna padta.",
        "Digital arrest ek fraud hai. Police kabhi video call par arrest nahi karti. Aisi call aaye to turant 1930 par batayein.",
    ], S)
    R += expand("awareness", "hindi", 0, [
        "सावधान रहें! कोई भी बैंक या पुलिस आपसे ओटीपी, पिन या सीवीवी नहीं मांगती। फ्रॉड कॉल आए तो 1930 पर शिकायत करें।",
        "ध्यान दें: पैसे पाने के लिए कभी पिन डालने या क्यूआर स्कैन करने की जरूरत नहीं होती।",
        "डिजिटल अरेस्ट एक धोखाधड़ी है। पुलिस कभी वीडियो कॉल पर गिरफ्तारी नहीं करती। ऐसी कॉल आए तो तुरंत 1930 पर बताएं।",
    ], S)
    R += expand("awareness", "english", 0, [
        "Beware: you never need to scan a QR code or enter your PIN to receive money. Anyone asking you to do so is a fraudster.",
        "Police or bank officials never ask you to stay on a video call or transfer money to a safe account. Report such calls on 1930.",
    ], S)
    # --- genuine refunds, KYC done, card block on request
    R += expand("refund_ok", "english", 0, [
        "Your refund of Rs {a} for order 8812 has been processed and will reach your original payment method in 5 to 7 days.",
        "Your KYC has been updated successfully. Thank you for banking with {b}.",
        "As requested by you, your {b} card has been blocked. A new card will be delivered in 7 days.",
    ], S)
    R += expand("refund_ok", "hinglish", 0, [
        "Aapke order ka Rs {a} ka refund process ho gaya hai. 5 se 7 din me original payment method me aa jayega.",
        "Aapka KYC safaltapoorvak update ho gaya hai. {b} ke saath bane rehne ke liye dhanyavad.",
        "Aapki request par aapka {b} card block kar diya gaya hai. Naya card 7 din me aa jayega.",
    ], S)
    R += expand("refund_ok", "hindi", 0, [
        "आपके ऑर्डर का {a} रुपये का रिफंड प्रोसेस हो गया है। 5 से 7 दिन में मूल भुगतान माध्यम में आ जाएगा।",
        "आपका केवाईसी सफलतापूर्वक अपडेट हो गया है। {bh} के साथ बने रहने के लिए धन्यवाद।",
    ], S)
    # --- delivery, telecom, utility, bank alerts
    R += expand("notice_ok", "hinglish", 0, [
        "Aapka parcel kal tak pahunch jayega. Delivery partner aapko call karega. Koi payment ki zaroorat nahi.",
        "Aapka bijli bill Rs {a} hai, last date {d}. Online payment official website ya app se karein.",
        "Aapke A/c XX4321 se Rs {a} debit hue hain. Agar aapne nahi kiya to bank ko turant batayein.",
        "Jio: aapka recharge safal raha. Validity {d} tak. Dhanyavad.",
    ], S)
    R += expand("notice_ok", "hindi", 0, [
        "आपका पार्सल कल तक पहुंचेगा। डिलीवरी पार्टनर आपको कॉल करेगा। किसी भुगतान की जरूरत नहीं है।",
        "आपका बिजली बिल {a} रुपये का है, अंतिम तिथि {d}। भुगतान आधिकारिक वेबसाइट या ऐप से करें।",
        "आपके खाते XX4321 से {a} रुपये डेबिट हुए हैं। यदि आपने नहीं किए तो बैंक को तुरंत बताएं।",
    ], S)
    R += expand("notice_ok", "english", 0, [
        "Your order has been shipped and will arrive by {d}. Track it in the official app. No payment is needed on delivery.",
        "Your electricity bill of Rs {a} is due on {d}. Pay on the official app or at the nearest counter.",
        "Rs {a} debited from A/c XX4321. If this was not you, call the number on the back of your card.",
    ], S)
    # --- ordinary people, ordinary links: the has_link signal had learned that any link means scam
    R += expand("link_ok", "english", 0, [
        "Here is the album from yesterday, it is in our family group: {gl}",
        "Meeting link for tomorrow 10 am: {gl} Please join five minutes early.",
        "Read this article, I think you will like it: {gl}",
        "The invitation for the function is here, do come with the family: {gl}",
        "Your tickets are here, show this at the gate: {gl}",
    ], S)
    R += expand("link_ok", "hinglish", 0, [
        "Kal ki photos ye rahi, apne family group me bhi daal di hain: {gl}",
        "Kal subah 10 baje ki meeting ka link ye hai: {gl} Please 5 minute pehle aa jana.",
        "Ye article padh ke dekho, tumhe pasand aayega: {gl}",
        "Function ka invitation yahan hai, parivaar ke saath zaroor aana: {gl}",
    ], S)
    R += expand("link_ok", "hindi", 0, [
        "कल की तस्वीरें यहाँ हैं, हमारे परिवार वाले ग्रुप में भी डाली हैं: {gl}",
        "कल सुबह 10 बजे की मीटिंग का लिंक यह है: {gl} कृपया पांच मिनट पहले जुड़ जाइए।",
        "यह लेख पढ़कर देखो, तुम्हें पसंद आएगा: {gl}",
    ], S)
    # --- everyday messages that contain scary-looking words in a harmless way
    R += expand("everyday", "hinglish", 0, [
        "Bhai {n} ko batana ki kal mummy ka OTP wala message mujhe forward kar de, mera phone nahi chal raha.",
        "Aapka naam kya hai? Kal ki meeting ka time confirm kar dijiye, main shaam ko call karunga.",
        "Maine tumhe {a} rupaye UPI se bhej diye hain, check kar lena. Chai ke paise the.",
        "Dukaan me ek hi QR lagta hai, wahi scan karke payment kar dena, rasid maang lena.",
    ], S)
    R += expand("everyday", "english", 0, [
        "Please pay the school fee through the official school portal before {d}. The receipt will be emailed to you.",
        "Can you send me the report by evening? I need to submit it to the bank tomorrow morning.",
        "I paid your share, Rs {a}, to the shopkeeper through {app}. Please keep the receipt.",
        "Your account statement for November is ready. You can download it from the official app any time.",
    ], S)
    R += expand("everyday", "hindi", 0, [
        "स्कूल की फीस {d} से पहले स्कूल के आधिकारिक पोर्टल से जमा कर दीजिए। रसीद ईमेल पर आ जाएगी।",
        "कृपया शाम तक रिपोर्ट भेज दीजिए, मुझे कल सुबह बैंक में जमा करनी है।",
        "मैंने तुम्हारे हिस्से के {a} रुपये दुकानदार को {apph} से दे दिए हैं। रसीद संभाल कर रखना।",
    ], S)
    return R


def filter_frozen(rows: list[dict], index, label: str) -> list[dict]:
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
    ap.add_argument("--allow-missing-frozen", action="store_true")
    args = ap.parse_args(argv)
    index, warns = leak_check.build_index(leak_check.DEFAULT_FROZEN, ROOT)
    if not leak_check.DEFAULT_FROZEN.is_dir() and not args.allow_missing_frozen:
        print("ERROR: frozen evaluation directory is missing; refusing to write generated data (see ml/TUNING.md).", file=sys.stderr)
        sys.exit(2)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for name, rows in (("gap_v3_scam", scam()), ("gap_v3_genuine", genuine())):
        seen, uniq = set(), []
        for r in rows:
            if r["text"] not in seen:
                seen.add(r["text"]); uniq.append(r)
        uniq = filter_frozen(uniq, index, name)
        with open(OUT_DIR / f"{name}.csv", "w", encoding="utf-8", newline="") as fp:
            w = csv.DictWriter(fp, fieldnames=["text", "label", "lang", "group"])
            w.writeheader(); w.writerows(uniq)
        langs = {l: sum(1 for r in uniq if r["lang"] == l) for l in ("english", "hindi", "hinglish")}
        print(f"wrote {len(uniq)} rows to data/team/{name}.csv {langs}")


if __name__ == "__main__":
    main()
