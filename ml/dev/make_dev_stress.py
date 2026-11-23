"""Writes dev/dev_stress_v1.csv: a hand-written diagnostic set, written BEFORE any v3 fix so that it did not shape the fixes.
All text is invented (no real people, numbers or accounts). It is a DEVELOPMENT set: once its failures are used to fix things it can no longer
claim to be independent, so numbers on it are quoted as development numbers only. It is never read by build_corpus.py or train.py.
Format per line: label|lang|family|text   (label 1 = scam, 0 = genuine)
"""
import csv
from pathlib import Path

ROWS = """
1|hinglish|kyc|Aapka SBI account kal band ho jayega. Abhi apna KYC update karein, warna account freeze ho jayega.
1|hinglish|kyc|Dear customer, aapka PAN card aapke bank account se link nahi hai. Aaj hi update karo nahi to account block.
1|hinglish|kyc|Mera naam Rahul hai, main HDFC bank se bol raha hoon. Aapka KYC pending hai, OTP bataiye abhi.
1|hinglish|kyc|Sir aapka Aadhaar verification expire ho gaya hai. Is number par call karke details confirm kijiye.
1|hindi|kyc|आपका बैंक खाता केवाईसी न होने की वजह से आज रात बंद हो जाएगा। तुरंत अपनी जानकारी अपडेट करें।
1|hindi|kyc|प्रिय ग्राहक, आपका पैन कार्ड अपडेट नहीं है। नीचे दिए नंबर पर कॉल करके ओटीपी बताएं वरना खाता ब्लॉक होगा।
1|english|kyc|Your account will be suspended in 24 hours. Complete your KYC verification immediately by sharing your Aadhaar number and OTP.
1|hinglish|otp|Maine galti se aapke number par OTP bhej diya hai, wo mujhe bata dijiye please.
1|hinglish|otp|Bhaiya aapke phone par ek 6 digit code aaya hoga, wo bata do, bank verification ho raha hai.
1|hindi|otp|आपके फोन पर एक कोड आया होगा, वह मुझे बता दीजिए ताकि आपका कार्ड चालू हो सके।
1|english|otp|To cancel the transaction of Rs 24,999 please share the 6 digit code sent to your phone with our executive.
1|hinglish|arrest|Main Mumbai cyber cell se bol raha hoon. Aapke naam se ek parcel pakda gaya hai jisme drugs hain. Call mat kaatiye.
1|hindi|arrest|आप डिजिटल अरेस्ट में हैं। वीडियो कॉल पर बने रहिए और किसी को कुछ मत बताइए, वरना गिरफ्तारी हो जाएगी।
1|hindi|arrest|मैं सीबीआई अधिकारी बोल रहा हूँ। आपके आधार से मनी लॉन्ड्रिंग हुई है। जांच के लिए सुरक्षित खाते में पैसे ट्रांसफर करें।
1|english|arrest|This is the narcotics bureau. A warrant has been issued against you. Stay on the call and transfer the verification amount to the safe account.
1|hinglish|courier|Aapka courier customs me ruka hua hai. Clearance ke liye 3500 rupaye abhi UPI se bhejiye.
1|hinglish|courier|Aapka parcel aaya hai lekin address galat hai. Delivery charge 50 rupaye is link par pay karein.
1|english|courier|Your package is held at the depot. Pay the re-delivery fee of Rs 49 using this link to avoid return.
1|hindi|courier|आपका पार्सल अटका हुआ है। डिलीवरी के लिए 80 रुपये इस लिंक पर जमा करें।
1|hinglish|lottery|Badhai ho! Aapko KBC lucky draw me 25 lakh ka inaam mila hai. Claim karne ke liye 4000 rupaye processing fee bhejiye.
1|hindi|lottery|बधाई हो आपने 10 लाख रुपये की लॉटरी जीती है। इनाम पाने के लिए अपना बैंक खाता नंबर और पिन बताएं।
1|english|lottery|You are the lucky winner of a brand new iPhone. Pay Rs 99 shipping to claim your prize today.
1|hinglish|electricity|Aapka bijli bill pending hai. Aaj raat 9:30 baje connection kat jayega. Turant is number par sampark karein.
1|hindi|electricity|आपका बिजली कनेक्शन आज रात काट दिया जाएगा क्योंकि पिछला बिल जमा नहीं हुआ। अभी इस नंबर पर बात करें।
1|english|electricity|Dear consumer your power will be disconnected tonight as last month bill is unpaid. Call the officer on this number now.
1|hinglish|upi_qr|Aapko payment receive karne ke liye ye QR code scan karein aur apna UPI PIN daalein.
1|english|upi_qr|Scan this QR code to receive your refund of Rs 3,200. Enter your UPI PIN to confirm.
1|hinglish|upi_qr|Maine aapko Rs 5000 bheje hain galti se. Please wapas kar dijiye aur meri collect request accept kar lijiye.
1|english|upi_qr|Sorry sent money to you accidentally, kindly return it and approve the collect request on your UPI app.
1|hindi|upi_qr|मैंने गलती से आपके खाते में पैसे भेज दिए हैं, कृपया वापस कर दें और मेरा कलेक्ट रिक्वेस्ट स्वीकार करें।
1|hinglish|job|Work from home job! Roz 3000 rupaye kamaiye. YouTube videos like karo aur paise paao. Pehle 500 registration fee bhejiye.
1|hindi|job|घर बैठे रोज़ 5000 कमाएं। बस वीडियो लाइक करें और रेटिंग दें। पहले रजिस्ट्रेशन के 1000 रुपये जमा करें।
1|english|job|Part time job offer: earn Rs 4,000 daily by rating hotels. Join our Telegram group and pay the Rs 800 task deposit.
1|hindi|invest|निवेश करें 20,000 और 10 दिन में पाएं 80,000, गारंटीड मुनाफा। हमारे वीआईपी ग्रुप से जुड़ें।
1|hinglish|invest|Stock market tips group join karo, 100% guaranteed profit, 15 din me paisa double. Abhi 10,000 deposit karein.
1|english|invest|Invest Rs 50,000 in our crypto plan and receive guaranteed returns of 40% in one week. Limited slots left.
1|hinglish|loan|Aapka personal loan approve ho gaya hai. Bas 2500 processing fee jama karein, 10 minute me paisa account me.
1|english|loan|Instant loan of Rs 2 lakh approved without documents. Pay insurance charge Rs 3,000 first to release the amount.
1|hindi|loan|आपका लोन मंजूर हो गया है। राशि पाने के लिए पहले 2000 रुपये बीमा शुल्क भेजें।
1|hinglish|relative|Papa main hoon, mera phone kharab hai ye naya number hai. Abhi turant 15000 rupaye bhej do, urgent hai, baad me samjhata hoon.
1|hinglish|relative|Mummy mera accident ho gaya hai, hospital me hoon. Is account me abhi 20000 bhej do, kisi ko mat batana.
1|hindi|relative|मैं आपका बेटा बोल रहा हूँ, नया नंबर है। अभी तुरंत 25000 रुपये भेजो, बहुत जरूरी है।
1|english|relative|Hi mom this is my new number, I am in trouble. Please send Rs 30,000 right now and do not tell dad.
1|hinglish|sim|Aapka SIM 2 ghante me block ho jayega kyunki Aadhaar link nahi hai. Is link par click karke verify karein.
1|english|sim|Your mobile number will be deactivated today. Click the link and complete verification to keep your SIM active.
1|hinglish|scheme|Aapki PM Kisan ki kist ruki hui hai. Bank details yahan update karo aur OTP bhejo.
1|hindi|scheme|आपकी पीएम किसान की किस्त रुकी हुई है। अपना बैंक खाता नंबर और ओटीपी इस नंबर पर बताएं।
1|hinglish|scheme|Ladli behna yojana ka paisa aapke account me aane wala hai, uske liye is link par apna ATM PIN daalein.
1|hinglish|apk|Aapke credit card ke 5000 reward points aaj expire ho rahe hain. Ye apk download karke redeem karein.
1|english|apk|Download the new bank app from this link to avoid account block. APK file attached, install now.
1|hinglish|remote|Aapke phone ka problem solve karne ke liye AnyDesk install karein aur code mujhe bata dijiye.
1|english|remote|Our technician needs to access your phone. Install AnyDesk and share the 9 digit code with us to get your refund.
1|hinglish|marketplace|Aapka OLX par samaan kharidne ke liye main advance de raha hoon, ye QR scan karke paisa le lijiye.
1|english|marketplace|I am an army officer posted far away. I will pay by scanning your QR, just share your UPI PIN to confirm the payment.
1|hinglish|spaced|Aapka O T P kisi ko mat batana, par abhi hume wo bata do verification ke liye.
1|english|spaced|Update your K Y C today and share your O.T.P with the agent or the account will be blocked.
1|english|homoglyph|Your acc0unt is blocked. V3rify now and share the 0TP to restore access.
1|hinglish|tax|Income tax department ne aapko notice bheja hai. Refund pane ke liye apne bank details aur OTP is link par bhariye.
1|hindi|tax|आयकर विभाग से आपको 15000 रुपये का रिफंड मिलेगा। इसके लिए अपना खाता नंबर और ओटीपी बताएं।
1|english|insurance|Your LIC policy bonus of Rs 1.2 lakh is ready. Pay the GST of Rs 4,500 to release the amount.
1|hinglish|gas|Aapka gas connection band hone wala hai. Abhi is number par call karke KYC karwayein aur OTP batayein.
1|english|bank_call|Hello sir, I am calling from your bank's fraud department. Your card is compromised, please tell me the card number and CVV to secure it.
1|hindi|bank_call|मैं आपके बैंक से बोल रहा हूँ। आपका कार्ड चोरी हो गया है, कार्ड नंबर और सीवीवी बताइए ताकि मैं उसे ब्लॉक कर दूं।
0|english|bank_alert|Rs 1,250 has been debited from your A/c XX4321 on 21-Nov-26. If this was not you, call 1800 000 000. - Union Bank
0|hinglish|bank_alert|Aapke A/c XX4321 se Rs 640 debit hue hain. Avl bal Rs 9,820. Agar aapne nahi kiya to bank ko turant batayein.
0|hindi|bank_alert|आपके खाते XX4321 में 5,000 रुपये जमा हुए हैं। उपलब्ध शेष 15,230 रुपये।
0|english|bank_alert|Your credit card statement of Rs 8,450 is generated. Minimum due Rs 420 by 05-Dec. Pay through the official app only.
0|hinglish|bank_alert|Aapka EMI Rs 3,200 kal debit hoga. Account me paryapt balance rakhein. - Bajaj Finance
0|english|otp|123456 is your OTP for login. Do not share it with anyone. Valid for 10 minutes. - ICICI Bank
0|hinglish|otp|Aapka OTP 482913 hai. Ise kisi ke saath share na karein. Bank kabhi OTP nahi maangta.
0|hindi|otp|आपका ओटीपी 774512 है। इसे किसी को न बताएं। यह 5 मिनट के लिए मान्य है।
0|english|otp|Your OTP for UPI registration is 665544. Never share this with anyone, including bank staff.
0|hinglish|otp|Zomato: 4821 aapka delivery OTP hai. Delivery partner ko tabhi batayein jab aapka order mil jaye.
0|english|delivery|Your order from Flipkart has been shipped and will be delivered by Friday. Track it in the app.
0|hinglish|delivery|Aapka Amazon order kal tak deliver ho jayega. Delivery partner aapko call karega.
0|hindi|delivery|आपका पार्सल कल शाम तक पहुंचेगा। डिलीवरी बॉय आपसे संपर्क करेगा।
0|english|telecom|Your Jio recharge of Rs 299 is successful. Validity till 20-Dec. Thank you.
0|hinglish|telecom|Airtel: Aapka data pack khatam hone wala hai. 199 me naya pack lene ke liye My Airtel app kholein.
0|hindi|telecom|आपका रिचार्ज सफल रहा। 28 दिन की वैधता। धन्यवाद।
0|english|govt|PM Kisan: Rs 2,000 has been credited to your account. Check status at the official pmkisan.gov.in portal.
0|hinglish|govt|PM Kisan ki 15vi kist aapke khate me jama ho gayi hai. Adhik jankari ke liye apne bank se sampark karein.
0|hindi|govt|आपके राशन कार्ड का ई-केवाईसी पूरा हो गया है। अधिक जानकारी के लिए नजदीकी राशन दुकान से संपर्क करें।
0|english|govt|Your income tax refund of Rs 8,400 has been processed and will reach your account in 7 days. - Income Tax Dept
0|hinglish|govt|Aapka gas cylinder booking confirm ho gaya hai. Delivery 2 din me hogi. - Indane
0|english|awareness|Beware of fraud calls. Banks never ask for your OTP, PIN or CVV. Report cyber fraud at 1930.
0|hinglish|awareness|Savdhan rahein! Koi bhi bank aapse OTP ya PIN nahi maangta. Fraud ki shikayat 1930 par karein.
0|hindi|awareness|सावधान रहें। कोई भी बैंक आपसे ओटीपी या पिन नहीं मांगता। साइबर ठगी की शिकायत 1930 पर करें।
0|english|personal|Hey are we still meeting at 6 near the market? Let me know if you are running late.
0|hinglish|personal|Bhai aaj shaam ko ghar aa jana, mummy ne khana banaya hai. Papa bhi aa rahe hain.
0|hinglish|personal|Aapka naam kya hai? Kal ki meeting ka time confirm kar dijiye.
0|hindi|personal|कल सुबह स्कूल की छुट्टी है। बच्चों को तैयार रखना, हम सब नानी के घर चलेंगे।
0|hinglish|personal|Maine tumhe 500 rupaye UPI se bhej diye hain, check kar lena. Chai ke paise the.
0|english|personal|Can you send me the photos from yesterday? Here is the album link, it is in our family group.
0|english|work|Reminder: team meeting at 3 pm today in the conference room. Please bring your reports.
0|hinglish|work|Aapki salary credit ho gayi hai. Payslip company portal par available hai.
0|hindi|school|विद्यालय की फीस जमा करने की अंतिम तिथि 30 नवंबर है। कृपया समय पर भुगतान करें।
0|english|utility|Your electricity bill of Rs 1,240 is due on 28-Nov. Pay on the official TNEB app or at the nearest counter.
0|hinglish|utility|Aapka bijli bill Rs 860 hai, last date 25 Nov. Online payment official website ya app se karein.
0|english|travel|Your IRCTC ticket PNR 4521 is confirmed. Train departs at 18:45 from platform 3.
0|hinglish|health|Aapka lab report ready hai. Please apni clinic ya official app se collect karein.
0|english|bank_service|Hello sir, I am calling from the bank branch about your cheque book request. No OTP or PIN is needed, this call is for information only.
0|hinglish|promo|Flat 40% off on all mobiles this weekend on our app. Offer valid till Sunday.
0|english|bank_alert|Alert: A new payee was added to your account. If you did not do this, call the number on the back of your card.
"""

rows = []
for line in ROWS.strip().splitlines():
    label, lang, family, text = line.split("|", 3)
    rows.append((int(label), lang, family, text.strip()))
assert len({r[3] for r in rows}) == len(rows), "duplicate text"
out = Path(__file__).resolve().parent / "dev_stress_v1.csv"
with open(out, "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["text", "label", "lang", "family"])
    for label, lang, family, text in rows:
        w.writerow([text, label, lang, family])
print(f"wrote {len(rows)} rows ({sum(r[0] for r in rows)} scam, {sum(1 - r[0] for r in rows)} genuine) to {out.name}")
