# Installing Suraksha

There are two ways to use Suraksha. The **web app** works on any phone or computer and needs no special permission. The **Android app** adds automatic inbox checking, but Google Play Protect blocks it, so installing it means turning Play Protect scanning off for a moment. Read the warnings first.

## Read this first

> [!WARNING]
> **Google Play Protect blocks this APK.** It [automatically blocks installs from internet sources](https://developers.google.com/android/play-protect/warning-dev-guidance) (browsers, messaging apps, file managers) of apps that ask for `RECEIVE_SMS`, `READ_SMS`, notification access or accessibility. Suraksha declares the first three, because that is how it checks your messages. The protection was [piloted in India](https://blog.google/intl/en-in/products/launching-enhanced-fraud-protection-pilot-in-india/), and Google reported [expanding it to 185 markets](https://blog.google/security/keeping-google-play-android-app-ecosystem-safe-2025/) in 2025.
>
> **To install the APK you have to turn Play Protect scanning off, install, and turn it back on.**
>
> - While it is off, your phone is less protected. Install only Suraksha, from this repository or the project website, and switch it back on straight away.
> - **Never turn it off because a caller, a message or a stranger asked you to.** That is a common scam step.
> - If you would rather not, use the web app below. Nothing needs to be turned off.

> [!IMPORTANT]
> - Suraksha is a **hackathon prototype**. It is not audited or certified, and it can be wrong in both directions. Never share an OTP, PIN or card detail because an app said a message looked genuine.
> - The APK is **not on the Play Store**. Take it only from this repository or https://hack-a-sol-specter.vercel.app.
> - It is signed with a **hackathon key kept in this public repository**. Anyone could sign a different file with it, so check where your file came from and compare the checksum below.
> - **Android developer verification:** from September 2026 in selected regions for participating stores, and globally in 2027, apps from unverified developers can be installed only with Android's [advanced flow](https://developer.android.com/developer-verification/guides/faq) (a one-time setup with a one-day wait) or with ADB.

## Option A: the web app (recommended if you are unsure)

| Device | Steps |
|---|---|
| Android (Chrome) | Open https://hack-a-sol-specter.vercel.app → menu **⋮** → **Install app** or **Add to Home screen** |
| iPhone (Safari) | Open the site → **Share** → **Add to Home Screen** |
| Computer (Chrome or Edge) | Open the site → install icon in the address bar |

Open it once while online. After that, message checks, the QR checker, lessons, the quiz and the reporting guide work with no connection. You can also share text to it from other apps on Android.

The web app **cannot** read your SMS, Chat or WhatsApp messages. You paste or share the text yourself.

## Option B: the Android app

**You need:** Android 7.0 or newer, about 15.7 MB of space.

1. **Download.** On the phone, open https://hack-a-sol-specter.vercel.app/suraksha.apk (the same file is in the repository at `apps/web/public/suraksha.apk`). If you can, [check the file](#check-the-file-you-downloaded) before installing.
2. **Turn Play Protect scanning off.** Open the **Play Store** → your **profile icon** → **Play Protect** → **Settings** (gear) → switch off **Scan apps with Play Protect** ([Google's steps](https://support.google.com/android/answer/2812853); names vary a little between phones).
3. **Install.** Open the downloaded file. Android asks you to allow **Install unknown apps** for the app that downloaded it. Allow it and install.
4. **Turn Play Protect back on** in the same place as step 2, and switch **Install unknown apps** off again (**Settings → Apps → Special app access → Install unknown apps**). Do this before anything else. Play Protect may warn about Suraksha again afterwards, for the same reason.
5. **Open Suraksha** and choose Hindi, Chhattisgarhi or English.
6. **SMS access (optional).** Tap **Check** and allow SMS so the app can check your inbox. The text is scored on the phone. Say no and everything else still works.
7. **Chat and WhatsApp (optional).** When the app offers it, switch on **Notification access** for Suraksha. On Android 13 and later the switch can be greyed out for apps installed from a file:
   1. **Settings → Apps → Suraksha**
   2. **⋮** (More) → **Allow restricted settings**, then confirm
   3. Go back and switch Notification access on

   ([Android help](https://support.google.com/android/answer/12623953). Google advises allowing restricted settings only for apps you trust.) Only messages that arrive after this can be checked.
8. **Camera, microphone, notifications.** The app asks only when you scan a QR code, listen to a call, or want warnings.

### What each permission does

| Permission | Used for | If you say no |
|---|---|---|
| Read and receive SMS | Check the inbox and new SMS | Paste or share messages instead |
| Notification access | Read messaging apps' notifications to check Chat and WhatsApp | Chat and WhatsApp are not checked |
| Camera | Scan a QR code, only while scanning | Choose a photo of the code |
| Microphone | Live listening and recording on the call screen | Paste the transcript |
| Notifications | Warn about a new risky message | No alerts |
| Internet and network state | Official links, trends, speech service, offline detection | Needed |

Delete everything the app stored: **Settings → Delete all my data**. Turn off Notification access in Android settings to stop Chat and WhatsApp checks.

## Check the file you downloaded

SHA-256 of the APK published with this version:

```
3281f2cfdbb3056dbf7d376b126f0d96fc3abf945af6a0b2badee004a1e5288f
```

```powershell
Get-FileHash suraksha.apk -Algorithm SHA256
```

```bash
shasum -a 256 suraksha.apk
```

Signing certificate SHA-256 (with Android build tools: `apksigner verify --print-certs suraksha.apk`):

```
48aacc4179e159672102389b60cf974971ac844b23d5b48f1d20d97202135481
```

A newer build has a different file checksum. The certificate stays the same, which is why a new build installs over the old one.

## For developers: install over USB

With **Developer options** and **USB debugging** on:

```bash
adb install -r suraksha.apk
```

Google's developer-verification rules [exempt ADB installs](https://developer.android.com/developer-verification/guides/faq). Google's description of the Play Protect block names internet sources, not ADB; we have not tested how a given phone treats it. To build the APK yourself, see **Run it locally** in the [main README](../README.md#run-it-locally).

## Troubleshooting

| What you see | Likely cause | What to do |
|---|---|---|
| "App blocked to protect your device" | Play Protect's fraud protection | Turn Play Protect scanning off (step 2), install, turn it back on (step 4). Or use the web app |
| The Play Protect switch cannot be turned off | Your account or phone enforces it, for example Advanced Protection | Use the web app |
| "App not installed" | An older copy signed with a different key is installed, or storage is full | Uninstall the old copy (this erases its data), free space, try again |
| Notification access switch is greyed out | Android restricted settings | Step 7 above |
| The inbox is empty | SMS permission not granted, or messages are Chat (RCS), not SMS | Allow SMS; for Chat, switch on Notification access |
| Old Chat or WhatsApp messages are missing | Only new notifications can be read | Expected |
| Audio upload fails | The speech service is not running | Paste the transcript, or use live listening |
| Trends take several seconds | Slow hosted database | Wait; the screen shows the last saved copy offline |

_Android menu names differ between phones. Rules from Google can change; the linked pages are the current source. Checked 25 November 2026._
