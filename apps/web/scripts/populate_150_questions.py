"""Generates and writes 15 questions per chapter for all 10 chapters into quiz.json.
Total: 150 questions (10 chapters x 15 questions).
100% strictly Devanagari for all Hindi and Chhattisgarhi fields.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
QUIZ_FILE = ROOT / "public" / "content" / "quiz.json"

with open(QUIZ_FILE, encoding="utf-8") as f:
    quiz_data = json.load(f)

# Existing questions map
existing = {q["id"]: q for q in quiz_data["questions"]}

# Helper: Keep only valid regex matching KEEP in validate-content.mjs
# const KEEP = /\b[a-z0-9-]+(\.[a-z0-9-]+)*\.(com|in|top|xyz|sbi|ly|net|org)\b(\/\S*)?|\.apk|98X+|\{\w+\}/gi
KEEP = re.compile(r"\b[a-z0-9-]+(\.[a-z0-9-]+)*\.(com|in|top|xyz|sbi|ly|net|org)\b(/\S*)?|\.apk|98X+|\{\w+\}", re.I)

def check_no_latin(label: str, s: str):
    cleaned = KEEP.sub("", s)
    matches = re.findall(r"[A-Za-z]", cleaned)
    if matches:
        raise ValueError(f"Found Latin characters in {label}: {matches} in string: '{s}'")

# Topics:
# 1. otp_pin_card
# 2. atm_pin
# 3. upi_pin
# 4. fake_kyc
# 5. digital_arrest
# 6. courier_customs
# 7. upi_qr
# 8. links_apps
# 9. safe_habits
# 10. what_to_do

NEW_ITEMS = [
    # ---------------- 1. otp_pin_card (7 to 15) ----------------
    {
        "id": "q_otp_7", "topic": "otp_pin_card", "difficulty": 1, "type": "tf",
        "question": {"en": "You can share your OTP with a friend if they say their phone has no network.", "hi": "क्या आप अपने दोस्त को अपना ओटीपी दे सकते हैं यदि वह कहे कि उसके फोन में नेटवर्क नहीं है?", "cg": "का तुमन अपन संगी ला अपन ओटीपी दे सकथो अगर ओ कहय कि ओकर फोन म नेटवर्क नइये?"},
        "options": [{"en": "Yes, friends can be trusted", "hi": "हाँ, दोस्तों पर भरोसा कर सकते हैं", "cg": "हाँ, संगी मन म भरोसा करे जा सकथे"}, {"en": "Never, an OTP is for your account only", "hi": "कभी नहीं, ओटीपी सिर्फ आपके खाते के लिए है", "cg": "कभू नइ, ओटीपी सिरिफ तुंहर खाता बर हे"}],
        "answer": 1,
        "explanation": {"en": "Never share an OTP. The OTP is tied to your bank account and authorizes money leaving your account.", "hi": "ओटीपी कभी साझा न करें। ओटीपी आपके बैंक खाते से जुड़ा होता है और पैसे काटने की अनुमति देता है।", "cg": "ओटीपी कभू कखरो संग साझा झन करव। ओटीपी तुंहर बैंक खाता ले जुड़े रहिथे अउ पइसा काटे के अनुमति देथे।"}
    },
    {
        "id": "q_otp_8", "topic": "otp_pin_card", "difficulty": 2, "type": "scenario",
        "question": {"en": "An SMS says: '₹5,000 debited. If not you, share OTP 8421 with bank support immediately.' What is this?", "hi": "एक संदेश आता है: '₹5,000 कट गए। अगर आपने नहीं किया, तो बैंक को तुरंत ओटीपी 8421 बताएं।' यह क्या है?", "cg": "एक संदेश आथे: '₹5,000 कट गे। अगर तुमन नइ करे हव, त बैंक ला तुरंत ओटीपी 8421 बताव।' ए का चीज हे?"},
        "options": [{"en": "A scam message trying to steal your OTP", "hi": "ओटीपी चुराने वाला एक फर्जी संदेश", "cg": "ओटीपी चोराए वाला एक फर्जी संदेश"}, {"en": "A real bank security alert", "hi": "बैंक का असली सुरक्षा संदेश", "cg": "बैंक के असली सुरक्षा संदेश"}, {"en": "A technical error from telecom company", "hi": "टेलीकॉम कंपनी की तकनीकी खराबी", "cg": "टेलीकॉम कंपनी के तकनीकी खराबी"}],
        "answer": 0,
        "explanation": {"en": "Scammers send fake debit alerts to induce panic so that you share your OTP. Banks never ask for OTP to cancel a transaction.", "hi": "ठग घबराहट पैदा करने के लिए फर्जी संदेश भेजते हैं ताकि आप ओटीपी बता दें। बैंक कभी लेनदेन रद्द करने के लिए ओटीपी नहीं मांगता।", "cg": "ठग मन घबराहट पैदा करे बर फर्जी संदेश भेजथें जेकर ले तुमन ओटीपी बता देव। बैंक कभू लेनदेन रद्द करे बर ओटीपी नइ मांगय।"}
    },
    {
        "id": "q_otp_9", "topic": "otp_pin_card", "difficulty": 1, "type": "mcq",
        "question": {"en": "Where is the CVV number located on your debit card?", "hi": "आपके एटीएम कार्ड पर सीवीवी नंबर कहाँ लिखा होता है?", "cg": "तुंहर एटीएम कार्ड म सीवीवी नंबर कहाँ लिखे रहिथे?"},
        "options": [{"en": "On the back, 3 digits near the signature strip", "hi": "पीछे की तरफ, हस्ताक्षर पट्टी के पास 3 अंक", "cg": "पाछू के कोती, दस्तखत पट्टी के तीर 3 अंक"}, {"en": "On the front, below your name", "hi": "सामने की तरफ, आपके नाम के नीचे", "cg": "आघू के कोती, तुंहर नाम के तरी"}, {"en": "Inside the golden chip", "hi": "गोल्डन चिप के अंदर", "cg": "सुनहरा चिप के भीतर"}],
        "answer": 0,
        "explanation": {"en": "The CVV is a 3-digit secret code on the back of your card. Never share it with anyone.", "hi": "सीवीवी कार्ड के पीछे लिखा 3 अंकों का गुप्त कोड है। इसे कभी किसी को न बताएं।", "cg": "सीवीवी कार्ड के पाछू लिखे 3 अंक के गुप्त कोड हे। एला कभू कखरो ला झन बतावहू।"}
    },
    {
        "id": "q_otp_10", "topic": "otp_pin_card", "difficulty": 2, "type": "tf",
        "question": {"en": "If a caller knows your card number and date of birth, it means they are definitely from the bank.", "hi": "यदि फोन करने वाले को आपका कार्ड नंबर और जन्म तिथि पता है, तो इसका मतलब है कि वह सचमुच बैंक से है।", "cg": "अगर फोन करे वाला ला तुंहर कार्ड नंबर अउ जनम तारीख मालूम हे, त एकर मतलब हे कि ओ सचमुच बैंक ले हे।"},
        "options": [{"en": "True", "hi": "सही", "cg": "सही"}, {"en": "False", "hi": "गलत", "cg": "गलत"}],
        "answer": 1,
        "explanation": {"en": "False. Fraudsters often buy leaked details to sound convincing, but only you have the OTP or PIN.", "hi": "गलत। ठग भरोसा जीतने के लिए लीक हुआ विवरण इस्तेमाल करते हैं, लेकिन ओटीपी और पिन केवल आपके पास होता है।", "cg": "गलत। ठग मन भरोसा जीते बर लीक विवरण के उपयोग करथें, फेर ओटीपी अउ पिन सिरिफ तुंहर तीर होथे।"}
    },
    {
        "id": "q_otp_11", "topic": "otp_pin_card", "difficulty": 3, "type": "scenario",
        "question": {"en": "Someone at a ration shop offers to type your PIN to help you. What should you do?", "hi": "राशन दुकान पर कोई आपकी मदद के लिए आपका पिन टाइप करने को कहता है। आपको क्या करना चाहिए?", "cg": "राशन दुकान म कोनो तुंहर मदद बर तुंहर पिन टाइप करे ला कहिथे। तुंहला का करना चाही?"},
        "options": [{"en": "Politely refuse and type your PIN privately yourself", "hi": "विनम्रता से मना करें और पिन खुद छुपाकर टाइप करें", "cg": "मया ले मना करव अउ पिन ला खुद लुका के टाइप करव"}, {"en": "Tell them the PIN so the line moves faster", "hi": "उन्हें पिन बता दें ताकि काम जल्दी हो", "cg": "ओमन ला पिन बता देव ताकि काम जल्दी हो जाय"}, {"en": "Write the PIN on a slip of paper", "hi": "कागज की पर्ची पर पिन लिखकर दे दें", "cg": "कागज के टुकना म पिन लिखके दे देव"}],
        "answer": 0,
        "explanation": {"en": "Never let anyone see or enter your PIN. Always cover the keypad with your hand and type it yourself.", "hi": "अपना पिन किसी को न देखने दें, न टाइप करने दें। हमेशा हाथ से कीपैड छुपाकर खुद टाइप करें।", "cg": "अपन पिन कखरो ला झन देखन देव, न टाइप करन देव। हमेशा हाथ ले कीपैड ला तोप के खुद टाइप करव।"}
    },
    {
        "id": "q_otp_12", "topic": "otp_pin_card", "difficulty": 1, "type": "mcq",
        "question": {"en": "What does OTP stand for?", "hi": "ओटीपी का पूरा अर्थ क्या है?", "cg": "ओटीपी के पूरा मतलब का होथे?"},
        "options": [{"en": "One-Time Password", "hi": "एक बार इस्तेमाल होने वाला पासवर्ड", "cg": "एक पइंत उपयोग होए वाला पासवर्ड"}, {"en": "Official Telephone Pass", "hi": "ऑफिशियल टेलीफोन पास", "cg": "ऑफिशियल टेलीफोन पास"}, {"en": "Online Transfer Permission", "hi": "ऑनलाइन ट्रांसफर परमिशन", "cg": "ऑनलाइन ट्रांसफर परमिशन"}],
        "answer": 0,
        "explanation": {"en": "OTP stands for One-Time Password. It is valid for a single transaction and expires in minutes.", "hi": "ओटीपी का मतलब है वन-टाइम पासवर्ड। यह केवल एक बार के लेनदेन के लिए मान्य होता है।", "cg": "ओटीपी के मतलब वन-टाइम पासवर्ड होथे। ए सिरिफ एक पइंत के लेनदेन बर मान्य होथे।"}
    },
    {
        "id": "q_otp_13", "topic": "otp_pin_card", "difficulty": 1, "type": "tf",
        "question": {"en": "It is safe to write your ATM PIN on the back of your card with a marker.", "hi": "एटीएम कार्ड के पीछे मार्कर से अपना पिन लिखना सुरक्षित है।", "cg": "एटीएम कार्ड के पाछू मार्कर ले अपन पिन लिखना सुरक्षित हे।"},
        "options": [{"en": "True", "hi": "सही", "cg": "सही"}, {"en": "False", "hi": "गलत", "cg": "गलत"}],
        "answer": 1,
        "explanation": {"en": "False. If your card is lost or stolen, anyone can immediately withdraw all your savings.", "hi": "गलत। यदि आपका कार्ड खो जाए या चोरी हो जाए, तो कोई भी तुरंत आपकी पूरी जमा पूंजी निकाल सकता है।", "cg": "गलत। अगर तुंहर कार्ड हेरा जाय या चोरी हो जाय, त कोनो घलो तुरंत तुंहर जम्मो पइसा निकाल लिही।"}
    },
    {
        "id": "q_otp_14", "topic": "otp_pin_card", "difficulty": 2, "type": "scenario",
        "question": {"en": "You receive an OTP on your phone that you did not request. What should you do?", "hi": "आपके फोन पर एक ओटीपी आया जिसे आपने नहीं मांगा था। आपको क्या करना चाहिए?", "cg": "तुंहर फोन म एक ओटीपी आइस जेला तुमन नइ मांगे रेहेव। तुंहला का करना चाही?"},
        "options": [{"en": "Do not share it with anyone and inform your bank", "hi": "किसी को न बताएं और तुरंत अपने बैंक को सूचित करें", "cg": "कखरो ला झन बताव अउ तुरंत अपन बैंक ला खबर करव"}, {"en": "Forward the SMS to social media", "hi": "संदेश को सोशल मीडिया पर शेयर कर दें", "cg": "संदेश ला सोशल मीडिया म भेज देव"}, {"en": "Call the number mentioned in the SMS", "hi": "संदेश में लिखे नंबर पर तुरंत फोन करें", "cg": "संदेश म लिखे नंबर म तुरंत फोन करव"}],
        "answer": 0,
        "explanation": {"en": "An unrequested OTP means someone is attempting to access your money. Never share it, and contact your bank branch.", "hi": "बिना मांगे आया ओटीपी बताता है कि कोई आपके खाते में सेंध लगाने की कोशिश कर रहा है। इसे किसी को न बताएं और बैंक को बताएं।", "cg": "बिना मांगे आए ओटीपी बताथे कि कोनो तुंहर खाता म सेंध लगाए के कोशिश करत हे। एला कखरो ला झन बताव अउ बैंक ला बताव।"}
    },
    {
        "id": "q_otp_15", "topic": "otp_pin_card", "difficulty": 3, "type": "mcq",
        "question": {"en": "A scammer says: 'To verify your identity, send the OTP back to us.' What will happen if you do?", "hi": "ठग कहता है: 'अपनी पहचान सत्यापित करने के लिए हमें वापस ओटीपी भेजें।' यदि आप भेजते हैं तो क्या होगा?", "cg": "ठग कहिथे: 'अपन पहिचान साबित करे बर हमन ला वापस ओटीपी भेजव।' अगर तुमन भेज दिहू त का होही?"},
        "options": [{"en": "Money will be deducted from your account", "hi": "आपके खाते से पैसे कट जाएंगे", "cg": "तुंहर खाता ले पइसा कट जाही"}, {"en": "Your account will be protected", "hi": "आपका खाता सुरक्षित हो जाएगा", "cg": "तुंहर खाता सुरक्षित हो जाही"}, {"en": "Your bank balance will double", "hi": "आपका बैंक बैलेंस दोगुना हो जाएगा", "cg": "तुंहर बैंक बैलेंस दुगुना हो जाही"}],
        "answer": 0,
        "explanation": {"en": "Sending the OTP lets the scammer authorize the fraudulent withdrawal or transfer immediately.", "hi": "ओटीपी भेजते ही ठग आपके खाते से पैसे निकालने या ट्रांसफर करने का काम पूरा कर लेता है।", "cg": "ओटीपी भेजते ही ठग तुंहर खाता ले पइसा निकाले या ट्रांसफर करे के काम पूरा कर लेथे।"}
    },

    # ---------------- 2. atm_pin (7 to 15) ----------------
    {
        "id": "q_atm_7", "topic": "atm_pin", "difficulty": 1, "type": "tf",
        "question": {"en": "You should check if the ATM card slot feels loose or has an extra plastic piece attached.", "hi": "एटीएम मशीन में कार्ड डालने वाली जगह अगर ढीली लगे या अलग से चिपकाई लगे, तो सावधानी बरतनी चाहिए।", "cg": "एटीएम मशीन म कार्ड डारे के जगा अगर ढीला लगय या अलग ले चिपकाए लगय, त सावधानी रखना चाही।"},
        "options": [{"en": "True", "hi": "सही", "cg": "सही"}, {"en": "False", "hi": "गलत", "cg": "गलत"}],
        "answer": 0,
        "explanation": {"en": "True. Criminals place card skimmers over the slot to steal your card data. If it looks suspicious, use another ATM.", "hi": "सही। ठग कार्ड का डेटा चुराने के लिए स्लॉट पर स्किमर चिपका देते हैं। यदि कुछ अजीब लगे तो दूसरे एटीएम का उपयोग करें।", "cg": "सही। ठग मन कार्ड के डेटा चोराए बर स्लॉट म स्किमर चिपका देथें। अगर कुछु अजीब लगय त दूसरा एटीएम म जाव।"}
    },
    {
        "id": "q_atm_8", "topic": "atm_pin", "difficulty": 2, "type": "scenario",
        "question": {"en": "Your card gets stuck inside the ATM. A stranger standing behind says: 'Enter your PIN again, it will come out.' What should you do?", "hi": "आपका कार्ड एटीएम मशीन में फंस गया। पीछे खड़ा अनजान व्यक्ति कहता है: 'पिन दोबारा डालें, कार्ड निकल आएगा।' आपको क्या करना चाहिए?", "cg": "तुंहर कार्ड एटीएम मशीन म फंस गे। पाछू खड़ा अनजान मनखे कहिथे: 'पिन दोबारा डारव, कार्ड निकल जाही।' तुंहला का करना चाही?"},
        "options": [{"en": "Do not enter your PIN; report to the bank and block the card immediately", "hi": "पिन न डालें; तुरंत बैंक को बताएं और कार्ड ब्लॉक करवाएं", "cg": "पिन झन डारव; तुरंत बैंक ला बताव अउ कार्ड ब्लॉक करवाव"}, {"en": "Type your PIN so the stranger can help", "hi": "पिन टाइप करें ताकि वह व्यक्ति मदद कर सके", "cg": "पिन टाइप करव ताकि ओ मनखे मदद कर सकय"}, {"en": "Leave the ATM and check tomorrow", "hi": "कार्ड वहीं छोड़कर कल बैंक जाएं", "cg": "कार्ड ला ओहिचे छोड़ के कल बैंक जाव"}],
        "answer": 0,
        "explanation": {"en": "Never enter your PIN in front of a stranger. They may have tampered with the slot to steal your card and see your PIN.", "hi": "किसी अजनबी के सामने पिन न डालें। हो सकता है उसने कार्ड फंसाने की साजिश की हो ताकि आपका पिन देख सके।", "cg": "कोनो अनजान मनखे के आघू पिन झन डारव। हो सकथे ओ कार्ड फंसाए के साजिश करे होय ताकि तुंहर पिन देख सकय।"}
    },
    {
        "id": "q_atm_9", "topic": "atm_pin", "difficulty": 1, "type": "mcq",
        "question": {"en": "What is the safest way to enter your ATM PIN at an ATM counter?", "hi": "एटीएम काउंटर पर अपना पिन दर्ज करने का सबसे सुरक्षित तरीका क्या है?", "cg": "एटीएम काउंटर म अपन पिन डारे के सबसे सुरक्षित तरीका का हे?"},
        "options": [{"en": "Cover the keypad with your other hand while typing", "hi": "टाइप करते समय दूसरे हाथ से कीपैड को ऊपर से ढकें", "cg": "टाइप करत बेरा दूसरा हाथ ले कीपैड ला ऊपर ले तोपव"}, {"en": "Ask the security guard to enter it for you", "hi": "सुरक्षा गार्ड से कहें कि वह पिन दर्ज कर दे", "cg": "सुरक्षा गार्ड ले कहव कि ओ पिन टाइप कर देय"}, {"en": "Say the digits aloud as you press them", "hi": "बटन दबाते समय अंकों को जोर से बोलें", "cg": "बटन दबावत बेरा अंक मन ला जोर ले बोलव"}],
        "answer": 0,
        "explanation": {"en": "Covering the keypad blocks hidden cameras or prying eyes from seeing your secret PIN.", "hi": "कीपैड को ढकने से छिपे हुए कैमरे या पास खड़े लोग आपका गुप्त पिन नहीं देख पाते।", "cg": "कीपैड ला तोपे ले लुकाए कैमरा या तीर म खड़े मनखे तुंहर गुप्त पिन ला नइ देख पावंय।"}
    },
    {
        "id": "q_atm_10", "topic": "atm_pin", "difficulty": 2, "type": "tf",
        "question": {"en": "Using your birth year like 1985 as your ATM PIN is safe because it is easy to remember.", "hi": "जन्म का वर्ष जैसे 1985 को एटीएम पिन बनाना सुरक्षित है क्योंकि यह याद रहता है।", "cg": "जनम के बछर जइसे 1985 ला एटीएम पिन बनाना सुरक्षित हे काबर कि ए याद रहिथे।"},
        "options": [{"en": "True", "hi": "सही", "cg": "सही"}, {"en": "False", "hi": "गलत", "cg": "गलत"}],
        "answer": 1,
        "explanation": {"en": "False. Birth years, 1234, or repeating digits like 0000 are the first combinations fraudsters guess.", "hi": "गलत। जन्म वर्ष, 1234 या 0000 जैसे आसान पिन का अनुमान ठग सबसे पहले लगाते हैं।", "cg": "गलत। जनम बछर, 1234 या 0000 जइसन सीधा पिन के अंदाजा ठग मन सबसे पहिली लगाथें।"}
    },
    {
        "id": "q_atm_11", "topic": "atm_pin", "difficulty": 3, "type": "scenario",
        "question": {"en": "You finished withdrawing cash at an ATM. What should you do before walking out?", "hi": "आपने एटीएम से पैसे निकाल लिए। बाहर जाने से पहले आपको क्या करना चाहिए?", "cg": "तुमन एटीएम ले पइसा निकाल लेहेव। बाहिर जाय ले पहिली तुंहला का करना चाही?"},
        "options": [{"en": "Take your card, take the receipt or press Cancel, and ensure the welcome screen is back", "hi": "कार्ड लें, कैंसल बटन दबाएं और सुनिश्चित करें कि मुख्य स्क्रीन वापस आ गई है", "cg": "कार्ड लेव, कैंसल बटन दबावहू अउ पक्का करव कि मुख्य स्क्रीन वापस आ गे हे"}, {"en": "Leave immediately without pressing any button", "hi": "बिना कोई बटन दबाए तुरंत बाहर निकल जाएं", "cg": "बिना कोनो बटन दबाए तुरंत बाहिर निकल जाव"}, {"en": "Hand the card to the next person to check if it worked", "hi": "अगले व्यक्ति को कार्ड देकर जाँचने को कहें", "cg": "पाछू वाले मनखे ला कार्ड देके चेक करे ला कहव"}],
        "answer": 0,
        "explanation": {"en": "Always press Cancel and wait for the welcome screen so your banking session is completely closed.", "hi": "हमेशा कैंसल बटन दबाएं और मुख्य स्क्रीन आने तक प्रतीक्षा करें ताकि आपका सत्र पूरी तरह बंद हो जाए।", "cg": "हमेशा कैंसल बटन दबावहू अउ मुख्य स्क्रीन आवत ले अगोरव ताकि तुंहर सत्र पूरा बंद हो जाय।"}
    },
    {
        "id": "q_atm_12", "topic": "atm_pin", "difficulty": 1, "type": "mcq",
        "question": {"en": "How many digits does a standard debit card ATM PIN have in India?", "hi": "भारत में सामान्य एटीएम कार्ड का पिन कितने अंकों का होता है?", "cg": "भारत म सामान्य एटीएम कार्ड के पिन कतका अंक के होथे?"},
        "options": [{"en": "4 digits", "hi": "4 अंक", "cg": "4 अंक"}, {"en": "8 digits", "hi": "8 अंक", "cg": "8 अंक"}, {"en": "10 digits", "hi": "10 अंक", "cg": "10 अंक"}],
        "answer": 0,
        "explanation": {"en": "Standard ATM PINs in India are 4 digits long. Keep all 4 digits completely secret.", "hi": "भारत में एटीएम पिन 4 अंकों का होता है। इन चारों अंकों को पूरी तरह गुप्त रखें।", "cg": "भारत म एटीएम पिन 4 अंक के होथे। ए चारों अंक ला पूरा गुप्त राखव।"}
    },
    {
        "id": "q_atm_13", "topic": "atm_pin", "difficulty": 2, "type": "tf",
        "question": {"en": "If you notice someone standing uncomfortably close inside the ATM room, you should ask them to step outside.", "hi": "यदि कोई व्यक्ति एटीएम रूम के अंदर आपके एकदम करीब खड़ा हो, तो उसे बाहर जाने के लिए कहना चाहिए।", "cg": "अगर कोनो मनखे एटीएम रूम के भीतर तुंहर एकदम तीर म खड़ा होवय, त ओला बाहिर जाय बर कहना चाही।"},
        "options": [{"en": "True", "hi": "सही", "cg": "सही"}, {"en": "False", "hi": "गलत", "cg": "गलत"}],
        "answer": 0,
        "explanation": {"en": "True. Only one person is permitted inside an ATM kiosk at a time to ensure complete transaction privacy.", "hi": "सही। एटीएम केबिन में एक समय में केवल एक ही व्यक्ति को रहने की अनुमति होती है ताकि सुरक्षा बनी रहे।", "cg": "सही। एटीएम केबिन म एक बेरा म सिरिफ एक ही मनखे के रहे के नियम होथे ताकि सुरक्षा बने रहय।"}
    },
    {
        "id": "q_atm_14", "topic": "atm_pin", "difficulty": 3, "type": "scenario",
        "question": {"en": "An SMS arrives saying your ATM card is blocked due to chip error. It gives an unknown mobile number to reactivate. What should you do?", "hi": "एक संदेश आता है कि चिप खराबी के कारण एटीएम ब्लॉक हो गया है और चालू करने के लिए अनजान मोबाइल नंबर दिया है। क्या करें?", "cg": "एक संदेश आथे कि चिप खराबी के सेती एटीएम ब्लॉक हो गे हे अउ चालू करे बर अनजान मोबाइल नंबर दे हे। का करव?"},
        "options": [{"en": "Do not call the number; visit your bank branch directly to verify", "hi": "उस नंबर पर कॉल न करें; सीधे अपनी बैंक शाखा जाकर पता करें", "cg": "ओ नंबर म फोन झन करव; सीधा अपन बैंक शाखा जाके पता करव"}, {"en": "Call the number and give your card details", "hi": "नंबर पर फोन करके कार्ड का नंबर बताएं", "cg": "नंबर म फोन करके कार्ड के नंबर बता देव"}, {"en": "Send your PIN via SMS to that number", "hi": "उस नंबर पर एसएमएस से पिन भेज दें", "cg": "ओ नंबर म संदेश भेज के पिन बता देव"}],
        "answer": 0,
        "explanation": {"en": "Banks do not send personal mobile numbers for card reactivation. This is a trap to steal your card details.", "hi": "बैंक कभी कार्ड चालू करने के लिए किसी का व्यक्तिगत मोबाइल नंबर नहीं भेजते। यह ठगी का जाल है।", "cg": "बैंक कभू कार्ड चालू करे बर कोनो के व्यक्तिगत मोबाइल नंबर नइ भेजंय। ए ठगी के जाल हे।"}
    },
    {
        "id": "q_atm_15", "topic": "atm_pin", "difficulty": 2, "type": "mcq",
        "question": {"en": "How often should you change your ATM PIN for maximum safety?", "hi": "सुरक्षा के लिए आपको अपना एटीएम पिन कितने समय में बदलते रहना चाहिए?", "cg": "सुरक्षा बर तुंहला अपन एटीएम पिन कतका दिन म बदलत रहना चाही?"},
        "options": [{"en": "Every 3 to 6 months", "hi": "हर 3 से 6 महीने में", "cg": "हर 3 ले 6 महीना म"}, {"en": "Never, keep the same PIN for life", "hi": "कभी नहीं, जीवन भर एक ही पिन रखें", "cg": "कभू नइ, जिनगी भर एक ही पिन राखव"}, {"en": "Every single day", "hi": "हर दिन", "cg": "हर दिन"}],
        "answer": 0,
        "explanation": {"en": "Changing your PIN every few months protects you in case it was accidentally seen by someone.", "hi": "कुछ महीनों में पिन बदलते रहने से सुरक्षा बनी रहती है यदि किसी ने अनजाने में आपका पिन देख भी लिया हो।", "cg": "कुछ महीना म पिन बदलत रहे ले सुरक्षा बने रहिथे अगर कोनो अनजाने म तुंहर पिन देख घलो डारे होय।"}
    },

    # ---------------- 3. upi_pin (7 to 15) ----------------
    {
        "id": "q_pin_7", "topic": "upi_pin", "difficulty": 1, "type": "tf",
        "question": {"en": "Entering your UPI PIN adds money to your bank account.", "hi": "यूपीआई पिन डालने से आपके बैंक खाते में पैसे जमा होते हैं।", "cg": "यूपीआई पिन डारे ले तुंहर बैंक खाता म पइसा जमा होथे।"},
        "options": [{"en": "True", "hi": "सही", "cg": "सही"}, {"en": "False", "hi": "गलत", "cg": "गलत"}],
        "answer": 1,
        "explanation": {"en": "False! Entering your UPI PIN ONLY sends money OUT of your account. Receiving money never needs a PIN.", "hi": "गलत! यूपीआई पिन डालने से केवल पैसे खाते से बाहर जाते हैं। पैसे प्राप्त करने के लिए पिन कभी नहीं लगता।", "cg": "गलत! यूपीआई पिन डारे ले सिरिफ पइसा खाता ले बाहिर जाथे। पइसा मिले बर पिन कभू नइ लागय।"}
    },
    {
        "id": "q_pin_8", "topic": "upi_pin", "difficulty": 2, "type": "scenario",
        "question": {"en": "A buyer on OLX says: 'I sent you ₹2,000 for your old cycle. Click this link and enter your UPI PIN to claim it.' What is happening?", "hi": "सामान खरीदने वाला कहता है: 'मैंने ₹2,000 भेज दिए हैं। इस लिंक पर क्लिक करके अपना यूपीआई पिन डालें और पैसे लें।' क्या हो रहा है?", "cg": "सामान बिसाए वाला कहिथे: 'मंय ₹2,000 भेज देहे हंव। ए लिंक म जाके अपन यूपीआई पिन डारव अउ पइसा लेव।' का होत हे?"},
        "options": [{"en": "It is a fraud collect request to deduct ₹2,000 from you", "hi": "यह आपके खाते से ₹2,000 काटने का ठगी का प्रयास है", "cg": "ए तुंहर खाता ले ₹2,000 काटे के ठगी के प्रयास हे"}, {"en": "It is the standard procedure to receive money", "hi": "पैसे प्राप्त करने का यही सामान्य तरीका है", "cg": "पइसा मिले के एही सामान्य तरीका हे"}, {"en": "The bank is holding the funds", "hi": "बैंक ने पैसे रोक रखे हैं", "cg": "बैंक ह पइसा रोक के रखे हे"}],
        "answer": 0,
        "explanation": {"en": "You never enter your PIN to receive money. Entering your PIN approves a deduction from your own account.", "hi": "पैसे पाने के लिए कभी पिन नहीं डाला जाता। पिन डालते ही आपके खुद के खाते से पैसे कट जाते हैं।", "cg": "पइसा पाए बर कभू पिन नइ डारे जाय। पिन डारते ही तुंहर खुद के खाता ले पइसा कट जाथे।"}
    },
    {
        "id": "q_pin_9", "topic": "upi_pin", "difficulty": 1, "type": "mcq",
        "question": {"en": "How many digits is a UPI PIN typically?", "hi": "यूपीआई पिन आमतौर पर कितने अंकों का होता है?", "cg": "यूपीआई पिन आमतौर म कतका अंक के होथे?"},
        "options": [{"en": "4 or 6 digits", "hi": "4 या 6 अंक", "cg": "4 या 6 अंक"}, {"en": "10 digits", "hi": "10 अंक", "cg": "10 अंक"}, {"en": "16 digits", "hi": "16 अंक", "cg": "16 अंक"}],
        "answer": 0,
        "explanation": {"en": "Depending on your bank, a UPI PIN is either 4 or 6 digits long. Never disclose it to anyone.", "hi": "बैंक के अनुसार यूपीआई पिन 4 या 6 अंकों का होता है। इसे कभी किसी को न बताएं।", "cg": "बैंक के हिसाब ले यूपीआई पिन 4 या 6 अंक के होथे। एला कभू कखरो ला झन बतावहू।"}
    },
    {
        "id": "q_pin_10", "topic": "upi_pin", "difficulty": 2, "type": "tf",
        "question": {"en": "Your UPI PIN is the same thing as the OTP sent by SMS.", "hi": "आपका यूपीआई पिन और एसएमएस से आने वाला ओटीपी दोनों एक ही चीज़ हैं।", "cg": "तुंहर यूपीआई पिन अउ संदेश म आए वाला ओटीपी दूनों एक ही चीज हे।"},
        "options": [{"en": "True", "hi": "सही", "cg": "सही"}, {"en": "False", "hi": "गलत", "cg": "गलत"}],
        "answer": 1,
        "explanation": {"en": "False. A UPI PIN is set by you and stays the same. An OTP is a one-time code sent for a single transaction.", "hi": "गलत। यूपीआई पिन आप खुद बनाते हैं जो हमेशा वही रहता है। ओटीपी बैंक द्वारा भेजा गया एक बार का कोड होता है।", "cg": "गलत। यूपीआई पिन तुमन खुद बनाथव जउन हमेशा ओही रहिथे। ओटीपी बैंक कोती ले भेजे एक बेरा के कोड होथे।"}
    },
    {
        "id": "q_pin_11", "topic": "upi_pin", "difficulty": 3, "type": "scenario",
        "question": {"en": "You see a notification in your payment app: 'Request from Electric Department: Pay ₹1,500. Enter PIN.' You already paid your bill yesterday. What should you do?", "hi": "ऐप पर सूचना आई: 'बिजली विभाग का बिल: ₹1,500 भरें। पिन डालें।' आप कल ही बिल भर चुके हैं। क्या करें?", "cg": "ऐप म सूचना आइस: 'बिजली विभाग के बिल: ₹1,500 भरव। पिन डारव।' तुमन कालीच बिल भर चुके हव। का करव?"},
        "options": [{"en": "Decline the request and do not enter your PIN", "hi": "अनुरोध अस्वीकार करें और पिन बिल्कुल न डालें", "cg": "अनुरोध ला मना कर देव अउ पिन बिल्कुल झन डारव"}, {"en": "Enter your PIN just in case", "hi": "पिन डाल दें ताकि बिजली न कटे", "cg": "पिन डार देव ताकि बिजली झन कटय"}, {"en": "Forward the notification to friends", "hi": "सूचना दोस्तों को भेजें", "cg": "सूचना ला संगी मन ला भेज देव"}],
        "answer": 0,
        "explanation": {"en": "Scammers send fake collect requests hoping you tap and enter your PIN automatically. Always decline suspicious requests.", "hi": "ठग फर्जी बिल अनुरोध भेजते हैं ताकि आप बिना सोचे पिन डाल दें। ऐसे फर्जी अनुरोध को तुरंत अस्वीकार करें।", "cg": "ठग मन फर्जी बिल अनुरोध भेजथें ताकि तुमन बिना सोचे पिन डार देव। अइसन फर्जी अनुरोध ला तुरंत मना करव।"}
    },
    {
        "id": "q_pin_12", "topic": "upi_pin", "difficulty": 1, "type": "mcq",
        "question": {"en": "When should you enter your UPI PIN in your payment app?", "hi": "आपको अपने पेमेंट ऐप में यूपीआई पिन कब दर्ज करना चाहिए?", "cg": "तुंहला अपन पेमेंट ऐप म यूपीआई पिन कभू डारना चाही?"},
        "options": [{"en": "Only when YOU are intentionally sending money to someone", "hi": "केवल तब जब आप खुद किसी को पैसे भेज रहे हों", "cg": "सिरिफ तब जब तुमन खुद कोनो ला पइसा भेजत होवव"}, {"en": "When checking your notifications", "hi": "नोटिफिकेशन चेक करते समय", "cg": "नोटिफिकेशन देखत बेरा"}, {"en": "To claim a cashback reward", "hi": "कैशबैक इनाम पाने के लिए", "cg": "कैशबैक इनाम पाए बर"}],
        "answer": 0,
        "explanation": {"en": "The UPI PIN screen is ONLY for sending money. If you are receiving money or claiming a reward, no PIN is needed.", "hi": "यूपीआई पिन स्क्रीन केवल पैसे भेजने के लिए होती है। पैसे पाने या इनाम के लिए पिन कभी नहीं लगता।", "cg": "यूपीआई पिन स्क्रीन सिरिफ पइसा भेजे बर होथे। पइसा पाए बर या इनाम बर पिन कभू नइ लागय।"}
    },
    {
        "id": "q_pin_13", "topic": "upi_pin", "difficulty": 2, "type": "tf",
        "question": {"en": "Customer support from PhonePe or Google Pay will ask you to enter your PIN on a phone call to fix a transaction.", "hi": "पेमेंट ऐप का कस्टमर केयर अधिकारी लेनदेन ठीक करने के लिए फोन पर आपसे पिन दर्ज करने को कह सकता है।", "cg": "पेमेंट ऐप के कस्टमर केयर अधिकारी लेनदेन ठीक करे बर फोन म तुमन ले पिन डारे ला कह सकथे।"},
        "options": [{"en": "True", "hi": "सही", "cg": "सही"}, {"en": "False", "hi": "गलत", "cg": "गलत"}],
        "answer": 1,
        "explanation": {"en": "False. Real support agents never ask for your PIN under any circumstances.", "hi": "गलत। असली कस्टमर केयर कर्मचारी कभी किसी भी परिस्थिति में आपका पिन नहीं मांगते।", "cg": "गलत। असली कस्टमर केयर कर्मचारी कभू कोनो हालत म तुंहर पिन नइ मांगंय।"}
    },
    {
        "id": "q_pin_14", "topic": "upi_pin", "difficulty": 3, "type": "scenario",
        "question": {"en": "Someone accidentally sends ₹500 to your UPI and asks you to send it back via a suspicious link they sent. What should you do?", "hi": "किसी ने गलती से आपके खाते में ₹500 भेज दिए और वापस करने के लिए एक लिंक भेजा। आपको क्या करना चाहिए?", "cg": "कोनो ह गलती ले तुंहर खाता म ₹500 भेज दीस अउ वापस करे बर एक लिंक भेजीस। तुंहला का करना चाही?"},
        "options": [{"en": "Do not click the link; verify with your bank or send only through the official app", "hi": "लिंक पर क्लिक न करें; बैंक से पुष्टि करें या केवल आधिकारिक ऐप से भेजें", "cg": "लिंक म क्लिक झन करव; बैंक ले पता करव या सिरिफ असली ऐप ले भेजव"}, {"en": "Click the link immediately to return the money", "hi": "पैसे लौटाने के लिए तुरंत लिंक पर क्लिक करें", "cg": "पइसा लौटाए बर तुरंत लिंक म क्लिक कर देव"}, {"en": "Send double the amount as apology", "hi": "माफी के तौर पर दोगुने पैसे भेजें", "cg": "माफी के रूप म दुगुना पइसा भेज देव"}],
        "answer": 0,
        "explanation": {"en": "Scammers send phishing links pretending to be refund links. Never click links to return money; use official channels.", "hi": "ठग पैसे लौटाने के नाम पर फर्जी लिंक भेजते हैं। पैसे लौटाने के लिए कभी किसी लिंक पर क्लिक न करें।", "cg": "ठग मन पइसा लौटाए के नाम म फर्जी लिंक भेजथें। पइसा लौटाए बर कभू कोनो लिंक म क्लिक झन करव।"}
    },
    {
        "id": "q_pin_15", "topic": "upi_pin", "difficulty": 2, "type": "mcq",
        "question": {"en": "If you suspect someone saw your UPI PIN while you were paying at a local shop, what is the best step?", "hi": "यदि आपको संदेह हो कि दुकान पर भुगतान करते समय किसी ने आपका यूपीआई पिन देख लिया, तो सबसे अच्छा कदम क्या है?", "cg": "अगर तुंहला संदेहा होवय कि दुकान म पइसा देवत बेरा कोनो तुंहर यूपीआई पिन देख लीस, त सबसे बने कदम का हे?"},
        "options": [{"en": "Change your UPI PIN immediately inside the official app", "hi": "आधिकारिक ऐप में जाकर तुरंत अपना यूपीआई पिन बदल लें", "cg": "असली ऐप म जाके तुरंत अपन यूपीआई पिन ला बदल लेव"}, {"en": "Do nothing unless money is stolen", "hi": "कुछ न करें जब तक पैसे न कटें", "cg": "कुछु झन करव जब तक पइसा नइ कटय"}, {"en": "Uninstall the app permanently", "hi": "ऐप को हमेशा के लिए डिलीट कर दें", "cg": "ऐप ला हमेशा बर डिलीट कर देव"}],
        "answer": 0,
        "explanation": {"en": "You can change your UPI PIN anytime in seconds in your app. Changing it immediately keeps your account secure.", "hi": "आप ऐप में कुछ ही सेकंड में अपना यूपीआई पिन बदल सकते हैं। तुरंत पिन बदलने से आपका खाता सुरक्षित रहता है।", "cg": "तुमन ऐप म कुछे सेकंड म अपन यूपीआई पिन बदल सकथव। तुरंत पिन बदले ले तुंहर खाता सुरक्षित रहिथे।"}
    },

    # ---------------- 4. fake_kyc (7 to 15) ----------------
    {
        "id": "q_kyc_7", "topic": "fake_kyc", "difficulty": 1, "type": "tf",
        "question": {"en": "A bank will send an SMS threatening to block your account in 24 hours unless you update KYC via WhatsApp.", "hi": "क्या बैंक संदेश भेजकर 24 घंटे में खाता बंद करने की धमकी देता है यदि आपने व्हाट्सएप पर केवाईसी नहीं किया?", "cg": "का बैंक संदेश भेज के 24 घंटा म खाता बंद करे के धमकी देथे अगर तुमन व्हाट्सएप म केवाईसी नइ करेव?"},
        "options": [{"en": "True", "hi": "सही", "cg": "सही"}, {"en": "False", "hi": "गलत", "cg": "गलत"}],
        "answer": 1,
        "explanation": {"en": "False. Banks never conduct KYC updates over WhatsApp or threaten sudden 24-hour account suspension.", "hi": "गलत। बैंक कभी व्हाट्सएप पर केवाईसी नहीं करते और न ही 24 घंटे में खाता बंद करने की धमकी देते हैं।", "cg": "गलत। बैंक कभू व्हाट्सएप म केवाईसी नइ करंय अउ न ही 24 घंटा म खाता बंद करे के धमकी देवंय।"}
    },
    {
        "id": "q_kyc_8", "topic": "fake_kyc", "difficulty": 2, "type": "scenario",
        "question": {"en": "A caller says: 'I am calling from SBI headquarters. To unblock your account, install this app on your phone.' What should you do?", "hi": "एक फोन आता है: 'मैं एसबीआई मुख्यालय से बोल रहा हूँ। खाता चालू करने के लिए अपने फोन में यह ऐप इंस्टॉल करें।' क्या करें?", "cg": "एक फोन आथे: 'मंय एसबीआई मुख्यालय ले बोलत हंव। खाता चालू करे बर अपन फोन म ए ऐप ला इनस्टॉल करव।' का करव?"},
        "options": [{"en": "Cut the call immediately; banks never ask you to install apps to unblock accounts", "hi": "तुरंत फोन काट दें; बैंक कभी खाता चालू करने के लिए ऐप इंस्टॉल करने को नहीं कहता", "cg": "तुरंत फोन काट देव; बैंक कभू खाता चालू करे बर ऐप इनस्टॉल करे ला नइ कहय"}, {"en": "Install the app quickly", "hi": "जल्दी से ऐप इंस्टॉल कर लें", "cg": "जल्दी ले ऐप इनस्टॉल कर लेव"}, {"en": "Give the phone to a child to install it", "hi": "बच्चे को फोन देकर इंस्टॉल करवाएं", "cg": "लइका ला फोन देके इनस्टॉल करवाव"}],
        "answer": 0,
        "explanation": {"en": "This is a remote access trap. The app will give scammers control of your phone and bank OTPs.", "hi": "यह फोन का नियंत्रण छीनने की चाल है। यह ऐप ठगों को आपके फोन और आने वाले ओटीपी देखने की छूट दे देता है।", "cg": "ए फोन के नियंत्रण छीने के चाल हे। ए ऐप ठग मन ला तुंहर फोन अउ आवे वाला ओटीपी देखे के छूट दे देथे।"}
    },
    {
        "id": "q_kyc_9", "topic": "fake_kyc", "difficulty": 1, "type": "mcq",
        "question": {"en": "What is the official and safe way to update your bank KYC?", "hi": "अपने बैंक में केवाईसी अपडेट करने का आधिकारिक और सुरक्षित तरीका क्या है?", "cg": "अपन बैंक म केवाईसी अपडेट करे के असली अउ सुरक्षित तरीका का हे?"},
        "options": [{"en": "Visit your bank branch in person or use the official bank app", "hi": "खुद बैंक शाखा जाएं या बैंक के आधिकारिक ऐप का उपयोग करें", "cg": "खुद बैंक शाखा जाव या बैंक के असली ऐप के उपयोग करव"}, {"en": "Send your Aadhaar card photo to an unknown caller on WhatsApp", "hi": "व्हाट्सएप पर किसी अनजान व्यक्ति को आधार कार्ड की फोटो भेजें", "cg": "व्हाट्सएप म कोनो अनजान मनखे ला आधार कार्ड के फोटो भेज देव"}, {"en": "Click on links received in random text messages", "hi": "किसी भी अनजान संदेश में आए लिंक पर क्लिक करें", "cg": "कोनो घलो अनजान संदेश म आए लिंक म क्लिक करव"}],
        "answer": 0,
        "explanation": {"en": "Always do KYC at your bank branch or inside the bank's official application directly.", "hi": "केवाईसी हमेशा अपनी बैंक शाखा में जाकर या बैंक के आधिकारिक ऐप के भीतर से ही करें।", "cg": "केवाईसी हमेशा अपन बैंक शाखा म जाके या बैंक के असली ऐप के भीतर ले ही करव।"}
    },
    {
        "id": "q_kyc_10", "topic": "fake_kyc", "difficulty": 2, "type": "tf",
        "question": {"en": "Real bank verification messages come from official alphanumeric sender IDs like VK-SBI or AX-HDFC.", "hi": "असली बैंक के संदेश आधिकारिक अक्षरों वाले सेंडर आईडी जैसे वीके-एसबीआई या एएक्स-एचडीएफसी से आते हैं।", "cg": "असली बैंक के संदेश आधिकारिक अक्षर वाले सेंडर आईडी जइसे वीके-एसबीआई या एएक्स-एचडीएफसी ले आथें।"},
        "options": [{"en": "True", "hi": "सही", "cg": "सही"}, {"en": "False", "hi": "गलत", "cg": "गलत"}],
        "answer": 0,
        "explanation": {"en": "True. If an SMS claiming to be from your bank comes from a regular 10-digit mobile number, it is definitely a scam.", "hi": "सही। यदि बैंक के नाम पर कोई संदेश सामान्य 10 अंकों के मोबाइल नंबर से आए, तो वह निश्चित रूप से फर्जी है।", "cg": "सही। अगर बैंक के नाम म कोनो संदेश सामान्य 10 अंक के मोबाइल नंबर ले आवय, त ओ पक्का फर्जी हे।"}
    },
    {
        "id": "q_kyc_11", "topic": "fake_kyc", "difficulty": 3, "type": "scenario",
        "question": {"en": "You receive a message: 'Your electricity power will be disconnected at 9:30 PM tonight due to pending KYC. Call 98XXXX immediately.' What should you do?", "hi": "संदेश आया: 'केवाईसी न होने से आज रात 9:30 बजे बिजली काट दी जाएगी। तुरंत 98XXXX पर कॉल करें।' क्या करें?", "cg": "संदेश आइस: 'केवाईसी नइ होए ले आज रात 9:30 बजे बिजली काट दे जाही। तुरंत 98XXXX म फोन करव।' का करव?"},
        "options": [{"en": "Do not call the number; verify your bill with the electricity office or official portal", "hi": "उस नंबर पर कॉल न करें; बिजली कार्यालय या आधिकारिक पोर्टल से बिल की पुष्टि करें", "cg": "ओ नंबर म फोन झन करव; बिजली दफ्तर या असली पोर्टल ले बिल के पता करव"}, {"en": "Call immediately and transfer the money they demand", "hi": "तुरंत कॉल करें और जो पैसे मांगें दे दें", "cg": "तुरंत फोन करव अउ जउन पइसा मांगय दे देव"}, {"en": "Share your meter number and Aadhaar OTP with the caller", "hi": "मीटर नंबर और आधार ओटीपी फोन पर बता दें", "cg": "मीटर नंबर अउ आधार ओटीपी फोन म बता देव"}],
        "answer": 0,
        "explanation": {"en": "Electricity boards never disconnect power over arbitrary SMS with personal numbers. This is a common fraud script.", "hi": "बिजली विभाग कभी व्यक्तिगत मोबाइल नंबर से संदेश भेजकर बिजली काटने की धमकी नहीं देता। यह ठगों का तरीका है।", "cg": "बिजली विभाग कभू मनखे के मोबाइल नंबर ले संदेश भेज के बिजली काटे के धमकी नइ देय। ए ठग मन के तरीका हे।"}
    },
    {
        "id": "q_kyc_12", "topic": "fake_kyc", "difficulty": 1, "type": "mcq",
        "question": {"en": "What does KYC stand for?", "hi": "केवाईसी का पूरा नाम क्या है?", "cg": "केवाईसी के पूरा नाम का होथे?"},
        "options": [{"en": "Know Your Customer", "hi": "नो योर कस्टमर (अपने ग्राहक को पहचानें)", "cg": "नो योर कस्टमर (अपन ग्राहक ला पहचानव)"}, {"en": "Keep Your Cash", "hi": "कीप योर कैश", "cg": "कीप योर कैश"}, {"en": "Kisan Yojana Center", "hi": "किसान योजना सेंटर", "cg": "किसान योजना सेंटर"}],
        "answer": 0,
        "explanation": {"en": "KYC stands for Know Your Customer. It is a one-time identity verification process required by the Reserve Bank.", "hi": "केवाईसी का मतलब है नो योर कस्टमर। यह बैंक द्वारा ग्राहक की पहचान सत्यापित करने की आधिकारिक प्रक्रिया है।", "cg": "केवाईसी के मतलब नो योर कस्टमर होथे। ए बैंक कोती ले ग्राहक के पहिचान जांचे के असली प्रक्रिया हे।"}
    },
    {
        "id": "q_kyc_13", "topic": "fake_kyc", "difficulty": 2, "type": "tf",
        "question": {"en": "It is safe to download an app named 'QuickSupport' or 'AnyDesk' if someone says it is needed for bank verification.", "hi": "यदि कोई कहे कि बैंक सत्यापन के लिए क्विक-सपोर्ट या एनी-डेस्क ऐप डाउनलोड करना जरूरी है, तो यह सुरक्षित है।", "cg": "अगर कोनो कहय कि बैंक जांच बर क्विक-सपोर्ट या एनी-डेस्क ऐप डाउनलोड करना जरूरी हे, त ए सुरक्षित हे।"},
        "options": [{"en": "True", "hi": "सही", "cg": "सही"}, {"en": "False", "hi": "गलत", "cg": "गलत"}],
        "answer": 1,
        "explanation": {"en": "False. These screen-sharing apps let fraudsters see your screen, banking passwords, and OTPs in real time.", "hi": "गलत। ये स्क्रीन शेयर करने वाले ऐप ठगों को आपकी मोबाइल स्क्रीन और पासवर्ड देखने की पूरी छूट दे देते हैं।", "cg": "गलत। ए स्क्रीन शेयर करे वाला ऐप ठग मन ला तुंहर मोबाइल स्क्रीन अउ पासवर्ड देखे के पूरा छूट दे देथें।"}
    },
    {
        "id": "q_kyc_14", "topic": "fake_kyc", "difficulty": 3, "type": "scenario",
        "question": {"en": "A caller claims your SIM card will be deactivated unless you share the 6-digit Aadhaar OTP you just received. What should you do?", "hi": "एक फोन आता है कि आपका सिम कार्ड बंद हो जाएगा जब तक आप अभी-अभी आया 6 अंकों का आधार ओटीपी नहीं बताते। क्या करें?", "cg": "एक फोन आथे कि तुंहर सिम कार्ड बंद हो जाही जब तक तुमन अभी-अभी आए 6 अंक के आधार ओटीपी नइ बतावव। का करव?"},
        "options": [{"en": "Hang up immediately; never share an Aadhaar OTP over a call", "hi": "तुरंत फोन काट दें; फोन पर आधार ओटीपी कभी किसी को न बताएं", "cg": "तुरंत फोन काट देव; फोन म आधार ओटीपी कभू कखरो ला झन बतावहू"}, {"en": "Tell them the OTP so your phone keeps working", "hi": "ओटीपी बता दें ताकि फोन चलता रहे", "cg": "ओटीपी बता देव ताकि फोन चलत रहय"}, {"en": "Ask them to call back in 5 minutes", "hi": "उन्हें 5 मिनट बाद फोन करने को कहें", "cg": "ओमन ला 5 मिनट पाछू फोन करे ला कहव"}],
        "answer": 0,
        "explanation": {"en": "Sharing an Aadhaar OTP allows fraudsters to issue a duplicate SIM or take fraudulent loans in your name.", "hi": "आधार ओटीपी देने से ठग आपके नाम पर दूसरा सिम जारी करवा सकते हैं या फर्जी लोन ले सकते हैं।", "cg": "आधार ओटीपी देय ले ठग मन तुंहर नाम म दूसरा सिम निकाल सकथें या फर्जी लोन ले सकथें।"}
    },
    {
        "id": "q_kyc_15", "topic": "fake_kyc", "difficulty": 2, "type": "mcq",
        "question": {"en": "What should you check if you receive a link in an SMS asking to update your bank account?", "hi": "यदि बैंक अपडेट करने के लिए संदेश में कोई लिंक आए, तो आपको क्या देखना चाहिए?", "cg": "अगर बैंक अपडेट करे बर संदेश म कोनो लिंक आवय, त तुंहला का देखना चाही?"},
        "options": [{"en": "Do not click links; look for official domain or visit the branch directly", "hi": "लिंक पर क्लिक न करें; आधिकारिक वेबसाइट देखें या सीधे बैंक जाएं", "cg": "लिंक म क्लिक झन करव; असली वेबसाइट देखव या सीधा बैंक जाव"}, {"en": "Check how fast your internet connection is", "hi": "देखें कि इंटरनेट कितना तेज है", "cg": "देखव कि इंटरनेट कतका तेज हे"}, {"en": "Check if the link contains colourful letters", "hi": "देखें कि लिंक में रंग-बिरंगे अक्षर हैं या नहीं", "cg": "देखव कि लिंक म रंग-बिरंग अक्षर हे कि नइ"}],
        "answer": 0,
        "explanation": {"en": "Never click on unverified links in SMS. Always open your bank app directly or visit your branch.", "hi": "संदेश में आए अज्ञात लिंक पर कभी क्लिक न करें। हमेशा सीधे बैंक ऐप खोलें या शाखा जाएं।", "cg": "संदेश म आए अनजान लिंक म कभू क्लिक झन करव। हमेशा सीधा बैंक ऐप खोलव या शाखा जाव।"}
    },

    # ---------------- 5. digital_arrest (7 to 15) ----------------
    {
        "id": "q_arr_7", "topic": "digital_arrest", "difficulty": 1, "type": "tf",
        "question": {"en": "Indian law allows police or judges to place citizens under 'digital arrest' via Skype or WhatsApp video call.", "hi": "भारतीय कानून में पुलिस या जज को व्हाट्सएप या स्काइप वीडियो कॉल पर 'डिजिटल अरेस्ट' करने का अधिकार है।", "cg": "भारतीय कानून म पुलिस या जज ला व्हाट्सएप या स्काइप वीडियो कॉल म 'डिजिटल अरेस्ट' करे के अधिकार हे।"},
        "options": [{"en": "True", "hi": "सही", "cg": "सही"}, {"en": "False", "hi": "गलत", "cg": "गलत"}],
        "answer": 1,
        "explanation": {"en": "False! There is NO such thing as 'digital arrest' in Indian law. Police and courts never arrest or try anyone over video calls.", "hi": "गलत! भारतीय कानून में 'डिजिटल अरेस्ट' जैसी कोई व्यवस्था नहीं है। पुलिस या कोर्ट वीडियो कॉल पर किसी को गिरफ्तार नहीं करते।", "cg": "गलत! भारतीय कानून म 'डिजिटल अरेस्ट' जइसन कोनो व्यवस्था नइये। पुलिस या कोर्ट वीडियो कॉल म कखरो गिरफ्तारी नइ करंय।"}
    },
    {
        "id": "q_arr_8", "topic": "digital_arrest", "difficulty": 2, "type": "scenario",
        "question": {"en": "A caller in police uniform on a video call says a parcel with illegal drugs was found in your name in Mumbai. What is this?", "hi": "वीडियो कॉल पर पुलिस वर्दी पहने व्यक्ति कहता है कि मुंबई में आपके नाम पर नशीले पदार्थों का पार्सल पकड़ा गया है। यह क्या है?", "cg": "वीडियो कॉल म पुलिस के वर्दी पहिरे मनखे कहिथे कि मुंबई म तुंहर नाम म नशीला पदार्थ के पार्सल पकड़े गे हे। ए का चीज हे?"},
        "options": [{"en": "A fake digital arrest extortion scam to terrify you into paying money", "hi": "डरा-धमकाकर पैसे ऐंठने वाला फर्जी डिजिटल अरेस्ट गिरोह", "cg": "डरा-धमका के पइसा वसूले वाला फर्जी डिजिटल अरेस्ट गिरोह"}, {"en": "A genuine police interrogation", "hi": "पुलिस की वास्तविक पूछताछ", "cg": "पुलिस के असली पूछताछ"}, {"en": "A postal department check", "hi": "डाक विभाग की सामान्य जाँच", "cg": "डाक विभाग के सामान्य जांच"}],
        "answer": 0,
        "explanation": {"en": "This is a widespread fraud. Scammers wear fake uniforms and fake police logos. Hang up and dial 1930.", "hi": "यह एक बड़ा फर्जीवाड़ा है। ठग नकली वर्दी और नकली पुलिस लोगो का उपयोग करते हैं। तुरंत फोन काटें और 1930 पर शिकायत करें।", "cg": "ए एक बड़े फर्जीवाड़ा हे। ठग मन नकली वर्दी अउ नकली पुलिस लोगो के उपयोग करथें। तुरंत फोन काटव अउ 1930 म शिकायत करव।"}
    },
    {
        "id": "q_arr_9", "topic": "digital_arrest", "difficulty": 1, "type": "mcq",
        "question": {"en": "What should you do immediately if someone threatens you with digital arrest over a phone or video call?", "hi": "यदि कोई फोन या वीडियो कॉल पर डिजिटल अरेस्ट की धमकी दे, तो आपको तुरंत क्या करना चाहिए?", "cg": "अगर कोनो फोन या वीडियो कॉल म डिजिटल अरेस्ट के धमकी देय, त तुंहला तुरंत का करना चाही?"},
        "options": [{"en": "Hang up immediately, do not pay any money, and report to 1930", "hi": "तुरंत फोन काट दें, कोई पैसा न दें, और 1930 पर शिकायत दर्ज करें", "cg": "तुरंत फोन काट देव, कोनो पइसा झन देव, अउ 1930 म शिकायत दर्ज करव"}, {"en": "Stay on the call for hours in fear", "hi": "डर के मारे घंटों कॉल पर बने रहें", "cg": "डर के मारे घंटा भर कॉल म जुड़े रहव"}, {"en": "Transfer your life savings to their 'secret verification account'", "hi": "अपनी जमा पूंजी उनके बताए खाते में ट्रांसफर कर दें", "cg": "अपन जम्मो पइसा ओमन के बताए खाता म ट्रांसफर कर देव"}],
        "answer": 0,
        "explanation": {"en": "Hang up. Real government agencies never ask for money or fund transfers to clear your name in a criminal case.", "hi": "तुरंत फोन काटें। सरकारी एजेंसियां कभी किसी केस को खत्म करने के लिए पैसे ट्रांसफर करने को नहीं कहती हैं।", "cg": "तुरंत फोन काटव। सरकारी एजेंसी कभू कोनो केस ला खतम करे बर पइसा ट्रांसफर करे ला नइ कहंय।"}
    },
    {
        "id": "q_arr_10", "topic": "digital_arrest", "difficulty": 2, "type": "tf",
        "question": {"en": "The CBI or Supreme Court can issue an arrest warrant and ask you to pay bail money through UPI.", "hi": "सीबीआई या सुप्रीम कोर्ट अरेस्ट वारंट जारी करके यूपीआई के जरिए जमानत राशि जमा करने को कह सकते हैं।", "cg": "सीबीआई या सुप्रीम कोर्ट अरेस्ट वारंट जारी करके यूपीआई के जरिए जमानत राशि जमा करे ला कह सकथें।"},
        "options": [{"en": "True", "hi": "सही", "cg": "सही"}, {"en": "False", "hi": "गलत", "cg": "गलत"}],
        "answer": 1,
        "explanation": {"en": "False. Bail is granted only in an open court through formal legal procedures, never via UPI or phone transfer.", "hi": "गलत। जमानत केवल अदालत में कानूनी प्रक्रिया द्वारा मिलती है, यूपीआई या फोन ट्रांसफर से कभी नहीं।", "cg": "गलत। जमानत सिरिफ अदालत म कानूनी प्रक्रिया ले मिलथे, यूपीआई या फोन ट्रांसफर ले कभू नइ।"}
    },
    {
        "id": "q_arr_11", "topic": "digital_arrest", "difficulty": 3, "type": "scenario",
        "question": {"en": "The fake caller tells you: 'You must stay in a closed room and not tell your family, or you will be jailed.' Why do they say this?", "hi": "फर्जी कॉलर कहता है: 'एक कमरे में बंद रहें और परिवार में किसी को न बताएं, वरना जेल होगी।' वह ऐसा क्यों कहता है?", "cg": "फर्जी कॉलर कहिथे: 'एक खोली म बंद रहव अउ घर म कखरो ला झन बतावव, नइ त जेल हो जाही।' ओ अइसन काबर कहिथे?"},
        "options": [{"en": "To isolate you so nobody can warn you that it is a scam", "hi": "आपको अकेला करने के लिए ताकि कोई आपको न समझा सके कि यह ठगी है", "cg": "तुंहला अकेले करे बर ताकि कोनो तुंहला न समझा सकय कि ए ठगी हे"}, {"en": "Because it is strict government confidentiality", "hi": "क्योंकि यह सरकार की सख्त गोपनीयता का नियम है", "cg": "काबर कि ए सरकार के कड़ा नियम हे"}, {"en": "To protect your microphone from background noise", "hi": "माइक्रोफोन को शोर से बचाने के लिए", "cg": "माइक्रोफोन ला अवाज ले बचाए बर"}],
        "answer": 0,
        "explanation": {"en": "Isolation is the scammer's primary psychological weapon. Talk to your family, neighbors, or police immediately.", "hi": "अकेला करना ठगों का मुख्य हथियार है ताकि कोई आपको सचेत न कर सके। तुरंत अपने परिवार या पुलिस से बात करें।", "cg": "अकेले करना ठग मन के मुख्य हथियार हे ताकि कोनो तुंहला सचेत झन कर सकय। तुरंत अपन परिवार या पुलिस ले बात करव।"}
    },
    {
        "id": "q_arr_12", "topic": "digital_arrest", "difficulty": 1, "type": "mcq",
        "question": {"en": "What is the national cybercrime helpline number to report digital arrest extortion in India?", "hi": "भारत में डिजिटल अरेस्ट और साइबर ठगी की शिकायत दर्ज करने का राष्ट्रीय हेल्पलाइन नंबर क्या है?", "cg": "भारत म डिजिटल अरेस्ट अउ साइबर ठगी के शिकायत दर्ज करे के राष्ट्रीय हेल्पलाइन नंबर का हे?"},
        "options": [{"en": "1930", "hi": "1930 (उन्नीस सौ तीस)", "cg": "1930 (उन्नीस सौ तीस)"}, {"en": "100", "hi": "100", "cg": "100"}, {"en": "108", "hi": "108", "cg": "108"}],
        "answer": 0,
        "explanation": {"en": "Dial 1930 immediately or visit cybercrime.gov.in to report cyber financial fraud and freeze payments.", "hi": "साइबर वित्तीय धोखाधड़ी की शिकायत के लिए तुरंत 1930 डायल करें या cybercrime.gov.in पर जाएं।", "cg": "साइबर वित्तीय धोखाधड़ी के शिकायत बर तुरंत 1930 डायल करव या cybercrime.gov.in म जाव।"}
    },
    {
        "id": "q_arr_13", "topic": "digital_arrest", "difficulty": 2, "type": "tf",
        "question": {"en": "If a caller sends a PDF with an official-looking police emblem and your photo, it proves the case is real.", "hi": "यदि फोन करने वाला पुलिस के चिन्ह और आपकी फोटो वाला पीडीएफ दस्तावेज भेजे, तो यह साबित करता है कि केस असली है।", "cg": "अगर फोन करे वाला पुलिस के चिन्ह अउ तुंहर फोटो वाला पीडीएफ दस्तावेज भेजय, त ए साबित करथे कि केस असली हे।"},
        "options": [{"en": "True", "hi": "सही", "cg": "सही"}, {"en": "False", "hi": "गलत", "cg": "गलत"}],
        "answer": 1,
        "explanation": {"en": "False. Fraudsters create fake digital letters and warrants using editing apps in minutes.", "hi": "गलत। ठग एडिटिंग सॉफ्टवेयर की मदद से कुछ ही मिनटों में फर्जी सरकारी आदेश और वारंट बना लेते हैं।", "cg": "गलत। ठग मन मोबाइल ऐप के मदद ले कुछे मिनट म फर्जी सरकारी आदेश अउ वारंट बना लेथें।"}
    },
    {
        "id": "q_arr_14", "topic": "digital_arrest", "difficulty": 3, "type": "scenario",
        "question": {"en": "The fake officer tells you to transfer ₹1,00,000 to an 'RBI security account' that will be refunded after 30 minutes of verification. Will you get the money back?", "hi": "फर्जी अधिकारी कहता है कि ₹1,00,000 आरबीआई सुरक्षा खाते में भेजें, जो 30 मिनट में वापस मिल जाएगा। क्या पैसे वापस मिलेंगे?", "cg": "फर्जी अधिकारी कहिथे कि ₹1,00,000 आरबीआई सुरक्षा खाता म भेजव, जउन 30 मिनट म वापस मिल जाही। का पइसा वापस मिलही?"},
        "options": [{"en": "No, you will lose your money permanently; RBI has no such accounts", "hi": "नहीं, आपके पैसे हमेशा के लिए लुट जाएंगे; आरबीआई का ऐसा कोई खाता नहीं होता", "cg": "नइ, तुंहर पइसा हमेशा बर लुट जाही; आरबीआई के अइसन कोनो खाता नइ होवय"}, {"en": "Yes, RBI refunds all money within 30 minutes", "hi": "हाँ, आरबीआई 30 मिनट में पैसे लौटा देता है", "cg": "हाँ, आरबीआई 30 मिनट म पइसा लौटा देथे"}, {"en": "You will receive double the amount as compensation", "hi": "मुआवजे के रूप में दोगुने पैसे मिलेंगे", "cg": "मुआवजा के रूप म दुगुना पइसा मिलही"}],
        "answer": 0,
        "explanation": {"en": "The Reserve Bank of India never holds individual accounts to verify citizen innocence. Any such transfer is lost to criminals.", "hi": "आरबीआई नागरिकों की बेगुनाही जांचने के लिए कभी खाते नहीं चलाता। ऐसे खाते में भेजा गया पैसा ठग हड़प लेते हैं।", "cg": "आरबीआई मनखे मन के बेगुनाही जांचे बर कभू खाता नइ चलावय। अइसन खाता म भेजे पइसा ठग मन डकार लेथें।"}
    },
    {
        "id": "q_arr_15", "topic": "digital_arrest", "difficulty": 2, "type": "mcq",
        "question": {"en": "How can you verify if there is an actual complaint or FIR filed against you in Chhattisgarh?", "hi": "छत्तीसगढ़ में आपके खिलाफ कोई वास्तविक शिकायत या प्राथमिकी दर्ज है या नहीं, यह जानने का सही तरीका क्या है?", "cg": "छत्तीसगढ़ म तुंहर खिलाफ कोनो असली शिकायत या प्राथमिकी दर्ज हे कि नइ, एला जाने के सही तरीका का हे?"},
        "options": [{"en": "Visit your local police station in person or check the official state police portal", "hi": "सीधे अपने नजदीकी थाने जाएं या राज्य पुलिस के आधिकारिक पोर्टल पर देखें", "cg": "सीधा अपन तीर के थाना जाव या राज्य पुलिस के असली पोर्टल म देखव"}, {"en": "Ask the stranger who called you on WhatsApp", "hi": "व्हाट्सएप पर फोन करने वाले अनजान व्यक्ति से पूछें", "cg": "व्हाट्सएप म फोन करे वाला अनजान मनखे ले पूछव"}, {"en": "Pay a token fee to an online link", "hi": "किसी ऑनलाइन लिंक पर फीस देकर जांचें", "cg": "कोनो ऑनलाइन लिंक म पइसा देके जांचव"}],
        "answer": 0,
        "explanation": {"en": "Always check directly with your local police station in person. Real police will guide you honestly.", "hi": "हमेशा अपने स्थानीय थाने में जाकर खुद पता करें। असली पुलिस आपकी सही मदद करेगी।", "cg": "हमेशा अपन तीर के थाना म जाके खुद पता करव। असली पुलिस तुंहर सही मदद करही।"}
    },

    # ---------------- 6. courier_customs (7 to 15) ----------------
    {
        "id": "q_cou_7", "topic": "courier_customs", "difficulty": 1, "type": "tf",
        "question": {"en": "A real courier company asks you to pay customs clearance fees to an individual's personal UPI ID.", "hi": "क्या असली कूरियर कंपनी सीमा शुल्क या डिलीवरी फीस किसी व्यक्ति की निजी यूपीआई आईडी पर मांगने को कहती है?", "cg": "का असली कूरियर कंपनी सीमा शुल्क या डिलीवरी फीस कोनो मनखे के निजी यूपीआई आईडी म जमा करे ला कहिथे?"},
        "options": [{"en": "True", "hi": "सही", "cg": "सही"}, {"en": "False", "hi": "गलत", "cg": "गलत"}],
        "answer": 1,
        "explanation": {"en": "False. Legitimate companies never ask for customs duties to personal UPI IDs or personal savings accounts.", "hi": "गलत। असली कंपनियां कभी किसी निजी यूपीआई आईडी या व्यक्तिगत खाते में सीमा शुल्क नहीं मांगतीं।", "cg": "गलत। असली कंपनी कभू कोनो निजी यूपीआई आईडी या व्यक्तिगत खाता म सीमा शुल्क नइ मांगंय।"}
    },
    {
        "id": "q_cou_8", "topic": "courier_customs", "difficulty": 2, "type": "scenario",
        "question": {"en": "You receive a message: 'Your parcel could not be delivered due to wrong address. Update address and pay ₹5 fee via this link.' What is this?", "hi": "संदेश आया: 'गलत पते के कारण पार्सल नहीं पहुंचा। पता सुधारने और ₹5 फीस देने के लिए इस लिंक पर जाएं।' यह क्या है?", "cg": "संदेश आइस: 'गलत पता के सेती पार्सल नइ पहुंचिस। पता सुधारे अउ ₹5 फीस देय बर ए लिंक म जाव।' ए का चीज हे?"},
        "options": [{"en": "A phishing trap to steal your card or net banking password using a tiny ₹5 fee", "hi": "मात्र ₹5 के बहाने आपके कार्ड और पासवर्ड चुराने का फर्जी लिंक", "cg": "सिरिफ ₹5 के बहाने तुंहर कार्ड अउ पासवर्ड चोराए के फर्जी लिंक"}, {"en": "A genuine post office notification", "hi": "डाकघर का असली संदेश", "cg": "डाकघर के असली संदेश"}, {"en": "A special festival gift parcel", "hi": "त्योहार का कोई उपहार पार्सल", "cg": "त्यौहार के कोनो उपहार पार्सल"}],
        "answer": 0,
        "explanation": {"en": "Scammers ask for ₹5 or ₹10 to make you enter your card details and OTP, and then debit thousands.", "hi": "ठग ₹5 या ₹10 का छोटा शुल्क मांगते हैं ताकि आप कार्ड नंबर और ओटीपी डाल दें, फिर हजारों रुपये काट लेते हैं।", "cg": "ठग मन ₹5 या ₹10 के नानकुन फीस मांगथें ताकि तुमन कार्ड नंबर अउ ओटीपी डार देव, फेर हजारों रुपिया काट लेथें।"}
    },
    {
        "id": "q_cou_9", "topic": "courier_customs", "difficulty": 1, "type": "mcq",
        "question": {"en": "How should you verify the delivery status of a genuine courier parcel?", "hi": "अपने असली कूरियर पार्सल की स्थिति जांचने का सबसे सही तरीका क्या है?", "cg": "अपन असली कूरियर पार्सल के स्थिति जांचे के सबसे सही तरीका का हे?"},
        "options": [{"en": "Check the tracking ID directly on the official courier app or website", "hi": "कंपनी की आधिकारिक वेबसाइट या ऐप पर ट्रैकिंग नंबर डालकर देखें", "cg": "कंपनी के असली वेबसाइट या ऐप म ट्रैकिंग नंबर डार के देखव"}, {"en": "Call the random mobile number sent in an unverified SMS", "hi": "संदेश में आए किसी भी मोबाइल नंबर पर फोन करें", "cg": "संदेश म आए कोनो घलो मोबाइल नंबर म फोन करव"}, {"en": "Pay whatever fees are demanded over a phone call", "hi": "फोन पर जो भी फीस मांगी जाए तुरंत भर दें", "cg": "फोन म जउन घलो फीस मांगे तुरंत भर देव"}],
        "answer": 0,
        "explanation": {"en": "Always track parcels on the courier company's official portal using your booking tracking ID.", "hi": "हमेशा बुकिंग रसीद पर लिखे ट्रैकिंग नंबर से आधिकारिक वेबसाइट पर ही पार्सल की जाँच करें।", "cg": "हमेशा बुकिंग रसीद म लिखे ट्रैकिंग नंबर ले असली वेबसाइट म ही पार्सल के जांच करव।"}
    },
    {
        "id": "q_cou_10", "topic": "courier_customs", "difficulty": 2, "type": "tf",
        "question": {"en": "An online friend you met last week on social media says they sent you expensive gold jewelry and cash from abroad as a gift.", "hi": "सोशल मीडिया पर पिछले हफ्ते बना दोस्त कहता है कि उसने विदेश से आपके लिए सोने के गहने और नकदी का पार्सल भेजा है।", "cg": "सोशल मीडिया म पिछला हफ्ता बने संगी कहिथे कि ओ विदेश ले तुंहर बर सोना के गहना अउ पइसा के पार्सल भेजे हे।"},
        "options": [{"en": "It is definitely a parcel customs scam trap", "hi": "यह पक्का पार्सल सीमा शुल्क ठगी का जाल है", "cg": "ए पक्का पार्सल सीमा शुल्क ठगी के जाल हे"}, {"en": "It is real pure friendship and generous gift", "hi": "यह सच्ची दोस्ती और सच्चा उपहार है", "cg": "ए सच्चा मया अउ सच्चा उपहार हे"}],
        "answer": 0,
        "explanation": {"en": "This is the classic foreign gift scam. A fake customs officer will soon call demanding lakhs in 'clearance fees'. Never pay.", "hi": "यह विदेशी उपहार के नाम पर ठगी है। जल्द ही एक फर्जी अफसर का फोन आएगा जो पार्सल छुड़ाने के नाम पर लाखों रुपये मांगेगा। कभी न दें।", "cg": "ए विदेशी उपहार के नाम म ठगी हे। जल्दीच एक फर्जी अफसर के फोन आही जउन पार्सल छोड़े के नाम म लाखों रुपिया मांगही। कभू झन देव।"}
    },
    {
        "id": "q_cou_11", "topic": "courier_customs", "difficulty": 3, "type": "scenario",
        "question": {"en": "A caller claiming to be Delhi Customs says: 'Your parcel has passports and foreign currency. Pay ₹45,000 fine now or face arrest.' What should you do?", "hi": "दिल्ली कस्टम अधिकारी बनकर कोई कहता है: 'पार्सल में पासपोर्ट और विदेशी मुद्रा है। अभी ₹45,000 जुर्माना भरें वरना जेल होगी।' क्या करें?", "cg": "दिल्ली कस्टम अधिकारी बनके कोनो कहिथे: 'पार्सल म पासपोर्ट अउ विदेशी पइसा हे। अभी ₹45,000 जुर्माना भरव नइ त जेल होही।' का करव?"},
        "options": [{"en": "Cut the call and report to 1930; customs never demands fines into individual bank accounts", "hi": "कॉल काटें और 1930 पर शिकायत करें; कस्टम विभाग कभी व्यक्तिगत खातों में जुर्माना नहीं लेता", "cg": "कॉल काटव अउ 1930 म शिकायत करव; कस्टम विभाग कभू मनखे के निजी खाता म जुर्माना नइ लेवय"}, {"en": "Borrow money from neighbors and pay immediately", "hi": "पड़ोसियों से उधार लेकर तुरंत पैसे दे दें", "cg": "पड़ोसी मन ले उधार लेके तुरंत पइसा दे देव"}, {"en": "Ask for a discount on the fine", "hi": "जुर्माना कम करने की गुहार लगाएं", "cg": "जुर्माना कम करे बर बिनती करव"}],
        "answer": 0,
        "explanation": {"en": "Government customs officers do not call citizens asking for penalty transfers to private accounts. This is extortion.", "hi": "सरकारी कस्टम अधिकारी कभी व्यक्तिगत खातों में पैसे ट्रांसफर करने के लिए फोन नहीं करते। यह जबरन वसूली है।", "cg": "सरकारी कस्टम अधिकारी कभू निजी खाता म पइसा ट्रांसफर करे बर फोन नइ करंय। ए जबरन वसूली हे।"}
    },
    {
        "id": "q_cou_12", "topic": "courier_customs", "difficulty": 1, "type": "mcq",
        "question": {"en": "If a courier delivery agent arrives at your door with a parcel you never ordered, what should you do?", "hi": "यदि कूरियर वाला ऐसा पार्सल लेकर आए जिसे आपने कभी मंगाया ही नहीं था, तो आपको क्या करना चाहिए?", "cg": "अगर कूरियर वाला अइसन पार्सल लेके आवय जेला तुमन कभू मंगाय ही नइ रेहेव, त तुंहला का करना चाही?"},
        "options": [{"en": "Refuse delivery and do not share any OTP with the delivery person", "hi": "पार्सल लेने से मना कर दें और डिलीवरी वाले को कोई ओटीपी न दें", "cg": "पार्सल लेय ले मना कर देव अउ डिलीवरी वाला ला कोनो ओटीपी झन देव"}, {"en": "Accept the parcel and pay cash on delivery", "hi": "पार्सल ले लें और पैसे चुका दें", "cg": "पार्सल ला ले लेव अउ पइसा दे देव"}, {"en": "Give your signature on a blank paper", "hi": "खाली कागज पर दस्तखत कर दें", "cg": "कोरा कागज म दस्तखत कर देव"}],
        "answer": 0,
        "explanation": {"en": "Always reject unsolicited parcels. Scammers send junk items cash-on-delivery or ask for cancel-order OTPs to steal accounts.", "hi": "बिना मंगाए पार्सल को तुरंत लौटा दें। ठग बेकार सामान भेजकर पैसे ऐंठते हैं या कैंसल कराने के बहाने ओटीपी मांगते हैं।", "cg": "बिना मंगाए पार्सल ला तुरंत लौटा देव। ठग मन बेकार सामान भेज के पइसा ऐंठथें या कैंसल कराए के बहाने ओटीपी मांगथें।"}
    },
    {
        "id": "q_cou_13", "topic": "courier_customs", "difficulty": 2, "type": "tf",
        "question": {"en": "India Post sends text messages containing shortened link shorteners asking you to pay postal duties.", "hi": "भारतीय डाक विभाग संक्षिप्त लिंक वाले संदेश भेजकर डाक शुल्क भरने को कहता है।", "cg": "भारतीय डाक विभाग छोटका लिंक वाले संदेश भेज के डाक शुल्क भरे ला कहिथे।"},
        "options": [{"en": "True", "hi": "सही", "cg": "सही"}, {"en": "False", "hi": "गलत", "cg": "गलत"}],
        "answer": 1,
        "explanation": {"en": "False. India Post never sends random shortened links for address updates or payment collection.", "hi": "गलत। भारतीय डाक विभाग पता बदलने या भुगतान के लिए कभी अनजान लिंक नहीं भेजता।", "cg": "गलत। भारतीय डाक विभाग पता बदले बर या पइसा बर कभू अनजान लिंक नइ भेजय।"}
    },
    {
        "id": "q_cou_14", "topic": "courier_customs", "difficulty": 3, "type": "scenario",
        "question": {"en": "A fake courier tracking page asks you to enter your credit card number, expiry date, and CVV to pay ₹2 redelivery fee. What is this?", "hi": "कूरियर ट्रैकिंग पेज पर ₹2 पुनः डिलीवरी शुल्क के लिए कार्ड नंबर, एक्सपायरी और सीवीवी मांगा जा रहा है। यह क्या है?", "cg": "कूरियर ट्रैकिंग पेज म ₹2 दोबारा डिलीवरी फीस बर कार्ड नंबर, एक्सपायरी अउ सीवीवी मांगे जात हे। ए का चीज हे?"},
        "options": [{"en": "A phishing site designed to clone and drain your card", "hi": "आपके कार्ड की जानकारी चुराकर खाता खाली करने वाली फर्जी वेबसाइट", "cg": "तुंहर कार्ड के जानकारी चोरा के खाता खाली करे वाली फर्जी वेबसाइट"}, {"en": "A secure official payment gateway", "hi": "एक सुरक्षित आधिकारिक भुगतान गेटवे", "cg": "एक सुरक्षित असली भुगतान गेटवे"}, {"en": "A standard bank verification page", "hi": "बैंक की सामान्य जाँच वेबसाइट", "cg": "बैंक के सामान्य जांच वेबसाइट"}],
        "answer": 0,
        "explanation": {"en": "The page looks real but sends your card credentials directly to cyber criminals. Never enter card details on unverified links.", "hi": "यह पेज देखने में असली लगता है लेकिन कार्ड का विवरण सीधे ठगों के पास भेजता है। अनजान लिंक पर कार्ड विवरण कभी न डालें।", "cg": "ए पेज देखे म असली लगथे फेर कार्ड के विवरण सीधा ठग मन तीर भेज देथे। अनजान लिंक म कार्ड विवरण कभू झन डारव।"}
    },
    {
        "id": "q_cou_15", "topic": "courier_customs", "difficulty": 2, "type": "mcq",
        "question": {"en": "If you already shared your bank details on a fake courier website, what should you do immediately?", "hi": "यदि आपने अनजाने में फर्जी कूरियर साइट पर अपने कार्ड की जानकारी डाल दी है, तो तुरंत क्या करें?", "cg": "अगर तुमन अनजाने म फर्जी कूरियर साइट म अपन कार्ड के जानकारी डार देहेव, त तुरंत का करव?"},
        "options": [{"en": "Block your card immediately through the bank app or call customer support", "hi": "बैंक ऐप से तुरंत कार्ड ब्लॉक करें या बैंक कस्टमर केयर को फोन करें", "cg": "बैंक ऐप ले तुरंत कार्ड ब्लॉक करव या बैंक कस्टमर केयर ला फोन करव"}, {"en": "Wait for 2 days to see if the parcel arrives", "hi": "दो दिन इंतजार करें कि पार्सल आता है या नहीं", "cg": "दो दिन अगोरव कि पार्सल आथे कि नइ"}, {"en": "Switch off your mobile phone for an hour", "hi": "अपना फोन एक घंटे के लिए बंद कर दें", "cg": "अपन फोन ला एक घंटा बर बंद कर देव"}],
        "answer": 0,
        "explanation": {"en": "Immediately block your debit card to prevent fraudulent international transactions and file a report on 1930.", "hi": "ठगी से बचने के लिए तुरंत अपना कार्ड ब्लॉक करवाएं और 1930 पर शिकायत दर्ज करें।", "cg": "ठगी ले बचे बर तुरंत अपन कार्ड ब्लॉक करवाव अउ 1930 म शिकायत दर्ज करव।"}
    },

    # ---------------- 7. upi_qr (7 to 15) ----------------
    {
        "id": "q_upi_7", "topic": "upi_qr", "difficulty": 1, "type": "tf",
        "question": {"en": "Scanning a QR code can automatically credit lottery prize money directly into your bank account.", "hi": "क्यूआर कोड स्कैन करने से लॉटरी का इनाम सीधे आपके बैंक खाते में जमा हो सकता है।", "cg": "क्यूआर कोड स्कैन करे ले लॉटरी के इनाम सीधा तुंहर बैंक खाता म जमा हो सकथे।"},
        "options": [{"en": "True", "hi": "सही", "cg": "सही"}, {"en": "False", "hi": "गलत", "cg": "गलत"}],
        "answer": 1,
        "explanation": {"en": "False! Scanning a QR code is ONLY for paying money, never for receiving money or winning lottery prizes.", "hi": "गलत! क्यूआर कोड स्कैन करने का मतलब हमेशा पैसे देना होता है, पैसे पाना या लॉटरी जीतना कभी नहीं।", "cg": "गलत! क्यूआर कोड स्कैन करे के मतलब हमेशा पइसा देना होथे, पइसा पाना या लॉटरी जीतना कभू नइ।"}
    },
    {
        "id": "q_upi_8", "topic": "upi_qr", "difficulty": 2, "type": "scenario",
        "question": {"en": "A buyer on WhatsApp sends an image of a QR code and says: 'Scan this QR code and type your PIN to receive ₹10,000.' What will happen?", "hi": "व्हाट्सएप पर खरीदार एक क्यूआर कोड भेजता है और कहता है: 'इसे स्कैन करें और ₹10,000 पाने के लिए अपना पिन डालें।' क्या होगा?", "cg": "व्हाट्सएप म खरीदार एक क्यूआर कोड भेजथे अउ कहिथे: 'एला स्कैन करव अउ ₹10,000 पाए बर अपन पिन डारव।' का होही?"},
        "options": [{"en": "₹10,000 will be instantly debited from your account", "hi": "आपके खाते से तुरंत ₹10,000 कट जाएंगे", "cg": "तुंहर खाता ले तुरंत ₹10,000 कट जाही"}, {"en": "You will receive ₹10,000", "hi": "आपको ₹10,000 मिल जाएंगे", "cg": "तुंहला ₹10,000 मिल जाही"}, {"en": "Nothing will happen", "hi": "कुछ भी नहीं होगा", "cg": "कुछु घलो नइ होवय"}],
        "answer": 0,
        "explanation": {"en": "This is a classic QR scam. Entering your PIN authorizes a debit transaction, sending your money to the fraudster.", "hi": "यह क्यूआर ठगी का आम तरीका है। पिन डालते ही आपके खाते से पैसे कटकर ठग के पास चले जाते हैं।", "cg": "ए क्यूआर ठगी के आम तरीका हे। पिन डारते ही तुंहर खाता ले पइसा कट के ठग तीर चले जाथे।"}
    },
    {
        "id": "q_upi_9", "topic": "upi_qr", "difficulty": 1, "type": "mcq",
        "question": {"en": "What does a QR code do when you scan it with Google Pay or PhonePe?", "hi": "जब आप पेमेंट ऐप से कोई क्यूआर कोड स्कैन करते हैं, तो क्या होता है?", "cg": "जब तुमन पेमेंट ऐप ले कोनो क्यूआर कोड स्कैन करथव, त का होथे?"},
        "options": [{"en": "It reads the recipient's payment address so YOU can pay THEM", "hi": "यह दुकानदार का यूपीआई पता पढ़ता है ताकि आप उसे पैसे भेज सकें", "cg": "ए दुकानदार के यूपीआई पता पढ़थे ताकि तुमन ओला पइसा भेज सकव"}, {"en": "It checks your bank balance", "hi": "यह आपका बैंक बैलेंस जांचता है", "cg": "ए तुंहर बैंक बैलेंस जांचथे"}, {"en": "It deposits government bonus cash", "hi": "यह सरकारी बोनस जमा करता है", "cg": "ए सरकारी बोनस जमा करथे"}],
        "answer": 0,
        "explanation": {"en": "A QR code only contains payee details. It is used exclusively to make payments, never to receive money.", "hi": "क्यूआर कोड में केवल पाने वाले का विवरण होता है। इसका उपयोग केवल भुगतान करने के लिए होता है।", "cg": "क्यूआर कोड म सिरिफ पाने वाला के विवरण होथे। एकर उपयोग सिरिफ भुगतान करे बर होथे।"}
    },
    {
        "id": "q_upi_10", "topic": "upi_qr", "difficulty": 2, "type": "tf",
        "question": {"en": "At a shop counter, a scammer may paste a fake paper QR sticker over the genuine shopkeeper's QR stand.", "hi": "दुकान के काउंटर पर ठग असली दुकानदार के क्यूआर स्टैंड के ऊपर अपना नकली क्यूआर स्टीकर चिपका सकते हैं।", "cg": "दुकान के काउंटर म ठग मन असली दुकानदार के क्यूआर स्टैंड के ऊपर अपन नकली क्यूआर स्टीकर चिपका सकथें।"},
        "options": [{"en": "True", "hi": "सही", "cg": "सही"}, {"en": "False", "hi": "गलत", "cg": "गलत"}],
        "answer": 0,
        "explanation": {"en": "True. Always verify the shopkeeper's registered business name shown on your screen before typing your PIN.", "hi": "सही। पिन डालने से पहले स्क्रीन पर दिखने वाले दुकानदार के नाम की पुष्टि हमेशा बोलकर कर लें।", "cg": "सही। पिन डारे ले पहिली स्क्रीन म दिखइया दुकानदार के नाम के पुष्टि हमेशा बोल के कर लेव।"}
    },
    {
        "id": "q_upi_11", "topic": "upi_qr", "difficulty": 3, "type": "scenario",
        "question": {"en": "You scan a shop QR code to pay ₹100, but the payment screen automatically shows ₹1,000 pre-filled. What should you do?", "hi": "दुकान पर ₹100 देने के लिए क्यूआर स्कैन किया, लेकिन स्क्रीन पर पहले से ₹1,000 भरा हुआ आ गया। आपको क्या करना चाहिए?", "cg": "दुकान म ₹100 देय बर क्यूआर स्कैन करेव, फेर स्क्रीन म पहिली ले ₹1,000 भराए आ गे। तुंहला का करना चाही?"},
        "options": [{"en": "Cancel immediately, check the amount with the shopkeeper, and do not enter your PIN", "hi": "तुरंत कैंसल करें, दुकानदार से पूछें और पिन बिल्कुल न डालें", "cg": "तुरंत कैंसल करव, दुकानदार ले पूछव अउ पिन बिल्कुल झन डारव"}, {"en": "Enter your PIN quickly to see if it fixes itself", "hi": "पिन डाल दें ताकि बात सुलझ जाए", "cg": "पिन डार देव ताकि बात सुलझ जाय"}, {"en": "Ask for ₹900 cash back from the shopkeeper after paying", "hi": "पिन डालकर दुकानदार से ₹900 नकद मांगें", "cg": "पिन डार के दुकानदार ले ₹900 नकद मांगव"}],
        "answer": 0,
        "explanation": {"en": "Never enter your PIN if the displayed amount does not match what you agreed to pay. Cancel immediately.", "hi": "यदि स्क्रीन पर दिख रही राशि आपकी सहमति से मेल न खाए, तो पिन कभी न डालें। तुरंत कैंसल करें।", "cg": "अगर स्क्रीन म दिखइया राशि तुंहर सहमति ले मेल नइ खाय, त पिन कभू झन डारव। तुरंत कैंसल करव।"}
    },
    {
        "id": "q_upi_12", "topic": "upi_qr", "difficulty": 1, "type": "mcq",
        "question": {"en": "What information should you verify on your phone screen after scanning a merchant QR code?", "hi": "व्यापारी का क्यूआर स्कैन करने के बाद आपको स्क्रीन पर क्या जाँचना चाहिए?", "cg": "व्यापारी के क्यूआर स्कैन करे के बाद तुंहला स्क्रीन म का देखना चाही?"},
        "options": [{"en": "The payee name and the exact payment amount", "hi": "दुकानदार का नाम और भुगतान की सही राशि", "cg": "दुकानदार के नाम अउ भुगतान के सही राशि"}, {"en": "The colour of the QR code borders", "hi": "क्यूआर कोड के किनारों का रंग", "cg": "क्यूआर कोड के कोना के रंग"}, {"en": "The model of the shopkeeper's phone", "hi": "दुकानदार के फोन का मॉडल", "cg": "दुकानदार के फोन के मॉडल"}],
        "answer": 0,
        "explanation": {"en": "Always confirm the merchant name and amount on your screen before entering your PIN.", "hi": "पिन डालने से पहले हमेशा स्क्रीन पर दिख रहे नाम और राशि की पुष्टि करें।", "cg": "पिन डारे ले पहिली हमेशा स्क्रीन म दिखत नाम अउ राशि ला जांच लेव।"}
    },
    {
        "id": "q_upi_13", "topic": "upi_qr", "difficulty": 2, "type": "tf",
        "question": {"en": "A QR code received by email or WhatsApp can be scanned to receive a pending income tax refund.", "hi": "ईमेल या व्हाट्सएप पर आए क्यूआर कोड को स्कैन करके अटका हुआ आयकर रिफंड पाया जा सकता है।", "cg": "ईमेल या व्हाट्सएप म आए क्यूआर कोड ला स्कैन करके अटका हुआ आयकर रिफंड पाए जा सकथे।"},
        "options": [{"en": "True", "hi": "सही", "cg": "सही"}, {"en": "False", "hi": "गलत", "cg": "गलत"}],
        "answer": 1,
        "explanation": {"en": "False. Government refunds are credited directly to your verified bank account via direct bank transfer, never through QR codes.", "hi": "गलत। सरकारी रिफंड सीधे बैंक खाते में जमा होते हैं, क्यूआर कोड स्कैन करके कभी नहीं दिए जाते।", "cg": "गलत। सरकारी रिफंड सीधा बैंक खाता म जमा होथें, क्यूआर कोड स्कैन करके कभू नइ दिए जावंय।"}
    },
    {
        "id": "q_upi_14", "topic": "upi_qr", "difficulty": 3, "type": "scenario",
        "question": {"en": "You see a flyer pasted on an electric pole: 'PM Kisan Yojana Bonus ₹5,000: Scan this QR code to claim.' What is this?", "hi": "बिजली के खंभे पर पर्चा चिपका है: 'पीएम किसान योजना ₹5,000 बोनस: पाने के लिए क्यूआर स्कैन करें।' यह क्या है?", "cg": "बिजली के खंभा म पर्चा चिपके हे: 'पीएम किसान योजना ₹5,000 बोनस: पाए बर क्यूआर स्कैन करव।' ए का चीज हे?"},
        "options": [{"en": "A scam designed to steal money from rural farmers", "hi": "किसानों को ठगने और पैसे लूटने के लिए बनाया गया फर्जी जाल", "cg": "किसान मन ला ठगे अउ पइसा लूटे बर बनाए गए फर्जी जाल"}, {"en": "An official government scheme distribution", "hi": "सरकार की आधिकारिक योजना का वितरण", "cg": "सरकार के असली योजना के वितरण"}, {"en": "A local bank advertisement", "hi": "स्थानीय बैंक का विज्ञापन", "cg": "तीर-तखार के बैंक के विज्ञापन"}],
        "answer": 0,
        "explanation": {"en": "Government subsidies are credited automatically through direct bank transfer. The government never asks citizens to scan QR codes.", "hi": "सरकारी योजना का पैसा सीधे बैंक खाते में आता है। सरकार कभी क्यूआर कोड स्कैन करने को नहीं कहती।", "cg": "सरकारी योजना के पइसा सीधा बैंक खाता म आथे। सरकार कभू क्यूआर कोड स्कैन करे ला नइ कहय।"}
    },
    {
        "id": "q_upi_15", "topic": "upi_qr", "difficulty": 2, "type": "mcq",
        "question": {"en": "What is the single most important rule to remember about QR codes?", "hi": "क्यूआर कोड के बारे में याद रखने वाला सबसे मुख्य नियम क्या है?", "cg": "क्यूआर कोड के बारे म याद रखे वाला सबसे मुख्य नियम का हे?"},
        "options": [{"en": "Scanning a QR code is ONLY for paying; you NEVER scan a QR code to receive money", "hi": "क्यूआर कोड केवल पैसे देने के लिए होता है; पैसे पाने के लिए कभी स्कैन नहीं किया जाता", "cg": "क्यूआर कोड सिरिफ पइसा देय बर होथे; पइसा पाए बर कभू स्कैन नइ करे जाय"}, {"en": "Always scan every QR code you see on walls", "hi": "दीवार पर दिखने वाले हर क्यूआर कोड को तुरंत स्कैन करें", "cg": "भीत म दिखइया हर क्यूआर कोड ला तुरंत स्कैन करव"}, {"en": "QR codes expire every 10 seconds", "hi": "क्यूआर कोड हर 10 सेकंड में बदल जाता है", "cg": "क्यूआर कोड हर 10 सेकंड म बदल जाथे"}],
        "answer": 0,
        "explanation": {"en": "Always remember: QR stands for paying money out. If anyone asks you to scan a QR code to get paid, it is 100% fraud.", "hi": "हमेशा याद रखें: क्यूआर कोड का मतलब पैसे देना है। जो भी पैसे देने के नाम पर स्कैन करने को कहे, वह ठग है।", "cg": "हमेशा याद राखव: क्यूआर कोड के मतलब पइसा देना हे। जउन घलो पइसा देय के नाम म स्कैन करे ला कहय, ओ ठग हे।"}
    },

    # ---------------- 8. links_apps (7 to 15) ----------------
    {
        "id": "q_lnk_7", "topic": "links_apps", "difficulty": 1, "type": "tf",
        "question": {"en": "It is safe to install an app received as an .apk file over WhatsApp from an unknown number.", "hi": "व्हाट्सएप पर किसी अनजान नंबर से आई एपीके फाइल को अपने फोन में इंस्टॉल करना सुरक्षित है।", "cg": "व्हाट्सएप म कोनो अनजान नंबर ले आए एपीके फाइल ला अपन फोन म इनस्टॉल करना सुरक्षित हे।"},
        "options": [{"en": "True", "hi": "सही", "cg": "सही"}, {"en": "False", "hi": "गलत", "cg": "गलत"}],
        "answer": 1,
        "explanation": {"en": "False! Unknown APK files frequently contain dangerous malware and spyware that steal all your OTPs and bank credentials.", "hi": "गलत! अज्ञात एपीके फाइलों में खतरनाक वायरस होते हैं जो आपके फोन के सभी ओटीपी और पासवर्ड चुरा लेते हैं।", "cg": "गलत! अनजान एपीके फाइल म खतरनाक वायरस होथे जउन तुंहर फोन के जम्मो ओटीपी अउ पासवर्ड चोरा लेथे।"}
    },
    {
        "id": "q_lnk_8", "topic": "links_apps", "difficulty": 2, "type": "scenario",
        "question": {"en": "A message offers a free ₹500 recharge if you click a link and forward the message to 10 WhatsApp groups. What is this?", "hi": "संदेश आता है: 'इस लिंक पर क्लिक करें और 10 व्हाट्सएप ग्रुपों में भेजें, मुफ्त ₹500 का रिचार्ज पाएं।' यह क्या है?", "cg": "संदेश आथे: 'ए लिंक म क्लिक करव अउ 10 व्हाट्सएप ग्रुप म भेजव, मुफ्त ₹500 के रिचार्ज पाव।' ए का चीज हे?"},
        "options": [{"en": "A viral phishing scam trap to collect phone numbers and spread malware", "hi": "फोन नंबर चुराने और वायरस फैलाने वाला फर्जी वायरल जाल", "cg": "फोन नंबर चोराए अउ वायरस फैलाए वाला फर्जी वायरल जाल"}, {"en": "A real government telecom offer", "hi": "सरकार का वास्तविक टेलीकॉम ऑफर", "cg": "सरकार के असली टेलीकॉम ऑफर"}, {"en": "A prize from your mobile network operator", "hi": "आपकी सिम कंपनी का असली इनाम", "cg": "तुंहर सिम कंपनी के असली इनाम"}],
        "answer": 0,
        "explanation": {"en": "Free recharge forwards are phishing hoaxes designed to collect personal data and infect devices. Never click or forward them.", "hi": "मुफ्त रिचार्ज का झांसा ठगी का तरीका है। ऐसे लिंक पर कभी क्लिक न करें और न ही आगे भेजें।", "cg": "मुफ्त रिचार्ज के झांसा ठगी के तरीका हे। अइसन लिंक म कभू क्लिक झन करव अउ न ही आघू भेजव।"}
    },
    {
        "id": "q_lnk_9", "topic": "links_apps", "difficulty": 1, "type": "mcq",
        "question": {"en": "Where should you always download mobile applications from on an Android smartphone?", "hi": "एंड्रॉयड फोन पर आपको ऐप्स हमेशा कहाँ से डाउनलोड करने चाहिए?", "cg": "एंड्रॉयड फोन म तुंहला ऐप हमेशा कहाँ ले डाउनलोड करना चाही?"},
        "options": [{"en": "Only from the official Google Play Store", "hi": "केवल आधिकारिक गूगल प्ले स्टोर से", "cg": "सिरिफ असली गूगल प्ले स्टोर ले"}, {"en": "From random links sent on WhatsApp or Telegram", "hi": "व्हाट्सएप या टेलीग्राम पर आए किसी भी लिंक से", "cg": "व्हाट्सएप या टेलीग्राम म आए कोनो घलो लिंक ले"}, {"en": "From browser pop-up advertisements", "hi": "इंटरनेट पर अचानक आने वाले विज्ञापनों से", "cg": "इंटरनेट म अचानक आवे वाला विज्ञापन ले"}],
        "answer": 0,
        "explanation": {"en": "Always install applications from the official Google Play Store, which scans apps for malicious code.", "hi": "हमेशा आधिकारिक गूगल प्ले स्टोर से ही ऐप डाउनलोड करें, जो वायरस की जांच करता है।", "cg": "हमेशा असली गूगल प्ले स्टोर ले ही ऐप डाउनलोड करव, जउन वायरस के जांच करथे।"}
    },
    {
        "id": "q_lnk_10", "topic": "links_apps", "difficulty": 2, "type": "tf",
        "question": {"en": "Giving 'Accessibility' or 'SMS read' permission to an unknown app allows it to read your secret bank OTPs without your knowledge.", "hi": "किसी अज्ञात ऐप को 'एक्सेसिबिलिटी' या 'एसएमएस' की अनुमति देने से वह आपके गुप्त ओटीपी खुद पढ़ सकता है।", "cg": "कोनो अनजान ऐप ला 'एक्सेसिबिलिटी' या 'एसएमएस' के परमिशन देय ले ओ तुंहर गुप्त ओटीपी ला खुद पढ़ सकथे।"},
        "options": [{"en": "True", "hi": "सही", "cg": "सही"}, {"en": "False", "hi": "गलत", "cg": "गलत"}],
        "answer": 0,
        "explanation": {"en": "True. Malicious apps request SMS and Accessibility permissions to silently intercept banking OTPs.", "hi": "सही। वायरस वाले ऐप एसएमएस पढ़ने की अनुमति लेकर आपके बैंक ओटीपी चुपके से चुरा लेते हैं।", "cg": "सही। वायरस वाले ऐप एसएमएस पढ़े के परमिशन लेके तुंहर बैंक ओटीपी ला चुपके ले चोरा लेथें।"}
    },
    {
        "id": "q_lnk_11", "topic": "links_apps", "difficulty": 3, "type": "scenario",
        "question": {"en": "You clicked on a link and your phone screen suddenly started flashing with ads and battery draining fast. What should you do?", "hi": "एक लिंक पर क्लिक करने के बाद फोन में अजीब विज्ञापन आने लगे और बैटरी तेजी से खत्म होने लगी। क्या करें?", "cg": "एक लिंक म क्लिक करे के बाद फोन म अजीब विज्ञापन आवे लगिस अउ बैटरी जल्दी खतम होए लगिस। का करव?"},
        "options": [{"en": "Turn off Wi-Fi and mobile data, uninstall recently added unknown apps, and run a security scan", "hi": "इंटरनेट बंद करें, हाल ही में आए अनजान ऐप को तुरंत डिलीट करें और सुरक्षा जांच करें", "cg": "इंटरनेट बंद करव, हाल म आए अनजान ऐप ला तुरंत डिलीट करव अउ जांच करव"}, {"en": "Put the phone inside a bucket of water", "hi": "फोन को पानी की बाल्टी में डाल दें", "cg": "फोन ला पानी के बाल्टी म डार देव"}, {"en": "Click on all the flashing ads", "hi": "आने वाले सभी विज्ञापनों पर क्लिक करते रहें", "cg": "आवे वाला जम्मो विज्ञापन म क्लिक करत रहव"}],
        "answer": 0,
        "explanation": {"en": "Disconnect from the internet immediately to stop data transmission, uninstall suspicious apps, and reset passwords from a safe device.", "hi": "डेटा चोरी रोकने के लिए तुरंत इंटरनेट बंद करें, संदिग्ध ऐप्स को अनइंस्टॉल करें और पासवर्ड बदलें।", "cg": "डेटा चोरी रोके बर तुरंत इंटरनेट बंद करव, संदिग्ध ऐप ला अनइंस्टॉल करव अउ पासवर्ड बदलव।"}
    },
    {
        "id": "q_lnk_12", "topic": "links_apps", "difficulty": 1, "type": "mcq",
        "question": {"en": "What is an instant loan app trap?", "hi": "फर्जी लोन ऐप का जाल क्या होता है?", "cg": "फर्जी लोन ऐप के जाल का होथे?"},
        "options": [{"en": "Unregulated apps that charge exorbitant interest, steal your contact list, and blackmail you", "hi": "अनधिकृत ऐप्स जो भारी ब्याज वसूलते हैं, संपर्क सूची चुराते हैं और ब्लैकमेल करते हैं", "cg": "बिना नियम के ऐप जउन भारी ब्याज वसूलथें, कांटेक्ट लिस्ट चोराथें अउ ब्लैकमेल करथें"}, {"en": "A free gift from the government", "hi": "सरकार की ओर से मुफ्त उपहार", "cg": "सरकार कोती ले मुफ्त उपहार"}, {"en": "A standard bank savings account", "hi": "बैंक का एक साधारण बचत खाता", "cg": "बैंक के एक सीधा बचत खाता"}],
        "answer": 0,
        "explanation": {"en": "Illegal loan apps access your photos and contacts, then harass and blackmail your friends and family. Only borrow from RBI-registered banks.", "hi": "अवैध लोन ऐप आपकी तस्वीरें और नंबर चुराकर परिजनों को ब्लैकमेल करते हैं। केवल आरबीआई से मान्यता प्राप्त बैंकों से ही ऋण लें।", "cg": "अवैध लोन ऐप तुंहर फोटो अउ नंबर चोरा के परिवार मन ला ब्लैकमेल करथें। सिरिफ आरबीआई ले मान्यता प्राप्त बैंक ले ही कर्जा लेव।"}
    },
    {
        "id": "q_lnk_13", "topic": "links_apps", "difficulty": 2, "type": "tf",
        "question": {"en": "If a link received in SMS looks like 'sbi-update.xyz', it is an official State Bank of India website.", "hi": "यदि संदेश में आया लिंक 'एसबीआई-अपडेट डॉट एक्सवाईजेड' जैसा दिखे, तो यह स्टेट बैंक की आधिकारिक वेबसाइट है।", "cg": "अगर संदेश म आए लिंक 'एसबीआई-अपडेट डॉट एक्सवाईजेड' जइसन दिखय, त ए स्टेट बैंक के असली वेबसाइट हे।"},
        "options": [{"en": "True", "hi": "सही", "cg": "सही"}, {"en": "False", "hi": "गलत", "cg": "गलत"}],
        "answer": 1,
        "explanation": {"en": "False. Real Indian bank domains end in sbi.co.in or bank.in, never random domain extensions like .xyz or .top.", "hi": "गलत। असली भारतीय बैंक की वेबसाइट sbi.co.in या bank.in पर खत्म होती हैं, अजीब अंत वाली फर्जी वेबसाइटों पर नहीं।", "cg": "गलत। असली भारतीय बैंक के वेबसाइट sbi.co.in या bank.in म खतम होथे, अजीब अंत वाले फर्जी वेबसाइट म कभू नइ।"}
    },
    {
        "id": "q_lnk_14", "topic": "links_apps", "difficulty": 3, "type": "scenario",
        "question": {"en": "A stranger asks you to search for 'SBI Customer Care' on Google and call the top mobile number listed. What is the risk?", "hi": "कोई अनजान व्यक्ति गूगल पर 'एसबीआई कस्टमर केयर' खोजकर सबसे ऊपर आए मोबाइल नंबर पर कॉल करने को कहता है। क्या खतरा है?", "cg": "कोनो अनजान मनखे गूगल म 'एसबीआई कस्टमर केयर' खोज के सबसे ऊपर आए मोबाइल नंबर म फोन करे ला कहिथे। का खतरा हे?"},
        "options": [{"en": "Fraudsters create fake Google business listings with personal phone numbers to trap callers", "hi": "ठग गूगल पर फर्जी नंबर डाल देते हैं ताकि कॉल करने वालों के बैंक खाते खाली कर सकें", "cg": "ठग मन गूगल म अपन फर्जी नंबर डार देथें ताकि फोन करे वाला मन के खाता खाली कर सकंय"}, {"en": "It will cost ₹500 per minute of call", "hi": "फोन करने पर ₹500 प्रति मिनट कटेंगे", "cg": "फोन करे म ₹500 प्रति मिनट कटही"}, {"en": "Your phone screen will crack", "hi": "फोन की स्क्रीन टूट जाएगी", "cg": "फोन के स्क्रीन फूट जाही"}],
        "answer": 0,
        "explanation": {"en": "Never trust phone numbers found randomly on Google search. Always use the customer care number printed on the back of your bank card.", "hi": "गूगल सर्च पर मिले नंबरों पर कभी भरोसा न करें। हमेशा अपने बैंक कार्ड के पीछे छपे आधिकारिक नंबर पर ही कॉल करें।", "cg": "गूगल सर्च म मिले नंबर म कभू भरोसा झन करव। हमेशा अपन बैंक कार्ड के पाछू छपे असली नंबर म ही फोन करव।"}
    },
    {
        "id": "q_lnk_15", "topic": "links_apps", "difficulty": 2, "type": "mcq",
        "question": {"en": "What setting on your Android phone should always remain turned OFF to protect against dangerous downloads?", "hi": "खतरनाक ऐप से बचने के लिए एंड्रॉयड फोन की कौन-सी सेटिंग हमेशा बंद रखनी चाहिए?", "cg": "खतरनाक ऐप ले बचे बर एंड्रॉयड फोन के कोन सेटिंग हमेशा बंद रखना चाही?"},
        "options": [{"en": "Install apps from unknown sources", "hi": "अज्ञात स्रोतों से ऐप इंस्टॉल करने की अनुमति (अननोन सोर्सेस)", "cg": "अनजान जगा ले ऐप इनस्टॉल करे के अनुमति (अननोन सोर्सेस)"}, {"en": "Screen brightness", "hi": "स्क्रीन की चमक", "cg": "स्क्रीन के चमक"}, {"en": "Alarm clock", "hi": "सुबह का अलार्म", "cg": "सबेरे के अलार्म"}],
        "answer": 0,
        "explanation": {"en": "Keeping 'Install from Unknown Sources' disabled blocks rogue APK files from automatically installing on your device.", "hi": "'अननोन सोर्सेस' सेटिंग बंद रखने से फर्जी और वायरस वाले ऐप बिना आपकी मर्जी के इंस्टॉल नहीं हो पाते।", "cg": "'अननोन सोर्सेस' सेटिंग बंद रखे ले फर्जी अउ वायरस वाले ऐप बिना तुंहर मर्जी के इनस्टॉल नइ हो पावंय।"}
    },

    # ---------------- 9. safe_habits (7 to 15) ----------------
    {
        "id": "q_hab_7", "topic": "safe_habits", "difficulty": 1, "type": "tf",
        "question": {"en": "Using the same 4-digit PIN for your ATM card, your UPI app, and your phone screen lock is good practice.", "hi": "अपने एटीएम कार्ड, यूपीआई ऐप और फोन लॉक के लिए एक ही 4 अंकों का पिन रखना सुरक्षित आदत है।", "cg": "अपन एटीएम कार्ड, यूपीआई ऐप अउ फोन लॉक बर एक ही 4 अंक के पिन रखना सुरक्षित आदत हे।"},
        "options": [{"en": "True", "hi": "सही", "cg": "सही"}, {"en": "False", "hi": "गलत", "cg": "गलत"}],
        "answer": 1,
        "explanation": {"en": "False. If a thief observes you unlocking your phone, they will immediately have access to your bank account as well.", "hi": "गलत। यदि कोई आपका फोन अनलॉक करते देख ले, तो उसे आपके बैंक खाते का पिन भी अपने आप पता चल जाएगा।", "cg": "गलत। अगर कोनो तुंहर फोन अनलॉक करत देख लेय, त ओला तुंहर बैंक खाता के पिन घलो अपने आप पता चल जाही।"}
    },
    {
        "id": "q_hab_8", "topic": "safe_habits", "difficulty": 2, "type": "scenario",
        "question": {"en": "You are at a railway station and connect to 'Free Public Wi-Fi'. Is it safe to check your bank account or send money?", "hi": "आप रेलवे स्टेशन पर 'फ्री पब्लिक वाई-फाई' से जुड़े हैं। क्या इस समय बैंक खाता खोलना या पैसे भेजना सुरक्षित है?", "cg": "तुमन रेलवे स्टेशन म 'फ्री पब्लिक वाई-फाई' ले जुड़े हव। का ए बेरा बैंक खाता खोलना या पइसा भेजना सुरक्षित हे?"},
        "options": [{"en": "No, open public Wi-Fi networks can be snooped; use your own mobile data for banking", "hi": "नहीं, खुले वाई-फाई पर डेटा चोरी हो सकता है; बैंकिंग के लिए केवल अपने मोबाइल डेटा का उपयोग करें", "cg": "नइ, खुले वाई-फाई म डेटा चोरी हो सकथे; बैंकिंग बर सिरिफ अपन मोबाइल डेटा के उपयोग करव"}, {"en": "Yes, public Wi-Fi is 100% encrypted by government", "hi": "हाँ, सार्वजनिक वाई-फाई पूरी तरह सुरक्षित होता है", "cg": "हाँ, सरकारी वाई-फाई पूरा सुरक्षित होथे"}, {"en": "Yes, if the Wi-Fi speed is fast", "hi": "हाँ, यदि इंटरनेट स्पीड तेज हो", "cg": "हाँ, अगर इंटरनेट के स्पीड तेज होवय"}],
        "answer": 0,
        "explanation": {"en": "Never perform financial transactions or type banking credentials on unsecured public Wi-Fi networks.", "hi": "सार्वजनिक वाई-फाई पर कभी पैसे का लेनदेन या बैंक पासवर्ड दर्ज न करें। हमेशा अपने निजी मोबाइल डेटा का उपयोग करें।", "cg": "सार्वजनिक वाई-फाई म कभू पइसा के लेनदेन या बैंक पासवर्ड झन डारव। हमेशा अपन खुद के मोबाइल डेटा के उपयोग करव।"}
    },
    {
        "id": "q_hab_9", "topic": "safe_habits", "difficulty": 1, "type": "mcq",
        "question": {"en": "What should you do before throwing away an old bank passbook or ATM withdrawal slip?", "hi": "पुरानी बैंक पासबुक या एटीएम की पर्ची फेंकने से पहले आपको क्या करना चाहिए?", "cg": "पुरानी बैंक पासबुक या एटीएम के रसीद फेंके ले पहिली तुंहला का करना चाही?"},
        "options": [{"en": "Tear it into small pieces so your account number and balance are destroyed", "hi": "उसे छोटे-छोटे टुकड़ों में फाड़ दें ताकि खाता नंबर और विवरण कोई न देख सके", "cg": "ओला नानकुन टुकना म फार देव ताकि खाता नंबर अउ विवरण कोनो झन देख सकय"}, {"en": "Throw it as it is on the street", "hi": "सड़क पर ऐसे ही फेंक दें", "cg": "सड़क म अइसने फेंक देव"}, {"en": "Hand it to strangers", "hi": "अजनबियों को दे दें", "cg": "अनजान मनखे ला दे देव"}],
        "answer": 0,
        "explanation": {"en": "Always shred documents with personal account details to prevent identity theft and fraud.", "hi": "खाता विवरण वाली पर्चियों को हमेशा फाड़कर नष्ट करें ताकि कोई आपकी जानकारी का दुरुपयोग न कर सके।", "cg": "खाता विवरण वाले रसीद ला हमेशा फार के नष्ट करव ताकि कोनो तुंहर जानकारी के गलत उपयोग झन कर सकय।"}
    },
    {
        "id": "q_hab_10", "topic": "safe_habits", "difficulty": 2, "type": "tf",
        "question": {"en": "Checking your bank account SMS alerts regularly helps you spot unauthorized transactions immediately.", "hi": "बैंक से आने वाले संदेशों को नियमित रूप से पढ़ते रहने से किसी भी अनधिकृत लेनदेन का तुरंत पता चल जाता है।", "cg": "बैंक ले आवे वाला संदेश ला रोज-रोज पढ़त रहे ले कोनो घलो गलत लेनदेन के तुरंत पता चल जाथे।"},
        "options": [{"en": "True", "hi": "सही", "cg": "सही"}, {"en": "False", "hi": "गलत", "cg": "गलत"}],
        "answer": 0,
        "explanation": {"en": "True. Promptly reading your bank transaction messages ensures you can report unauthorized debits within minutes to 1930.", "hi": "सही। बैंक संदेशों को तुरंत पढ़ने से आप किसी भी फर्जी लेनदेन की शिकायत कुछ ही मिनटों में 1930 पर दर्ज करा सकते हैं।", "cg": "सही। बैंक संदेश ला तुरंत पढ़े ले तुमन कोनो घलो फर्जी लेनदेन के शिकायत कुछे मिनट म 1930 म दर्ज करा सकथव।"}
    },
    {
        "id": "q_hab_11", "topic": "safe_habits", "difficulty": 3, "type": "scenario",
        "question": {"en": "A stranger at a tea stall says their phone battery died and asks to borrow your phone to 'make an urgent call'. What precautions should you take?", "hi": "चाय की दुकान पर अनजान व्यक्ति कहता है कि उसका फोन बंद हो गया है और जरूरी बात करने के लिए आपका फोन मांगता है। क्या करें?", "cg": "चाय दुकान म अनजान मनखे कहिथे कि ओकर फोन बंद हो गे हे अउ जरूरी गोठ-बात बर तुंहर फोन मांगथे। का करव?"},
        "options": [{"en": "Dial the number yourself, keep the phone in your sight, and lock your payment apps with a fingerprint/PIN", "hi": "नंबर खुद डायल करें, फोन पर नजर रखें और पेमेंट ऐप्स को हमेशा लॉक रखें", "cg": "नंबर खुद डायल करव, फोन म नजर राखव अउ पेमेंट ऐप ला हमेशा लॉक राखव"}, {"en": "Hand over the unlocked phone and walk away to order tea", "hi": "अनलॉक फोन देकर चाय पीने चले जाएं", "cg": "अनलॉक फोन देके चाय पिए बर चले जाव"}, {"en": "Open your banking app and leave it open on screen", "hi": "बैंक ऐप खोलकर स्क्रीन चालू छोड़ दें", "cg": "बैंक ऐप खोल के स्क्रीन चालू छोड़ देव"}],
        "answer": 0,
        "explanation": {"en": "Never leave an unlocked phone unattended with strangers. They can forward your SMS, read OTPs, or transfer money in seconds.", "hi": "अनलॉक फोन कभी अजनबियों के हाथ में न छोड़ें। वे कुछ ही सेकंड में आपके संदेश फॉरवर्ड कर सकते हैं या पैसे ट्रांसफर कर सकते हैं।", "cg": "अनलॉक फोन कभू अनजान मनखे के हाथ म झन छोड़व। ओमन कुछे सेकंड म तुंहर संदेश फॉरवर्ड कर सकथें या पइसा ट्रांसफर कर सकथें।"}
    },
    {
        "id": "q_hab_12", "topic": "safe_habits", "difficulty": 1, "type": "mcq",
        "question": {"en": "What is two-factor authentication (2FA)?", "hi": "दोहरी सुरक्षा (टू-फैक्टर ऑथेंटिकेशन) क्या होती है?", "cg": "दोहरी सुरक्षा (टू-फैक्टर ऑथेंटिकेशन) का होथे?"},
        "options": [{"en": "An extra security step like an OTP or fingerprint in addition to your password", "hi": "पासवर्ड के अलावा ओटीपी या फिंगरप्रिंट की अतिरिक्त सुरक्षा परत", "cg": "पासवर्ड के अलावा ओटीपी या फिंगरप्रिंट के अतिरिक्त सुरक्षा परत"}, {"en": "Having two bank accounts", "hi": "दो अलग-अलग बैंक खाते रखना", "cg": "दो अलग-अलग बैंक खाता रखना"}, {"en": "Entering your PIN twice", "hi": "एक ही पिन को दो बार टाइप करना", "cg": "एक ही पिन ला दो पइंत टाइप करना"}],
        "answer": 0,
        "explanation": {"en": "Two-factor authentication adds an essential second layer of defense so stolen passwords alone cannot compromise your account.", "hi": "दोहरी सुरक्षा सुनिश्चित करती है कि केवल पासवर्ड पता होने पर भी कोई आपका खाता न खोल सके।", "cg": "दोहरी सुरक्षा पक्का करथे कि सिरिफ पासवर्ड मालूम होए म घलो कोनो तुंहर खाता झन खोल सकय।"}
    },
    {
        "id": "q_hab_13", "topic": "safe_habits", "difficulty": 2, "type": "tf",
        "question": {"en": "It is safe to let a web browser save your debit card CVV number for faster shopping.", "hi": "इंटरनेट ब्राउज़र में अपने कार्ड का सीवीवी नंबर हमेशा के लिए सेव रखना सुरक्षित है।", "cg": "इंटरनेट ब्राउज़र म अपन कार्ड के सीवीवी नंबर हमेशा बर सेव रखना सुरक्षित हे।"},
        "options": [{"en": "True", "hi": "सही", "cg": "सही"}, {"en": "False", "hi": "गलत", "cg": "गलत"}],
        "answer": 1,
        "explanation": {"en": "False. Never save CVV numbers on browsers or online shopping websites. Always type it fresh each time.", "hi": "गलत। ब्राउज़र या शॉपिंग वेबसाइट पर सीवीवी नंबर कभी सेव न करें। हमेशा हर बार खुद नया दर्ज करें।", "cg": "गलत। ब्राउज़र या शॉपिंग वेबसाइट म सीवीवी नंबर कभू सेव झन करव। हमेशा हर बेरा खुद नया टाइप करव।"}
    },
    {
        "id": "q_hab_14", "topic": "safe_habits", "difficulty": 3, "type": "scenario",
        "question": {"en": "You decide to sell your old Android smartphone to a mobile shop. What must you do before handing it over?", "hi": "आप अपना पुराना एंड्रॉयड फोन दुकान पर बेचने जा रहे हैं। फोन सौंपने से पहले आपको क्या करना चाहिए?", "cg": "तुमन अपन पुराना एंड्रॉयड फोन दुकान म बेचे बर जावत हव। फोन सौंपे ले पहिली तुंहला का करना चाही?"},
        "options": [{"en": "Log out of all accounts, remove SIM and memory cards, and perform a full Factory Data Reset", "hi": "सभी खातों से लॉगआउट करें, सिम और मेमोरी कार्ड निकालें और फोन को फैक्टरी रीसेट करें", "cg": "जम्मो खाता ले लॉगआउट करव, सिम अउ मेमोरी कार्ड निकालव अउ फोन ला फैक्टरी रीसेट करव"}, {"en": "Just delete a few photos from the gallery", "hi": "गैलरी से केवल कुछ फोटो हटा दें", "cg": "गैलरी ले सिरिफ कुछु फोटो हटा देव"}, {"en": "Hand it over with all banking apps logged in", "hi": "सभी बैंक ऐप चालू रखकर फोन दे दें", "cg": "जम्मो बैंक ऐप चालू रख के फोन दे देव"}],
        "answer": 0,
        "explanation": {"en": "A factory data reset completely erases all your saved passwords, bank tokens, and personal messages.", "hi": "फैक्टरी रीसेट करने से आपके सभी बैंक पासवर्ड, टोकन और व्यक्तिगत संदेश फोन से पूरी तरह मिट जाते हैं।", "cg": "फैक्टरी रीसेट करे ले तुंहर जम्मो बैंक पासवर्ड, टोकन अउ व्यक्तिगत संदेश फोन ले पूरा मिट जाथें।"}
    },
    {
        "id": "q_hab_15", "topic": "safe_habits", "difficulty": 2, "type": "mcq",
        "question": {"en": "Why should you lock your smartphone with a biometric fingerprint or strong PIN code?", "hi": "आपको अपना स्मार्टफोन फिंगरप्रिंट या मजबूत पिन कोड से लॉक क्यों रखना चाहिए?", "cg": "तुंहला अपन स्मार्टफोन फिंगरप्रिंट या मजबूत पिन कोड ले लॉक काबर रखना चाही?"},
        "options": [{"en": "To prevent anyone who picks up or steals your phone from accessing your UPI and banking apps", "hi": "ताकि फोन खोने या चोरी होने पर कोई आपके पेमेंट और बैंक ऐप्स तक न पहुंच सके", "cg": "ताकि फोन हेराए या चोरी होए म कोनो तुंहर पेमेंट अउ बैंक ऐप तक झन पहुंच सकय"}, {"en": "To make the phone battery charge faster", "hi": "फोन की बैटरी जल्दी चार्ज करने के लिए", "cg": "फोन के बैटरी जल्दी चार्ज करे बर"}, {"en": "To improve mobile camera quality", "hi": "कैमरे की फोटो अच्छी करने के लिए", "cg": "कैमरा के फोटो बने करे बर"}],
        "answer": 0,
        "explanation": {"en": "Screen lock is the first line of defense protecting your financial apps, OTPs, and private messages.", "hi": "स्क्रीन लॉक आपके वित्तीय ऐप्स, आने वाले ओटीपी और संदेशों की सुरक्षा की पहली ढाल है।", "cg": "स्क्रीन लॉक तुंहर वित्तीय ऐप, आवे वाला ओटीपी अउ संदेश मन के सुरक्षा के पहिली ढाल हे।"}
    },

    # ---------------- 10. what_to_do (7 to 15) ----------------
    {
        "id": "q_do_7", "topic": "what_to_do", "difficulty": 1, "type": "tf",
        "question": {"en": "If money is fraudulently deducted from your account, reporting within the 'golden hour' (first 2-3 hours) increases the chance of recovering it.", "hi": "यदि खाते से धोखे से पैसे कट जाएं, तो शुरुआती 'गोल्डन ऑवर' (पहले 2-3 घंटे) में शिकायत करने से पैसे वापस मिलने की संभावना सबसे ज्यादा होती है।", "cg": "अगर खाता ले धोखे ले पइसा कट जाय, त पहिली 'गोल्डन ऑवर' (पहिली 2-3 घंटा) म शिकायत करे ले पइसा वापस मिले के संभावना सबसे जादा होथे।"},
        "options": [{"en": "True", "hi": "सही", "cg": "सही"}, {"en": "False", "hi": "गलत", "cg": "गलत"}],
        "answer": 0,
        "explanation": {"en": "True! Calling 1930 immediately allows authorities to freeze the scammer's beneficiary bank account before they withdraw the cash.", "hi": "सही! 1930 पर तुरंत कॉल करने से पुलिस और बैंक ठग के खाते को तुरंत फ्रीज कर देते हैं इससे पहले कि वह पैसे निकाल सके।", "cg": "सही! 1930 म तुरंत फोन करे ले पुलिस अउ बैंक ठग के खाता ला तुरंत सील कर देथें एकर ले पहिली कि ओ पइसा निकाल सकय।"}
    },
    {
        "id": "q_do_8", "topic": "what_to_do", "difficulty": 2, "type": "scenario",
        "question": {"en": "You realize you just shared an OTP with a scammer on phone. What is the very first thing you should do?", "hi": "आपको एहसास हुआ कि आपने फोन पर ठग को ओटीपी बता दिया है। सबसे पहला काम आपको क्या करना चाहिए?", "cg": "तुंहला एहसास होइस कि तुमन फोन म ठग ला ओटीपी बता देहेव। सबसे पहिली काम तुंहला का करना चाही?"},
        "options": [{"en": "Call your bank immediately to freeze the account/card, and dial 1930", "hi": "तुरंत अपने बैंक को फोन करके खाता/कार्ड ब्लॉक करवाएं और 1930 पर कॉल करें", "cg": "तुरंत अपन बैंक ला फोन करके खाता/कार्ड ब्लॉक करवाव अउ 1930 म फोन करव"}, {"en": "Call the scammer back and ask them to return the OTP", "hi": "ठग को वापस फोन करके ओटीपी लौटाने की विनती करें", "cg": "ठग ला वापस फोन करके ओटीपी लौटाए बर बिनती करव"}, {"en": "Wait till next Monday to visit the branch", "hi": "अगले सोमवार तक बैंक शाखा खुलने का इंतजार करें", "cg": "आवे वाला सोमवार तक बैंक शाखा खुले के अगोरव"}],
        "answer": 0,
        "explanation": {"en": "Act fast. Call your bank's toll-free number printed on your card to block the card, then report to 1930.", "hi": "तेजी से कदम उठाएं। कार्ड के पीछे लिखे टोल-फ्री नंबर पर कॉल करके कार्ड ब्लॉक कराएं और 1930 पर शिकायत दर्ज करें।", "cg": "फुर्ती ले कदम उठाव। कार्ड के पाछू लिखे टोल-फ्री नंबर म फोन करके कार्ड ब्लॉक कराव अउ 1930 म शिकायत दर्ज करव।"}
    },
    {
        "id": "q_do_9", "topic": "what_to_do", "difficulty": 1, "type": "mcq",
        "question": {"en": "What is the official government portal to register cyber financial fraud complaints in India?", "hi": "भारत में साइबर वित्तीय अपराध की ऑनलाइन शिकायत दर्ज करने का आधिकारिक सरकारी पोर्टल कौन-सा है?", "cg": "भारत म साइबर वित्तीय अपराध के ऑनलाइन शिकायत दर्ज करे के असली सरकारी पोर्टल कोन-सा हे?"},
        "options": [{"en": "cybercrime.gov.in", "hi": "cybercrime.gov.in (साइबरक्राइम डॉट जीओवी डॉट इन)", "cg": "cybercrime.gov.in (साइबरक्राइम डॉट जीओवी डॉट इन)"}, {"en": "free-refund.com", "hi": "free-refund.com", "cg": "free-refund.com"}, {"en": "lottery-winner.net", "hi": "lottery-winner.net", "cg": "lottery-winner.net"}],
        "answer": 0,
        "explanation": {"en": "cybercrime.gov.in is the Ministry of Home Affairs official National Cyber Crime Reporting Portal.", "hi": "cybercrime.gov.in गृह मंत्रालय का आधिकारिक राष्ट्रीय साइबर अपराध रिपोर्टिंग पोर्टल है।", "cg": "cybercrime.gov.in गृह मंत्रालय के असली राष्ट्रीय साइबर अपराध रिपोर्टिंग पोर्टल हे।"}
    },
    {
        "id": "q_do_10", "topic": "what_to_do", "difficulty": 2, "type": "tf",
        "question": {"en": "After experiencing financial fraud, deleting the scammer's phone number and SMS is recommended.", "hi": "धोखाधड़ी होने के बाद ठग का मोबाइल नंबर और एसएमएस डिलीट कर देना चाहिए।", "cg": "धोखाधड़ी होए के बाद ठग के मोबाइल नंबर अउ संदेश ला मिटा देना चाही।"},
        "options": [{"en": "True", "hi": "सही", "cg": "सही"}, {"en": "False", "hi": "गलत", "cg": "गलत"}],
        "answer": 1,
        "explanation": {"en": "False. Keep every SMS, phone number, screenshot, and bank statement. They are vital legal evidence for the police.", "hi": "गलत। हर संदेश, नंबर, स्क्रीनशॉट और बैंक स्टेटमेंट सुरक्षित रखें। ये पुलिस जांच के लिए अहम कानूनी सबूत होते हैं।", "cg": "गलत। हर संदेश, नंबर, स्क्रीनशॉट अउ बैंक स्टेटमेंट ला सुरक्षित राखव। ए पुलिस जांच बर जरूरी कानूनी सबूत होथें।"}
    },
    {
        "id": "q_do_11", "topic": "what_to_do", "difficulty": 3, "type": "scenario",
        "question": {"en": "You were targeted by an extortion call demanding ₹20,000, but you did NOT lose any money. Should you still report it?", "hi": "आपको ₹20,000 की ठगी की कॉल आई, लेकिन आपके पैसे नहीं कटे। क्या आपको फिर भी शिकायत दर्ज करनी चाहिए?", "cg": "तुंहला ₹20,000 के ठगी के कॉल आइस, फेर तुंहर पइसा नइ कटिस। का तुंहला तब घलो शिकायत दर्ज करना चाही?"},
        "options": [{"en": "Yes, report the suspicious caller on Chakshu (Sanchar Saathi) or 1930 so the criminal's number is blocked", "hi": "हाँ, चक्षु (संचार साथी) या 1930 पर रिपोर्ट करें ताकि ठग का नंबर ब्लॉक हो सके और दूसरे लोग बच सकें", "cg": "हाँ, चक्षु (संचार साथी) या 1930 म रिपोर्ट करव ताकि ठग के नंबर ब्लॉक हो सकय अउ दूसरा मनखे बच सकंय"}, {"en": "No, if no money was lost, it is not a crime", "hi": "नहीं, जब पैसे नहीं कटे तो कोई अपराध नहीं हुआ", "cg": "नइ, जब पइसा नइ कटिस त कोनो अपराध नइ होइस"}, {"en": "Send abusive text messages to the scammer", "hi": "ठग को गाली-गलौज वाले संदेश भेजें", "cg": "ठग ला उलटा-सीधा संदेश भेजव"}],
        "answer": 0,
        "explanation": {"en": "Reporting suspicious numbers on the Chakshu portal blocks the scammer's SIM and handset, protecting other citizens.", "hi": "चक्षु पोर्टल पर संदिग्ध नंबर रिपोर्ट करने से सरकार उस नंबर और मोबाइल को ब्लॉक कर देती है, जिससे अन्य लोग बचते हैं।", "cg": "चक्षु पोर्टल म संदिग्ध नंबर रिपोर्ट करे ले सरकार ओ नंबर अउ मोबाइल ला बंद कर देथे, जेकर ले दूसरा मनखे बचथें।"}
    },
    {
        "id": "q_do_12", "topic": "what_to_do", "difficulty": 1, "type": "mcq",
        "question": {"en": "What is the very first phone number you should dial if you fall victim to financial cyber fraud in India?", "hi": "भारत में वित्तीय साइबर धोखाधड़ी का शिकार होने पर सबसे पहले कौन-सा नंबर मिलाना चाहिए?", "cg": "भारत म वित्तीय साइबर धोखाधड़ी के शिकार होए म सबसे पहिली कोन नंबर मिलाना चाही?"},
        "options": [{"en": "1930", "hi": "1930 (उन्नीस सौ तीस)", "cg": "1930 (उन्नीस सौ तीस)"}, {"en": "100", "hi": "100", "cg": "100"}, {"en": "101", "hi": "101", "cg": "101"}],
        "answer": 0,
        "explanation": {"en": "1930 is the citizen financial cyber fraud reporting helpline operational across all states in India.", "hi": "1930 भारत के सभी राज्यों में सक्रिय वित्तीय साइबर धोखाधड़ी हेल्पलाइन नंबर है।", "cg": "1930 भारत के जम्मो राज्य म चालू वित्तीय साइबर धोखाधड़ी हेल्पलाइन नंबर हे।"}
    },
    {
        "id": "q_do_13", "topic": "what_to_do", "difficulty": 2, "type": "tf",
        "question": {"en": "A private hacker on Telegram who promises to recover stolen money for an advance fee of ₹1,000 can be trusted.", "hi": "टेलीग्राम पर मिला कोई प्राइवेट हैकर जो ₹1,000 फीस लेकर लूटे हुए पैसे वापस दिलाने का दावा करे, उस पर भरोसा किया जा सकता है।", "cg": "टेलीग्राम म मिले कोनो प्राइवेट हैकर जउन ₹1,000 फीस लेके लूटे पइसा वापस दिलाए के दावा करय, ओकर म भरोसा करे जा सकथे।"},
        "options": [{"en": "True", "hi": "सही", "cg": "सही"}, {"en": "False", "hi": "गलत", "cg": "गलत"}],
        "answer": 1,
        "explanation": {"en": "False! This is a 'recovery scam'. These fraudsters prey on fraud victims to steal even more money. Only official police and banks can recover funds.", "hi": "गलत! यह ठगी के पीड़ितों को दोबारा ठगने का 'रिकवरी स्कैम' है। पैसे केवल पुलिस और बैंक के जरिए ही वापस मिल सकते हैं।", "cg": "गलत! ए ठगी के शिकार मनखे ला दोबारा ठगे के 'रिकवरी स्कैम' हे। पइसा सिरिफ पुलिस अउ बैंक के जरिए ही वापस मिल सकथे।"}
    },
    {
        "id": "q_do_14", "topic": "what_to_do", "difficulty": 3, "type": "scenario",
        "question": {"en": "You have called 1930 and blocked your card. What is the next official document you should collect from your bank branch?", "hi": "आपने 1930 पर शिकायत कर दी और कार्ड ब्लॉक कर दिया। इसके बाद बैंक जाकर कौन-सा दस्तावेज प्राप्त करना चाहिए?", "cg": "तुमन 1930 म शिकायत कर देहेव अउ कार्ड ब्लॉक कर देहेव। एकर बाद बैंक जाके कोन दस्तावेज लेना चाही?"},
        "options": [{"en": "Bank account statement showing the fraudulent transaction with UTR / reference numbers", "hi": "खाता विवरण (स्टेटमेंट) जिसमें उस फर्जी लेनदेन का यूटीआर या संदर्भ नंबर दर्ज हो", "cg": "खाता विवरण (स्टेटमेंट) जेमा ओ फर्जी लेनदेन के यूटीआर या संदर्भ नंबर लिखे होवय"}, {"en": "A calendar from the bank manager", "hi": "बैंक मैनेजर से नया कैलेंडर मांगें", "cg": "बैंक मैनेजर ले नया कैलेंडर मांगव"}, {"en": "A new passbook cover", "hi": "पासबुक का नया कवर", "cg": "पासबुक के नया कवर"}],
        "answer": 0,
        "explanation": {"en": "The bank statement with transaction reference numbers (UTR) is essential evidence required when filing your formal police report.", "hi": "यूटीआर नंबर वाला बैंक स्टेटमेंट पुलिस में औपचारिक प्राथमिकी दर्ज करने के लिए सबसे आवश्यक दस्तावेज है।", "cg": "यूटीआर नंबर वाला बैंक स्टेटमेंट पुलिस म औपचारिक रिपोर्ट दर्ज करे बर सबसे जरूरी दस्तावेज हे।"}
    },
    {
        "id": "q_do_15", "topic": "what_to_do", "difficulty": 2, "type": "mcq",
        "question": {"en": "What does Chakshu on Sanchar Saathi allow you to report?", "hi": "संचार साथी का 'चक्षु' पोर्टल आपको किस चीज़ की शिकायत करने की सुविधा देता है?", "cg": "संचार साथी के 'चक्षु' पोर्टल तुंहला कोन चीज के शिकायत करे के सुविधा देथे?"},
        "options": [{"en": "Suspected fraud communications received via SMS, WhatsApp, or calls", "hi": "संदेश, व्हाट्सएप या कॉल पर आई किसी भी संदिग्ध धोखाधड़ी की सूचना", "cg": "संदेश, व्हाट्सएप या कॉल म आए कोनो घलो संदिग्ध धोखाधड़ी के सूचना"}, {"en": "Slow internet speeds", "hi": "इंटरनेट की धीमी गति", "cg": "इंटरनेट के धीमा गति"}, {"en": "Cracked mobile screens", "hi": "मोबाइल स्क्रीन का टूटना", "cg": "मोबाइल स्क्रीन के फूटना"}],
        "answer": 0,
        "explanation": {"en": "Chakshu is the Department of Telecommunications portal to report suspected fraud SMS and calls before money is lost.", "hi": "चक्षु दूरसंचार विभाग का पोर्टल है जहाँ संदिग्ध कॉल और संदेशों की रिपोर्ट करके ठगों के सिम बंद करवाए जाते हैं।", "cg": "चक्षु दूरसंचार विभाग के पोर्टल हे जिहाँ संदिग्ध कॉल अउ संदेश के रिपोर्ट करके ठग मन के सिम बंद करवाए जाथे।"}
    }
]

# Verify no Latin characters in any hi or cg strings
for item in NEW_ITEMS:
    check_no_latin(f"{item['id']} question.hi", item["question"]["hi"])
    check_no_latin(f"{item['id']} question.cg", item["question"]["cg"])
    check_no_latin(f"{item['id']} explanation.hi", item["explanation"]["hi"])
    check_no_latin(f"{item['id']} explanation.cg", item["explanation"]["cg"])
    for i, opt in enumerate(item["options"]):
        check_no_latin(f"{item['id']} opt{i}.hi", opt["hi"])
        check_no_latin(f"{item['id']} opt{i}.cg", opt["cg"])

# Merge with existing
for item in NEW_ITEMS:
    existing[item["id"]] = item

all_questions = list(existing.values())
quiz_data["questions"] = all_questions

# Count per topic
counts = {}
for q in all_questions:
    t = q["topic"]
    counts[t] = counts.get(t, 0) + 1

print("Question counts per topic:")
for t, c in sorted(counts.items()):
    print(f"  {t}: {c}")

assert all(c == 15 for c in counts.values()), "Not all topics have 15 questions!"
assert len(all_questions) == 150, f"Expected 150 questions, got {len(all_questions)}"

with open(QUIZ_FILE, "w", encoding="utf-8") as f:
    json.dump(quiz_data, f, ensure_ascii=False, indent=1)

print("Saved 150 questions successfully into quiz.json!")
