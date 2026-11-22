# Test scripts for a team of four

Four testers, each with a complete script: exact inputs, exact expected results, and where to write the outcome. Estimated time in brackets. Test IDs (A1, B3, ...) are used in the results log `docs/test_results_template.csv` and in bug reports.

| Tester | Area | Time |
|---|---|---|
| **A** | App shell, offline behaviour, installing, accessibility | about 2 h |
| **B** | Message detector accuracy, and an independent challenge set | about 3 h |
| **C** | Call detector, call recordings, QR checker, "on a call right now" card | about 3 h |
| **D** | Reporting, lessons and quiz, trends and privacy, Hindi and Chhattisgarhi review, usability sessions | about 3 h |

## Before you start (everyone)

1. Get the code and install once:
   ```bash
   git clone https://github.com/Headhunte-121/Hack-a-sol-specter
   cd Hack-a-sol-specter
   pip install -r services/api/requirements.txt
   ```
   Install Node.js 20+ and Python 3.11+ if you do not have them.
2. Double-click `start-all.bat`. Answer **N** to the transcription question unless your script says otherwise (Tester C answers **y**). Wait for "Web app: http://localhost:4173".
3. Open **http://localhost:4173** in Chrome. Use `stop-all.bat` when you are done.
4. Open DevTools with **F12**. You will use two tabs: **Network** (to see requests) and **Application** (storage, service worker, manifest).
5. Test in a fresh state when a script says "fresh": DevTools > Application > Storage > **Clear site data**, then reload.
6. For every test write **Pass**, **Fail** or **Blocked** in the results log. For a Fail write what you saw and add a screenshot.

### How to report a bug (one line each is enough)
`Tester / test ID / screen / language / device / what you did / what you expected / what happened / screenshot file`

### Pass rules
A test passes only if every "Expected" item is true. If something is correct but confusing, mark Pass and add a note under "Confusing".

---

# Tester A: app shell, offline, install, accessibility

**Needs:** a laptop with Chrome. For A8 to A11 also an Android phone with Chrome and a hosted HTTPS link (see A8).

| ID | Do this | Expected |
|---|---|---|
| **A1** (fresh) | Open the app. | Teal header "Specter: Scam Shield"; one line "Check messages, calls and QR codes. Works offline."; a status box; six tiles (Check a Message, Check a Call, Report a Scam, Learn and Quiz, Scam Trends, Check a QR); a red button "On a call right now?". |
| **A2** | Watch the status box for about 10 seconds. | It starts red or amber ("Not ready offline yet..." or "Getting ready for offline use..."), then turns green "Ready to use offline". It also shows "Online". |
| **A3** | Click **हिन्दी**, then **छत्तीसगढ़ी**, then **English**. After each click look at the whole home screen and the footer. | Every label, tile name, the status text and the footer change language at once. No page reload, no blank labels, no text like `tile.message` anywhere. Devanagari text is fully readable (no boxes). |
| **A4** | Choose हिन्दी, reload the page (F5). | Still Hindi. |
| **A5** | Application > Service Workers: tick **Offline**. Reload. Then open **Check a Message**, tap the chip "Bank debit alert". | The home screen loads while offline. The result says "Looks genuine". The status box shows "Offline". |
| **A6** (offline still ticked) | Open **Learn and Quiz**, open lesson 1, press Back. Then **Report a Scam**, choose "I am only checking". | Lessons and the reporting guide open with no errors. |
| **A7** | Application > Storage > **Clear site data**, reload (online). Wait for green. Footer > **Settings and privacy**. Tap **Delete all my data on this phone**, confirm. Reload. | The page shows "All data on this phone was deleted." After reload the language is back to the default and the status goes red/amber then green again. |
| **A8** | Deploy `apps/web/dist` to Netlify or Vercel (drag and drop the folder; build first with `npm run build` in `apps/web`). Open the https link on an Android phone in Chrome. | The app opens. Chrome offers "Install app" or "Add to Home screen". |
| **A9** (phone) | Add to home screen. Open it from the icon. | Opens full screen with no address bar and the shield icon. |
| **A10** (phone) | Wait for green "Ready to use offline". Turn on **airplane mode**. Open the app icon. Run: Check a Message (any chip), Learn and Quiz (full quiz, 12 questions), Report a Scam, "On a call right now?". | Everything opens and works. The status box shows "Offline". |
| **A11** (phone) | In airplane mode open **Scam Trends** and **Check a Call > Audio**. | Trends shows "No connection: showing the last saved copy" or the not-connected note, never a blank crash. The Audio tab explains the service is not connected or needs internet. The **Paste text** and **Examples** tabs still work. |
| **A12** | Change any English text in `apps/web/src/i18n/en.json` (for example the `home.tagline`), run `npm run build` in `apps/web`, reload the open tab twice. | A banner "A new version is ready." with **Refresh now** and **Later**. **Later** hides it. **Refresh now** reloads with the new text. Revert your change afterwards (`git checkout apps/web/src/i18n/en.json`). |
| **A13** | Application > Manifest. | Name "Specter: Scam Shield", short name "Specter", start URL `/`, display `standalone`, three icons (192, 512, maskable 512), no errors or warnings under Installability. |
| **A14** | DevTools > **Lighthouse**: run Accessibility, Best practices and SEO (mobile). | Accessibility 90 or higher. Write down all three scores and any listed failures. (Lighthouse no longer has a separate PWA score; A13 covers installability.) |
| **A15** (accessibility) | Chrome > Settings > Appearance > Font size **Very large**, then zoom the page to 200%. Go through the home screen and the message screen. | Text and buttons stay readable; nothing is cut off; no horizontal scrolling. |
| **A16** | Press **Tab** repeatedly from the top of the home screen. | Focus moves through language buttons, tiles, the red button, footer link in a sensible order, and a visible orange outline shows where you are. |
| **A17** | On the phone, use the app with one hand: reach the Back button, the main buttons and the quiz answers with your thumb. | Buttons are easy to hit (at least about 48 px). Note any that are not. |
| **A18** | Turn on TalkBack (Android) or a screen reader. Run a message check. | The result is read out including the verdict ("Likely scam" / "Looks genuine"). Note anything unlabelled. |
| **A19** | Rotate the phone and shrink the window to 320 px wide on the laptop. | No overlapping or cut-off content. |
| **A20** | Click through every tile on the home screen once, plus the footer link. | Every tile opens its screen; the Back button always returns; no screen is blank. |

**Confusing / suggestions:** write them in the results log.

---

# Tester B: message detector and the independent challenge set

**Needs:** the app running. **Language:** test in all three; note the language you used for each row. For each pasted message use **Check** and read the result card.

## B1: the eight example chips (fresh)

Tap each chip on **Check a Message**. Expected:

| Chip | Expected band |
|---|---|
| KYC (Hinglish) | Likely scam |
| डिजिटल अरेस्ट | Likely scam |
| Lottery (English) | Likely scam |
| Bank debit alert | Looks genuine |
| OTP message | Looks genuine |
| OTP (Hinglish) | Looks genuine |
| Delivery update | Looks genuine |
| Fake bank link | Likely scam |

For every result also check: at least one **reason** in the active language (switch language and see it change); for scams highlighted words in the text and a "Words that raised the risk" line; buttons **Report this scam** (scams only) and **Learn about this scam**; the line "Checked on your phone. Nothing was sent anywhere."

## B2: easy set (28 messages)

Paste each message exactly. Truth is given; record the band the app shows. **Pass criterion: at least 90% correct** (a scam shown as "Likely scam" or "Suspicious" counts as correct; a genuine message must show "Looks genuine").

**English, scams (truth: scam)**
1. `URGENT: Your Axis Bank account is temporarily locked. Verify your details within 2 hours at http://axis-verify.help to avoid closure.`
2. `You have won a free iPhone 15! Click bit.ly/iph15win to claim before midnight. Limited offer.`
3. `This is the customs department. A parcel in your name has been seized for containing illegal items. Pay Rs 25,000 fine today or face arrest.`
4. `Hello, we are hiring for work from home. Earn Rs 4000 per day by rating products. Join our Telegram group now.`
5. `Your SIM will be disconnected in 24 hours due to incomplete KYC. Call 8888877777 to update.`
6. `Congratulations! Your number won Rs 10 lakh in the lucky draw. Send Rs 2000 processing fee to claim your prize.`

**English, genuine (truth: genuine)**
7. `Your OTP for Swiggy login is 556677. Valid for 10 minutes. Do not share it with anyone.`
8. `Rs 3,499 has been debited from your account XX5678 on 21-Nov for a UPI payment to Reliance Retail. Not you? Call 1800 111 109.`
9. `Your IRCTC ticket is confirmed. PNR 2845109673. Train 12879 departs Raipur at 18:20 on 24 Nov.`
10. `Reminder: Your dental appointment is tomorrow at 4 pm at Sunrise Clinic.`

**Hindi, scams**
11. `आपका बैंक खाता बंद होने वाला है। अभी इस लिंक पर क्लिक करके अपना केवाईसी पूरा करें: http://sbi-kyc.top`
12. `बधाई हो! आपने 25 लाख रुपये की लॉटरी जीती है। इनाम पाने के लिए अभी 5000 रुपये प्रोसेसिंग फीस भेजें।`
13. `मैं सीबीआई से बोल रहा हूँ। आपके आधार कार्ड का इस्तेमाल अपराध में हुआ है। गिरफ्तारी से बचने के लिए तुरंत 40000 रुपये ट्रांसफर करें।`
14. `घर बैठे रोज़ 3000 रुपये कमाएं। टेलीग्राम ग्रुप जॉइन करें, सीमित सीटें हैं।`
15. `आपका बिजली कनेक्शन आज रात कट जाएगा। तुरंत इस नंबर पर कॉल करें: 9988776655`

**Hindi, genuine**
16. `आपके खाते XX2345 में 21 नवंबर को Rs 18,500 वेतन जमा हुआ।`
17. `आपका ओटीपी 774411 है। यह 5 मिनट के लिए मान्य है। कृपया इसे किसी के साथ साझा न करें।`
18. `आपका गैस सिलेंडर कल सुबह तक पहुँच जाएगा।`
19. `कल शाम 6 बजे स्कूल में अभिभावक बैठक है। कृपया समय पर पहुँचें।`

**Hinglish, scams**
20. `Dear customer aapka PAN link nahi hai, aaj hi update karo warna account band ho jayega. Link: tinyurl.com/pan-up`
21. `Aapka parcel customs me ruka hai. Fine Rs 15,000 turant pay karo, nahi to arrest ho jayega.`
22. `Congrats! Aapne lottery jeeti hai Rs 5 lakh. Prize ke liye pehle Rs 3000 tax bhejo.`
23. `Bhai mera phone kho gaya, naya number hai. Abhi Rs 10,000 bhej do, kal wapas kar dunga.`
24. `Aapki credit card ki limit badh gayi hai. Activate karne ke liye OTP aur CVV bataiye.`

**Hinglish, genuine**
25. `Aapke login ka OTP 902134 hai. Ise kisi ke saath share na karein. - ICICI Bank`
26. `Aapka Zomato order 10 minute me pahunch jayega. Delivery partner: Ravi.`
27. `Reminder: kal subah 10 baje doctor ke saath appointment hai.`
28. `Aapke account me Rs 2,000 credit hue. Available balance Rs 14,320.`

## B3: hard set (12 messages)

These are meant to be difficult. **A few mistakes are expected.** Pass criterion: at least 60% correct, and write down every miss: it tells us what to improve.

**Scams (truth: scam)**
1. `Hi Mum, I dropped my phone in water, this is my new number. Can you send Rs 8000 to this account urgently? I will explain later.`
2. `Sir your gas subsidy is pending. Update your bank details on this page to receive it: gasbenefit-india.in.net`
3. `Hello, your courier could not be delivered due to incomplete address. Reschedule here: http://dtdc-redeliver.top/r`
4. `आपकी पीएम किसान की क़िस्त रुकी हुई है, अपना आधार नंबर इस नंबर पर भेजें: 9876501234`
5. `Bhai galti se tumhare UPI me Rs 7000 chale gaye, wapas bhej do please, nahi to complaint kar dunga.`
6. `Your Aadhaar is linked to a money laundering case. Officer will call you in 10 minutes. Do not tell anyone.`

**Genuine (truth: genuine)**
7. `Your Uber ride is arriving. Share OTP 4821 with your driver to start the trip.`
8. `HDFC Bank: Your KYC is due. Please visit your nearest branch with your ID proof. Do not share OTP or click on links sent by anyone.`
9. `Rs 500 cashback has been credited to your PhonePe wallet. Thanks for using PhonePe.`
10. `आपका आधार अपडेट अनुरोध प्राप्त हो गया है। स्थिति देखने के लिए uidai.gov.in पर जाएँ।`
11. `Your electricity bill of Rs 1,860 is due on 28 Nov. Pay on the official portal or at the nearest office.`
12. `Hi, this is Ramesh from SBI Raipur branch. Your passbook is ready, you can collect it anytime this week.`

## B4: odd inputs

| ID | Input | Expected |
|---|---|---|
| B4a | Leave the box empty | The **Check** button is disabled |
| B4b | `<script>alert(1)</script> your KYC will be blocked, click bit.ly/x` | The tag is shown as plain text; no alert pops up; the result appears |
| B4c | `😀😀😀😀` | No crash; a result or a sensible message |
| B4d | `http://hdfc-secure-login.xyz/verify` | "Likely scam" with reasons about the link (look-alike bank name, odd ending) |
| B4e | `https://www.hdfcbank.com/personal` | Not "Likely scam" |
| B4f | `https://bit.ly/3xYz9` | At least "Suspicious" with the shortened-link reason |
| B4g | Paste about 2000 characters of any text | No crash, result within about a second |
| B4h | `kyc kyc kyc kyc kyc` | No crash |
| B4i | Mixed: `आपका account block ho jayega, KYC update karo abhi` | A scam verdict; language shown as Hinglish or Hindi |

## B5: privacy check
DevTools > Network. Clear the list. Check three different messages. **Expected: no network request appears at all** (only the first page load before you cleared the list). Note any request that appears.

## B6: feedback and speed
Press 👍 and 👎 on two results: "Thanks. Saved on your phone only." appears; Network shows nothing. On a 🔊 result (scams) the speaker button reads the warning aloud. Typing a message and pressing Check shows a result in about one second.

## B7: write the independent challenge set (the most valuable task)

1. Create `data/challenge_team.csv` with the columns `text,label,lang` (label `1` scam, `0` genuine; lang `english`, `hindi` or `hinglish`).
2. Write **at least 60 messages**, close to half scams and half genuine, **without looking at** `data/team/`, `ai tuning/data/` or the examples above. Include:
   - scams in new wording and new topics (gas subsidy, insurance bonus, EMI, fake job fee, fake refund, crypto, scholarship, relative in trouble);
   - **genuine messages that look scary**: real-style bank OTPs, debit/credit alerts, delivery notices, utility bills, appointment reminders, a branch asking you to visit for KYC, a bank warning "never share your OTP".
3. Rules: rewrite from a pattern; **no real phone numbers, names or account details**; no copying real messages.
4. Follow `data/LABELING.md`. Ask a second person to label 10% independently and note the agreement.
5. Run `cd ml && python build_corpus.py && python evaluate.py` (needs the downloaded datasets; if not available send the CSV to the developer). The report then shows a `challenge_team` row. **Do not retrain on this file.**

---

# Tester C: calls, recordings, QR codes, call card

**Needs:** a phone or microphone for recordings; for C5 start the app with **y** to the transcription question (first audio upload downloads a 75 MB speech model, so allow a few minutes; it needs internet once).

## C1: the sixteen example calls

**Check a Call > Examples.** Tap each. Expected:

| Example | Expected result | Script name |
|---|---|---|
| Fake KYC call (Hinglish) | Likely scam call | Fake KYC / bank call |
| फ़र्ज़ी केवाईसी कॉल (हिन्दी) | Likely scam call | Fake KYC / bank call |
| Fake KYC call (English) | Likely scam call | Fake KYC / bank call |
| डिजिटल अरेस्ट कॉल (हिन्दी) | Likely scam call | Digital arrest / fake police call |
| Digital arrest call (Hinglish) | Likely scam call | Digital arrest / fake police call |
| Digital arrest call (English) | Likely scam call | Digital arrest / fake police call |
| Fake courier / customs call (Hinglish) | Likely scam call | Fake courier / customs call |
| फ़र्ज़ी कस्टम / कूरियर कॉल (हिन्दी) | Likely scam call | Fake courier / customs call |
| Fake customs call (English) | Likely scam call | Fake courier / customs call |
| Genuine bank service call (Hinglish) | "No known scam script heard" | none |
| Genuine delivery call (Hinglish) | "No known scam script heard" | none |
| परिवार का कॉल (हिन्दी) | "No known scam script heard" | none |
| Genuine hospital reminder (English) | "No known scam script heard" | none |
| Genuine bank branch call about KYC (Hindi) | "No known scam script heard" | none |
| Genuine bank fraud-awareness call (English) | "No known scam script heard" | none |
| Genuine electricity bill reminder (Hinglish) | "No known scam script heard" | none |

For each scam result also check:
- the **"What was heard"** list ticks at least two stages (✔);
- the transcript shows **timestamps** (0:00, 0:06, ...) and **highlighted phrases**;
- tapping a phrase chip scrolls to it in the transcript;
- **Copy a note for the report** copies text with the date, the script name and time-coded phrases and no phone numbers;
- **Report this call** opens the reporting guide.

## C2: paste your own transcripts

On **Paste text** paste each and press **Analyse**. Record the verdict.

1. `Sir main bank officer bol raha hoon, aapka account block ho jayega, abhi OTP bataiye` — expect: likely scam.
2. `Hello this is your bank, your KYC is expired, install AnyDesk so we can fix it` — expect: likely scam.
3. `I am calling about your parcel, it has drugs, you are under digital arrest, do not tell anyone` — expect: likely scam.
4. `bank` — expect: **not** likely scam (one word never triggers).
5. `मैं पुलिस स्टेशन गया था` — expect: not likely scam.
6. `Please never share your OTP with anyone, this call is only to inform you` — expect: not likely scam.
7. Your own invented scam in your own words — record what happens.
8. Your own invented genuine call (delivery, doctor, relative) — record what happens.

## C3: the call-card and trust checks

- A scam result shows advice "Hang up..." and a genuine result shows "No check is perfect...".
- Press 👍/👎: "Thanks. Saved on your phone only."

## C4: record the 12 clips (see `docs/call_clips.md` for scripts)

Record **3 fake KYC, 3 digital arrest, 3 courier/customs, 3 genuine** (bank service, delivery, family; one of the genuine ones should be a "we never ask for your OTP" call). 30 to 90 seconds each. Use teammates who agree; no real people's calls or numbers. Record some through a phone speaker and some with background noise. Save as `clips/kyc_1.wav` ... and write the exact words for **four** of them in `clips/<name>.txt`. Make `clips/manifest.csv`: `file,expected_script,expected_level` (`fake_kyc` / `digital_arrest` / `courier_customs`, level `high`; empty script and `low` for genuine). **Keep the clips out of Git.**

## C5: transcription

1. Start the app with **y**. Check http://localhost:8001/health returns `"status":"ok"`.
2. Run:
   ```bash
   cd services/asr
   python eval_clips.py ../../clips http://localhost:8001
   ```
   Record the seconds per clip, the transcript quality, and the **word error rate** on the four reference clips.
3. In the app: **Check a Call > Audio** > choose a clip file. Expected: a status "Waking up the service..." or "Sending the audio...", then the result with a transcript, a verdict and flagged phrases.
4. Record the verdict for each of the 12 clips in the results log (use the columns: clip, transcript right?, verdict, phrases flagged, missed or false alarm and why). Expected overall: every scam clip flagged with the right script, or note which were missed and why; **no genuine clip flagged high**.

## C6: audio error handling

| ID | Do this | Expected |
|---|---|---|
| C6a | Choose a `.txt` or `.pdf` file | "This file type is not supported..." |
| C6b | Choose an audio file larger than 5 MB | "The file is too big (limit 5 MB)." |
| C6c | Choose a clip longer than 3 minutes | "The clip is too long (limit 3 minutes)." |
| C6d | Choose a silent clip | "No speech was found in this audio." |
| C6e | Press **Record now**, refuse the microphone permission | "Microphone permission was refused. You can choose a file instead." |
| C6f | Press **Record now**, allow, speak 10 seconds, **Stop recording** | Transcript and verdict |
| C6g | Stop the service (`stop-all.bat`), start the app only, try an upload | A clear failure message with **Paste text instead**; Examples and Paste still work |
| C6h | Start an upload, press **Cancel** | The status disappears; no error |

## C7: QR checker

Open `docs/qr-test-codes/` (PNG files). Show each on a screen or print them. In the app: **Check a QR**, then **Choose a picture of a QR code** (or **Scan with the camera**; the camera works on `localhost` and on https). Expected for each:

| File | Expected |
|---|---|
| shop_with_amount.png | Kind "UPI payment code"; "Something looks unusual"; the preset-amount warning |
| shop_static.png | "Nothing unusual found in the structure of this code" and the line that this does not mean the payee is honest |
| tampered_refund.png | "Look carefully before you go on"; refund/reward note warning and preset amount |
| odd_handle.png | "Something looks unusual"; unusual address ending |
| no_name_big_amount.png | "Something looks unusual"; no payee name, preset amount, large amount |
| malformed.png | "Look carefully before you go on"; incomplete or malformed |
| lookalike_link.png | Kind "Web link"; "Look carefully..." with look-alike and odd-ending reasons |
| official_link.png | "Nothing unusual found..." |
| plain_text.png | Kind "Plain text"; "Nothing unusual found..." |
| shortened_link.png | "Something looks unusual"; shortened link reason |

Also check: the result **never uses the word "safe"**; the fields (payee address, name, amount, note) are shown; typing an "expected name" such as `Sunita Medical` before scanning `shop_static.png` adds a **name does not match** warning; scanning a picture with no QR shows "No QR code found..."; refusing the camera permission shows the message with the picture option; the camera stops after a code is read. Try a blurry, rotated or dark photo of a code and note whether it reads.

## C8: "On a call right now?" card

Tap the red button on the home screen (also test with the network offline). Expected: five large numbered steps in the active language; **Take a 60 second pause** counts down from 60 and ends with "Time is up..."; 🔊 reads the steps aloud; **Report this call** opens the reporting guide.

---

# Tester D: reporting, lessons, trends and privacy, language review, usability

**Needs:** the app running (with the demo data from `start-all.bat`).

## D1: reporting routes (Report a Scam)

For each choice write what the first button is and the order of the steps.

| ID | Choice | Expected card title | First button | First step |
|---|---|---|---|---|
| D1a | "Money has left my account" | Call the 1930 helpline now | 📞 Call 1930 (on a laptop it shows "Dial 1930 from your phone: 1930") | Call 1930 and tell them what happened |
| D1b | "No money lost yet" then "No, I shared nothing" | Report it on Chakshu (Sanchar Saathi) | 🌐 Open Chakshu | Report the number and message on Chakshu |
| D1c | "No money lost yet" then "Yes, I shared something" | Call your bank first, then 1930 | 📞 Call 1930 | Call your bank and card or UPI provider |
| D1d | "Harassment, fake profile or other cybercrime" | File on cybercrime.gov.in | 🌐 Open cybercrime.gov.in | Then file a complaint on cybercrime.gov.in |
| D1e | "I am only checking" | Good: nothing has happened | 🎓 Open the lessons | Read the safety tips... |

For each card also check: the yellow warning "Nobody from a bank, the police or a courier service will ask for your OTP..."; "Last verified: 22 Nov 2026"; at most **two questions** in total; no screen asks for a name, account number or phone number; **Start again** works.

Also: reaching a channel **from a flagged result in three taps or fewer** (Check a Message > a scam chip > Report this scam > choose option > card).

## D2: checklist and summary

- On D1a tick two checklist items, leave the screen, come back: **the ticks are still there**.
- The **Summary to paste into the report** shows date, type, "Looks like", "Warning signs", "Words seen". It contains **no phone numbers**. **Copy** shows "Copied". Paste it into Notepad to confirm.
- Switch the language: the summary and checklist change.

## D3: verify the official channels (needs internet)

Open each and write what you see and the date:
1. National Cyber Crime Helpline **1930**: confirm the number and that it is the national cyber fraud line.
2. **https://cybercrime.gov.in**: opens the national cybercrime reporting portal.
3. **https://sancharsaathi.gov.in/sfc/**: the Chakshu "Report Suspected Fraud Communication" page; confirm what it says it covers and whether any time window (such as 30 days) is stated.
4. Update `LAST_VERIFIED` and any wrong detail in `apps/web/src/report/channels.ts` and the wording in `apps/web/scripts/strings_report.py`, or send the differences to the developer.

## D4: lessons and quiz

| ID | Do this | Expected |
|---|---|---|
| D4a | Open **Learn and Quiz** | Seven lessons listed; each lesson shows an example, "Warning signs", "What to do", a **Read aloud** button, **Mark as done**, **Take the quiz** |
| D4b | Mark lesson 1 done, go back | "Done" tick on lesson 1 |
| D4c | **Take the quiz (12 questions)** | One question per screen; "Question 1 of 12"; large answer buttons; after answering an immediate explanation with "Correct!" or "Not quite." |
| D4d | Finish by always choosing the **first** answer | Score card "Your Digital Financial Literacy Score" with a number usually below 40 and level "Beginner"; topic bars; "Weakest topic: ..." and a button to that lesson |
| D4e | **Try again**, answer carefully using the explanations you saw | A higher score; "Previous score: ..." is shown |
| D4f | Offline mode (DevTools > Application > Service Workers > Offline) | Complete quiz works offline; the same answers give the same score (repeat with identical answers if you can) |
| D4g | Settings > Delete all my data | Lesson ticks and quiz history are gone |
| D4h | Over 3 quizzes | Questions do not repeat inside a quiz and mostly do not repeat across consecutive quizzes |
| D4i | Open a scam result in **Check a Message** and press **Learn about this scam** | The matching lesson opens (KYC message opens "Fake KYC and bank calls") |

## D5: trends and privacy (demo data from `start-all.bat`)

| ID | Do this | Expected |
|---|---|---|
| D5a | Open **Scam Trends** | Yellow banner "DEMO DATA: these numbers are made up..."; tabs Overview, Over time, Districts, About the data |
| D5b | Overview | A number for the last 7 days, change from the week before, top three scam types, a "Rising" list, and the note "...small group(s) are hidden to protect privacy." |
| D5c | Over time | A line chart (digital arrest rising); **View as a table** shows the same data |
| D5d | Districts | A bar chart of districts (Raipur high); **View as a table** works; very small districts such as Sukma or Narayanpur do **not** appear |
| D5e | Filters | Choosing a district or channel changes the numbers; "Not enough reports yet..." appears if nothing qualifies |
| D5f | About the data | Says what is collected (scam type, channel, district, the hour) and never collected (message text, phone numbers, names, audio, exact location), the small-group rule, and that figures are indicative |
| D5g | Fresh start (clear site data). Check Message > "KYC (Hinglish)". | Under the result a card "Share anonymous scam counts?" with two buttons; sharing is **off** until you choose |
| D5h | Network tab open. Press **Do not share**. Check more messages. | **No request to port 8000** carries any report data |
| D5i | Settings and privacy > choose **Share anonymous counts**. Check a scam message, pick a district, press **Add an anonymous count** | "Saved on your phone. It will be sent when you are online." Network shows one POST to `/reports/batch` containing only `scam_category`, `channel`, `region_code`, `risk_band`, `client_batch_id`, **no message text** |
| D5j | In the Network tab tick **Offline**, add another count, then untick Offline | The report is sent after reconnecting, **once** (check the API log in the black window: one POST per report; the same report is never sent twice) |
| D5k | Turn sharing off in Settings | Nothing further is sent, and anything queued is discarded |
| D5l | Open http://localhost:8000/docs and look at the endpoints | There is **no endpoint that lists raw reports**; `GET /reports` returns 405 |

## D6: Hindi and Chhattisgarhi review

Needs a native Chhattisgarhi speaker (a family member is fine) and a Hindi speaker.

1. Open `docs/cg_review.csv` in Excel or Google Sheets (530 rows: key, English, Hindi, Chhattisgarhi current).
2. For each row read the Chhattisgarhi. If it is wrong, unnatural or hard to understand write the fix in **chhattisgarhi_corrected**. Do the same for Hindi in **hindi_corrected**. Use the notes column for comments.
3. Rules: keep wording simple; never change the meaning of a safety instruction; keep numbers such as 1930 and the words OTP, PIN, UPI as people say them locally.
4. Priority order: lessons and quiz rows (`lessons.`, `quiz.`), then the reporting rows (`ui:report`, `ui:step`, `ui:ck`), then the detector reasons (`ui:reason`), then everything else.
5. Also read the app itself on a small phone in each language and note any text that is cut off or in the wrong font.
6. Send the corrected CSV to the developer to apply (or edit the `.py` files under `apps/web/scripts/` and run the content check: `cd apps/web && npm run check:content`).

## D7: usability sessions (three people outside the team, 10 minutes each)

Give each person a phone with the app open on the home screen and say only: "This app helps you check suspicious messages and calls. Please do these tasks and say aloud what you are thinking." Do not help. Write down where they hesitate.

Tasks:
1. "You got this SMS. Find out if it is a scam." (give them the KYC (Hinglish) text)
2. "A caller says your parcel has drugs and you must pay. Check this call." (use an example call)
3. "You lost money to a scam. Find what to do."
4. "Find the lesson about OTP safety and finish a short quiz."
5. "Change the language to Chhattisgarhi."

Record per person: tasks finished unaided (yes/no), time, where they hesitated, what they did not understand, their language, age group, phone experience. **Pass: all five tasks finished unaided by at least two of three people**, and the reporting guide reached in under two minutes.

---

## Results and sign-off

- Fill `docs/test_results_template.csv` (copy it to `test_results_<name>.csv`) and send it, or commit it under `docs/results/`.
- A tester's work is done when every test in their section is marked Pass, Fail or Blocked and every Fail has a bug line.
- Do not edit the code while testing. Send bugs; the developer fixes them in batches.
