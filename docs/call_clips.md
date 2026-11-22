# Recording the call clips

At least 12 clips of 30 to 90 seconds, acted by team members who agree to it. No real person's call or voice, no real phone numbers.

| Set | Clips | Script to act |
|---|---|---|
| Fake KYC | 3 | Caller claims to be from the bank, says KYC is pending and the account will be blocked today, asks for the OTP. Vary the language: one Hindi, one Hinglish, one mixed with English. |
| Digital arrest | 3 | Caller claims to be police or CBI, says a parcel with drugs is in your name, says you are under "digital arrest", must stay on the call and tell no one, must move money to a "safe account". |
| Courier / customs | 3 | Caller claims to be from a courier or customs, says the parcel holds illegal items, asks for a customs fee through a link. |
| Genuine | 3 | A bank service call (no OTP request), a delivery call asking for a landmark, a family call. Add one "never share your OTP" awareness call. |

Record some clips through a phone speaker and some with background noise (a fan, a street). Keep the example wording close to `apps/web/public/content/demo_calls.json`, but do not read it word for word.

## Files

Put clips in a local folder that is **not** committed (voices stay out of the public repo unless every speaker agrees):

```
clips/
  kyc_1.wav        kyc_1.txt      (reference transcript, only for four of the clips)
  arrest_1.m4a ...
manifest.csv       file,expected_script,expected_level   (expected_script is empty for genuine clips)
```

## Run

```bash
cd services/asr
uvicorn app.main:app --port 8001            # in one terminal
python eval_clips.py ../../clips http://localhost:8001
```

The script sends each clip to the service and writes `clips/results.json` and a table with the transcript, duration, time taken and, where a `.txt` reference exists, the word error rate. Paste each transcript into the app's "Check a call" screen to record the verdict and the flagged phrases. Report which scam clips were missed and why, and any genuine clip flagged high.

Transcription accuracy drops on narrow-band phone audio, noise and strong accents; state the measured word error rate on the four reference clips in the evaluation.
