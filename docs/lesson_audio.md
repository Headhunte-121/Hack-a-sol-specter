# Lesson audio, cards and offline use

Each lesson is a row of large visual cards (6 to 8), a short written lesson (one example, the warning signs, one thing to do) and, when it exists, audio. Everything works without audio: the cards and the text are in the lesson file, and the player only offers what the phone can really play.

## What the player does

| Situation | What the person sees |
|---|---|
| The lesson has a recording for the chosen language | A player: play and pause, 0.75x / 1x / 1.25x, a seek bar, and the text of the recording (timed captions) with the line being spoken highlighted. Starts only when the person taps play. |
| No recording, but the phone has a voice for that language | A "Read aloud" button using the phone's own voice, with the same three speeds and the current line highlighted in the written lesson. |
| Neither | No play button, and one sentence saying why. The written lesson and the cards are always on the page. |

The phone's voice is used only when `speechSynthesis.getVoices()` has a voice for the language: Hindi (`hi`), English (`en`, Indian English first) or Chhattisgarhi (`hne`). A Hindi voice is never used to read Chhattisgarhi text.

A screen reader hears "Playing", "Paused", "Finished", the new speed, or the error text; the running clock is never announced. Every control is a button or a range input, so the keyboard works. The card row also answers the arrow, Home and End keys, and with "reduce motion" switched on it jumps between cards instead of gliding.

## Adding recordings

1. Record each lesson, about a minute, in Hindi and Chhattisgarhi (a phone voice memo is enough). Name the files `<lesson_id>.<lang>.<ext>`, for example `upi_pin.hi.m4a` or `atm_pin.cg.wav`. The lesson ids are in `apps/web/public/content/lessons.json`. Say the title, the example, each warning sign and the one thing to do, in that order, because the text under the player is the lesson text.
2. Put them in `apps/web/recordings/raw/` (git-ignored) and, from `apps/web`, run
   `python -X utf8 scripts/make_audio.py`. It needs ffmpeg. It trims silence, sets the loudness to about -16 LUFS, makes the sound mono and writes AAC at 32 kbps (about 0.24 MB a minute) to `public/audio/<lesson_id>.<lang>.m4a`.
3. Optional, for the highlighted transcript: start the speech server (`services/asr`), set `ASR_URL` to its address and run `python -X utf8 scripts/make_captions.py`. It writes `public/audio/<lesson_id>.<lang>.json`. The speech model does not know Chhattisgarhi, so a native speaker must correct those captions before release.
4. Run `python -X utf8 scripts/content_source.py`. A lesson declares `audio` and `captions` for every file that exists.
5. Run `npm run check:content`. It checks that declared files exist, are under 1.5 MB, that captions parse and do not run past the end of the recording.

## Offline

The lesson list shows **Download all lessons for offline** when recordings exist. It fetches the recordings and captions of the language on screen into the browser cache named `lesson-audio`, one file at a time, with a progress bar, an estimate of the size ("about 3 MB") and the free space the browser reports (`navigator.storage.estimate()`). The player reads a downloaded file from that cache, so it plays and seeks with no internet; a button removes the downloaded audio again. Recordings are not part of the install: they are downloaded only when the person asks, or streamed when played online.

## Video lesson narration

The Video tab of a lesson plays a short scene-based explainer. Its spoken track is one small file per lesson and language, `public/audio/video/<lesson_id>.<lang>.m4a` (mono AAC, 24 kHz, 32 kbps, about 0.2 MB). It is a **computer voice**, made by `scripts/generate_video_audio.py` with the unofficial text-to-speech endpoint of Google Translate. That endpoint has no published licence or service terms, so these files are placeholders. Chhattisgarhi is not offered by it, so the Chhattisgarhi narration is spoken with the Hindi voice; the player says so on screen. Replace the files with recordings by native speakers using the same names before release (the player and the offline list read whatever is there).

The files are not part of the install: they are streamed when played and added to the browser cache by **Download all lessons for offline**, which counts them in the size estimate. The exported summary video (Video tab, "Generate & download video") has captions and scene chimes but no voice.
