"""Authoring source for lessons and quiz (three languages per string: English, Hindi, Chhattisgarhi).
Run: python scripts/content_source.py   -> writes public/content/lessons.json and public/content/quiz.json
Chhattisgarhi strings are working translations to be confirmed by a native speaker before release (see docs/TESTING.md).
All example messages are made up; no real numbers, names or accounts."""
import json
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "public" / "content"


def L(en, hi, cg):
    return {"en": en, "hi": hi, "cg": cg}


# ------------------------------------------------------------------ lessons
LESSONS = [
    dict(id="otp_pin_card", scripts=["kyc_bank", "otp"],
         title=L("OTP, PIN and card safety", "ओटीपी, पिन और कार्ड की सुरक्षा", "ओटीपी, पिन अउ कार्ड के सुरक्षा"),
         example=L("A caller says: \"I am from your bank. Tell me the code that just came on your phone so I can stop a wrong payment.\" That code is the key to your money. Anyone who has it can take your money.",
                   "एक कॉल करने वाला कहता है: \"मैं आपके बैंक से बोल रहा हूँ। अभी फ़ोन पर आया कोड बताइए ताकि मैं गलत भुगतान रोक सकूँ।\" वह कोड आपके पैसे की चाबी है। जिसके पास वह कोड है, वह आपका पैसा निकाल सकता है।",
                   "एक कॉल करइया कहिथे: \"मैं तुंहर बैंक ले बोलत हंव। अभी फोन म आए कोड बतावव ताकि मैं गलत भुगतान रोक सकंव।\" ओ कोड तुंहर पइसा के चाबी हे। जेकर तीर ओ कोड हे, ओ तुंहर पइसा निकाल सकथे।"),
         signs=[L("Someone asks for your OTP, ATM PIN, UPI PIN or CVV", "कोई आपसे ओटीपी, एटीएम पिन, यूपीआई पिन या सीवीवी माँगता है", "कोनो तुंहर ले ओटीपी, एटीएम पिन, यूपीआई पिन या सीवीवी मांगथे"),
                L("They say it is only to \"stop\" or \"cancel\" a payment", "वे कहते हैं कि यह सिर्फ़ किसी भुगतान को \"रोकने\" या \"रद्द\" करने के लिए है", "ओमन कहिथे कि ए सिरिफ कोनो भुगतान ला \"रोके\" या \"रद्द\" करे बर हे"),
                L("They sound official and are in a hurry", "वे सरकारी अंदाज़ में बात करते हैं और जल्दी मचाते हैं", "ओमन सरकारी अंदाज म गोठियाथे अउ जल्दी मचाथे")],
         todo=L("Hang up. Never tell anyone your OTP, PIN or CVV. No real bank employee will ever ask for them.", "कॉल काट दें। अपना ओटीपी, पिन या सीवीवी किसी को न बताएँ। असली बैंक कर्मचारी कभी नहीं माँगता।", "कॉल काट दव। अपन ओटीपी, पिन या सीवीवी कखरो ला झन बतावव। असली बैंक कर्मचारी कभू नइ मांगय।")),
    dict(id="fake_kyc", scripts=["kyc_bank"],
         title=L("Fake KYC and bank calls", "फ़र्ज़ी केवाईसी और बैंक के कॉल", "फर्जी केवाईसी अउ बैंक के कॉल"),
         example=L("An SMS says: \"Your account will be blocked today. Update KYC at this link.\" The link opens a copy of a bank website that steals your details.",
                   "एक एसएमएस कहता है: \"आपका खाता आज बंद हो जाएगा। इस लिंक पर केवाईसी अपडेट करें।\" वह लिंक बैंक की नकली वेबसाइट खोलता है जो आपकी जानकारी चुरा लेती है।",
                   "एक एसएमएस कहिथे: \"तुंहर खाता आज बंद हो जाही। ए लिंक म केवाईसी अपडेट करव।\" ओ लिंक बैंक के नकली वेबसाइट खोलथे जउन तुंहर जानकारी चोरा लेथे।"),
         signs=[L("A threat that your account will be blocked", "खाता बंद होने की धमकी", "खाता बंद होए के धमकी"),
                L("A link or a phone number to \"update KYC\"", "\"केवाईसी अपडेट\" के लिए लिंक या फ़ोन नंबर", "\"केवाईसी अपडेट\" बर लिंक या फोन नंबर"),
                L("Pressure to act today", "आज ही करने का दबाव", "आजे करे के दबाव")],
         todo=L("Do not click. Update KYC only at your bank branch or in the official bank app that you opened yourself.", "लिंक न खोलें। केवाईसी सिर्फ़ अपनी बैंक शाखा में या खुद खोले गए आधिकारिक बैंक ऐप में करें।", "लिंक झन खोलव। केवाईसी सिरिफ अपन बैंक शाखा म या खुद खोले आधिकारिक बैंक ऐप म करव।")),
    dict(id="digital_arrest", scripts=["digital_arrest"],
         title=L("Digital arrest and police calls", "डिजिटल अरेस्ट और पुलिस के कॉल", "डिजिटल अरेस्ट अउ पुलिस के कॉल"),
         example=L("A caller in a police uniform on video says a parcel in your name has drugs. He says you are under \"digital arrest\", must stay on the call and tell no one, and must move money to a \"safe account\".",
                   "वीडियो कॉल पर पुलिस की वर्दी में एक आदमी कहता है कि आपके नाम के पार्सल में ड्रग्स मिले हैं। वह कहता है कि आप \"डिजिटल अरेस्ट\" में हैं, कॉल पर बने रहें, किसी को न बताएँ और पैसे \"सुरक्षित खाते\" में भेजें।",
                   "वीडियो कॉल म पुलिस के वर्दी पहिरे एक आदमी कहिथे कि तुंहर नाम के पार्सल म ड्रग्स मिले हे। ओ कहिथे कि तुमन \"डिजिटल अरेस्ट\" म हव, कॉल म बने रहव, कखरो ला झन बतावव अउ पइसा \"सुरक्षित खाता\" म भेजव।"),
         signs=[L("Police, CBI or customs on a video call", "वीडियो कॉल पर पुलिस, सीबीआई या कस्टम", "वीडियो कॉल म पुलिस, सीबीआई या कस्टम"),
                L("\"Do not tell anyone\" and \"do not disconnect\"", "\"किसी को न बताएँ\" और \"कॉल न काटें\"", "\"कखरो ला झन बतावव\" अउ \"कॉल झन काटव\""),
                L("A demand to transfer money to prove you are innocent", "निर्दोष साबित करने के लिए पैसे ट्रांसफ़र करने की माँग", "निर्दोष साबित करे बर पइसा ट्रांसफर करे के मांग")],
         todo=L("Hang up. No police or government office arrests or questions anyone over a video call or asks for money. Tell a family member and report to 1930.", "कॉल काट दें। कोई पुलिस या सरकारी दफ़्तर वीडियो कॉल पर न गिरफ़्तार करता है, न पूछताछ करता है, न पैसे माँगता है। परिवार को बताएँ और 1930 पर रिपोर्ट करें।", "कॉल काट दव। कोनो पुलिस या सरकारी दफ्तर वीडियो कॉल म न गिरफ्तार करय, न पूछताछ करय, न पइसा मांगय। परिवार ला बतावव अउ 1930 म रिपोर्ट करव।")),
    dict(id="courier_customs", scripts=["courier_customs"],
         title=L("Courier, customs and parcel scams", "कूरियर, कस्टम और पार्सल की ठगी", "कूरियर, कस्टम अउ पार्सल के ठगी"),
         example=L("An SMS says: \"Your parcel is held. Pay Rs 49 for redelivery at this link.\" Or a call says your parcel has illegal items and you must pay a fine.",
                   "एक एसएमएस कहता है: \"आपका पार्सल रुका है। दोबारा डिलीवरी के लिए इस लिंक पर ₹49 भरें।\" या कॉल पर कहा जाता है कि पार्सल में अवैध सामान है और जुर्माना भरना होगा।",
                   "एक एसएमएस कहिथे: \"तुंहर पार्सल रुके हे। फेर डिलीवरी बर ए लिंक म ₹49 भरव।\" या कॉल म कहे जाथे कि पार्सल म अवैध सामान हे अउ जुर्माना भरे ला परही।"),
         signs=[L("A parcel you were not expecting", "ऐसा पार्सल जिसकी आपको उम्मीद नहीं थी", "अइसन पार्सल जेकर तुंहला उम्मीद नइ रिहिस"),
                L("A small fee or fine to be paid through a link", "लिंक से भरने के लिए छोटी फ़ीस या जुर्माना", "लिंक ले भरे बर छोटे फीस या जुर्माना"),
                L("A threat of arrest or legal action", "गिरफ़्तारी या कानूनी कार्रवाई की धमकी", "गिरफ्तारी या कानूनी कार्रवाई के धमकी")],
         todo=L("Ignore it. Track real parcels only on the courier's official app or website, using the tracking number.", "नज़रअंदाज़ करें। असली पार्सल सिर्फ़ कूरियर के आधिकारिक ऐप या वेबसाइट पर ट्रैकिंग नंबर से देखें।", "अनदेखा करव। असली पार्सल सिरिफ कूरियर के आधिकारिक ऐप या वेबसाइट म ट्रैकिंग नंबर ले देखव।")),
    dict(id="upi_qr", scripts=["payment_request", "fake_qr", "lottery_prize"],
         title=L("UPI and QR safety", "यूपीआई और क्यूआर की सुरक्षा", "यूपीआई अउ क्यूआर के सुरक्षा"),
         example=L("A buyer says: \"I will pay you. Scan this QR code and enter your PIN to receive the money.\" Scanning a QR and entering your PIN sends money OUT of your account.",
                   "एक खरीदार कहता है: \"मैं आपको पैसे दूँगा। पैसे पाने के लिए यह क्यूआर स्कैन करें और अपना पिन डालें।\" क्यूआर स्कैन करके पिन डालने से पैसे आपके खाते से बाहर जाते हैं।",
                   "एक खरीददार कहिथे: \"मैं तुंहला पइसा देहूं। पइसा पाए बर ए क्यूआर स्कैन करव अउ अपन पिन डारव।\" क्यूआर स्कैन करके पिन डारे ले पइसा तुंहर खाता ले बाहिर जाथे।"),
         signs=[L("You are asked to enter your UPI PIN to receive money", "पैसे पाने के लिए आपसे यूपीआई पिन डालने को कहा जाता है", "पइसा पाए बर तुंहर ले यूपीआई पिन डारे बर कहे जाथे"),
                L("A \"collect request\" from a stranger", "किसी अजनबी का \"कलेक्ट रिक्वेस्ट\"", "कोनो अजनबी के \"कलेक्ट रिक्वेस्ट\""),
                L("A story of a payment sent \"by mistake\"", "\"गलती से\" भेजे गए पैसे की कहानी", "\"गलती ले\" भेजे पइसा के कहानी")],
         todo=L("To receive money you never need a PIN. Decline unknown collect requests and check your bank app yourself.", "पैसे पाने के लिए पिन कभी नहीं चाहिए। अनजान कलेक्ट रिक्वेस्ट मना करें और अपने बैंक ऐप में खुद देखें।", "पइसा पाए बर पिन कभू नइ चाही। अनजान कलेक्ट रिक्वेस्ट मना करव अउ अपन बैंक ऐप म खुद देखव।")),
    dict(id="links_apps", scripts=["phishing_link", "investment_job", "loan_app"],
         title=L("Fake links, apps and remote access", "फ़र्ज़ी लिंक, ऐप और रिमोट एक्सेस", "फर्जी लिंक, ऐप अउ रिमोट एक्सेस"),
         example=L("A \"bank officer\" asks you to install a screen-sharing app \"to fix the problem\". Once installed, he can see your screen, your OTPs and your PIN.",
                   "एक \"बैंक अधिकारी\" कहता है कि \"समस्या ठीक करने के लिए\" स्क्रीन-शेयर वाला ऐप इंस्टॉल करें। इंस्टॉल होते ही वह आपकी स्क्रीन, ओटीपी और पिन देख सकता है।",
                   "एक \"बैंक अधिकारी\" कहिथे कि \"समस्या ठीक करे बर\" स्क्रीन-शेयर वाले ऐप इंस्टॉल करव। इंस्टॉल होते ही ओ तुंहर स्क्रीन, ओटीपी अउ पिन देख सकथे।"),
         signs=[L("A stranger asks you to install an app or open a .apk file", "कोई अजनबी ऐप इंस्टॉल करने या .apk फ़ाइल खोलने को कहता है", "कोनो अजनबी ऐप इंस्टॉल करे या .apk फाइल खोले बर कहिथे"),
                L("A short link (bit.ly) or an address that copies a bank name", "छोटा लिंक (bit.ly) या बैंक के नाम की नकल करने वाला पता", "छोटे लिंक (bit.ly) या बैंक के नाम के नकल करइया पता"),
                L("Easy money or a job that asks you to pay a fee first", "आसान कमाई या ऐसी नौकरी जिसमें पहले फ़ीस माँगी जाए", "आसान कमाई या अइसन नौकरी जेमा पहिली फीस मांगे जाथे")],
         todo=L("Install apps only from the official app store. Never install screen-sharing apps for a stranger. Open bank sites by typing the address yourself.", "ऐप सिर्फ़ आधिकारिक ऐप स्टोर से इंस्टॉल करें। किसी अजनबी के कहने पर स्क्रीन-शेयर ऐप कभी न डालें। बैंक की साइट का पता खुद टाइप करके खोलें।", "ऐप सिरिफ आधिकारिक ऐप स्टोर ले इंस्टॉल करव। कोनो अजनबी के कहे म स्क्रीन-शेयर ऐप कभू झन डारव। बैंक के साइट के पता खुद टाइप करके खोलव।")),
    dict(id="what_to_do", scripts=[],
         title=L("What to do if it happens", "अगर ठगी हो जाए तो क्या करें", "यदि ठगी हो जाय त का करव"),
         example=L("Ravi shared a code with a fake bank caller and lost Rs 20,000. He called 1930 within minutes, then filed a complaint on cybercrime.gov.in and kept the messages.",
                   "रवि ने नकली बैंक वाले को कोड बता दिया और ₹20,000 गँवा बैठा। उसने कुछ ही मिनटों में 1930 पर कॉल किया, फिर cybercrime.gov.in पर शिकायत की और संदेश सँभालकर रखे।",
                   "रवि नकली बैंक वाले ला कोड बता दिस अउ ₹20,000 गंवा दिस। ओ कुछ मिनट म 1930 म कॉल करिस, फेर cybercrime.gov.in म शिकायत करिस अउ संदेसा सहेज के राखिस।"),
         signs=[L("You gave a code, PIN or card detail", "आपने कोड, पिन या कार्ड की जानकारी दे दी", "तुमन कोड, पिन या कार्ड के जानकारी दे देव"),
                L("Money left your account", "आपके खाते से पैसे गए", "तुंहर खाता ले पइसा गिस"),
                L("You feel ashamed or scared: anyone can be targeted", "आपको शर्म या डर लग रहा है: कोई भी निशाना बन सकता है", "तुंहला शरम या डर लगत हे: कोनो घलो निशाना बन सकथे")],
         todo=L("Act fast: call 1930, then file on cybercrime.gov.in. Call your bank, block cards and UPI, keep all evidence, and tell someone you trust.", "तुरंत करें: 1930 पर कॉल करें, फिर cybercrime.gov.in पर शिकायत करें। बैंक को कॉल करें, कार्ड और यूपीआई बंद कराएँ, सारे सबूत रखें और किसी भरोसेमंद को बताएँ।", "तुरते करव: 1930 म कॉल करव, फेर cybercrime.gov.in म शिकायत करव। बैंक ला कॉल करव, कार्ड अउ यूपीआई बंद करावव, जम्मो सबूत राखव अउ कोनो भरोसा के आदमी ला बतावव।")),
]

TRUE, FALSE = L("True", "सही", "सही"), L("False", "गलत", "गलत")
SAFE, SCAM = L("Safe", "सुरक्षित", "सुरक्षित"), L("A scam", "ठगी", "ठगी")


def Q(id, topic, diff, kind, q, opts, ans, exp):
    return dict(id=id, topic=topic, difficulty=diff, type=kind, question=q, options=opts, answer=ans, explanation=exp)


QUIZ = [
    # ---- OTP, PIN, card
    Q("q_otp_1", "otp_pin_card", 1, "tf", L("A bank employee may ask for your OTP to verify who you are.", "बैंक का कर्मचारी आपकी पहचान जाँचने के लिए आपका ओटीपी माँग सकता है।", "बैंक के कर्मचारी तुंहर पहिचान जांचे बर तुंहर ओटीपी मांग सकथे।"), [TRUE, FALSE], 1,
      L("False. No bank employee will ever ask for your OTP. If someone does, it is a scam.", "गलत। कोई बैंक कर्मचारी कभी आपका ओटीपी नहीं माँगता। जो माँगे वह ठग है।", "गलत। कोनो बैंक कर्मचारी कभू तुंहर ओटीपी नइ मांगय। जउन मांगथे ओ ठग हे।")),
    Q("q_otp_2", "otp_pin_card", 1, "mcq", L("Which of these must you never tell anyone?", "इनमें से कौन-सी चीज़ आपको किसी को कभी नहीं बतानी चाहिए?", "इनमा ले कोन चीज तुंहला कखरो ला कभू नइ बताना चाही?"),
      [L("The name of your village", "आपके गाँव का नाम", "तुंहर गाँव के नाम"), L("Your OTP", "आपका ओटीपी", "तुंहर ओटीपी"), L("Your favourite food", "आपका पसंदीदा खाना", "तुंहर पसंद के खाना"), L("Your school name", "आपके स्कूल का नाम", "तुंहर स्कूल के नाम")], 1,
      L("Your OTP is the key to your money. Keep it, your PIN and your CVV secret.", "ओटीपी आपके पैसे की चाबी है। इसे, अपने पिन और सीवीवी को गुप्त रखें।", "ओटीपी तुंहर पइसा के चाबी हे। एला, अपन पिन अउ सीवीवी ला गुप्त राखव।")),
    Q("q_otp_3", "otp_pin_card", 2, "scenario", L("You get: \"Your OTP is 482913 for a payment of Rs 5,000 at ShopX. Do not share it.\" You did not make this payment. What do you do?", "आपको संदेश मिलता है: \"शॉपएक्स पर ₹5,000 के भुगतान के लिए आपका ओटीपी 482913 है। इसे साझा न करें।\" आपने यह भुगतान नहीं किया। आप क्या करेंगे?", "तुंहला संदेसा मिलथे: \"शॉपएक्स म ₹5,000 के भुगतान बर तुंहर ओटीपी 482913 हे। एला साझा झन करव।\" तुमन ए भुगतान नइ करे हव। तुमन का करहू?"),
      [L("Call the number printed on your card and ask the bank to block it", "कार्ड पर छपे नंबर पर कॉल करके बैंक से कार्ड बंद करवाएँ", "कार्ड म छपे नंबर म कॉल करके बैंक ले कार्ड बंद करवावव"), L("Reply with the OTP to cancel the payment", "भुगतान रद्द करने के लिए ओटीपी भेज दें", "भुगतान रद्द करे बर ओटीपी भेज देवव"), L("Do nothing and forget about it", "कुछ न करें और भूल जाएँ", "कुछु झन करव अउ भुला जावव")], 0,
      L("Someone is trying to use your card. Never send the OTP. Call your bank on the number on your card.", "कोई आपके कार्ड का इस्तेमाल करने की कोशिश कर रहा है। ओटीपी कभी न भेजें। कार्ड पर छपे नंबर पर बैंक को कॉल करें।", "कोनो तुंहर कार्ड के उपयोग करे के कोसिस करत हे। ओटीपी कभू झन भेजव। कार्ड म छपे नंबर म बैंक ला कॉल करव।")),
    Q("q_otp_4", "otp_pin_card", 3, "mcq", L("Your shopping app says: \"Share this delivery OTP with the delivery person when you receive your parcel.\" You are holding the parcel. What is right?", "आपका शॉपिंग ऐप कहता है: \"पार्सल लेते समय यह डिलीवरी ओटीपी डिलीवरी वाले को बताएँ।\" पार्सल आपके हाथ में है। सही क्या है?", "तुंहर शॉपिंग ऐप कहिथे: \"पार्सल लेवत समय ए डिलीवरी ओटीपी डिलीवरी वाले ला बतावव।\" पार्सल तुंहर हाथ म हे। सही का हे?"),
      [L("Giving this delivery OTP to the person at your door is fine, because you placed that order. A bank OTP for a payment is never to be shared.", "दरवाज़े पर खड़े व्यक्ति को यह डिलीवरी ओटीपी देना ठीक है, क्योंकि ऑर्डर आपने किया है। भुगतान का बैंक ओटीपी कभी साझा नहीं करना।", "दरवाजा म खड़े आदमी ला ए डिलीवरी ओटीपी देना ठीक हे, काबर कि ऑर्डर तुमन करे हव। भुगतान के बैंक ओटीपी कभू साझा नइ करना।"), L("Never share any OTP, even this one", "कोई भी ओटीपी कभी साझा न करें, यह भी नहीं", "कोनो घलो ओटीपी कभू साझा झन करव, ए घलो नइ"), L("Share it with anyone who phones you about the order", "ऑर्डर के बारे में फ़ोन करने वाले किसी को भी दे दें", "ऑर्डर के बारे म फोन करइया कखरो ला घलो दे देवव")], 0,
      L("Only the delivery OTP from your own order app, only to the person standing at your door. A caller asking for it is a scam.", "सिर्फ़ अपने ऑर्डर ऐप का डिलीवरी ओटीपी, सिर्फ़ दरवाज़े पर खड़े व्यक्ति को। फ़ोन पर माँगने वाला ठग है।", "सिरिफ अपन ऑर्डर ऐप के डिलीवरी ओटीपी, सिरिफ दरवाजा म खड़े आदमी ला। फोन म मांगइया ठग हे।")),
    # ---- fake KYC
    Q("q_kyc_1", "fake_kyc", 1, "tf", L("Banks update your KYC by sending an SMS link that you must click.", "बैंक केवाईसी अपडेट करने के लिए एसएमएस में लिंक भेजते हैं जिस पर आपको क्लिक करना होता है।", "बैंक केवाईसी अपडेट करे बर एसएमएस म लिंक भेजथे जेमा तुंहला क्लिक करे ला परथे।"), [TRUE, FALSE], 1,
      L("False. A KYC link by SMS is a classic scam. Update KYC at the branch or in the official app.", "गलत। एसएमएस में केवाईसी का लिंक सबसे आम ठगी है। केवाईसी शाखा में या आधिकारिक ऐप में करें।", "गलत। एसएमएस म केवाईसी के लिंक सबले आम ठगी हे। केवाईसी शाखा म या आधिकारिक ऐप म करव।")),
    Q("q_kyc_2", "fake_kyc", 1, "mcq", L("A message says: \"Your account will be blocked today. Update KYC at this link.\" What is the best action?", "संदेश कहता है: \"आपका खाता आज बंद हो जाएगा। इस लिंक पर केवाईसी अपडेट करें।\" सबसे अच्छा कदम क्या है?", "संदेसा कहिथे: \"तुंहर खाता आज बंद हो जाही। ए लिंक म केवाईसी अपडेट करव।\" सबले बढ़िया कदम का हे?"),
      [L("Click quickly so the account is not blocked", "खाता बंद न हो, इसलिए जल्दी क्लिक करें", "खाता बंद झन होय, एकरे सेती जल्दी क्लिक करव"), L("Do not click. Check with your bank on the number on your card", "क्लिक न करें। कार्ड पर छपे नंबर पर बैंक से पूछें", "क्लिक झन करव। कार्ड म छपे नंबर म बैंक ले पूछव"), L("Forward it to your friends", "अपने दोस्तों को भेज दें", "अपन संगवारी मन ला भेज देवव")], 1,
      L("The hurry is the trick. Real banks do not block accounts through a link.", "जल्दी मचाना ही चाल है। असली बैंक लिंक भेजकर खाता बंद नहीं करते।", "जल्दी मचाना ही चाल हे। असली बैंक लिंक भेजके खाता बंद नइ करय।")),
    Q("q_kyc_3", "fake_kyc", 2, "mcq", L("Where is it safe to update your KYC?", "केवाईसी अपडेट करना कहाँ सुरक्षित है?", "केवाईसी अपडेट करना कहाँ सुरक्षित हे?"),
      [L("At a link sent by an unknown number", "अनजान नंबर से आए लिंक पर", "अनजान नंबर ले आए लिंक म"), L("At your bank branch, or in the official bank app you opened yourself", "अपनी बैंक शाखा में, या खुद खोले गए आधिकारिक बैंक ऐप में", "अपन बैंक शाखा म, या खुद खोले आधिकारिक बैंक ऐप म"), L("By telling a caller your Aadhaar and PAN", "फ़ोन करने वाले को आधार और पैन बताकर", "फोन करइया ला आधार अउ पैन बताके")], 1,
      L("Only channels you opened yourself are safe.", "सिर्फ़ वही माध्यम सुरक्षित हैं जिन्हें आपने खुद खोला हो।", "सिरिफ ओइसने माध्यम सुरक्षित हे जेला तुमन खुद खोले हव।")),
    Q("q_kyc_4", "fake_kyc", 3, "scenario", L("SMS: \"Dear customer, your PAN is not linked. Call 98XXXXXXXX today to avoid a penalty.\"", "एसएमएस: \"प्रिय ग्राहक, आपका पैन लिंक नहीं है। जुर्माने से बचने के लिए आज ही 98XXXXXXXX पर कॉल करें।\"", "एसएमएस: \"प्रिय ग्राहक, तुंहर पैन लिंक नइ हे। जुर्माना ले बचे बर आजे 98XXXXXXXX म कॉल करव।\""),
      [SAFE, SCAM], 1,
      L("A scam: a mobile number, a penalty threat and a deadline. Official notices do not ask you to call a mobile number.", "ठगी: मोबाइल नंबर, जुर्माने की धमकी और समय-सीमा। आधिकारिक सूचना मोबाइल नंबर पर कॉल करने को नहीं कहती।", "ठगी: मोबाइल नंबर, जुर्माना के धमकी अउ समय-सीमा। आधिकारिक सूचना मोबाइल नंबर म कॉल करे बर नइ कहय।")),
    # ---- digital arrest
    Q("q_arr_1", "digital_arrest", 1, "tf", L("The police or the CBI can arrest you over a video call.", "पुलिस या सीबीआई वीडियो कॉल पर आपको गिरफ़्तार कर सकती है।", "पुलिस या सीबीआई वीडियो कॉल म तुंहला गिरफ्तार कर सकथे।"), [TRUE, FALSE], 1,
      L("False. \"Digital arrest\" does not exist in law. It is a scam.", "गलत। \"डिजिटल अरेस्ट\" कानून में होता ही नहीं। यह ठगी है।", "गलत। \"डिजिटल अरेस्ट\" कानून म होबे नइ करय। ए ठगी हे।")),
    Q("q_arr_2", "digital_arrest", 1, "mcq", L("A caller on video says you are under \"digital arrest\" and must tell no one. What does this tell you?", "वीडियो कॉल पर कोई कहता है कि आप \"डिजिटल अरेस्ट\" में हैं और किसी को न बताएँ। इससे क्या पता चलता है?", "वीडियो कॉल म कोनो कहिथे कि तुमन \"डिजिटल अरेस्ट\" म हव अउ कखरो ला झन बतावव। एकर ले का पता चलथे?"),
      [L("It is serious, so obey", "मामला गंभीर है, इसलिए मानें", "मामला गंभीर हे, एकरे सेती मानव"), L("It is a scam: scammers want to keep you isolated", "यह ठगी है: ठग आपको अकेला रखना चाहते हैं", "ए ठगी हे: ठग तुंहला अकेला राखना चाहथे"), L("It is a normal police step", "यह पुलिस की सामान्य कार्रवाई है", "ए पुलिस के सामान्य कार्रवाई हे")], 1,
      L("Isolation stops you from checking with family. Talk to someone you trust right away.", "अकेला रखने से आप परिवार से पूछ नहीं पाते। तुरंत किसी भरोसेमंद से बात करें।", "अकेला राखे ले तुमन परिवार ले पूछ नइ पाव। तुरते कोनो भरोसा के आदमी ले गोठियावव।")),
    Q("q_arr_3", "digital_arrest", 2, "mcq", L("They ask you to move your money to a \"safe account\" to prove you are innocent. What do you do?", "वे कहते हैं कि निर्दोष साबित करने के लिए पैसे \"सुरक्षित खाते\" में भेजें। आप क्या करेंगे?", "ओमन कहिथे कि निर्दोष साबित करे बर पइसा \"सुरक्षित खाता\" म भेजव। तुमन का करहू?"),
      [L("Transfer it quickly", "जल्दी से ट्रांसफ़र कर दें", "जल्दी ट्रांसफर कर देवव"), L("Hang up, tell family, and report to 1930", "कॉल काटें, परिवार को बताएँ और 1930 पर रिपोर्ट करें", "कॉल काटव, परिवार ला बतावव अउ 1930 म रिपोर्ट करव"), L("Ask for a discount", "कम रकम की बात करें", "कम रकम के गोठ करव")], 1,
      L("No government office asks you to send money to prove anything.", "कोई सरकारी दफ़्तर कुछ साबित करने के लिए पैसे भेजने को नहीं कहता।", "कोनो सरकारी दफ्तर कुछु साबित करे बर पइसा भेजे बर नइ कहय।")),
    Q("q_arr_4", "digital_arrest", 2, "scenario", L("A courier call says a parcel in your name has drugs and connects you to \"Mumbai Police\" on video.", "एक कूरियर कॉल कहता है कि आपके नाम के पार्सल में ड्रग्स हैं और आपको वीडियो पर \"मुंबई पुलिस\" से जोड़ता है।", "एक कूरियर कॉल कहिथे कि तुंहर नाम के पार्सल म ड्रग्स हे अउ तुंहला वीडियो म \"मुंबई पुलिस\" ले जोड़थे।"),
      [SAFE, SCAM], 1,
      L("A scam: the courier-to-police hand-off is the standard \"digital arrest\" script.", "ठगी: कूरियर से पुलिस को जोड़ना \"डिजिटल अरेस्ट\" की जानी-पहचानी चाल है।", "ठगी: कूरियर ले पुलिस ला जोड़ना \"डिजिटल अरेस्ट\" के जाने-पहचाने चाल हे।")),
    # ---- courier / customs
    Q("q_cou_1", "courier_customs", 1, "tf", L("A courier company can ask you to pay a customs fee through a random SMS link.", "कूरियर कंपनी किसी अनजान एसएमएस लिंक से कस्टम फ़ीस भरने को कह सकती है।", "कूरियर कंपनी कोनो अनजान एसएमएस लिंक ले कस्टम फीस भरे बर कह सकथे।"), [TRUE, FALSE], 1,
      L("False. Check any fee in the courier's official app.", "गलत। किसी भी फ़ीस को कूरियर के आधिकारिक ऐप में जाँचें।", "गलत। कोनो घलो फीस ला कूरियर के आधिकारिक ऐप म जांचव।")),
    Q("q_cou_2", "courier_customs", 1, "mcq", L("SMS: \"Parcel held. Pay Rs 49 at this link for redelivery.\" You are not expecting a parcel. What do you do?", "एसएमएस: \"पार्सल रुका है। दोबारा डिलीवरी के लिए इस लिंक पर ₹49 भरें।\" आपको कोई पार्सल नहीं आना है। आप क्या करेंगे?", "एसएमएस: \"पार्सल रुके हे। फेर डिलीवरी बर ए लिंक म ₹49 भरव।\" तुंहला कोनो पार्सल नइ आना हे। तुमन का करहू?"),
      [L("Pay, it is only Rs 49", "सिर्फ़ ₹49 है, भर दें", "सिरिफ ₹49 हे, भर देवव"), L("Ignore and delete it", "नज़रअंदाज़ करके मिटा दें", "अनदेखा करके मिटा देवव"), L("Reply with your address", "अपना पता भेज दें", "अपन पता भेज देवव")], 1,
      L("Small fees are used to steal your card details. Ignore it.", "छोटी फ़ीस के बहाने आपकी कार्ड जानकारी चुराई जाती है। नज़रअंदाज़ करें।", "छोटे फीस के बहाना तुंहर कार्ड जानकारी चोराए जाथे। अनदेखा करव।")),
    Q("q_cou_3", "courier_customs", 2, "mcq", L("How can you safely check a real parcel?", "असली पार्सल को सुरक्षित तरीके से कैसे जाँचें?", "असली पार्सल ला सुरक्षित तरीका ले कइसे जांचव?"),
      [L("Tap the link in the SMS", "एसएमएस के लिंक पर टैप करें", "एसएमएस के लिंक म टैप करव"), L("Use the tracking number in the courier's official app or website that you opened yourself", "कूरियर के आधिकारिक ऐप या वेबसाइट में, जिसे आपने खुद खोला हो, ट्रैकिंग नंबर डालें", "कूरियर के आधिकारिक ऐप या वेबसाइट म, जेला तुमन खुद खोले हव, ट्रैकिंग नंबर डारव"), L("Call the number in the SMS", "एसएमएस वाले नंबर पर कॉल करें", "एसएमएस वाले नंबर म कॉल करव")], 1,
      L("Always start from the official app, never from the message.", "हमेशा आधिकारिक ऐप से शुरू करें, संदेश से नहीं।", "हमेसा आधिकारिक ऐप ले सुरु करव, संदेसा ले नइ।")),
    Q("q_cou_4", "courier_customs", 3, "scenario", L("A call says your parcel has illegal items and you must pay a fine today to avoid arrest.", "कॉल कहता है कि आपके पार्सल में अवैध सामान है और गिरफ़्तारी से बचने के लिए आज जुर्माना भरें।", "कॉल कहिथे कि तुंहर पार्सल म अवैध सामान हे अउ गिरफ्तारी ले बचे बर आजे जुर्माना भरव।"),
      [SAFE, SCAM], 1,
      L("A scam: a fine demanded by phone with an arrest threat.", "ठगी: फ़ोन पर गिरफ़्तारी की धमकी के साथ जुर्माने की माँग।", "ठगी: फोन म गिरफ्तारी के धमकी के संग जुर्माना के मांग।")),
    # ---- UPI and QR
    Q("q_upi_1", "upi_qr", 1, "tf", L("To receive money by UPI you must enter your UPI PIN.", "यूपीआई से पैसे पाने के लिए आपको अपना यूपीआई पिन डालना पड़ता है।", "यूपीआई ले पइसा पाए बर तुंहला अपन यूपीआई पिन डारे ला परथे।"), [TRUE, FALSE], 1,
      L("False. You only enter the PIN to SEND money. Receiving never needs a PIN.", "गलत। पिन सिर्फ़ पैसे भेजने के लिए डाला जाता है। पैसे पाने में पिन कभी नहीं लगता।", "गलत। पिन सिरिफ पइसा भेजे बर डारे जाथे। पइसा पाए म पिन कभू नइ लगय।")),
    Q("q_upi_2", "upi_qr", 1, "mcq", L("A \"buyer\" asks you to scan his QR code to receive payment. What happens if you scan it and enter your PIN?", "एक \"खरीदार\" पैसे देने के लिए अपना क्यूआर स्कैन करने को कहता है। स्कैन करके पिन डालने पर क्या होगा?", "एक \"खरीददार\" पइसा देवत बर अपन क्यूआर स्कैन करे बर कहिथे। स्कैन करके पिन डारे ले का होही?"),
      [L("You receive money", "आपको पैसे मिलेंगे", "तुंहला पइसा मिलही"), L("Money leaves your account", "आपके खाते से पैसे चले जाएँगे", "तुंहर खाता ले पइसा चल दिही"), L("Nothing happens", "कुछ नहीं होगा", "कुछु नइ होही")], 1,
      L("A QR to pay is not a QR to get paid. Do not scan it.", "पैसे भेजने वाला क्यूआर पैसे पाने का क्यूआर नहीं होता। इसे स्कैन न करें।", "पइसा भेजइया क्यूआर पइसा पाए के क्यूआर नइ होय। एला स्कैन झन करव।")),
    Q("q_upi_3", "upi_qr", 2, "mcq", L("A \"collect request\" from a stranger appears in your UPI app. What do you do?", "आपके यूपीआई ऐप में किसी अजनबी का \"कलेक्ट रिक्वेस्ट\" आया है। आप क्या करेंगे?", "तुंहर यूपीआई ऐप म कोनो अजनबी के \"कलेक्ट रिक्वेस्ट\" आए हे। तुमन का करहू?"),
      [L("Approve it", "मंज़ूर कर दें", "मंजूर कर देवव"), L("Decline it and report the sender", "मना करें और भेजने वाले की रिपोर्ट करें", "मना करव अउ भेजइया के रिपोर्ट करव"), L("Approve a small amount to test", "जाँचने के लिए छोटी रकम मंज़ूर करें", "जांचे बर छोटे रकम मंजूर करव")], 1,
      L("Approving a collect request sends money out. Decline it.", "कलेक्ट रिक्वेस्ट मंज़ूर करने से पैसे बाहर जाते हैं। मना करें।", "कलेक्ट रिक्वेस्ट मंजूर करे ले पइसा बाहिर जाथे। मना करव।")),
    Q("q_upi_4", "upi_qr", 3, "scenario", L("A stranger says: \"I sent you Rs 5,000 by mistake, please return it,\" and also sends a collect request.", "एक अजनबी कहता है: \"मैंने गलती से आपको ₹5,000 भेज दिए, कृपया लौटा दें,\" और साथ में कलेक्ट रिक्वेस्ट भी भेजता है।", "एक अजनबी कहिथे: \"मैं गलती ले तुंहला ₹5,000 भेज देंव, किरपा करके लौटा देवव,\" अउ संग म कलेक्ट रिक्वेस्ट घलो भेजथे।"),
      [SAFE, SCAM], 1,
      L("A scam. Do not approve the request. Check your bank app yourself and ask your bank if you really received money.", "ठगी। रिक्वेस्ट मंज़ूर न करें। अपने बैंक ऐप में खुद देखें और बैंक से पूछें कि पैसे सच में आए या नहीं।", "ठगी। रिक्वेस्ट मंजूर झन करव। अपन बैंक ऐप म खुद देखव अउ बैंक ले पूछव कि पइसा सच म आइस कि नइ।")),
    # ---- links, apps
    Q("q_lnk_1", "links_apps", 1, "tf", L("It is safe to install a screen-sharing app if a \"bank officer\" asks you to.", "अगर कोई \"बैंक अधिकारी\" कहे तो स्क्रीन-शेयर ऐप इंस्टॉल करना सुरक्षित है।", "यदि कोनो \"बैंक अधिकारी\" कहय त स्क्रीन-शेयर ऐप इंस्टॉल करना सुरक्षित हे।"), [TRUE, FALSE], 1,
      L("False. With such an app the caller can see your screen, OTPs and PIN.", "गलत। ऐसे ऐप से फ़ोन करने वाला आपकी स्क्रीन, ओटीपी और पिन देख सकता है।", "गलत। अइसन ऐप ले फोन करइया तुंहर स्क्रीन, ओटीपी अउ पिन देख सकथे।")),
    Q("q_lnk_2", "links_apps", 2, "mcq", L("Which address is most likely to be fake?", "इनमें से कौन-सा पता नकली होने की सबसे ज़्यादा संभावना रखता है?", "इनमा ले कोन पता नकली होए के सबले जादा संभावना रखथे?"),
      [L("sbi.co.in", "sbi.co.in", "sbi.co.in"), L("sbi-kyc-update.top", "sbi-kyc-update.top", "sbi-kyc-update.top"), L("onlinesbi.sbi", "onlinesbi.sbi", "onlinesbi.sbi"), L("hdfcbank.com", "hdfcbank.com", "hdfcbank.com")], 1,
      L("It adds extra words and an odd ending to a bank's name. The real sites are short and official.", "इसमें बैंक के नाम के साथ अतिरिक्त शब्द और अजीब अंत जुड़ा है। असली साइटें छोटी और आधिकारिक होती हैं।", "एमा बैंक के नाम संग अतिरिक्त शब्द अउ अजीब अंत जुड़े हे। असली साइट छोटे अउ आधिकारिक होथे।")),
    Q("q_lnk_3", "links_apps", 2, "mcq", L("An unknown contact sends a file called \"Wedding invitation.apk\". What do you do?", "एक अनजान संपर्क \"शादी का निमंत्रण.apk\" नाम की फ़ाइल भेजता है। आप क्या करेंगे?", "एक अनजान संपर्क \"बिहाव के नेवता.apk\" नाम के फाइल भेजथे। तुमन का करहू?"),
      [L("Open it to see the card", "कार्ड देखने के लिए खोलें", "कार्ड देखे बर खोलव"), L("Delete it without opening", "बिना खोले मिटा दें", "बिना खोले मिटा देवव"), L("Forward it to family", "परिवार को भेज दें", "परिवार ला भेज देवव")], 1,
      L("An .apk file is an app. Fake invitation apps can take over your phone and your bank apps.", ".apk फ़ाइल एक ऐप होती है। नकली निमंत्रण ऐप आपके फ़ोन और बैंक ऐप पर कब्ज़ा कर सकते हैं।", ".apk फाइल एक ऐप होथे। नकली निमंत्रण ऐप तुंहर फोन अउ बैंक ऐप म कब्जा कर सकथे।")),
    Q("q_lnk_4", "links_apps", 3, "scenario", L("SMS: \"Congratulations! You won a phone. Claim it at bit.ly/x7Kq2.\"", "एसएमएस: \"बधाई हो! आपने फ़ोन जीता है। bit.ly/x7Kq2 पर पाएँ।\"", "एसएमएस: \"बधाई हो! तुमन फोन जीते हव। bit.ly/x7Kq2 म पावव।\""),
      [SAFE, SCAM], 1,
      L("A scam: a prize you did not enter for, and a shortened link that hides the real address.", "ठगी: ऐसा इनाम जिसमें आपने हिस्सा नहीं लिया, और छोटा लिंक जो असली पता छिपाता है।", "ठगी: अइसन इनाम जेमा तुमन हिस्सा नइ लेव, अउ छोटे लिंक जेन असली पता लुकाथे।")),
    # ---- what to do
    Q("q_do_1", "what_to_do", 1, "mcq", L("You lost money in a scam just now. Which number do you call first?", "अभी एक ठगी में आपके पैसे चले गए। सबसे पहले किस नंबर पर कॉल करें?", "अभी एक ठगी म तुंहर पइसा चल दिस। सबले पहिली कोन नंबर म कॉल करव?"),
      [L("1930", "1930", "1930"), L("100 only after a week", "एक हफ़्ते बाद सिर्फ़ 100", "एक हफ्ता बाद सिरिफ 100"), L("The scammer's number", "ठग का नंबर", "ठग के नंबर")], 0,
      L("1930 is the national cyber fraud helpline. Speed matters.", "1930 राष्ट्रीय साइबर ठगी हेल्पलाइन है। जल्दी करना ज़रूरी है।", "1930 राष्ट्रीय साइबर ठगी हेल्पलाइन हे। जल्दी करना जरूरी हे।")),
    Q("q_do_2", "what_to_do", 1, "tf", L("After you were cheated, deleting the chat and messages helps the police.", "ठगी के बाद चैट और संदेश मिटा देने से पुलिस को मदद मिलती है।", "ठगी के बाद चैट अउ संदेसा मिटा देहे ले पुलिस ला मदद मिलथे।"), [TRUE, FALSE], 1,
      L("False. Keep every message, screenshot and payment record as evidence.", "गलत। हर संदेश, स्क्रीनशॉट और भुगतान का रिकॉर्ड सबूत के लिए रखें।", "गलत। हर संदेसा, स्क्रीनशॉट अउ भुगतान के रिकॉर्ड सबूत बर राखव।")),
    Q("q_do_3", "what_to_do", 2, "mcq", L("After calling 1930, where else should you file a complaint?", "1930 पर कॉल करने के बाद आप और कहाँ शिकायत दर्ज करें?", "1930 म कॉल करे के बाद तुमन अउ कहाँ शिकायत दर्ज करव?"),
      [L("cybercrime.gov.in", "cybercrime.gov.in", "cybercrime.gov.in"), L("A social media post", "सोशल मीडिया पोस्ट", "सोशल मीडिया पोस्ट"), L("Nowhere", "कहीं नहीं", "कहूँ नइ")], 0,
      L("File on the national cybercrime portal, cybercrime.gov.in, and keep your evidence ready.", "राष्ट्रीय साइबर अपराध पोर्टल cybercrime.gov.in पर शिकायत करें और सबूत तैयार रखें।", "राष्ट्रीय साइबर अपराध पोर्टल cybercrime.gov.in म शिकायत करव अउ सबूत तैयार राखव।")),
    Q("q_do_4", "what_to_do", 2, "mcq", L("You got a suspicious call but lost no money. Where can you report it?", "आपको एक संदिग्ध कॉल आया लेकिन कोई पैसा नहीं गया। रिपोर्ट कहाँ करें?", "तुंहला एक संदिग्ध कॉल आइस फेर कोनो पइसा नइ गिस। रिपोर्ट कहाँ करव?"),
      [L("Chakshu on the Sanchar Saathi portal", "संचार साथी पोर्टल पर चक्षु", "संचार साथी पोर्टल म चक्षु"), L("Call the scammer back", "ठग को वापस कॉल करें", "ठग ला वापस कॉल करव"), L("Do nothing", "कुछ न करें", "कुछु झन करव")], 0,
      L("Chakshu is for reporting suspected fraud calls and messages before any loss.", "नुकसान से पहले संदिग्ध ठगी वाले कॉल और संदेश की रिपोर्ट के लिए चक्षु है।", "नुकसान ले पहिली संदिग्ध ठगी वाले कॉल अउ संदेसा के रिपोर्ट बर चक्षु हे।")),
]

OUT.mkdir(parents=True, exist_ok=True)
(OUT / "lessons.json").write_text(json.dumps({"version": "2026-11-22.1", "lessons": LESSONS}, ensure_ascii=False, indent=1), encoding="utf-8")
(OUT / "quiz.json").write_text(json.dumps({"version": "2026-11-22.1", "questions": QUIZ}, ensure_ascii=False, indent=1), encoding="utf-8")
print(f"{len(LESSONS)} lessons, {len(QUIZ)} questions")
