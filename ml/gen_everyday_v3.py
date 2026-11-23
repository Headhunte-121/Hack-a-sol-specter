"""Generate everyday genuine messages in Hinglish, Hindi and English (family, friends, work, school, shops, travel, health, festivals).

Why: in the training data Hinglish and Hindi are mostly scam or bank text, so the polite everyday words of the language (aapka, naam, kya, hai, dijiye,
kijiye, kal, confirm, bhej diye ...) had learned to mean "scam". The shipped model gave 0.29 to "Aapka naam kya hai? Kal ki meeting ka time confirm kar
dijiye." Everyday text with those same words, labelled genuine, removes that shortcut. Every sentence is its own group. Nothing is copied from an
evaluation text; every row is checked against the frozen texts. All names, places and numbers are invented.

Writes data/team/everyday_v3.csv (columns text,label,lang,group).
"""
from __future__ import annotations

import csv
import sys
from pathlib import Path

import leak_check

ROOT = Path(__file__).resolve().parent.parent

HINGLISH = """
Aapka naam kya hai? Kal ki class ka time bata dijiye.
Bhaiya kal subah 8 baje station aa jaana, main gaadi lekar aa jaunga.
Mummy ne kaha hai ki shaam ko dahi lete aana.
Aapka order ready hai, kal dukaan se le jaiye.
Kya aap kal doctor ke paas ja rahe hain? Mujhe bhi saath chalna hai.
Beta school se aate waqt thoda doodh le aana.
Dhanyavad, aapki madad ke liye bahut shukriya.
Hamari meeting shaam 5 baje hai, kripya samay par aaiye.
Aapka naam list me likh liya hai, kal shaadi me zaroor aana.
Main 20 minute me pahunch raha hoon, chai bana lo.
Please apna address bhej dijiye, hum saamaan bhijwa denge.
Aaj ka match dekha? Kohli ne kamaal kar diya.
Bhai kal ka assignment bhej do, mera pen drive kharab ho gaya.
Aapki beti ki shaadi ka card mil gaya, bahut bahut badhai.
Hum log Sunday ko mandir ja rahe hain, aap bhi chalo.
Aapka doctor appointment kal 11 baje confirm ho gaya hai.
Chhote ko bukhar hai, dawai le li hai, aap chinta mat karo.
Dukaan par 2 kilo chawal aur ek litre tel bhijwa dijiye.
Tumhara naam kya hai beta? Kaun si class me padhte ho?
Kal Diwali ki chutti hai, bank aur office band rahenge.
Please ye photo ghar ke group me bhej dena.
Aapka cab 5 minute me pahunch raha hai, driver ka naam Ramesh hai.
Dadi ki tabiyat theek hai, aap fikar na karein.
Main aaj raat 9 baje ki train se aa raha hoon.
Kya hum kal 4 baje milein? Aap kahan rehte hain?
Maine aapko kal call kiya tha, aap kahan the?
Aapki kitaab maine library me wapas kar di hai.
Pooja ka prasad kal subah milega, aap aa jaana.
Hamare yahan Sunday ko havan hai, aap parivaar ke saath padhariye.
Aapka naam registration list me add kar diya gaya hai.
Bhaiya thoda dheere chalaiye, mujhe jaldi nahi hai.
Meri chhutti kal se shuru hai, tab milte hain.
Ye recipe bahut achhi hai, aap bhi try kijiye.
Gas cylinder kal aa jayega, delivery wala pehle phone karega.
Aaj tez barish hai, school ki chhutti ho gayi hai.
Mujhe aapka number apne dost ne diya tha, kya main aapse baat kar sakta hoon?
Aapko jaldi theek hone ki shubhkamnayein, apna khayal rakhiye.
Kal raat ko khana bahut swadisht tha, dhanyavad.
Bachon ke exam kal se shuru hain, unhe subah jaldi utha dijiye.
Aapka passport appointment 15 tarikh ko hai, original documents saath lana.
Main office se nikal gaya hoon, ghar pahunch kar phone karta hoon.
Aapki gaadi ki service ho gayi hai, kal shaam tak le jaiye.
Hello, kya aap Sharma ji bol rahe hain? Main unke bhai ka dost hoon.
Aaj se naya sabzi wala aayega, kal se usi se le lena.
Ghar ki chaabi padosi ke paas hai, unse le lena.
Raksha bandhan par ghar aa rahe ho na? Maa intezaar kar rahi hain.
Aapke bete ka result aa gaya hai, bahut achhe number aaye hain.
Kal bijli ka kaam hai isliye subah 10 se 2 baje tak light nahi rahegi.
Mera phone shaam tak band rahega, kuch zaroori ho to message kar dena.
Please ye form bhar kar kal tak school me jama kar dijiye.
Ye mera naya naam hai, ab se mujhe isi naam se bulana.
Hum sab aapka intezaar kar rahe hain, jaldi aaiye.
Aapka swagat hai, kripya andar aaiye aur baithiye.
Kal bank band hai, parso kaam ho jayega.
Mujhe do ticket chahiye Raipur ke liye, kab milengi?
Aapne jo kitaab bheji thi wo mil gayi, dhanyavad.
Aapka naam aur gaon ka naam likh kar dijiye, form bharna hai.
Chhat ka paani ka tank saaf karwa dijiye, bahut din ho gaye.
Is Sunday cricket match hai, aap bhi khelne aaiye.
Kya aap mujhe kal dopahar ko call kar sakte hain? Main thoda busy hoon.
Aapke ghar ka bijli bill aa gaya hai, kal bhar dijiye.
Ye dawai din me teen baar khana ke baad lena hai.
Bahut dino se aap se baat nahi hui, sab theek hai na?
""".strip().splitlines()

HINDI = """
आपका नाम क्या है? कल की कक्षा का समय बता दीजिए।
भैया कल सुबह 8 बजे स्टेशन आ जाना, मैं गाड़ी लेकर आ जाऊँगा।
माँ ने कहा है कि शाम को दही लेते आना।
आपका ऑर्डर तैयार है, कल दुकान से ले जाइए।
क्या आप कल डॉक्टर के पास जा रहे हैं? मुझे भी साथ चलना है।
बेटा स्कूल से आते समय थोड़ा दूध ले आना।
धन्यवाद, आपकी मदद के लिए बहुत शुक्रिया।
हमारी बैठक शाम 5 बजे है, कृपया समय पर आइए।
आपका नाम सूची में लिख लिया है, कल शादी में जरूर आना।
मैं 20 मिनट में पहुँच रहा हूँ, चाय बना लो।
कृपया अपना पता भेज दीजिए, हम सामान भिजवा देंगे।
आज का मैच देखा? विराट ने कमाल कर दिया।
भाई कल का असाइनमेंट भेज दो, मेरी पेन ड्राइव खराब हो गई।
आपकी बेटी की शादी का कार्ड मिल गया, बहुत बहुत बधाई।
हम लोग रविवार को मंदिर जा रहे हैं, आप भी चलिए।
आपका डॉक्टर का अपॉइंटमेंट कल 11 बजे पक्का हो गया है।
छोटे को बुखार है, दवा ले ली है, आप चिंता मत कीजिए।
दुकान पर दो किलो चावल और एक लीटर तेल भिजवा दीजिए।
तुम्हारा नाम क्या है बेटा? कौन सी कक्षा में पढ़ते हो?
कल दिवाली की छुट्टी है, बैंक और दफ्तर बंद रहेंगे।
कृपया यह फोटो घर के ग्रुप में भेज देना।
आपकी टैक्सी 5 मिनट में पहुँच रही है, ड्राइवर का नाम रमेश है।
दादी की तबीयत ठीक है, आप फिक्र न करें।
मैं आज रात 9 बजे की ट्रेन से आ रहा हूँ।
क्या हम कल 4 बजे मिलें? आप कहाँ रहते हैं?
मैंने आपको कल फोन किया था, आप कहाँ थे?
आपकी किताब मैंने पुस्तकालय में वापस कर दी है।
पूजा का प्रसाद कल सुबह मिलेगा, आप आ जाना।
हमारे यहाँ रविवार को हवन है, आप परिवार के साथ पधारिए।
भैया थोड़ा धीरे चलाइए, मुझे जल्दी नहीं है।
मेरी छुट्टी कल से शुरू है, तब मिलते हैं।
यह विधि बहुत अच्छी है, आप भी आज़माइए।
गैस सिलेंडर कल आ जाएगा, डिलीवरी वाला पहले फोन करेगा।
आज तेज बारिश है, स्कूल की छुट्टी हो गई है।
आपको जल्दी स्वस्थ होने की शुभकामनाएँ, अपना ख्याल रखिए।
बच्चों की परीक्षा कल से शुरू है, उन्हें सुबह जल्दी उठा दीजिए।
आपका पासपोर्ट अपॉइंटमेंट 15 तारीख को है, मूल दस्तावेज साथ लाना।
मैं दफ्तर से निकल गया हूँ, घर पहुँचकर फोन करता हूँ।
कल बिजली का काम है इसलिए सुबह 10 से 2 बजे तक बिजली नहीं रहेगी।
कृपया यह फॉर्म भरकर कल तक स्कूल में जमा कर दीजिए।
आप सब का स्वागत है, कृपया अंदर आइए और बैठिए।
कल बैंक बंद है, परसों काम हो जाएगा।
यह दवा दिन में तीन बार खाने के बाद लेनी है।
""".strip().splitlines()

ENGLISH = """
What is your name? Please tell me the time of tomorrow's class.
Please come to the station at 8 tomorrow morning, I will pick you up.
Mom said to bring some curd on your way back in the evening.
Your order is ready, you can collect it from the shop tomorrow.
Are you going to the doctor tomorrow? I would like to come along.
Thank you so much for your help, I really appreciate it.
Our meeting is at 5 pm today, please be on time.
I will reach in 20 minutes, please put the tea on.
Please send me your address, we will arrange to deliver the goods.
Did you watch the match today? What a performance.
Your doctor appointment is confirmed for tomorrow at 11 am.
Please share these photos in the family group.
Your taxi will arrive in 5 minutes, the driver is Ramesh.
I am leaving the office now, I will call you when I get home.
Tomorrow is a holiday for Diwali, banks and offices will be closed.
Your passport appointment is on the 15th, please carry the original documents.
The exam starts tomorrow, please make sure the kids wake up early.
Please fill this form and submit it at the school office by tomorrow.
There will be no electricity tomorrow from 10 am to 2 pm due to maintenance work.
Take this medicine three times a day after meals.
""".strip().splitlines()


def main() -> None:
    index, warns = leak_check.build_index(leak_check.DEFAULT_FROZEN, ROOT)
    if not leak_check.DEFAULT_FROZEN.is_dir():
        print("ERROR: frozen evaluation directory missing; refusing to write generated data.", file=sys.stderr)
        sys.exit(2)
    rows, seen = [], set()
    for lang, lines in (("hinglish", HINGLISH), ("hindi", HINDI), ("english", ENGLISH)):
        for k, text in enumerate(lines):
            text = text.strip()
            if text and text not in seen:
                seen.add(text)
                rows.append({"text": text, "label": 0, "lang": lang, "group": f"everyday:{lang[:2]}:e{k}"})
    kept = [r for r in rows if not index.match(r["text"])]
    print(f"frozen-text filter: kept {len(kept)} of {len(rows)} rows")
    with open(ROOT / "data" / "team" / "everyday_v3.csv", "w", encoding="utf-8", newline="") as fp:
        w = csv.DictWriter(fp, fieldnames=["text", "label", "lang", "group"])
        w.writeheader(); w.writerows(kept)
    langs = {l: sum(1 for r in kept if r["lang"] == l) for l in ("english", "hindi", "hinglish")}
    print(f"wrote {len(kept)} rows to data/team/everyday_v3.csv {langs}")


if __name__ == "__main__":
    main()
