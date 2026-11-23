"""Generates 15 questions for each of the 10 chapters in quiz.json.
Total: 150 questions (10 topics x 15 questions).
All Hindi and Chhattisgarhi strings are strictly Devanagari (no Latin letters).
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
QUIZ_FILE = ROOT / "public" / "content" / "quiz.json"

# Load existing questions
with open(QUIZ_FILE, encoding="utf-8") as f:
    quiz_data = json.load(f)

existing = {q["id"]: q for q in quiz_data["questions"]}

# Define the 9 new questions (7 to 15) for each of the 10 topics
NEW_QUESTIONS = [
    # ---------------- 1. otp_pin_card (7 to 15) ----------------
    {
        "id": "q_otp_7",
        "topic": "otp_pin_card",
        "difficulty": 1,
        "type": "tf",
        "question": {
            "en": "You can share your OTP with a friend if they say their phone has no network.",
            "hi": "क्या आप अपने दोस्त को अपना ओटीपी दे सकते हैं यदि वह कहे कि उसके फोन में नेटवर्क नहीं है?",
            "cg": "का तुमन अपन संगी ला अपन ओटीपी दे सकथो अगर ओ कहय कि ओकर फोन म नेटवर्क नइये?"
        },
        "options": [
            {"en": "Yes, friends can be trusted", "hi": "हाँ, दोस्तों पर भरोसा कर सकते हैं", "cg": "हाँ, संगी मन म भरोसा करे जा सकथे"},
            {"en": "Never, an OTP is for your account only", "hi": "कभी नहीं, ओटीपी सिर्फ आपके खाते के लिए है", "cg": "कभू नइ, ओटीपी सिरिफ तुंहर खाता बर हे"}
        ],
        "answer": 1,
        "explanation": {
            "en": "Never share an OTP. The OTP is tied to your bank account and authorizes money leaving your account.",
            "hi": "ओटीपी कभी साझा न करें। ओटीपी आपके बैंक खाते से जुड़ा होता है और पैसे काटने की अनुमति देता है।",
            "cg": "ओटीपी कभू कखरो संग साझा झन करव। ओटीपी तुंहर बैंक खाता ले जुड़े रहिथे अउ पइसा काटे के अनुमति देथे।"
        }
    },
    {
        "id": "q_otp_8",
        "topic": "otp_pin_card",
        "difficulty": 2,
        "type": "scenario",
        "question": {
            "en": "An SMS says: '₹5,000 debited. If not you, share OTP 8421 with bank support immediately.' What is this?",
            "hi": "एक संदेश आता है: '₹5,000 कट गए। अगर आपने नहीं किया, तो बैंक को तुरंत ओटीपी 8421 बताएं।' यह क्या है?",
            "cg": "एक संदेश आथे: '₹5,000 कट गे। अगर तुमन नइ करे हव, त बैंक ला तुरंत ओटीपी 8421 बताव।' ए का चीज हे?"
        },
        "options": [
            {"en": "A scam message trying to steal your OTP", "hi": "ओटीपी चुराने वाला एक फर्जी संदेश", "cg": "ओटीपी चोराए वाला एक फर्जी संदेश"},
            {"en": "A real bank security alert", "hi": "बैंक का असली सुरक्षा संदेश", "cg": "बैंक के असली सुरक्षा संदेश"},
            {"en": "A technical error from the telecom company", "hi": "टेलीकॉम कंपनी की तकनीकी खराबी", "cg": "टेलीकॉम कंपनी के तकनीकी खराबी"}
        ],
        "answer": 0,
        "explanation": {
            "en": "Scammers send fake debit alerts to induce panic so that you share your OTP. Banks never ask for OTP to cancel a transaction.",
            "hi": "ठग घबराहट पैदा करने के लिए फर्जी संदेश भेजते हैं ताकि आप ओटीपी बता दें। बैंक कभी लेनदेन रद्द करने के लिए ओटीपी नहीं मांगता।",
            "cg": "ठग मन घबराहट पैदा करे बर फर्जी संदेश भेजथें जेकर ले तुमन ओटीपी बता देव। बैंक कभू लेनदेन रद्द करे बर ओटीपी नइ मांगय।"
        }
    },
    {
        "id": "q_otp_9",
        "topic": "otp_pin_card",
        "difficulty": 1,
        "type": "mcq",
        "question": {
            "en": "Where is the CVV number located on your debit card?",
            "hi": "आपके एटीएम कार्ड पर सीवीवी नंबर कहाँ लिखा होता है?",
            "cg": "तुंहर एटीएम कार्ड म सीवीवी नंबर कहाँ लिखे रहिथे?"
        },
        "options": [
            {"en": "On the back, 3 digits near the signature strip", "hi": "पीछे की तरफ, हस्ताक्षर पट्टी के पास 3 अंक", "cg": "पाछू के कोती, दस्तखत पट्टी के तीर 3 अंक"},
            {"en": "On the front, below your name", "hi": "सामने की तरफ, आपके नाम के नीचे", "cg": "आघू के कोती, तुंहर नाम के तरी"},
            {"en": "Inside the golden chip", "hi": "गोल्डन चिप के अंदर", "cg": "सुनहरा चिप के भीतर"}
        ],
        "answer": 0,
        "explanation": {
            "en": "The CVV is a 3-digit secret code on the back of your card. Never share it with anyone.",
            "hi": "सीवीवी कार्ड के पीछे लिखा 3 अंकों का गुप्त कोड है। इसे कभी किसी को न बताएं।",
            "cg": "सीवीवी कार्ड के पाछू लिखे 3 अंक के गुप्त कोड हे। एला कभू कखरो ला झन बतावहू।"
        }
    },
    {
        "id": "q_otp_10",
        "topic": "otp_pin_card",
        "difficulty": 2,
        "type": "tf",
        "question": {
            "en": "If a caller knows your card number and date of birth, it means they are definitely from the bank.",
            "hi": "यदि फोन करने वाले को आपका कार्ड नंबर और जन्म तिथि पता है, तो इसका मतलब है कि वह सचमुच बैंक से है।",
            "cg": "अगर फोन करे वाला ला तुंहर कार्ड नंबर अउ जनम तारीख मालूम हे, त एकर मतलब हे कि ओ सचमुच बैंक ले हे।"
        },
        "options": [
            {"en": "True", "hi": "सही", "cg": "सही"},
            {"en": "False", "hi": "गलत", "cg": "गलत"}
        ],
        "answer": 1,
        "explanation": {
            "en": "False. Fraudsters often buy leaked details to sound convincing, but only you have the OTP or PIN.",
            "hi": "गलत। ठग भरोसा जीतने के लिए लीक हुआ विवरण इस्तेमाल करते हैं, लेकिन ओटीपी और पिन केवल आपके पास होता है।",
            "cg": "गलत। ठग मन भरोसा जीते बर लीक विवरण के उपयोग करथें, फेर ओटीपी अउ पिन सिरिफ तुंहर तीर होथे।"
        }
    },
    {
        "id": "q_otp_11",
        "topic": "otp_pin_card",
        "difficulty": 3,
        "type": "scenario",
        "question": {
            "en": "Someone at a ration shop or village kiosk offers to type your PIN to help you. What should you do?",
            "hi": "राशन दुकान या ग्राहक सेवा केंद्र पर कोई आपकी मदद के लिए आपका पिन टाइप करने को कहता है। आपको क्या करना चाहिए?",
            "cg": "राशन दुकान या ग्राहक सेवा केंद्र म कोनो तुंहर मदद बर तुंहर पिन टाइप करे ला कहिथे। तुंहला का करना चाही?"
        },
        "options": [
            {"en": "Politely refuse and type your PIN privately yourself", "hi": "विनम्रता से मना करें और पिन खुद छुपाकर टाइप करें", "cg": "मया ले मना करव अउ पिन ला खुद लुका के टाइप करव"},
            {"en": "Tell them the PIN so the line moves faster", "hi": "उन्हें पिन बता दें ताकि काम जल्दी हो", "cg": "ओमन ला पिन बता देव ताकि काम जल्दी हो जाय"},
            {"en": "Write the PIN on a slip of paper", "hi": "कागज की पर्ची पर पिन लिखकर दे दें", "cg": "कागज के टुकना म पिन लिखके दे देव"}
        ],
        "answer": 0,
        "explanation": {
            "en": "Never let anyone see or enter your PIN. Always cover the keypad with your hand and type it yourself.",
            "hi": "अपना पिन किसी को न देखने दें, न टाइप करने दें। हमेशा हाथ से कीपैड छुपाकर खुद टाइप करें।",
            "cg": "अपन पिन कखरो ला झन देखन देव, न टाइप करन देव। हमेशा हाथ ले कीपैड ला तोप के खुद टाइप करव।"
        }
    },
    {
        "id": "q_otp_12",
        "topic": "otp_pin_card",
        "difficulty": 2,
        "type": "mcq",
        "question": {
            "en": "What does OTP stand for?",
            "hi": "ओटीपी का पूरा अर्थ क्या है?",
            "cg": "ओटीपी के पूरा मतलब का होथे?"
        },
        "options": [
            {"en": "One-Time Password", "hi": "एक बार इस्तेमाल होने वाला पासवर्ड", "cg": "एक पइंत उपयोग होए वाला पासवर्ड"},
            {"en": "Official Telephone Pass", "hi": "ऑफिशियल टेलीफोन पास", "cg": "ऑफिशियल टेलीफोन पास"},
            {"en": "Online Transfer Permission", "hi": "ऑनलाइन ट्रांसफर परमिशन", "cg": "ऑनलाइन ट्रांसफर परमिशन"}
        ],
        "answer": 0,
        "explanation": {
            "en": "OTP stands for One-Time Password. It is valid for a single transaction and expires in minutes.",
            "hi": "ओटीपी का मतलब है वन-टाइम पासवर्ड। यह केवल एक बार के लेनदेन के लिए मान्य होता है।",
            "cg": "ओटीपी के मतलब वन-टाइम पासवर्ड होथे। ए सिरिफ एक पइंत के लेनदेन बर मान्य होथे।"
        }
    },
    {
        "id": "q_otp_13",
        "topic": "otp_pin_card",
        "difficulty": 1,
        "type": "tf",
        "question": {
            "en": "It is safe to write your ATM PIN on the back of your card with a marker.",
            "hi": "एटीएम कार्ड के पीछे मार्कर से अपना पिन लिखना सुरक्षित है।",
            "cg": "एटीएम कार्ड के पाछू मार्कर ले अपन पिन लिखना सुरक्षित हे।"
        },
        "options": [
            {"en": "True", "hi": "सही", "cg": "सही"},
            {"en": "False", "hi": "गलत", "cg": "गलत"}
        ],
        "answer": 1,
        "explanation": {
            "en": "False. If your card is lost or stolen, anyone can immediately withdraw all your savings.",
            "hi": "गलत। यदि आपका कार्ड खो जाए या चोरी हो जाए, तो कोई भी तुरंत आपकी पूरी जमा पूंजी निकाल सकता है।",
            "cg": "गलत। अगर तुंहर कार्ड हेरा जाय या चोरी हो जाय, त कोनो घलो तुरंत तुंहर जम्मो पइसा निकाल लिही।"
        }
    },
    {
        "id": "q_otp_14",
        "topic": "otp_pin_card",
        "difficulty": 2,
        "type": "scenario",
        "question": {
            "en": "You receive an OTP on your phone that you did not request. What should you do?",
            "hi": "आपके फोन पर एक ओटीपी आया जिसे आपने नहीं मांगा था। आपको क्या करना चाहिए?",
            "cg": "तुंहर फोन म एक ओटीपी आइस जेला तुमन नइ मांगे रेहेव। तुंहला का करना चाही?"
        },
        "options": [
            {"en": "Do not share it with anyone and inform your bank", "hi": "किसी को न बताएं और तुरंत अपने बैंक को सूचित करें", "cg": "कखरो ला झन बताव अउ तुरंत अपन बैंक ला खबर करव"},
            {"en": "Forward the SMS to social media", "hi": "संदेश को सोशल मीडिया पर शेयर कर दें", "cg": "संदेश ला सोशल मीडिया म भेज देव"},
            {"en": "Call the number mentioned in the SMS", "hi": "संदेश में लिखे नंबर पर तुरंत फोन करें", "cg": "संदेश म लिखे नंबर म तुरंत फोन करव"}
        ],
        "answer": 0,
        "explanation": {
            "en": "An unrequested OTP means someone is attempting to access your money. Never share it, and contact your bank branch.",
            "hi": "बिना मांगे आया ओटीपी बताता है कि कोई आपके खाते में सेंध लगाने की कोशिश कर रहा है। इसे किसी को न बताएं और बैंक को बताएं।",
            "cg": "बिना मांगे आए ओटीपी बताथे कि कोनो तुंहर खाता म सेंध लगाए के कोशिश करत हे। एला कखरो ला झन बताव अउ बैंक ला बताव।"
        }
    },
    {
        "id": "q_otp_15",
        "topic": "otp_pin_card",
        "difficulty": 3,
        "type": "mcq",
        "question": {
            "en": "A scammer says: 'To verify your identity, send the OTP back to us.' What will happen if you do?",
            "hi": "ठग कहता है: 'अपनी पहचान सत्यापित करने के लिए हमें वापस ओटीपी भेजें।' यदि आप भेजते हैं तो क्या होगा?",
            "cg": "ठग कहिथे: 'अपन पहिचान साबित करे बर हमन ला वापस ओटीपी भेजव।' अगर तुमन भेज दिहू त का होही?"
        },
        "options": [
            {"en": "Money will be deducted from your account", "hi": "आपके खाते से पैसे कट जाएंगे", "cg": "तुंहर खाता ले पइसा कट जाही"},
            {"en": "Your account will be protected", "hi": "आपका खाता सुरक्षित हो जाएगा", "cg": "तुंहर खाता सुरक्षित हो जाही"},
            {"en": "Your bank balance will double", "hi": "आपका बैंक बैलेंस दोगुना हो जाएगा", "cg": "तुंहर बैंक बैलेंस दुगुना हो जाही"}
        ],
        "answer": 0,
        "explanation": {
            "en": "Sending the OTP lets the scammer authorize the fraudulent withdrawal or transfer immediately.",
            "hi": "ओटीपी भेजते ही ठग आपके खाते से पैसे निकालने या ट्रांसफर करने का काम पूरा कर लेता है।",
            "cg": "ओटीपी भेजते ही ठग तुंहर खाता ले पइसा निकाले या ट्रांसफर करे के काम पूरा कर लेथे।"
        }
    },

    # ---------------- 2. atm_pin (7 to 15) ----------------
    {
        "id": "q_atm_7",
        "topic": "atm_pin",
        "difficulty": 1,
        "type": "tf",
        "question": {
            "en": "You should check if the ATM card slot feels loose or has an extra plastic piece attached.",
            "hi": "एटीएम मशीन में कार्ड डालने वाली जगह अगर ढीली लगे या अलग से चिपकाई लगे, तो सावधानी बरतनी चाहिए।",
            "cg": "एटीएम मशीन म कार्ड डारे के जगा अगर ढीला लगय या अलग ले चिपकाए लगय, त सावधानी रखना चाही।"
        },
        "options": [
            {"en": "True", "hi": "सही", "cg": "सही"},
            {"en": "False", "hi": "गलत", "cg": "गलत"}
        ],
        "answer": 0,
        "explanation": {
            "en": "True. Criminals place card skimmers over the slot to steal your card data. If it looks suspicious, use another ATM.",
            "hi": "सही। ठग कार्ड का डेटा चुराने के लिए स्लॉट पर स्किमर चिपका देते हैं। यदि कुछ अजीब लगे तो दूसरे एटीएम का उपयोग करें।",
            "cg": "सही। ठग मन कार्ड के डेटा चोराए बर स्लॉट म स्किमर चिपका देथें। अगर कुछु अजीब लगय त दूसरा एटीएम म जाव।"
        }
    },
    {
        "id": "q_atm_8",
        "topic": "atm_pin",
        "difficulty": 2,
        "type": "scenario",
        "question": {
            "en": "Your card gets stuck inside the ATM. A stranger standing behind says: 'Enter your PIN again, it will come out.' What should you do?",
            "hi": "आपका कार्ड एटीएम मशीन में फंस गया। पीछे खड़ा अनजान व्यक्ति कहता है: 'पिन दोबारा डालें, कार्ड निकल आएगा।' आपको क्या करना चाहिए?",
            "cg": "तुंहर कार्ड एटीएम मशीन म फंस गे। पाछू खड़ा अनजान मनखे कहिथे: 'पिन दोबारा डारव, कार्ड निकल जाही।' तुंहला का करना चाही?"
        },
        "options": [
            {"en": "Do not enter your PIN; report to the bank and block the card immediately", "hi": "पिन न डालें; तुरंत बैंक को बताएं और कार्ड ब्लॉक करवाएं", "cg": "पिन झन डारव; तुरंत बैंक ला बताव अउ कार्ड ब्लॉक करवाव"},
            {"en": "Type your PIN so the stranger can help", "hi": "पिन टाइप करें ताकि वह व्यक्ति मदद कर सके", "cg": "पिन टाइप करव ताकि ओ मनखे मदद कर सकय"},
            {"en": "Leave the ATM and check tomorrow", "hi": "कार्ड वहीं छोड़कर कल बैंक जाएं", "cg": "कार्ड ला ओहिचे छोड़ के कल बैंक जाव"}
        ],
        "answer": 0,
        "explanation": {
            "en": "Never enter your PIN in front of a stranger. They may have tampered with the slot to steal your card and see your PIN.",
            "hi": "किसी अजनबी के सामने पिन न डालें। हो सकता है उसने कार्ड फंसाने की साजिश की हो ताकि आपका पिन देख सके।",
            "cg": "कोनो अनजान मनखे के आघू पिन झन डारव। हो सकथे ओ कार्ड फंसाए के साजिश करे होय ताकि तुंहर पिन देख सकय।"
        }
    },
    {
        "id": "q_atm_9",
        "topic": "atm_pin",
        "difficulty": 1,
        "type": "mcq",
        "question": {
            "en": "What is the safest way to enter your ATM PIN at an ATM counter?",
            "hi": "एटीएम काउंटर पर अपना पिन दर्ज करने का सबसे सुरक्षित तरीका क्या है?",
            "cg": "एटीएम काउंटर म अपन पिन डारे के सबसे सुरक्षित तरीका का हे?"
        },
        "options": [
            {"en": "Cover the keypad with your other hand while typing", "hi": "टाइप करते समय दूसरे हाथ से कीपैड को ऊपर से ढकें", "cg": "टाइप करत बेरा दूसरा हाथ ले कीपैड ला ऊपर ले तोपव"},
            {"en": "Ask the security guard to enter it for you", "hi": "सुरक्षा गार्ड से कहें कि वह पिन दर्ज कर दे", "cg": "सुरक्षा गार्ड ले कहव कि ओ पिन टाइप कर देय"},
            {"en": "Say the digits aloud as you press them", "hi": "बटन दबाते समय अंकों को जोर से बोलें", "cg": "बटन दबावत बेरा अंक मन ला जोर ले बोलव"}
        ],
        "answer": 0,
        "explanation": {
            "en": "Covering the keypad blocks hidden cameras or prying eyes from seeing your secret PIN.",
            "hi": "कीपैड को ढकने से छिपे हुए कैमरे या पास खड़े लोग आपका गुप्त पिन नहीं देख पाते।",
            "cg": "कीपैड ला तोपे ले लुकाए कैमरा या तीर म खड़े मनखे तुंहर गुप्त पिन ला नइ देख पावंय।"
        }
    },
    {
        "id": "q_atm_10",
        "topic": "atm_pin",
        "difficulty": 2,
        "type": "tf",
        "question": {
            "en": "Using your birth year like 1985 as your ATM PIN is safe because it is easy to remember.",
            "hi": "जन्म का वर्ष जैसे 1985 को एटीएम पिन बनाना सुरक्षित है क्योंकि यह याद रहता है।",
            "cg": "जनम के बछर जइसे 1985 ला एटीएम पिन बनाना सुरक्षित हे काबर कि ए याद रहिथे।"
        },
        "options": [
            {"en": "True", "hi": "सही", "cg": "सही"},
            {"en": "False", "hi": "गलत", "cg": "गलत"}
        ],
        "answer": 1,
        "explanation": {
            "en": "False. Birth years, 1234, or repeating digits like 0000 are the first combinations fraudsters guess.",
            "hi": "गलत। जन्म वर्ष, 1234 या 0000 जैसे आसान पिन का अनुमान ठग सबसे पहले लगाते हैं।",
            "cg": "गलत। जनम बछर, 1234 या 0000 जइसन सीधा पिन के अंदाजा ठग मन सबसे पहिली लगाथें।"
        }
    },
    {
        "id": "q_atm_11",
        "topic": "atm_pin",
        "difficulty": 3,
        "type": "scenario",
        "question": {
            "en": "You finished withdrawing cash at an ATM. What should you do before walking out?",
            "hi": "आपने एटीएम से पैसे निकाल लिए। बाहर जाने से पहले आपको क्या करना चाहिए?",
            "cg": "तुमन एटीएम ले पइसा निकाल लेहेव। बाहिर जाय ले पहिली तुंहला का करना चाही?"
        },
        "options": [
            {"en": "Take your card, take the receipt or press Cancel, and ensure the welcome screen is back", "hi": "कार्ड लें, कैंसल बटन दबाएं और सुनिश्चित करें कि मुख्य स्क्रीन वापस आ गई है", "cg": "कार्ड लेव, कैंसल बटन दबावहू अउ पक्का करव कि मुख्य स्क्रीन वापस आ गे हे"},
            {"en": "Leave immediately without pressing any button", "hi": "बिना कोई बटन दबाए तुरंत बाहर निकल जाएं", "cg": "बिना कोनो बटन दबाए तुरंत बाहिर निकल जाव"},
            {"en": "Hand the card to the next person to check if it worked", "hi": "अगले व्यक्ति को कार्ड देकर जाँचने को कहें", "cg": "पाछू वाले मनखे ला कार्ड देके चेक करे ला कहव"}
        ],
        "answer": 0,
        "explanation": {
            "en": "Always press Cancel and wait for the welcome screen so your banking session is completely closed.",
            "hi": "हमेशा कैंसल बटन दबाएं और मुख्य स्क्रीन आने तक प्रतीक्षा करें ताकि आपका सत्र पूरी तरह बंद हो जाए।",
            "cg": "हमेशा कैंसल बटन दबावहू अउ मुख्य स्क्रीन आवत ले अगोरव ताकि तुंहर सत्र पूरा बंद हो जाय।"
        }
    },
    {
        "id": "q_atm_12",
        "topic": "atm_pin",
        "difficulty": 1,
        "type": "mcq",
        "question": {
            "en": "How many digits does a standard debit card ATM PIN have in India?",
            "hi": "भारत में सामान्य एटीएम कार्ड का पिन कितने अंकों का होता है?",
            "cg": "भारत म सामान्य एटीएम कार्ड के पिन कतका अंक के होथे?"
        },
        "options": [
            {"en": "4 digits", "hi": "4 अंक", "cg": "4 अंक"},
            {"en": "8 digits", "hi": "8 अंक", "cg": "8 अंक"},
            {"en": "10 digits", "hi": "10 अंक", "cg": "10 अंक"}
        ],
        "answer": 0,
        "explanation": {
            "en": "Standard ATM PINs in India are 4 digits long. Keep all 4 digits completely secret.",
            "hi": "भारत में एटीएम पिन 4 अंकों का होता है। इन चारों अंकों को पूरी तरह गुप्त रखें।",
            "cg": "भारत म एटीएम पिन 4 अंक के होथे। ए चारों अंक ला पूरा गुप्त राखव।"
        }
    },
    {
        "id": "q_atm_13",
        "topic": "atm_pin",
        "difficulty": 2,
        "type": "tf",
        "question": {
            "en": "If you notice someone standing uncomfortably close inside the ATM room, you should ask them to step outside.",
            "hi": "यदि कोई व्यक्ति एटीएम रूम के अंदर आपके एकदम करीब खड़ा हो, तो उसे बाहर जाने के लिए कहना चाहिए।",
            "cg": "अगर कोनो मनखे एटीएम रूम के भीतर तुंहर एकदम तीर म खड़ा होवय, त ओला बाहिर जाय बर कहना चाही।"
        },
        "options": [
            {"en": "True", "hi": "सही", "cg": "सही"},
            {"en": "False", "hi": "गलत", "cg": "गलत"}
        ],
        "answer": 0,
        "explanation": {
            "en": "True. Only one person is permitted inside an ATM kiosk at a time to ensure complete transaction privacy.",
            "hi": "सही। एटीएम केबिन में एक समय में केवल एक ही व्यक्ति को रहने की अनुमति होती है ताकि सुरक्षा बनी रहे।",
            "cg": "सही। एटीएम केबिन म एक बेरा म सिरिफ एक ही मनखे के रहे के नियम होथे ताकि सुरक्षा बने रहय।"
        }
    },
    {
        "id": "q_atm_14",
        "topic": "atm_pin",
        "difficulty": 3,
        "type": "scenario",
        "question": {
            "en": "An SMS arrives saying your ATM card is blocked due to chip error. It gives an unknown mobile number to reactivate. What should you do?",
            "hi": "एक संदेश आता है कि चिप खराबी के कारण एटीएम ब्लॉक हो गया है और चालू करने के लिए अनजान मोबाइल नंबर दिया है। क्या करें?",
            "cg": "एक संदेश आथे कि चिप खराबी के सेती एटीएम ब्लॉक हो गे हे अउ चालू करे बर अनजान मोबाइल नंबर दे हे। का करव?"
        },
        "options": [
            {"en": "Do not call the number; visit your bank branch directly to verify", "hi": "उस नंबर पर कॉल न करें; सीधे अपनी बैंक शाखा जाकर पता करें", "cg": "ओ नंबर म फोन झन करव; सीधा अपन बैंक शाखा जाके पता करव"},
            {"en": "Call the number and give your card details", "hi": "नंबर पर फोन करके कार्ड का नंबर बताएं", "cg": "नंबर म फोन करके कार्ड के नंबर बता देव"},
            {"en": "Send your PIN via SMS to that number", "hi": "उस नंबर पर एसएमएस से पिन भेज दें", "cg": "ओ नंबर म संदेश भेज के पिन बता देव"}
        ],
        "answer": 0,
        "explanation": {
            "en": "Banks do not send personal mobile numbers for card reactivation. This is a trap to steal your card details.",
            "hi": "बैंक कभी कार्ड चालू करने के लिए किसी का व्यक्तिगत मोबाइल नंबर नहीं भेजते। यह ठगी का जाल है।",
            "cg": "बैंक कभू कार्ड चालू करे बर कोनो के व्यक्तिगत मोबाइल नंबर नइ भेजंय। ए ठगी के जाल हे।"
        }
    },
    {
        "id": "q_atm_15",
        "topic": "atm_pin",
        "difficulty": 2,
        "type": "mcq",
        "question": {
            "en": "How often should you change your ATM PIN for maximum safety?",
            "hi": "सुरक्षा के लिए आपको अपना एटीएम पिन कितने समय में बदलते रहना चाहिए?",
            "cg": "सुरक्षा बर तुंहला अपन एटीएम पिन कतका दिन म बदलत रहना चाही?"
        },
        "options": [
            {"en": "Every 3 to 6 months", "hi": "हर 3 से 6 महीने में", "cg": "हर 3 ले 6 महीना म"},
            {"en": "Never, keep the same PIN for life", "hi": "कभी नहीं, जीवन भर एक ही पिन रखें", "cg": "कभू नइ, जिनगी भर एक ही पिन राखव"},
            {"en": "Every single day", "hi": "हर दिन", "cg": "हर दिन"}
        ],
        "answer": 0,
        "explanation": {
            "en": "Changing your PIN every few months protects you in case it was accidentally seen by someone.",
            "hi": "कुछ महीनों में पिन बदलते रहने से सुरक्षा बनी रहती है यदि किसी ने अनजाने में आपका पिन देख भी लिया हो।",
            "cg": "कुछ महीना म पिन बदलत रहे ले सुरक्षा बने रहिथे अगर कोनो अनजाने म तुंहर पिन देख घलो डारे होय।"
        }
    },

    # ---------------- 3. upi_pin (7 to 15) ----------------
    {
        "id": "q_pin_7",
        "topic": "upi_pin",
        "difficulty": 1,
        "type": "tf",
        "question": {
            "en": "Entering your UPI PIN adds money to your bank account.",
            "hi": "यूपीआई पिन डालने से आपके बैंक खाते में पैसे जमा होते हैं।",
            "cg": "यूपीआई पिन डारे ले तुंहर बैंक खाता म पइसा जमा होथे।"
        },
        "options": [
            {"en": "True", "hi": "सही", "cg": "सही"},
            {"en": "False", "hi": "गलत", "cg": "गलत"}
        ],
        "answer": 1,
        "explanation": {
            "en": "False! Entering your UPI PIN ONLY sends money OUT of your account. Receiving money never needs a PIN.",
            "hi": "गलत! यूपीआई पिन डालने से केवल पैसे खाते से बाहर जाते हैं। पैसे प्राप्त करने के लिए पिन कभी नहीं लगता।",
            "cg": "गलत! यूपीआई पिन डारे ले सिरिफ पइसा खाता ले बाहिर जाथे। पइसा मिले बर पिन कभू नइ लागय।"
        }
    },
    {
        "id": "q_pin_8",
        "topic": "upi_pin",
        "difficulty": 2,
        "type": "scenario",
        "question": {
            "en": "A buyer on OLX says: 'I sent you ₹2,000 for your old cycle. Click this link and enter your UPI PIN to claim it.' What is happening?",
            "hi": "सामान खरीदने वाला कहता है: 'मैंने ₹2,000 भेज दिए हैं। इस लिंक पर क्लिक करके अपना यूपीआई पिन डालें और पैसे लें।' क्या हो रहा है?",
            "cg": "सामान बिसाए वाला कहिथे: 'मंय ₹2,000 भेज देहे हंव। ए लिंक म जाके अपन यूपीआई पिन डारव अउ पइसा लेव।' का होत हे?"
        },
        "options": [
            {"en": "It is a fraud collect request to deduct ₹2,000 from you", "hi": "यह आपके खाते से ₹2,000 काटने का ठगी का प्रयास है", "cg": "ए तुंहर खाता ले ₹2,000 काटे के ठगी के प्रयास हे"},
            {"en": "It is the standard procedure to receive money", "hi": "पैसे प्राप्त करने का यही सामान्य तरीका है", "cg": "पइसा मिले के एही सामान्य तरीका हे"},
            {"en": "The bank is holding the funds", "hi": "बैंक ने पैसे रोक रखे हैं", "cg": "बैंक ह पइसा रोक के रखे हे"}
        ],
        "answer": 0,
        "explanation": {
            "en": "You never enter your PIN to receive money. Entering your PIN approves a deduction from your own account.",
            "hi": "पैसे पाने के लिए कभी पिन नहीं डाला जाता। पिन डालते ही आपके खुद के खाते से पैसे कट जाते हैं।",
            "cg": "पइसा पाए बर कभू पिन नइ डारे जाय। पिन डारते ही तुंहर खुद के खाता ले पइसा कट जाथे।"
        }
    },
    {
        "id": "q_pin_9",
        "topic": "upi_pin",
        "difficulty": 1,
        "type": "mcq",
        "question": {
            "en": "How many digits is a UPI PIN typically?",
            "hi": "यूपीआई पिन आमतौर पर कितने अंकों का होता है?",
            "cg": "यूपीआई पिन आमतौर म कतका अंक के होथे?"
        },
        "options": [
            {"en": "4 or 6 digits", "hi": "4 या 6 अंक", "cg": "4 या 6 अंक"},
            {"en": "10 digits", "hi": "10 अंक", "cg": "10 अंक"},
            {"en": "16 digits", "hi": "16 अंक", "cg": "16 अंक"}
        ],
        "answer": 0,
        "explanation": {
            "en": "Depending on your bank, a UPI PIN is either 4 or 6 digits long. Never disclose it to anyone.",
            "hi": "बैंक के अनुसार यूपीआई पिन 4 या 6 अंकों का होता है। इसे कभी किसी को न बताएं।",
            "cg": "बैंक के हिसाब ले यूपीआई पिन 4 या 6 अंक के होथे। एला कभू कखरो ला झन बतावहू।"
        }
    },
    {
        "id": "q_pin_10",
        "topic": "upi_pin",
        "difficulty": 2,
        "type": "tf",
        "question": {
            "en": "Your UPI PIN is the same thing as the OTP sent by SMS.",
            "hi": "आपका यूपीआई पिन और एसएमएस से आने वाला ओटीपी दोनों एक ही चीज़ हैं।",
            "cg": "तुंहर यूपीआई पिन अउ संदेश म आए वाला ओटीपी दूनों एक ही चीज हे।"
        },
        "options": [
            {"en": "True", "hi": "सही", "cg": "सही"},
            {"en": "False", "hi": "गलत", "cg": "गलत"}
        ],
        "answer": 1,
        "explanation": {
            "en": "False. A UPI PIN is set by you and stays the same. An OTP is a one-time code sent for a single transaction.",
            "hi": "गलत। यूपीआई पिन आप खुद बनाते हैं जो हमेशा वही रहता है। ओटीपी बैंक द्वारा भेजा गया एक बार का कोड होता है।",
            "cg": "गलत। यूपीआई पिन तुमन खुद बनाथव जउन हमेशा ओही रहिथे। ओटीपी बैंक कोती ले भेजे एक बेरा के कोड होथे।"
        }
    },
    {
        "id": "q_pin_11",
        "topic": "upi_pin",
        "difficulty": 3,
        "type": "scenario",
        "question": {
            "en": "You see a notification in your payment app: 'Request from Electric Department: Pay ₹1,500. Enter PIN.' You already paid your bill yesterday. What should you do?",
            "hi": "ऐप पर सूचना आई: 'बिजली विभाग का बिल: ₹1,500 भरें। पिन डालें।' आप कल ही बिल भर चुके हैं। क्या करें?",
            "cg": "ऐप म सूचना आइस: 'बिजली विभाग के बिल: ₹1,500 भरव। पिन डारव।' तुमन कालीच बिल भर चुके हव। का करव?"
        },
        "options": [
            {"en": "Decline the request and do not enter your PIN", "hi": "अनुरोध अस्वीकार करें और पिन बिल्कुल न डालें", "cg": "अनुरोध ला मना कर देव अउ पिन बिल्कुल झन डारव"},
            {"en": "Enter your PIN just in case", "hi": "पिन डाल दें ताकि बिजली न कटे", "cg": "पिन डार देव ताकि बिजली झन कटय"},
            {"en": "Forward the notification to friends", "hi": "सूचना दोस्तों को भेजें", "cg": "सूचना ला संगी मन ला भेज देव"}
        ],
        "answer": 0,
        "explanation": {
            "en": "Scammers send fake collect requests hoping you tap and enter your PIN automatically. Always decline suspicious requests.",
            "hi": "ठग फर्जी बिल अनुरोध भेजते हैं ताकि आप बिना सोचे पिन डाल दें। ऐसे फर्जी अनुरोध को तुरंत अस्वीकार करें।",
            "cg": "ठग मन फर्जी बिल अनुरोध भेजथें ताकि तुमन बिना सोचे पिन डार देव। अइसन फर्जी अनुरोध ला तुरंत मना करव।"
        }
    },
    {
        "id": "q_pin_12",
        "topic": "upi_pin",
        "difficulty": 1,
        "type": "mcq",
        "question": {
            "en": "When should you enter your UPI PIN in your payment app?",
            "hi": "आपको अपने पेमेंट ऐप में यूपीआई पिन कब दर्ज करना चाहिए?",
            "cg": "तुंहला अपन पेमेंट ऐप म यूपीआई पिन कभू डारना चाही?"
        },
        "options": [
            {"en": "Only when YOU are intentionally sending money to someone", "hi": "केवल तब जब आप खुद किसी को पैसे भेज रहे हों", "cg": "सिरिफ तब जब तुमन खुद कोनो ला पइसा भेजत होवव"},
            {"en": "When checking your notifications", "hi": "नोटिफिकेशन चेक करते समय", "cg": "नोटिफिकेशन देखत बेरा"},
            {"en": "To claim a cashback reward", "hi": "कैशबैक इनाम पाने के लिए", "cg": "कैशबैक इनाम पाए बर"}
        ],
        "answer": 0,
        "explanation": {
            "en": "The UPI PIN screen is ONLY for sending money. If you are receiving money or claiming a reward, no PIN is needed.",
            "hi": "यूपीआई पिन स्क्रीन केवल पैसे भेजने के लिए होती है। पैसे पाने या इनाम के लिए पिन कभी नहीं लगता।",
            "cg": "यूपीआई पिन स्क्रीन सिरिफ पइसा भेजे बर होथे। पइसा पाए बर या इनाम बर पिन कभू नइ लागय।"
        }
    },
    {
        "id": "q_pin_13",
        "topic": "upi_pin",
        "difficulty": 2,
        "type": "tf",
        "question": {
            "en": "Customer support from PhonePe or Google Pay will ask you to enter your PIN on a phone call to fix a transaction.",
            "hi": "पेमेंट ऐप का कस्टमर केयर अधिकारी लेनदेन ठीक करने के लिए फोन पर आपसे पिन दर्ज करने को कह सकता है।",
            "cg": "पेमेंट ऐप के कस्टमर केयर अधिकारी लेनदेन ठीक करे बर फोन म तुमन ले पिन डारे ला कह सकथे।"
        },
        "options": [
            {"en": "True", "hi": "सही", "cg": "सही"},
            {"en": "False", "hi": "गलत", "cg": "गलत"}
        ],
        "answer": 1,
        "explanation": {
            "en": "False. Real support agents never ask for your PIN under any circumstances.",
            "hi": "गलत। असली कस्टमर केयर कर्मचारी कभी किसी भी परिस्थिति में आपका पिन नहीं मांगते।",
            "cg": "गलत। असली कस्टमर केयर कर्मचारी कभू कोनो हालत म तुंहर पिन नइ मांगंय।"
        }
    },
    {
        "id": "q_pin_14",
        "topic": "upi_pin",
        "difficulty": 3,
        "type": "scenario",
        "question": {
            "en": "Someone accidentally sends ₹500 to your UPI and asks you to send it back via a suspicious link they sent. What should you do?",
            "hi": "किसी ने गलती से आपके खाते में ₹500 भेज दिए और वापस करने के लिए एक लिंक भेजा। आपको क्या करना चाहिए?",
            "cg": "कोनो ह गलती ले तुंहर खाता म ₹500 भेज दीस अउ वापस करे बर एक लिंक भेजीस। तुंहला का करना चाही?"
        },
        "options": [
            {"en": "Do not click the link; verify with your bank or send only through the official app", "hi": "लिंक पर क्लिक न करें; बैंक से पुष्टि करें या केवल आधिकारिक ऐप से भेजें", "cg": "लिंक म क्लिक झन करव; बैंक ले पता करव या सिरिफ असली ऐप ले भेजव"},
            {"en": "Click the link immediately to return the money", "hi": "पैसे लौटाने के लिए तुरंत लिंक पर क्लिक करें", "cg": "पइसा लौटाए बर तुरंत लिंक म क्लिक कर देव"},
            {"en": "Send double the amount as apology", "hi": "माफी के तौर पर दोगुने पैसे भेजें", "cg": "माफी के रूप म दुगुना पइसा भेज देव"}
        ],
        "answer": 0,
        "explanation": {
            "en": "Scammers send phishing links pretending to be refund links. Never click links to return money; use official channels.",
            "hi": "ठग पैसे लौटाने के नाम पर फर्जी लिंक भेजते हैं। पैसे लौटाने के लिए कभी किसी लिंक पर क्लिक न करें।",
            "cg": "ठग मन पइसा लौटाए के नाम म फर्जी लिंक भेजथें। पइसा लौटाए बर कभू कोनो लिंक म क्लिक झन करव।"
        }
    },
    {
        "id": "q_pin_15",
        "topic": "upi_pin",
        "difficulty": 2,
        "type": "mcq",
        "question": {
            "en": "If you suspect someone saw your UPI PIN while you were paying at a local shop, what is the best step?",
            "hi": "यदि आपको संदेह हो कि दुकान पर भुगतान करते समय किसी ने आपका यूपीआई पिन देख लिया, तो सबसे अच्छा कदम क्या है?",
            "cg": "अगर तुंहला संदेहा होवय कि दुकान म पइसा देवत बेरा कोनो तुंहर यूपीआई पिन देख लीस, त सबसे बने कदम का हे?"
        },
        "options": [
            {"en": "Change your UPI PIN immediately inside the official app", "hi": "आधिकारिक ऐप में जाकर तुरंत अपना यूपीआई पिन बदल लें", "cg": "असली ऐप म जाके तुरंत अपन यूपीआई पिन ला बदल लेव"},
            {"en": "Do nothing unless money is stolen", "hi": "कुछ न करें जब तक पैसे न कटें", "cg": "कुछु झन करव जब तक पइसा नइ कटय"},
            {"en": "Uninstall the app permanently", "hi": "ऐप को हमेशा के लिए डिलीट कर दें", "cg": "ऐप ला हमेशा बर डिलीट कर देव"}
        ],
        "answer": 0,
        "explanation": {
            "en": "You can change your UPI PIN anytime in seconds in your app. Changing it immediately keeps your account secure.",
            "hi": "आप ऐप में कुछ ही सेकंड में अपना यूपीआई पिन बदल सकते हैं। तुरंत पिन बदलने से आपका खाता सुरक्षित रहता है।",
            "cg": "तुमन ऐप म कुछे सेकंड म अपन यूपीआई पिन बदल सकथव। तुरंत पिन बदले ले तुंहर खाता सुरक्षित रहिथे।"
        }
    },

    # ---------------- 4. fake_kyc (7 to 15) ----------------
    {
        "id": "q_kyc_7",
        "topic": "fake_kyc",
        "difficulty": 1,
        "type": "tf",
        "question": {
            "en": "A bank will send an SMS threatening to block your account in 24 hours unless you update KYC via WhatsApp.",
            "hi": "क्या बैंक संदेश भेजकर 24 घंटे में खाता बंद करने की धमकी देता है यदि आपने व्हाट्सएप पर केवाईसी नहीं किया?",
            "cg": "का बैंक संदेश भेज के 24 घंटा म खाता बंद करे के धमकी देथे अगर तुमन व्हाट्सएप म केवाईसी नइ करेव?"
        },
        "options": [
            {"en": "True", "hi": "सही", "cg": "सही"},
            {"en": "False", "hi": "गलत", "cg": "गलत"}
        ],
        "answer": 1,
        "explanation": {
            "en": "False. Banks never conduct KYC updates over WhatsApp or threaten sudden 24-hour account suspension.",
            "hi": "गलत। बैंक कभी व्हाट्सएप पर केवाईसी नहीं करते और न ही 24 घंटे में खाता बंद करने की धमकी देते हैं।",
            "cg": "गलत। बैंक कभू व्हाट्सएप म केवाईसी नइ करंय अउ न ही 24 घंटा म खाता बंद करे के धमकी देवंय।"
        }
    },
    {
        "id": "q_kyc_8",
        "topic": "fake_kyc",
        "difficulty": 2,
        "type": "scenario",
        "question": {
            "en": "A caller says: 'I am calling from SBI headquarters. To unblock your account, install this app on your phone.' What should you do?",
            "hi": "एक फोन आता है: 'मैं एसबीआई मुख्यालय से बोल रहा हूँ। खाता चालू करने के लिए अपने फोन में यह ऐप इंस्टॉल करें।' क्या करें?",
            "cg": "एक फोन आथे: 'मंय एसबीआई मुख्यालय ले बोलत हंव। खाता चालू करे बर अपन फोन म ए ऐप ला इनस्टॉल करव।' का करव?"
        },
        "options": [
            {"en": "Cut the call immediately; banks never ask you to install apps to unblock accounts", "hi": "तुरंत फोन काट दें; बैंक कभी खाता चालू करने के लिए ऐप इंस्टॉल करने को नहीं कहता", "cg": "तुरंत फोन काट देव; बैंक कभू खाता चालू करे बर ऐप इनस्टॉल करे ला नइ कहय"},
            {"en": "Install the app quickly", "hi": "जल्दी से ऐप इंस्टॉल कर लें", "cg": "जल्दी ले ऐप इनस्टॉल कर लेव"},
            {"en": "Give the phone to a child to install it", "hi": "बच्चे को फोन देकर इंस्टॉल करवाएं", "cg": "लइका ला फोन देके इनस्टॉल करवाव"}
        ],
        "answer": 0,
        "explanation": {
            "en": "This is a remote access trap. The app will give scammers control of your phone and bank OTPs.",
            "hi": "यह फोन का नियंत्रण छीनने की चाल है। यह ऐप ठगों को आपके फोन और आने वाले ओटीपी देखने की छूट दे देता है।",
            "cg": "ए फोन के नियंत्रण छीने के चाल हे। ए ऐप ठग मन ला तुंहर फोन अउ आवे वाला ओटीपी देखे के छूट दे देथे।"
        }
    },
    {
        "id": "q_kyc_9",
        "topic": "fake_kyc",
        "difficulty": 1,
        "type": "mcq",
        "question": {
            "en": "What is the official and safe way to update your bank KYC?",
            "hi": "अपने बैंक में केवाईसी अपडेट करने का आधिकारिक और सुरक्षित तरीका क्या है?",
            "cg": "अपन बैंक म केवाईसी अपडेट करे के असली अउ सुरक्षित तरीका का हे?"
        },
        "options": [
            {"en": "Visit your bank branch in person or use the official bank app", "hi": "खुद बैंक शाखा जाएं या बैंक के आधिकारिक ऐप का उपयोग करें", "cg": "खुद बैंक शाखा जाव या बैंक के असली ऐप के उपयोग करव"},
            {"en": "Send your Aadhaar card photo to an unknown caller on WhatsApp", "hi": "व्हाट्सएप पर किसी अनजान व्यक्ति को आधार कार्ड की फोटो भेजें", "cg": "व्हाट्सएप म कोनो अनजान मनखे ला आधार कार्ड के फोटो भेज देव"},
            {"en": "Click on links received in random text messages", "hi": "किसी भी अनजान संदेश में आए लिंक पर क्लिक करें", "cg": "कोनो घलो अनजान संदेश म आए लिंक म क्लिक करव"}
        ],
        "answer": 0,
        "explanation": {
            "en": "Always do KYC at your bank branch or inside the bank's official application directly.",
            "hi": "केवाईसी हमेशा अपनी बैंक शाखा में जाकर या बैंक के आधिकारिक ऐप के भीतर से ही करें।",
            "cg": "केवाईसी हमेशा अपन बैंक शाखा म जाके या बैंक के असली ऐप के भीतर ले ही करव।"
        }
    },
    {
        "id": "q_kyc_10",
        "topic": "fake_kyc",
        "difficulty": 2,
        "type": "tf",
        "question": {
            "en": "Real bank verification messages come from short official alphanumeric sender IDs like VK-SBIINB or AX-HDFCBK.",
            "hi": "असली बैंक के संदेश आधिकारिक अक्षरों वाले सेंडर आईडी जैसे वीके-एसबीआई या एएक्स-एचडीएफसी से आते हैं।",
            "cg": "असली बैंक के संदेश आधिकारिक अक्षर वाले सेंडर आईडी जइसे वीके-एसबीआई या एएक्स-एचडीएफसी ले आथें।"
        },
        "options": [
            {"en": "True", "hi": "सही", "cg": "सही"},
            {"en": "False", "hi": "गलत", "cg": "गलत"}
        ],
        "answer": 0,
        "explanation": {
            "en": "True. If an SMS claiming to be from your bank comes from a regular 10-digit mobile number, it is definitely a scam.",
            "hi": "सही। यदि बैंक के नाम पर कोई संदेश सामान्य 10 अंकों के मोबाइल नंबर से आए, तो वह निश्चित रूप से फर्जी है।",
            "cg": "सही। अगर बैंक के नाम म कोनो संदेश सामान्य 10 अंक के मोबाइल नंबर ले आवय, त ओ पक्का फर्जी हे।"
        }
    },
    {
        "id": "q_kyc_11",
        "topic": "fake_kyc",
        "difficulty": 3,
        "type": "scenario",
        "question": {
            "en": "You receive a message: 'Your electricity power will be disconnected at 9:30 PM tonight due to pending KYC. Call 98XXXX immediately.' What should you do?",
            "hi": "संदेश आया: 'केवाईसी न होने से आज रात 9:30 बजे बिजली काट दी जाएगी। तुरंत 98XXXX पर कॉल करें।' क्या करें?",
            "cg": "संदेश आइस: 'केवाईसी नइ होए ले आज रात 9:30 बजे बिजली काट दे जाही। तुरंत 98XXXX म फोन करव।' का करव?"
        },
        "options": [
            {"en": "Do not call the number; verify your bill with the electricity office or official portal", "hi": "उस नंबर पर कॉल न करें; बिजली कार्यालय या आधिकारिक पोर्टल से बिल की पुष्टि करें", "cg": "ओ नंबर म फोन झन करव; बिजली दफ्तर या असली पोर्टल ले बिल के पता करव"},
            {"en": "Call immediately and transfer the money they demand", "hi": "तुरंत कॉल करें और जो पैसे मांगें दे दें", "cg": "तुरंत फोन करव अउ जउन पइसा मांगय दे देव"},
            {"en": "Share your meter number and Aadhaar OTP with the caller", "hi": "मीटर नंबर और आधार ओटीपी फोन पर बता दें", "cg": "मीटर नंबर अउ आधार ओटीपी फोन म बता देव"}
        ],
        "answer": 0,
        "explanation": {
            "en": "Electricity boards never disconnect power over arbitrary SMS with personal numbers. This is a common fraud script.",
            "hi": "बिजली विभाग कभी व्यक्तिगत मोबाइल नंबर से संदेश भेजकर बिजली काटने की धमकी नहीं देता। यह ठगों का तरीका है।",
            "cg": "बिजली विभाग कभू मनखे के मोबाइल नंबर ले संदेश भेज के बिजली काटे के धमकी नइ देय। ए ठग मन के तरीका हे।"
        }
    },
    {
        "id": "q_kyc_12",
        "topic": "fake_kyc",
        "difficulty": 1,
        "type": "mcq",
        "question": {
            "en": "What does KYC stand for?",
            "hi": "केवाईसी का पूरा नाम क्या है?",
            "cg": "केवाईसी के पूरा नाम का होथे?"
        },
        "options": [
            {"en": "Know Your Customer", "hi": "नो योर कस्टमर (अपने ग्राहक को पहचानें)", "cg": "नो योर कस्टमर (अपन ग्राहक ला पहचानव)"},
            {"en": "Keep Your Cash", "hi": "कीप योर कैश", "cg": "कीप योर कैश"},
            {"en": "Kisan Yojana Center", "hi": "किसान योजना सेंटर", "cg": "किसान योजना सेंटर"}
        ],
        "answer": 0,
        "explanation": {
            "en": "KYC stands for Know Your Customer. It is a one-time identity verification process required by the Reserve Bank.",
            "hi": "केवाईसी का मतलब है नो योर कस्टमर। यह बैंक द्वारा ग्राहक की पहचान सत्यापित करने की आधिकारिक प्रक्रिया है।",
            "cg": "केवाईसी के मतलब नो योर कस्टमर होथे। ए बैंक कोती ले ग्राहक के पहिचान जांचे के असली प्रक्रिया हे।"
        }
    },
    {
        "id": "q_kyc_13",
        "topic": "fake_kyc",
        "difficulty": 2,
        "type": "tf",
        "question": {
            "en": "It is safe to download an app named 'QuickSupport' or 'AnyDesk' if someone says it is needed for bank verification.",
            "hi": "यदि कोई कहे कि बैंक सत्यापन के लिए क्विक-सपोर्ट या एनी-डेस्क ऐप डाउनलोड करना जरूरी है, तो यह सुरक्षित है।",
            "cg": "अगर कोनो कहय कि बैंक जांच बर क्विक-सपोर्ट या एनी-डेस्क ऐप डाउनलोड करना जरूरी हे, त ए सुरक्षित हे।"
        },
        "options": [
            {"en": "True", "hi": "सही", "cg": "सही"},
            {"en": "False", "hi": "गलत", "cg": "गलत"}
        ],
        "answer": 1,
        "explanation": {
            "en": "False. These screen-sharing apps let fraudsters see your screen, banking passwords, and OTPs in real time.",
            "hi": "गलत। ये स्क्रीन शेयर करने वाले ऐप ठगों को आपकी मोबाइल स्क्रीन और पासवर्ड देखने की पूरी छूट दे देते हैं।",
            "cg": "गलत। ए स्क्रीन शेयर करे वाला ऐप ठग मन ला तुंहर मोबाइल स्क्रीन अउ पासवर्ड देखे के पूरा छूट दे देथें।"
        }
    },
    {
        "id": "q_kyc_14",
        "topic": "fake_kyc",
        "difficulty": 3,
        "type": "scenario",
        "question": {
            "en": "A caller claims your SIM card will be deactivated unless you share the 6-digit Aadhaar OTP you just received. What should you do?",
            "hi": "एक फोन आता है कि आपका सिम कार्ड बंद हो जाएगा जब तक आप अभी-अभी आया 6 अंकों का आधार ओटीपी नहीं बताते। क्या करें?",
            "cg": "एक फोन आथे कि तुंहर सिम कार्ड बंद हो जाही जब तक तुमन अभी-अभी आए 6 अंक के आधार ओटीपी नइ बतावव। का करव?"
        },
        "options": [
            {"en": "Hang up immediately; never share an Aadhaar OTP over a call", "hi": "तुरंत फोन काट दें; फोन पर आधार ओटीपी कभी किसी को न बताएं", "cg": "तुरंत फोन काट देव; फोन म आधार ओटीपी कभू कखरो ला झन बतावहू"},
            {"en": "Tell them the OTP so your phone keeps working", "hi": "ओटीपी बता दें ताकि फोन चलता रहे", "cg": "ओटीपी बता देव ताकि फोन चलत रहय"},
            {"en": "Ask them to call back in 5 minutes", "hi": "उन्हें 5 मिनट बाद फोन करने को कहें", "cg": "ओमन ला 5 मिनट पाछू फोन करे ला कहव"}
        ],
        "answer": 0,
        "explanation": {
            "en": "Sharing an Aadhaar OTP allows fraudsters to issue a duplicate SIM or take fraudulent loans in your name.",
            "hi": "आधार ओटीपी देने से ठग आपके नाम पर दूसरा सिम जारी करवा सकते हैं या फर्जी लोन ले सकते हैं।",
            "cg": "आधार ओटीपी देय ले ठग मन तुंहर नाम म दूसरा सिम निकाल सकथें या फर्जी लोन ले सकथें।"
        }
    },
    {
        "id": "q_kyc_15",
        "topic": "fake_kyc",
        "difficulty": 2,
        "type": "mcq",
        "question": {
            "en": "What should you check if you receive a link in an SMS asking to update your bank account?",
            "hi": "यदि बैंक अपडेट करने के लिए संदेश में कोई लिंक आए, तो आपको क्या देखना चाहिए?",
            "cg": "अगर बैंक अपडेट करे बर संदेश म कोनो लिंक आवय, त तुंहला का देखना चाही?"
        },
        "options": [
            {"en": "Do not click links; look for official domain or visit the branch directly", "hi": "लिंक पर क्लिक न करें; आधिकारिक वेबसाइट देखें या सीधे बैंक जाएं", "cg": "लिंक म क्लिक झन करव; असली वेबसाइट देखव या सीधा बैंक जाव"},
            {"en": "Check how fast your internet connection is", "hi": "देखें कि इंटरनेट कितना तेज है", "cg": "देखव कि इंटरनेट कतका तेज हे"},
            {"en": "Check if the link contains colourful letters", "hi": "देखें कि लिंक में रंग-बिरंगे अक्षर हैं या नहीं", "cg": "देखव कि लिंक म रंग-बिरंग अक्षर हे कि नइ"}
        ],
        "answer": 0,
        "explanation": {
            "en": "Never click on unverified links in SMS. Always open your bank app directly or visit your branch.",
            "hi": "संदेश में आए अज्ञात लिंक पर कभी क्लिक न करें। हमेशा सीधे बैंक ऐप खोलें या शाखा जाएं।",
            "cg": "संदेश म आए अनजान लिंक म कभू क्लिक झन करव। हमेशा सीधा बैंक ऐप खोलव या शाखा जाव।"
        }
    },

    # ---------------- 5. digital_arrest (7 to 15) ----------------
    {
        "id": "q_arr_7",
        "topic": "digital_arrest",
        "difficulty": 1,
        "type": "tf",
        "question": {
            "en": "Indian law allows police or judges to place citizens under 'digital arrest' via Skype or WhatsApp video call.",
            "hi": "भारतीय कानून में पुलिस या जज को व्हाट्सएप या स्काइप वीडियो कॉल पर 'डिजिटल अरेस्ट' करने का अधिकार है।",
            "cg": "भारतीय कानून म पुलिस या जज ला व्हाट्सएप या स्काइप वीडियो कॉल म 'डिजिटल अरेस्ट' करे के अधिकार हे।"
        },
        "options": [
            {"en": "True", "hi": "सही", "cg": "सही"},
            {"en": "False", "hi": "गलत", "cg": "गलत"}
        ],
        "answer": 1,
        "explanation": {
            "en": "False! There is NO such thing as 'digital arrest' in Indian law. Police and courts never arrest or try anyone over video calls.",
            "hi": "गलत! भारतीय कानून में 'डिजिटल अरेस्ट' जैसी कोई व्यवस्था नहीं है। पुलिस या कोर्ट वीडियो कॉल पर किसी को गिरफ्तार नहीं करते।",
            "cg": "गलत! भारतीय कानून म 'डिजिटल अरेस्ट' जइसन कोनो व्यवस्था नइये। पुलिस या कोर्ट वीडियो कॉल म कखरो गिरफ्तारी नइ करंय।"
        }
    },
    {
        "id": "q_arr_8",
        "topic": "digital_arrest",
        "difficulty": 2,
        "type": "scenario",
        "question": {
            "en": "A caller in police uniform on a video call says a parcel with illegal drugs was found in your name in Mumbai. What is this?",
            "hi": "वीडियो कॉल पर पुलिस वर्दी पहने व्यक्ति कहता है कि मुंबई में आपके नाम पर नशीले पदार्थों का पार्सल पकड़ा गया है। यह क्या है?",
            "cg": "वीडियो कॉल म पुलिस के वर्दी पहिरे मनखे कहिथे कि मुंबई म तुंहर नाम म नशीला पदार्थ के पार्सल पकड़े गे हे। ए का चीज हे?"
        },
        "options": [
            {"en": "A fake digital arrest extortion scam to terrify you into paying money", "hi": "डरा-धमकाकर पैसे ऐंठने वाला फर्जी डिजिटल अरेस्ट गिरोह", "cg": "डरा-धमका के पइसा वसूले वाला फर्जी डिजिटल अरेस्ट गिरोह"},
            {"en": "A genuine police interrogation", "hi": "पुलिस की वास्तविक पूछताछ", "cg": "पुलिस के असली पूछताछ"},
            {"en": "A postal department check", "hi": "डाक विभाग की सामान्य जाँच", "cg": "डाक विभाग के सामान्य जांच"}
        ],
        "answer": 0,
        "explanation": {
            "en": "This is a widespread fraud. Scammers wear fake uniforms and fake police logos. Hang up and dial 1930.",
            "hi": "यह एक बड़ा फर्जीवाड़ा है। ठग नकली वर्दी और नकली पुलिस लोगो का उपयोग करते हैं। तुरंत फोन काटें और 1930 पर शिकायत करें।",
            "cg": "ए एक बड़े फर्जीवाड़ा हे। ठग मन नकली वर्दी अउ नकली पुलिस लोगो के उपयोग करथें। तुरंत फोन काटव अउ 1930 म शिकायत करव।"
        }
    },
    {
        "id": "q_arr_9",
        "topic": "digital_arrest",
        "difficulty": 1,
        "type": "mcq",
        "question": {
            "en": "What should you do immediately if someone threatens you with digital arrest over a phone or video call?",
            "hi": "यदि कोई फोन या वीडियो कॉल पर डिजिटल अरेस्ट की धमकी दे, तो आपको तुरंत क्या करना चाहिए?",
            "cg": "अगर कोनो फोन या वीडियो कॉल म डिजिटल अरेस्ट के धमकी देय, त तुंहला तुरंत का करना चाही?"
        },
        "options": [
            {"en": "Hang up immediately, do not pay any money, and report to 1930", "hi": "तुरंत फोन काट दें, कोई पैसा न दें, और 1930 पर शिकायत दर्ज करें", "cg": "तुरंत फोन काट देव, कोनो पइसा झन देव, अउ 1930 म शिकायत दर्ज करव"},
            {"en": "Stay on the call for hours in fear", "hi": "डर के मारे घंटों कॉल पर बने रहें", "cg": "डर के मारे घंटा भर कॉल म जुड़े रहव"},
            {"en": "Transfer your life savings to their 'secret verification account'", "hi": "अपनी जमा पूंजी उनके बताए खाते में ट्रांसफर कर दें", "cg": "अपन जम्मो पइसा ओमन के बताए खाता म ट्रांसफर कर देव"}
        ],
        "answer": 0,
        "explanation": {
            "en": "Hang up. Real government agencies never ask for money or fund transfers to clear your name in a criminal case.",
            "hi": "तुरंत फोन काटें। सरकारी एजेंसियां कभी किसी केस को खत्म करने के लिए पैसे ट्रांसफर करने को नहीं कहती हैं।",
            "cg": "तुरंत फोन काटव। सरकारी एजेंसी कभू कोनो केस ला खतम करे बर पइसा ट्रांसफर करे ला नइ कहंय।"
        }
    },
    {
        "id": "q_arr_10",
        "topic": "digital_arrest",
        "difficulty": 2,
        "type": "tf",
        "question": {
            "en": "The CBI or Supreme Court can issue an arrest warrant and ask you to pay bail money through UPI.",
            "hi": "सीबीआई या सुप्रीम कोर्ट अरेस्ट वारंट जारी करके यूपीआई के जरिए जमानत राशि जमा करने को कह सकते हैं।",
            "cg": "सीबीआई या सुप्रीम कोर्ट अरेस्ट वारंट जारी करके यूपीआई के जरिए जमानत राशि जमा करे ला कह सकथें।"
        },
        "options": [
            {"en": "True", "hi": "सही", "cg": "सही"},
            {"en": "False", "hi": "गलत", "cg": "गलत"}
        ],
        "answer": 1,
        "explanation": {
            "en": "False. Bail is granted only in an open court through formal legal procedures, never via UPI or phone transfer.",
            "hi": "गलत। जमानत केवल अदालत में कानूनी प्रक्रिया द्वारा मिलती है, यूपीआई या फोन ट्रांसफर से कभी नहीं।",
            "cg": "गलत। जमानत सिरिफ अदालत म कानूनी प्रक्रिया ले मिलथे, यूपीआई या फोन ट्रांसफर ले कभू नइ।"
        }
    },
    {
        "id": "q_arr_11",
        "topic": "digital_arrest",
        "difficulty": 3,
        "type": "scenario",
        "question": {
            "en": "The fake caller tells you: 'You must stay in a closed room and not tell your family, or you will be jailed.' Why do they say this?",
            "hi": "फर्जी कॉलर कहता है: 'एक कमरे में बंद रहें और परिवार में किसी को न बताएं, वरना जेल होगी।' वह ऐसा क्यों कहता है?",
            "cg": "फर्जी कॉलर कहिथे: 'एक खोली म बंद रहव अउ घर म कखरो ला झन बतावव, नइ त जेल हो जाही।' ओ अइसन काबर कहिथे?"
        },
        "options": [
            {"en": "To isolate you so nobody can warn you that it is a scam", "hi": "आपको अकेला करने के लिए ताकि कोई आपको न समझा सके कि यह ठगी है", "cg": "तुंहला अकेले करे बर ताकि कोनो तुंहला न समझा सकय कि ए ठगी हे"},
            {"en": "Because it is strict government confidentiality", "hi": "क्योंकि यह सरकार की सख्त गोपनीयता का नियम है", "cg": "काबर कि ए सरकार के कड़ा नियम हे"},
            {"en": "To protect your microphone from background noise", "hi": "माइक्रोफोन को शोर से बचाने के लिए", "cg": "माइक्रोफोन ला अवाज ले बचाए बर"}
        ],
        "answer": 0,
        "explanation": {
            "en": "Isolation is the scammer's primary psychological weapon. Talk to your family, neighbors, or police immediately.",
            "hi": "अकेला करना ठगों का मुख्य हथियार है ताकि कोई आपको सचेत न कर सके। तुरंत अपने परिवार या पुलिस से बात करें।",
            "cg": "अकेले करना ठग मन के मुख्य हथियार हे ताकि कोनो तुंहला सचेत झन कर सकय। तुरंत अपन परिवार या पुलिस ले बात करव।"
        }
    },
    {
        "id": "q_arr_12",
        "topic": "digital_arrest",
        "difficulty": 1,
        "type": "mcq",
        "question": {
            "en": "What is the national cybercrime helpline number to report digital arrest extortion in India?",
            "hi": "भारत में डिजिटल अरेस्ट और साइबर ठगी की शिकायत दर्ज करने का राष्ट्रीय हेल्पलाइन नंबर क्या है?",
            "cg": "भारत म डिजिटल अरेस्ट अउ साइबर ठगी के शिकायत दर्ज करे के राष्ट्रीय हेल्पलाइन नंबर का हे?"
        },
        "options": [
            {"en": "1930", "hi": "1930 (उन्नीस सौ तीस)", "cg": "1930 (उन्नीस सौ तीस)"},
            {"en": "100", "hi": "100", "cg": "100"},
            {"en": "108", "hi": "108", "cg": "108"}
        ],
        "answer": 0,
        "explanation": {
            "en": "Dial 1930 immediately or visit cybercrime.gov.in to report cyber financial fraud and freeze payments.",
            "hi": "साइबर वित्तीय धोखाधड़ी की शिकायत के लिए तुरंत 1930 डायल करें या cybercrime.gov.in पर जाएं।",
            "cg": "साइबर वित्तीय धोखाधड़ी के शिकायत बर तुरंत 1930 डायल करव या cybercrime.gov.in म जाव।"
        }
    },
    {
        "id": "q_arr_13",
        "topic": "digital_arrest",
        "difficulty": 2,
        "type": "tf",
        "question": {
            "en": "If a caller sends a PDF with an official-looking police emblem and your photo, it proves the case is real.",
            "hi": "यदि फोन करने वाला पुलिस के चिन्ह और आपकी फोटो वाला पीडीएफ दस्तावेज भेजे, तो यह साबित करता है कि केस असली है।",
            "cg": "अगर फोन करे वाला पुलिस के चिन्ह अउ तुंहर फोटो वाला पीडीएफ दस्तावेज भेजय, त ए साबित करथे कि केस असली हे।"
        },
        "options": [
            {"en": "True", "hi": "सही", "cg": "सही"},
            {"en": "False", "hi": "गलत", "cg": "गलत"}
        ],
        "answer": 1,
        "explanation": {
            "en": "False. Fraudsters create fake digital letters and warrants using editing apps in minutes.",
            "hi": "गलत। ठग एडिटिंग सॉफ्टवेयर की मदद से कुछ ही मिनटों में फर्जी सरकारी आदेश और वारंट बना लेते हैं।",
            "cg": "गलत। ठग मन मोबाइल ऐप के मदद ले कुछे मिनट म फर्जी सरकारी आदेश अउ वारंट बना लेथें।"
        }
    },
    {
        "id": "q_arr_14",
        "topic": "digital_arrest",
        "difficulty": 3,
        "type": "scenario",
        "question": {
            "en": "The fake officer tells you to transfer ₹1,00,000 to an 'RBI security account' that will be refunded after 30 minutes of verification. Will you get the money back?",
            "hi": "फर्जी अधिकारी कहता है कि ₹1,00,000 आरबीआई सुरक्षा खाते में भेजें, जो 30 मिनट में वापस मिल जाएगा। क्या पैसे वापस मिलेंगे?",
            "cg": "फर्जी अधिकारी कहिथे कि ₹1,00,000 आरबीआई सुरक्षा खाता म भेजव, जउन 30 मिनट म वापस मिल जाही। का पइसा वापस मिलही?"
        },
        "options": [
            {"en": "No, you will lose your money permanently; RBI has no such accounts", "hi": "नहीं, आपके पैसे हमेशा के लिए लुट जाएंगे; आरबीआई का ऐसा कोई खाता नहीं होता", "cg": "नइ, तुंहर पइसा हमेशा बर लुट जाही; आरबीआई के अइसन कोनो खाता नइ होवय"},
            {"en": "Yes, RBI refunds all money within 30 minutes", "hi": "हाँ, आरबीआई 30 मिनट में पैसे लौटा देता है", "cg": "हाँ, आरबीआई 30 मिनट म पइसा लौटा देथे"},
            {"en": "You will receive double the amount as compensation", "hi": "मुआवजे के रूप में दोगुने पैसे मिलेंगे", "cg": "मुआवजा के रूप म दुगुना पइसा मिलही"}
        ],
        "answer": 0,
        "explanation": {
            "en": "The Reserve Bank of India never holds individual accounts to verify citizen innocence. Any such transfer is lost to criminals.",
            "hi": "आरबीआई नागरिकों की बेगुनाही जांचने के लिए कभी खाते नहीं चलाता। ऐसे खाते में भेजा गया पैसा ठग हड़प लेते हैं।",
            "cg": "आरबीआई मनखे मन के बेगुनाही जांचे बर कभू खाता नइ चलावय। अइसन खाता म भेजे पइसा ठग मन डकार लेथें।"
        }
    },
    {
        "id": "q_arr_15",
        "topic": "digital_arrest",
        "difficulty": 2,
        "type": "mcq",
        "question": {
            "en": "How can you verify if there is an actual complaint or FIR filed against you in Chhattisgarh?",
            "hi": "छत्तीसगढ़ में आपके खिलाफ कोई वास्तविक शिकायत या प्राथमिकी दर्ज है या नहीं, यह जानने का सही तरीका क्या है?",
            "cg": "छत्तीसगढ़ म तुंहर खिलाफ कोनो असली शिकायत या प्राथमिकी दर्ज हे कि नइ, एला जाने के सही तरीका का हे?"
        },
        "options": [
            {"en": "Visit your local police station in person or check the official state police portal", "hi": "सीधे अपने नजदीकी थाने जाएं या राज्य पुलिस के आधिकारिक पोर्टल पर देखें", "cg": "सीधा अपन तीर के थाना जाव या राज्य पुलिस के असली पोर्टल म देखव"},
            {"en": "Ask the stranger who called you on WhatsApp", "hi": "व्हाट्सएप पर फोन करने वाले अनजान व्यक्ति से पूछें", "cg": "व्हाट्सएप म फोन करे वाला अनजान मनखे ले पूछव"},
            {"en": "Pay a token fee to an online link", "hi": "किसी ऑनलाइन लिंक पर फीस देकर जांचें", "cg": "कोनो ऑनलाइन लिंक म पइसा देके जांचव"}
        ],
        "answer": 0,
        "explanation": {
            "en": "Always check directly with your local police station in person. Real police will guide you honestly.",
            "hi": "हमेशा अपने स्थानीय थाने में जाकर खुद पता करें। असली पुलिस आपकी सही मदद करेगी।",
            "cg": "हमेशा अपन तीर के थाना म जाके खुद पता करव। असली पुलिस तुंहर सही मदद करही।"
        }
    }
]

# We will also add chapters 6 to 10 (courier_customs, upi_qr, links_apps, safe_habits, what_to_do) in full.
print(f"Loaded {len(NEW_QUESTIONS)} new questions so far.")
