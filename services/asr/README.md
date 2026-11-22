# Transcription service

Turns a Hindi or Hinglish audio clip into timestamped text for the call screen, then deletes the audio.

```bash
pip install -r requirements.txt
uvicorn app.main:app --port 8001          # first request loads the model
python -m pytest -q                       # 9 tests with a fake transcriber (no model download)
```

| Endpoint | Purpose |
|---|---|
| `GET /health` | Status and model name. The app uses it to show a "waking up" message on free hosting. |
| `POST /transcribe` (multipart `file`) | Returns `{segments: [{start, end, text, confidence}], duration}`. |

Limits: 5 MB, 3 minutes, one clip at a time, 20 clips per client per hour, 120 s timeout. Errors: `413 too_big`, `415 bad_type`, `422 too_long` or `silent`, `429` rate limit, `504 timeout`.

## Privacy

The upload is written to a temp file and removed in a `finally` block, so it is deleted even when decoding or transcription fails. Logs carry status, duration and processing time only. Nothing about the content is logged.

## Model

| `ASR_MODEL` | Meaning |
|---|---|
| `small` (default) | Multilingual Whisper small, language forced to Hindi |
| path from `convert_model.py` | CTranslate2 conversion of `vasista22/whisper-hindi-small` (Apache-2.0, about 14% word error rate reported on Common Voice Hindi) |

`ASR_DEVICE=cuda` uses a GPU. `ASR_CORS` sets allowed origins. Phone-quality, noisy or accented speech transcribes worse; Chhattisgarhi is not supported.

## Deploy

`Dockerfile` runs the service on port 7860, ready for a Hugging Face Space (Docker) or Render. Set `ASR_MODEL`, `ASR_CORS` and any limits in the host settings. A free host sleeps when idle, so the first request after a pause is slow.
