# Transcription service

Turns a Hindi or Hinglish audio clip into timestamped text for the call screen, then deletes the audio.

```bash
pip install -r requirements.txt
uvicorn app.main:app --port 8001          # first request loads the model
python -m pytest -q                       # 15 tests with a fake transcriber (no model download)
```

| Endpoint | Purpose |
|---|---|
| `GET /health` | Status, model name and, when Hindi routing is on, the Hindi model's folder name (`hindi_model`). The app uses it to show a "waking up" message on free hosting. |
| `POST /transcribe` (multipart `file`) | Returns `{segments: [{start, end, text, confidence}], duration}`. |

Limits: 5 MB, 3 minutes, one clip at a time, 20 clips per client per hour, 120 s timeout. Errors: `413 too_big`, `415 bad_type`, `422 too_long` or `silent`, `429` rate limit, `504 timeout`.

## Privacy

The upload is written to a temp file and removed in a `finally` block, so it is deleted even when decoding or transcription fails. Logs carry status, duration and processing time only. Nothing about the content is logged.

## Model

| `ASR_MODEL` | Meaning |
|---|---|
| `small` (default) | Multilingual Whisper small. It detects the language (Hindi or English) and transcribes English. |
| `ASR_HINDI_MODEL` = path from `convert_model.py` | Optional. CTranslate2 conversion of `vasista22/whisper-hindi-small` (Apache-2.0, 9% word error on FLEURS Hindi, 14% on Common Voice). Speech detected as Hindi goes to this model; English stays on `small`. Needs about 1 GB more memory. |

Run `python convert_model.py` once to download (about 1 GB) and convert it (about 250 MB, written to the git-ignored `models/`), then start with `ASR_HINDI_MODEL=./models/whisper-hindi-small-ct2`. In Docker, mount that folder and set `ASR_HINDI_MODEL` to the mounted path.

Why both: on 24 spoken Hindi and Hinglish test clips the fine-tune writes almost exactly what was said (the multilingual model garbled several scam words and sometimes took 20 to 40 s per clip), but it writes English speech as Devanagari sounds, which made the call checker miss most English scams. Routing by detected language keeps both benefits.

`ASR_LANGUAGE=hi` or `en` skips language detection. A model whose language detector fails is treated as Hindi.

`ASR_DEVICE=cuda` uses a GPU. `ASR_CORS` sets allowed origins. Phone-quality, noisy or accented speech transcribes worse; Chhattisgarhi is not supported.

## Deploy

`Dockerfile` runs the service on port 7860, ready for a Hugging Face Space (Docker) or Render. Set `ASR_MODEL`, `ASR_CORS` and any limits in the host settings. A free host sleeps when idle, so the first request after a pause is slow.
