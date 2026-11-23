"""Writes dev/dev_sms_v1.csv: realistic Indian SMS-inbox formats (bank alerts, OTPs, promos, telecom, delivery, personal) and phishing SMS formats.
Written BEFORE the v3 retrain finished, for the live SMS feature: an inbox is mostly genuine text in odd formats (sender tags, Rs.1,200.00,
A/c *1234, <#> hashes, T&C lines), so false alarms matter most. All names, numbers and accounts are invented. Development set only (never trained on).
Format per line: label|text
"""
import csv
from pathlib import Path

ROWS = """
0|Dear Customer, INR 2,500.00 debited from A/c XX1234 on 23-11-26 and credited to VPA ramesh@okaxis (UPI Ref No 123456789012). If not done by you, call 18002586161. -SBI
0|Rs.1,200.00 spent on HDFC Bank Card x4321 at SWIGGY on 22-11-2026. Avl Lmt Rs.45,000. Not you? Call 18002586161.
0|Your A/c XX1234 is credited with Rs 25,000.00 on 23-Nov-26 by UPI Ref 345612. Avl Bal Rs 31,250.55. -Canara Bank
0|<#> 482913 is your Paytm verification code. Do not share it with anyone. xkF9sd2
0|482913 is the OTP for your Swiggy login. Valid for 10 mins. Do not share it with anyone.
0|Your Amazon order #402-1234567-1234567 has been delivered. Rate your experience: https://www.amazon.in/r/abc
0|Jio: Rs 299 recharge successful. Validity 28 days, 2GB/day. MyJio app: https://www.jio.com/app
0|Flat 50% OFF on all fashion at Myntra! Use code END50. Shop now: https://www.myntra.com/sale T&C apply. Reply STOP to opt out.
0|Dear Customer, your EMI of Rs 4,520 for loan A/c 5521 is due on 05-Dec. Please ensure sufficient balance. -Bajaj Finserv
0|Your appointment with Dr. Sharma is confirmed for 25 Nov at 11:30 AM. Reply 1 to confirm, 2 to cancel. -Apollo Clinic
0|Airtel: You have used 80% of your daily data. Recharge with Rs 19 for 1 GB more on the Airtel Thanks app.
0|IRCTC: PNR 2412345678 confirmed. Train 12345 dep 18:40 on 26-Nov. Wish you a happy journey.
0|Reached home. Will call after dinner.
0|UIDAI: Your Aadhaar update request has been received. URN 1234/56789/12345. Track at https://uidai.gov.in
0|Your LPG cylinder booking is confirmed. Delivery code 4412 will be needed at delivery, share it only with the delivery person.
0|Parent teacher meeting on Saturday 10 am. Please attend. -Principal, DAV School
0|Your electricity bill for Oct is Rs 1,240. Due date 28-Nov. Pay on the official app or website. Ignore if already paid.
0|Zomato: Your order is on the way. Delivery partner Raju will call you. OTP for delivery is 3321.
0|Dear Customer, a new payee has been added to your account. If you did not do this, please visit your nearest branch immediately. -ICICI Bank
0|Dear UPI user, A/c X1234 debited by 450.00 on 21Nov26 trf to Dmart Ref 998877665544. Not you? Call 1800 1234.
0|Uber: Your ride with Suresh is arriving in 3 minutes. Vehicle MP09AB1234. OTP 4471.
0|Mutual fund SIP of Rs 2,000 for Axis Bluechip Fund has been processed on 05-Nov. Units allotted 31.254. Statement: https://www.axismf.com
0|Your insurance premium of Rs 8,450 is due on 30-Nov. Pay via the official app or branch. -LIC
0|Your DTH recharge is due. Recharge now to avoid disconnection: Tata Play app. Balance Rs 12.
0|Aapka Airtel Xstream recharge safal raha. Dhanyavad.
0|आपके खाते XX1234 से 500 रुपये डेबिट हुए हैं। यदि आपने नहीं किए तो 1800 0000 पर कॉल करें। -एसबीआई
0|आपका ओटीपी 482913 है। इसे किसी को न बताएं। -पेटीएम
0|Bhai aaj raat dinner pe aa raha hai na? Mummy puch rahi thi.
0|Aapka bijli bill Rs 860 hai, last date 25 Nov. App se bharein. -TNEB
0|Your OTP for UPI PIN reset is 553210. Do not share with anyone, including bank staff. -HDFC Bank
0|Your PhonePe wallet is credited with Rs 100 cashback. Check your balance in the app.
0|Hi, your Ola Money balance is low. Add money in the app to continue booking rides.
0|Your FASTag balance is low. Recharge on the official IHMCL or bank app. -FASTag
0|Reminder: Your driving licence renewal is due on 12-Dec. Apply at the official parivahan portal.
0|BSNL: Your plan will expire on 28 Nov. Recharge with the BSNL Selfcare app to continue services.
0|Dear Customer, your PAN has been linked to your Aadhaar successfully. -Income Tax Department
0|We have received your complaint no 556677. We will resolve it within 3 working days. -Customer Care
1|Dear SBI user, your YONO account is blocked. Update PAN now: http://sbi-yono-update.xyz
1|HDFC Bank: Your net banking will be suspended today. Complete KYC at http://hdfc-kyc-verify.top or call 98XXXXXX10
1|Congratulations! You have won Rs 25 Lakh in Jio Lucky Draw. Claim here: http://jio-lucky-win.club
1|Your Income Tax refund of Rs 15,400 is approved. Submit bank details: http://incometax-refund.online
1|Dear customer your electricity will be disconnected tonight 9:30 PM. Call 70XXXXXX55 for officer.
1|Your parcel is held at customs. Pay Rs 75 clearance here: http://courier-clearance.link
1|Hi, send Rs 2,000 to this UPI id to complete your KYC: abc@ybl
1|URGENT: Your FASTag is blocked. Recharge now: http://fastag-recharge.site
1|Dear Paytm user your wallet KYC expires today. Click http://paytm-kyc-now.cc to avoid ban.
1|Amazon: Your account has unusual sign-in. Verify at http://amazon-secure-login.xyz
1|You are selected for a job at Amazon. Earn Rs 5,000 per day. WhatsApp 70XXXXXX55 with your Aadhaar and bank details.
1|Your electricity bill is unpaid, pay Rs 10 immediately on bit.ly/3xYz or power will be cut
1|Sir your SIM will be blocked in 2 hours. Complete Aadhaar verification: http://sim-verify.top
1|Dear customer, your gas subsidy of Rs 1,200 is pending. Update bank details: http://lpg-subsidy.xyz
1|A request of Rs 4,999 from Amazon Support is pending on your UPI app. Approve it to receive your refund.
1|आपका एसबीआई खाता आज बंद हो जाएगा। केवाईसी अपडेट करें: http://sbi-kyc-now.top
1|Aapka Paytm KYC aaj expire ho raha hai. Turant ye link kholein aur PAN daalein: http://paytm-pan-update.xyz
1|Your bank account is locked due to suspicious activity. Share the OTP sent to unlock it with our agent on 98XXXXXX10.
""".strip()
rows = [(int(l.split("|", 1)[0]), l.split("|", 1)[1].strip()) for l in ROWS.splitlines()]
assert len({t for _, t in rows}) == len(rows)
out = Path(__file__).resolve().parent / "dev_sms_v1.csv"
with open(out, "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f); w.writerow(["text", "label"])
    for y, t in rows: w.writerow([t, y])
print(f"wrote {len(rows)} rows ({sum(y for y, _ in rows)} scam, {sum(1 - y for y, _ in rows)} genuine)")
