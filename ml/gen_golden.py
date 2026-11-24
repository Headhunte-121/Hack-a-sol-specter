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
    },

    # ---- 8. "call" next to a phone number in genuine messages (a live phone showed a genuine missed-call alert as a scam) ----
    {
        "id": "gen_missed_call_alert_en",
        "text": "Dear Customer, You have a missed call from +91 98765 43210 The last missed call was at 07:58 PM on 16-Nov-2026 Thankyou, Team Jio.",
        "lang": "english",
        "expectedBand": "looks_genuine",
        "notes": "Telecom missed-call alert: the word call and a phone number, but nobody is asked to call"
    },
    {
        "id": "gen_missed_calls_alert_en",
        "text": "Vi Alert: You have missed 3 calls on 22-Nov. Last call from 9876543210 at 9:05 PM. Thank you.",
        "lang": "english",
        "expectedBand": "looks_genuine",
        "notes": "Telecom missed-calls alert"
    },
    {
        "id": "gen_missed_call_alert_hi",
        "text": "आपके फोन पर 9123456789 से मिस्ड कॉल आई है, समय सुबह 10:30 बजे।",
        "lang": "hindi",
        "expectedBand": "looks_genuine",
        "notes": "Hindi missed-call alert"
    },
    {
        "id": "gen_tried_calling_personal_en",
        "text": "Hi, I tried calling you but you did not pick up. Call me back on 9999912345 when you are free.",
        "lang": "english",
        "expectedBand": "looks_genuine",
        "notes": "Personal message asking for a call back"
    },
    {
        "id": "gen_delivery_partner_will_call_en",
        "text": "Your parcel is out for delivery. The rider will call you on 8000012345 once he is nearby.",
        "lang": "english",
        "expectedBand": "looks_genuine",
        "notes": "Delivery partner will call the customer"
    },
    {
        "id": "scam_call_this_number_en",
        "text": "Your account will be blocked today. Call 9876543210 immediately to update your KYC.",
        "lang": "english",
        "expectedBand": "likely_scam",
        "notes": "Still a scam: asks the person to call a number at once"
    },

    # ---- 9. Marketing and plan reminders from phone companies (a live inbox showed many of these as scams) ----
    {
        "id": "gen_telecom_plan_expiry_en",
        "text": "Your plan for Jio number 99999 12345 is expiring today. Recharge IMMEDIATELY to continue enjoying uninterrupted services. Visit jio.com/r/ab12",
        "lang": "english",
        "expectedBand": "looks_genuine",
        "notes": "Telecom plan-expiry reminder with an official link"
    },
    {
        "id": "gen_telecom_recharge_offer_en",
        "text": "Recharge now your Airtel no. 9876543210 with Rs.719 plan & enjoy Airtel Benefits - Netflix, unlimited 5G & more. Recharge at airtel.in/offer",
        "lang": "english",
        "expectedBand": "looks_genuine",
        "notes": "Telecom recharge offer"
    },
    {
        "id": "gen_telecom_plan_expiry_hi",
        "text": "आपके जियो नंबर 90000 11223 के प्लान की वैधता जल्द ही समाप्त हो जाएगी। सेवाओं के बंद होने से बचने के लिए अभी रिचार्ज करें। jio.com/r",
        "lang": "hindi",
        "expectedBand": "looks_genuine",
        "notes": "Hindi plan-expiry reminder"
    },
    {
        "id": "scam_free_recharge_otp_en",
        "text": "FREE recharge for all Jio users! Share your OTP with our agent to activate your free 12-month plan.",
        "lang": "english",
        "expectedBand": "likely_scam",
        "notes": "Still a scam: the same words, but it asks for the OTP"
    },

    # ---- 10. Found by scoring a realistic inbox on 24 Nov: bank messages that the call-script rules or two rules used to turn red ----
    {
        "id": "gen_bank_otp_not_share_staff_en",
        "text": "482913 is your OTP for Axis Bank net banking login. Valid for 5 minutes. Do not share it with anyone including bank staff.",
        "lang": "english",
        "expectedBand": "looks_genuine",
        "notes": "Was red: 'bank' and 'OTP' looked like two stages of the fake-KYC call script although the message only delivers a code and warns not to share it"
    },
    {
        "id": "gen_bank_debit_sms_block_en",
        "text": "ICICI Bank Acct XX812 debited for Rs 3,499.00 on 23-Nov-26; Amazon Pay. Call 18002662 for dispute or SMS BLOCK 812 to 9215676766.",
        "lang": "english",
        "expectedBand": "looks_genuine",
        "notes": "Was red: 'call' with a number and 'block' fired two scam rules; SMS BLOCK and 'for dispute' are the bank's own instructions"
    },
    {
        "id": "gen_bank_debit_sms_block_upi_en",
        "text": "HDFC Bank: Rs 2,000.00 debited from a/c XX1234 on 24-11-26. Not you? SMS BLOCK UPI to 7308080808 or call 18002586161.",
        "lang": "english",
        "expectedBand": "looks_genuine",
        "notes": "Debit alert with the bank's SMS BLOCK instruction"
    },
    {
        "id": "gen_courier_delivery_call_link_en",
        "text": "Your DTDC parcel 4412887 is out for delivery. Our executive will call you on delivery. Track at dtdc.in",
        "lang": "english",
        "expectedBand": "looks_genuine",
        "notes": "A courier's own site is an official link"
    },
    {
        "id": "scam_otp_warning_then_read_out_en",
        "text": "Dear customer your OTP is 482913. Bank staff will call you; read the OTP to the caller to complete KYC verification today.",
        "lang": "english",
        "expectedBand": "likely_scam",
        "notes": "Still a scam: a code message that tells the person to read the code out to a caller"
    },
    {
        "id": "scam_otp_warning_then_link_en",
        "text": "SBI: Your OTP is 556712. Do not share it. Your account will be blocked today, verify PAN at http://sbi-verify.top/pan",
        "lang": "english",
        "expectedBand": "likely_scam",
        "notes": "Still a scam: borrows the do-not-share warning and adds a look-alike link and a threat"
    }
]

out_path = Path("apps/web/src/detector/__fixtures__/golden.json")
out_path.parent.mkdir(parents=True, exist_ok=True)
out_path.write_text(json.dumps(examples, indent=2, ensure_ascii=False), encoding="utf-8")
print(f"Wrote {len(examples)} golden regression examples to {out_path}")
