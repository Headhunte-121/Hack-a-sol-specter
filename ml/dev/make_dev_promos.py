"""Writes dev/dev_promos_v1.csv: genuine marketing and plan-reminder messages from phone companies, streaming services and shops (the kind a live phone showed
as scams), and scams that use the same words. Written BEFORE the promo retrain, with wording different from the generator's. Invented numbers. Development only.
Format per line: label|text"""
import csv
from pathlib import Path
ROWS = """
0|Jio Offer: Recharge your Jio number 99999 12345 with Rs.749 plan today and get 2GB/day, JioCinema and JioTV free for 90 days. Recharge: jio.com/offer
0|Dear Customer, your Airtel plan on 9876543210 ends tomorrow. Renew now with Rs.299 and keep enjoying unlimited calls and data. Airtel Thanks app.
0|Vi: Your 28-day pack expires today. Recharge now with Rs.239 to avoid disruption. myvi.in/recharge
0|Congratulations! You have unlocked 3 months of Amazon Prime Mobile free with your Airtel recharge of Rs.699. Activate in the Airtel Thanks app. T&C apply.
0|Good news! Your free 6-month Netflix Mobile plan is now active on your Vi number. Enjoy streaming. T&C apply.
0|Dear User, You have earned a Rs 500 voucher on Croma. Redeem before 30-Nov at croma.com/offers. T&C apply.
0|आपके जियो नंबर 90000 11223 का प्लान कल समाप्त हो रहा है। ₹349 का रिचार्ज करें और रोज़ 2GB डेटा पाएं। jio.com/r
0|बधाई हो! आपका एयरटेल रिचार्ज सफल रहा और आपको 3 महीने का अमेज़न प्राइम मुफ़्त मिला है। शर्तें लागू।
0|Aapka Jio plan jaldi khatam hone wala hai. Abhi Rs.299 ka recharge karein aur unlimited 5G ka maza lein. jio.com/r
0|Hurry! Diwali sale ends tonight on Myntra. Flat 60% off + extra 10% with HDFC cards. Shop now: myntra.com/sale T&C apply.
0|Your data pack is about to finish. Recharge with Rs.19 data booster now and keep browsing without interruption. Open the Jio app.
0|Reminder: your Hotstar subscription renews on 02-Dec for Rs 299. Manage it in the app.
1|Congratulations! You have won a brand new iPhone 15. Pay Rs 99 delivery charge now to claim: http://iphone-winner.top/claim
1|Your Jio number will be blocked in 2 hours. Update KYC now at http://jio-kyc-update.xyz or call 9876543210
1|Dear customer your plan has expired. Pay Rs 10 immediately on http://bit.ly/3kXz9 to restore services and avoid a penalty
1|FREE recharge for all Jio users! Share your OTP with our agent to activate your free 12-month plan.
1|आपका सिम कल बंद हो जाएगा। तुरंत http://sim-kyc-now.cc पर जाकर केवाईसी अपडेट करें और ओटीपी डालें।
1|Aapko Airtel lucky draw mein Rs 5 lakh ka inaam mila hai. Claim karne ke liye processing fee Rs 2000 abhi bhejiye.
""".strip()
rows=[(int(l.split("|",1)[0]),l.split("|",1)[1].strip()) for l in ROWS.splitlines()]
out=Path(__file__).resolve().parent/"dev_promos_v1.csv"
with open(out,"w",newline="",encoding="utf-8") as f:
    w=csv.writer(f); w.writerow(["text","label","lang","family"])
    for y,t in rows: w.writerow([t,y,"mixed","promos"])
print(f"wrote {len(rows)} rows")
