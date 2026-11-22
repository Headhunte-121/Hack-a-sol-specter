"""Fixed lookup lists. Region is chosen by the user from this list (district level), never from device location."""

# (code, English, Hindi). Chhattisgarhi uses the Devanagari spelling of place names.
REGIONS = [
    ("balod", "Balod", "बालोद"), ("baloda_bazar", "Baloda Bazar", "बलौदाबाजार"), ("balrampur", "Balrampur", "बलरामपुर"),
    ("bastar", "Bastar", "बस्तर"), ("bemetara", "Bemetara", "बेमेतरा"), ("bijapur", "Bijapur", "बीजापुर"),
    ("bilaspur", "Bilaspur", "बिलासपुर"), ("dantewada", "Dantewada", "दंतेवाड़ा"), ("dhamtari", "Dhamtari", "धमतरी"),
    ("durg", "Durg", "दुर्ग"), ("gariaband", "Gariaband", "गरियाबंद"), ("gaurela_pendra_marwahi", "Gaurela-Pendra-Marwahi", "गौरेला-पेंड्रा-मरवाही"),
    ("janjgir_champa", "Janjgir-Champa", "जांजगीर-चांपा"), ("jashpur", "Jashpur", "जशपुर"), ("kabirdham", "Kabirdham", "कबीरधाम"),
    ("kanker", "Kanker", "कांकेर"), ("khairagarh", "Khairagarh-Chhuikhadan-Gandai", "खैरागढ़-छुईखदान-गंडई"), ("kondagaon", "Kondagaon", "कोंडागांव"),
    ("korba", "Korba", "कोरबा"), ("koriya", "Koriya", "कोरिया"), ("mahasamund", "Mahasamund", "महासमुंद"),
    ("manendragarh", "Manendragarh-Chirmiri-Bharatpur", "मनेंद्रगढ़-चिरमिरी-भरतपुर"), ("mohla_manpur", "Mohla-Manpur-Ambagarh Chowki", "मोहला-मानपुर-अंबागढ़ चौकी"),
    ("mungeli", "Mungeli", "मुंगेली"), ("narayanpur", "Narayanpur", "नारायणपुर"), ("raigarh", "Raigarh", "रायगढ़"),
    ("raipur", "Raipur", "रायपुर"), ("rajnandgaon", "Rajnandgaon", "राजनांदगांव"), ("sakti", "Sakti", "सक्ती"),
    ("sarangarh", "Sarangarh-Bilaigarh", "सारंगढ़-बिलाईगढ़"), ("sukma", "Sukma", "सुकमा"), ("surajpur", "Surajpur", "सूरजपुर"),
    ("surguja", "Surguja", "सरगुजा"),
]

CHANNELS = ("sms", "call", "qr", "other")
RISK_BANDS = ("likely_scam", "suspicious", "unknown")
CATEGORIES = ("kyc_bank", "otp", "digital_arrest", "courier_customs", "lottery_prize", "loan_app", "investment_job", "phishing_link", "payment_request", "fake_qr", "other")
LESSON = {"kyc_bank": "fake_kyc", "otp": "otp_pin_card", "digital_arrest": "digital_arrest", "courier_customs": "courier_customs", "lottery_prize": "upi_qr",
          "loan_app": "links_apps", "investment_job": "links_apps", "phishing_link": "links_apps", "payment_request": "upi_qr", "fake_qr": "upi_qr", "other": "what_to_do"}
