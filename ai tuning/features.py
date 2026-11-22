"""Hand-built, explainable scam signals for English / Hindi (Devanagari) / Hinglish.
`rule_features(text)` -> dense numpy vector; `explain(text)` -> list of human-readable triggered rules."""
import re
import numpy as np

def R(p): return re.compile(p, re.I)

SHORTENER = R(r"\b(bit\.ly|tinyurl\.com|rb\.gy|cutt\.ly|t\.co|goo\.gl|is\.gd)/")
SUSP_TLD = R(r"https?://\S+\.(top|xyz|cc|win|info|help|club|click|online|site|in\.net|co\.in)\b|\.(top|xyz|win|help)\b")
URL = R(r"https?://|www\.|\b\S+\.(com|in|net|org|top|xyz)/")
APK_REMOTE = R(r"\bapk\b|anydesk|teamviewer|quicksupport|install (the )?app|app install|ऐप इंस्टॉल|एपीके|एनीडेस्क")
SENSITIVE = R(r"\botp\b|\bcvv\b|\bpin\b|card number|aadhaar|aadhar|\bpan\b|bank details|account number|6 digit|ओटीपी|सीवीवी|पिन|कार्ड नंबर|आधार|पैन|बैंक विवरण|बैंक डिटेल|खाता नंबर|खाता संख्या|कोड")
ASK_VERB = R(r"\b(share|send|tell|give|provide|enter|submit|confirm|verify|batao|bataiye|bata|batayein|bhejo|bhejiye|bhej|daalo|dalo|karo|karein)\b|बताएं|बताइए|बताओ|भेजें|भेजिए|भेज|साझा करें|दर्ज करें|डालें|अपडेट करें|वेरिफाई|सत्यापित")
NEGATED = R(r"do not share|don'?t share|never share|not share|do not disclose|share na kar|na bata|kisi ko na|kisi ke saath share na|mat batana|न बताएं|न करें|साझा न|किसी को न|किसी के साथ साझा न|ignore this|अनदेखा|ignore karein")
PAY_REQ = R(r"\b(pay|deposit|transfer|remit|jama|bharo|bhejo|pay karo|payment karo)\b|fee|charges?|fine|penalty|जमा करें|भुगतान करें|भरें|शुल्क|जुर्माना|फीस")
URGENT = R(r"immediately|urgent|right now|within \d+ ?(hours?|hrs|mins?|minutes)|today only|tonight|last notice|final warning|turant|abhi|jaldi|aaj hi|ghante me|तुरंत|अभी|आज ही|घंटे में|आज रात|अंतिम")
THREAT = R(r"block(ed)?|suspend|arrest|legal action|court|disconnect|deactivat|cancel(led)?|freeze|frozen|band ho|kat (di|jayega)|giraft|रद्द|बंद|गिरफ्तार|कानूनी|कोर्ट|फ्रीज|ब्लॉक|काट")
PRIZE = R(r"\bwon\b|winner|lottery|prize|congratulations|congrats|gift voucher|reward|free (recharge|phone|iphone)|jeet|inaam|badhai|lucky draw|बधाई|लॉटरी|इनाम|जीत|मुफ्त|लकी ड्रॉ")
AUTHORITY = R(r"\bcbi\b|police|cyber (crime )?cell|\btrai\b|customs|income tax|enforcement directorate|\bed\b|narcotics|sebi|rbi officer|सीबीआई|पुलिस|साइबर|ट्राई|कस्टम|आयकर|इनकम टैक्स")
LEGIT = R(r"official (app|website|portal|site)|not you\?|if (it was )?not you|if you did not|valid for|call the number (on|at)|ref(erence)? ?(no|number)|track (your|at)|thank(s| you) for|आधिकारिक|धन्यवाद|वैध|मान्य|संदर्भ संख्या|official app se|official website|नहीं थे\?|आप नहीं")
REWARD_AMT = R(r"earn|guaranteed|double|daily|roz|per day|return|रोज़|दोगुना|गारंटी")
SECRECY = R(r"do not tell|don'?t tell|keep (this )?secret|stay on (the )?(video )?call|kisi ko mat|किसी को मत|वीडियो कॉल पर रहें|video call par|raho aur kisi")

NAMES = ["url", "short_url", "susp_tld", "apk_remote", "sensitive", "ask_verb", "negated_share", "asks_secret_unnegated",
         "pay_req", "urgent", "threat", "prize", "authority", "legit_cue", "easy_money", "secrecy", "digits_ratio", "n_rules"]

def rule_features(t: str) -> np.ndarray:
    has = lambda r: 1.0 if r.search(t) else 0.0
    sens, ask, neg = has(SENSITIVE), has(ASK_VERB), has(NEGATED)
    f = [has(URL), has(SHORTENER), has(SUSP_TLD), has(APK_REMOTE), sens, ask, neg, sens * ask * (1 - neg),
         has(PAY_REQ), has(URGENT), has(THREAT), has(PRIZE), has(AUTHORITY), has(LEGIT), has(REWARD_AMT), has(SECRECY)]
    f.append(sum(c.isdigit() for c in t) / max(1, len(t)))
    risky = f[1] + f[2] + f[3] + f[7] + f[8] + f[9] + f[10] + f[11] + f[12] + f[14] + f[15]
    f.append(risky)
    return np.array(f, dtype=np.float32)

LABELS = {"short_url": "URL shortener", "susp_tld": "suspicious web address", "apk_remote": "asks to install an app / remote-access tool",
          "asks_secret_unnegated": "asks for OTP/PIN/ID details", "pay_req": "asks for a payment or fee", "urgent": "urgency / time pressure",
          "threat": "threat (block / arrest / legal action)", "prize": "prize / reward claim", "authority": "impersonates an authority",
          "easy_money": "easy-money promise", "secrecy": "asks you to keep it secret"}

def explain(t: str):
    v = dict(zip(NAMES, rule_features(t)))
    out = [LABELS[k] for k in LABELS if v[k] > 0]
    if v["legit_cue"] > 0: out.append("(reassuring) official-channel wording")
    if v["negated_share"] > 0 and v["sensitive"] > 0: out.append("(reassuring) tells you NOT to share the code")
    return out

def matrix(texts):
    return np.vstack([rule_features(t) for t in texts])
