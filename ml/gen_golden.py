import json
from pathlib import Path

# Curate ~60 golden test cases representing all key families and edge cases.
# Crucially: none of these are from the blind test set (blind_v1.csv).

examples = [
    # ---- 1. Genuine Bank OTPs (en, hi, hinglish) ----
    {
        "id": "gen_otp_sbi_en",
        "text": "Your OTP for login to SBI NetBanking is 582914. Valid for 10 minutes. Do not share your OTP with anyone.",
        "lang": "english",
        "expectedBand": "looks_genuine",
        "notes": "Standard genuine OTP delivery"
    },
    {
        "id": "gen_otp_hdfc_en",
        "text": "492015 is your secret OTP for transaction of Rs 1,450.00 at Swiggy. Never share your OTP with anyone, including bank officials.",
        "lang": "english",
        "expectedBand": "looks_genuine",
        "notes": "Bank transaction OTP with warning"
    },
    {
        "id": "gen_otp_icici_hi",
        "text": "आईसीआईसीआई बैंक: आपके ऑनलाइन लॉगिन के लिए ओटीपी 382910 है। यह 5 मिनट के लिए मान्य है। किसी के साथ साझा न करें।",
        "lang": "hindi",
        "expectedBand": "looks_genuine",
        "notes": "Hindi genuine bank OTP"
    },
    {
        "id": "gen_otp_axis_hinglish",
        "text": "Axis Bank: Aapke account login ka OTP 918234 hai. Kripya apna OTP kisi ke saath share na karein.",
        "lang": "hinglish",
        "expectedBand": "looks_genuine",
        "notes": "Hinglish genuine bank OTP"
    },
    {
        "id": "gen_otp_pnb_en",
        "text": "PNB: 710294 is your verification code for internet banking. Valid till 15:30 hrs. Do not disclose to anyone.",
        "lang": "english",
        "expectedBand": "looks_genuine",
        "notes": "PNB verification code"
    },

    # ---- 2. Genuine Bank Debit / Credit Alerts ----
    {
        "id": "gen_debit_hdfc_en",
        "text": "Rs 2,500.00 debited from HDFC Bank A/c **4921 on 22-Nov-26 via UPI. UPI Ref 402918274910. Not you? Call 18002026161.",
        "lang": "english",
        "expectedBand": "looks_genuine",
        "notes": "Real transaction debit notice"
    },
    {
        "id": "gen_credit_sbi_en",
        "text": "Dear customer, your A/c XX3021 has been credited with Rs 45,000.00 on 21-Nov-26 by salary transfer. - SBI",
        "lang": "english",
        "expectedBand": "looks_genuine",
        "notes": "Salary credit notice"
    },
    {
        "id": "gen_debit_sbi_hi",
        "text": "आपके खाते संख्या XX9201 से 500.00 रुपये यूपीआई के माध्यम से डेबिट किए गए हैं। संदर्भ संख्या 408291829182। भारतीय स्टेट बैंक।",
        "lang": "hindi",
        "expectedBand": "looks_genuine",
        "notes": "Hindi debit notice with reference number"
    },
    {
        "id": "gen_debit_icici_hinglish",
        "text": "ICICI Bank: Rs 150.00 aapke account XX1029 se debit ho gaya hai. Balance Rs 14,200. Agar aapne nahi kiya toh card block karein.",
        "lang": "hinglish",
        "expectedBand": "looks_genuine",
        "notes": "Hinglish debit notice"
    },

    # ---- 3. Genuine Government Schemes & Verified Links ----
    {
        "id": "gen_pmkisan_hi",
        "text": "पीएम किसान सम्मान निधि: 18वीं किस्त के 2,000 रुपये आपके बैंक खाते में भेज दिए गए हैं। स्थिति देखें: https://pmkisan.gov.in",
        "lang": "hindi",
        "expectedBand": "looks_genuine",
        "notes": "PM-Kisan official notice with gov link"
    },
    {
        "id": "gen_uidai_en",
        "text": "Your Aadhaar update request URN 1029/49102/10291 has been completed successfully. Download e-Aadhaar from https://uidai.gov.in",
        "lang": "english",
        "expectedBand": "looks_genuine",
        "notes": "Aadhaar update completion"
    },
    {
        "id": "gen_incometax_en",
        "text": "Income Tax Department: Refund of Rs 8,420 for AY 2026-27 has been processed to your bank account. Details at https://incometax.gov.in",
        "lang": "english",
        "expectedBand": "looks_genuine",
        "notes": "Income tax refund processed"
    },
    {
        "id": "gen_epfo_hi",
        "text": "कर्मचारी भविष्य निधि संगठन (ईपीएफओ): आपके यूएएन खाते में माह अक्टूबर का अंशदान जमा कर दिया गया है। https://epfindia.gov.in",
        "lang": "hindi",
        "expectedBand": "looks_genuine",
        "notes": "EPFO contribution notice"
    },

    # ---- 4. Genuine Delivery & Verified Service Links ----
    {
        "id": "gen_amazon_en",
        "text": "Your Amazon package with wireless earbuds has been delivered. View order details at https://amazon.in/orders",
        "lang": "english",
        "expectedBand": "looks_genuine",
        "notes": "Amazon delivery alert"
    },
    {
        "id": "gen_flipkart_hinglish",
        "text": "Aapka Flipkart order out for delivery hai. Delivery agent Rahul aapko jald sampark karega. Track: https://fkrt.it/d4910",
        "lang": "hinglish",
        "expectedBand": "looks_genuine",
        "notes": "Flipkart delivery status"
    },
    {
        "id": "gen_swiggy_en",
        "text": "Your Swiggy delivery partner is at your gate. Please share delivery code 49 with partner to collect food.",
        "lang": "english",
        "expectedBand": "looks_genuine",
        "notes": "Swiggy food delivery OTP"
    },
    {
        "id": "gen_jio_hinglish",
        "text": "Jio: Aapka 1.5 GB daily data 100% khatam ho chuka hai. Add-on pack recharge karne ke liye MyJio app kholein ya https://jio.com par jayein.",
        "lang": "hinglish",
        "expectedBand": "looks_genuine",
        "notes": "Telecom data quota warning with official jio.com link"
    },

    # ---- 5. User-Initiated & Conversational ----
    {
        "id": "gen_user_req_en",
        "text": "As per your request, your SBI debit card ending in 4019 has been temporarily blocked for international transactions.",
        "lang": "english",
        "expectedBand": "looks_genuine",
        "notes": "User-initiated card block confirmation"
    },
    {
        "id": "gen_user_req_hi",
        "text": "आपके अनुरोध के अनुसार आपके खाते की चेकबुक शाखा से भेज दी गई है। 3 कार्य दिवसों में प्राप्त होगी।",
        "lang": "hindi",
        "expectedBand": "looks_genuine",
        "notes": "Cheque book request status"
    },

    # ---- 6. Safety Advisories (Should NOT be flagged as scam) ----
    {
        "id": "gen_rbi_advisory_en",
        "text": "RBI Kehta Hai: Never share your OTP, UPI PIN, CVV or password with anyone. Bank officials will never call asking for your secret codes.",
        "lang": "english",
        "expectedBand": "looks_genuine",
        "notes": "RBI safety advisory message"
    },
    {
        "id": "gen_cybercrime_advisory_hi",
        "text": "साइबर जागरूकता: लॉटरी या नौकरी के नाम पर अज्ञात खातों में पैसे न भेजें। किसी को अपना ओटीपी न बताएं। सुरक्षित रहें।",
        "lang": "hindi",
        "expectedBand": "looks_genuine",
        "notes": "Cyber security awareness advisory"
    },

    # ---- 7. Scam: Fake KYC & Account Suspension Threats ----
    {
        "id": "scam_kyc_sbi_en",
        "text": "URGENT: Your SBI account has been suspended due to incomplete KYC verification. Click http://sbi-netbank-update.top to update PAN immediately.",
        "lang": "english",
        "expectedBand": "likely_scam",
        "notes": "Fake KYC threat with suspicious link"
    },
    {
        "id": "scam_kyc_hdfc_hinglish",
        "text": "Dear customer aapka HDFC card aaj raat 12 baje block ho jayega. Turant KYC update karein nahi toh a/c band ho jayega: http://hdfc-kyc.xyz",
        "lang": "hinglish",
        "expectedBand": "likely_scam",
        "notes": "Hinglish KYC threat"
    },
    {
        "id": "scam_kyc_pnb_hi",
        "text": "पीएनबी ग्राहक: आपका बैंक खाता आज ब्लॉक कर दिया गया है। तुरंत अपनी केवाईसी और आधार कार्ड अपडेट करें: http://pnb-online-kyc.vip",
        "lang": "hindi",
        "expectedBand": "likely_scam",
        "notes": "Hindi KYC account block scam"
    },
    {
        "id": "scam_pan_aadhaar_link",
        "text": "Dear user, your PAN is not linked to SBI account. Penalty of Rs 10,000 will be charged. Click http://bit.ly/sbi-pan to link now.",
        "lang": "english",
        "expectedBand": "likely_scam",
        "notes": "PAN penalty scam with shortener"
    },

    # ---- 8. Scam: Digital Arrest & Fake Police / Customs ----
    {
        "id": "scam_police_hi",
        "text": "यह दिल्ली पुलिस क्राइम ब्रांच है। आपके मोबाइल नंबर से अवैध गतिविधि पाई गई है। तुरंत 9811204910 पर संपर्क करें अन्यथा गैर-जमानती वारंट जारी होगा।",
        "lang": "hindi",
        "expectedBand": "likely_scam",
        "notes": "Digital arrest police warrant scam"
    },
    {
        "id": "scam_customs_en",
        "text": "Customs Department Mumbai: A parcel containing contraband drugs and passports addressed to you has been confiscated. Call inspector now at 9182740192.",
        "lang": "english",
        "expectedBand": "likely_scam",
        "notes": "Customs courier narcotics scam"
    },
    {
        "id": "scam_cbi_hinglish",
        "text": "Main CBI officer bol raha hoon. Aapke naam par money laundering case darj hua hai. Video call par rahein aur kisi ko na batayein.",
        "lang": "hinglish",
        "expectedBand": "likely_scam",
        "notes": "CBI video call arrest scam"
    },

    # ---- 9. Scam: Electricity Disconnection Threats ----
    {
        "id": "scam_bijli_hi",
        "text": "बिजली विभाग: आपका बिजली बिल बकाया है। आज रात 9:30 बजे बिजली काट दी जाएगी। तुरंत अधिकारी से बात करें 9820194820 पर।",
        "lang": "hindi",
        "expectedBand": "likely_scam",
        "notes": "Electricity bill cut scam"
    },
    {
        "id": "scam_electricity_hinglish",
        "text": "Dear customer aapka bijli connection tonight 9:00 PM cut ho jayega. Bill payment update karne ke liye call karein 8920194810.",
        "lang": "hinglish",
        "expectedBand": "likely_scam",
        "notes": "Hinglish electricity disconnect scam"
    },
    {
        "id": "scam_electricity_en",
        "text": "Electricity Board Notice: Power supply to your premises will be disconnected at 8:00 PM due to unpaid bill. Contact bill officer 9710294819.",
        "lang": "english",
        "expectedBand": "likely_scam",
        "notes": "English electricity disconnect scam"
    },

    # ---- 10. Scam: Fake Lottery / KBC / Prize Claims ----
    {
        "id": "scam_kbc_hi",
        "text": "बधाई हो! आपने कौन बनेगा करोड़पति में 25,00,000 रुपये का इनाम जीता है। अपना इनाम प्राप्त करने के लिए व्हाट्सएप पर संपर्क करें: 9810293810।",
        "lang": "hindi",
        "expectedBand": "likely_scam",
        "notes": "KBC WhatsApp prize scam"
    },
    {
        "id": "scam_lottery_en",
        "text": "Congratulations! Your mobile number won 1st prize in All India Lucky Draw Rs 15 Lakh. Deposit processing fee Rs 2,500 to claim prize.",
        "lang": "english",
        "expectedBand": "likely_scam",
        "notes": "Lucky draw upfront fee scam"
    },
    {
        "id": "scam_car_hinglish",
        "text": "Aapke number par Tata Safari car nikli hai. Gaadi claim karne ke liye registration fee Rs 5,000 turant gpay karein 9820194820.",
        "lang": "hinglish",
        "expectedBand": "likely_scam",
        "notes": "Car prize upfront fee scam"
    },

    # ---- 11. Scam: Work from Home / Easy Money ----
    {
        "id": "scam_job_en",
        "text": "Part-time job offer: Earn Rs 5,000 to 10,000 daily by liking YouTube videos and Google reviews. No experience required. Telegram @easycash2026",
        "lang": "english",
        "expectedBand": "likely_scam",
        "notes": "YouTube like task scam"
    },
    {
        "id": "scam_job_hi",
        "text": "घर बैठे काम करें और रोजाना 2,000 से 5,000 रुपये कमाएं। केवल होटल रेटिंग और वीडियो लाइक करें। अभी जुड़ें टेलीग्राम पर।",
        "lang": "hindi",
        "expectedBand": "likely_scam",
        "notes": "Hindi work from home task scam"
    },

    # ---- 12. Scam: Refund & QR Code Tricks ----
    {
        "id": "scam_refund_qr_hinglish",
        "text": "Sir aapka electricity bill ka Rs 450 refund issue hua hai. Paisa credit karne ke liye ye QR code scan karein aur UPI PIN daalein.",
        "lang": "hinglish",
        "expectedBand": "likely_scam",
        "notes": "Refund QR code UPI PIN trick"
    },
    {
        "id": "scam_olx_en",
        "text": "I want to buy your furniture on OLX. I am sending Rs 8,000 advance through QR. Scan this QR code and approve on GPay to receive money.",
        "lang": "english",
        "expectedBand": "likely_scam",
        "notes": "OLX buyer receive money QR trick"
    },

    # ---- 13. Scam: Remote Access App Installation ----
    {
        "id": "scam_anydesk_en",
        "text": "Customer Support: To fix unauthorized transactions on your account, please download AnyDesk or RustDesk from PlayStore and share 9-digit code.",
        "lang": "english",
        "expectedBand": "likely_scam",
        "notes": "Remote access tool installation"
    },
    {
        "id": "scam_apk_hinglish",
        "text": "SBI Reward points worth Rs 9,850 expire ho rahe hain. Points cash mein convert karne ke liye ye official SBI app install karein: http://sbi-rewards.apk",
        "lang": "hinglish",
        "expectedBand": "likely_scam",
        "notes": "Malicious APK download scam"
    },

    # ---- 14. Scam: Unauthorized Charge / Order Cancellation Scam ----
    {
        "id": "scam_amazon_unauth_en",
        "text": "Amazon: An order for iPhone 16 Pro worth Rs 1,19,900 has been charged to your card. If you did not place this order, call support at 9820194820 immediately.",
        "lang": "english",
        "expectedBand": "likely_scam",
        "notes": "Fake unauthorized charge alert with scam callback number"
    },
    {
        "id": "scam_bank_unauth_hi",
        "text": "आपके बैंक खाते से 85,000 रुपये का स्थानांतरण शुरू हुआ है। यदि आपने यह नहीं किया तो कॉल न काटें, 9810294810 पर तुरंत संपर्क करें।",
        "lang": "hindi",
        "expectedBand": "likely_scam",
        "notes": "Hindi unauthorized transaction threat"
    }
]

out_path = Path("apps/web/src/detector/__fixtures__/golden.json")
out_path.parent.mkdir(parents=True, exist_ok=True)
out_path.write_text(json.dumps(examples, indent=2, ensure_ascii=False), encoding="utf-8")
print(f"Wrote {len(examples)} golden regression examples to {out_path}")
