"""Writes dev/dev_calls_v1.csv: messages with the word "call" and a phone number, genuine and scam. Written BEFORE the missed-call retrain finished, from
the false flag a live phone showed (a genuine missed-call alert shown as a scam). Invented numbers. Development set only.
Format per line: label|text"""
import csv
from pathlib import Path
ROWS = """
0|Dear Customer, You have a missed call from +91 99999 12345 The last missed call was at 08:12 PM on 22-Nov-2026 Thankyou, Team Airtel.
0|Vi Alert: You have missed 3 calls on 22-Nov. Last call from 9876543210 at 9:05 PM. Thank you.
0|BSNL: A missed call from 91234 56789 was received at 7:45 AM. For details dial 1503.
0|Jio: You have a missed call from +91 98765 43210. Call back to know more.
0|Missed call: 9000011223 tried to reach you at 6:10 PM today.
0|Hi, it's Rahul. Tried calling you twice. Ring me on 9999912345 when you see this.
0|Your parcel is out for delivery. The rider will call you on 8000012345 once he is nearby.
0|Aapko 9876543210 se missed call mila tha, shaam 6 baje. Wapas call kar lena.
0|आपके फोन पर 9123456789 से मिस्ड कॉल आई है, समय सुबह 10:30 बजे।
0|Please call Dr. Mehta's clinic on 9876543210 to confirm your slot for tomorrow.
0|The plumber will call you on 7000054321 before coming. Please keep your phone on.
0|Your cab driver Ajay will call you on 9999912345 on arrival.
1|Your account will be blocked today. Call 9876543210 immediately to update your KYC.
1|Congratulations, you won a prize of Rs 25,00,000! To claim call 9999912345 now.
1|Your electricity will be cut tonight. Call the officer on 9000011223 immediately to avoid disconnection.
1|Your parcel is held at customs. Call 9123456789 and pay the clearance fee today.
1|Bank alert: unusual activity on your card. Call our fraud team on 8000012345 now and share the OTP.
1|Aapka SIM band hone wala hai. Turant 9876543210 par call karke KYC karwayein.
1|आपका खाता बंद हो जाएगा। तुरंत 9999912345 पर कॉल करके जानकारी दें।
1|Loan approved! Call 7000054321 now to claim your amount, processing fee applies.
""".strip()
rows=[(int(l.split("|",1)[0]),l.split("|",1)[1].strip()) for l in ROWS.splitlines()]
out=Path(__file__).resolve().parent/"dev_calls_v1.csv"
with open(out,"w",newline="",encoding="utf-8") as f:
    w=csv.writer(f); w.writerow(["text","label","lang","family"])
    for y,t in rows: w.writerow([t,y,"mixed","calls"])
print(f"wrote {len(rows)} rows")
