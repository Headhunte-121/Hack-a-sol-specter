"""Transcription service (Module 2 server): Hindi / Hinglish speech to timestamped text, then the audio is deleted.

Privacy: audio is written to a temp file only for the duration of the request and deleted in a `finally` step, even when
transcription fails. Nothing about the content is logged: only status, duration and processing time.
"""
from __future__ import annotations

import asyncio
import hashlib
import logging
import math
import os
import re
import tempfile
import time
from datetime import datetime, timezone
from typing import Any, Callable, Protocol

import numpy as np
from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from .audio import duration_seconds, is_silent, load_audio, normalize

VERSION = "0.1.0"
MAX_BYTES = 5 * 1024 * 1024      # design target from the spec
MAX_SECONDS = 180                # 3 minutes
TIMEOUT_SECONDS = 120
OK_TYPES = {"audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/wave", "audio/webm", "audio/ogg", "audio/mp4", "audio/aac", "audio/x-m4a", "audio/m4a", "video/webm", "application/octet-stream"}
OK_EXT = re.compile(r"\.(mp3|wav|m4a|ogg|webm|aac|mp4)$", re.I)
log = logging.getLogger("asr")


# Vocabulary hints: Whisper spells scam words the standard way (केवाईसी, अकाउंट, ओटीपी) instead of guessing ("के वाय सी").
PROMPTS = {
    "hi": os.environ.get("ASR_PROMPT_HI", "बैंक, केवाईसी, ओटीपी, अकाउंट, ब्लॉक, तुरंत, पुलिस, सीबीआई, गिरफ्तार, पार्सल, कस्टम, लॉटरी, इनाम, यूपीआई, पिन, एनीडेस्क, बिजली बिल।"),
    "en": os.environ.get("ASR_PROMPT_EN", "Bank, KYC, OTP, account, blocked, police, CBI, arrest, parcel, customs, lottery, UPI, PIN, AnyDesk, electricity bill."),
}


def pick_language(probs: dict[str, float]) -> str:
    """Hindi or English only. Forcing Hindi on an English call produced junk; Hindi speech detected as Urdu would come out in
    Urdu script, which the call rules cannot read, so Urdu counts as Hindi."""
    return "hi" if probs.get("hi", 0.0) + probs.get("ur", 0.0) >= probs.get("en", 0.0) else "en"


class Transcriber(Protocol):
    name: str

    def transcribe(self, audio: np.ndarray) -> list[dict[str, Any]]: ...


class WhisperTranscriber:
    """faster-whisper on CPU (int8). The model name or path comes from ASR_MODEL.
    Recommended: a CTranslate2 conversion of vasista22/whisper-hindi-small (Apache-2.0), see convert_model.py.
    Default 'small' is the multilingual OpenAI Whisper small model with the language forced to Hindi."""

    def __init__(self, model: str | None = None, device: str | None = None, compute_type: str | None = None):
        self.name = model or os.environ.get("ASR_MODEL", "small")
        self._device = device or os.environ.get("ASR_DEVICE", "cpu")
        self._compute = compute_type or os.environ.get("ASR_COMPUTE", "int8" if self._device == "cpu" else "float16")
        self._model = None

    def _load(self):
        if self._model is None:
            from faster_whisper import WhisperModel

            self._model = WhisperModel(self.name, device=self._device, compute_type=self._compute)
        return self._model

    def transcribe(self, audio: np.ndarray) -> list[dict[str, Any]]:
        # splitIntoSpeech + transcribeChunks: voice-activity detection skips silence; the library cuts long audio into 30 s windows.
        model = self._load()
        _, _, probs = model.detect_language(audio)
        lang = pick_language(dict(probs))
        segments, _ = model.transcribe(audio, language=lang, task="transcribe", vad_filter=True, beam_size=1, condition_on_previous_text=False,
                                       initial_prompt=PROMPTS[lang])
        out = []
        for s in segments:
            if getattr(s, "no_speech_prob", 0) > 0.8 or getattr(s, "compression_ratio", 0) > 2.4:
                continue  # drop likely hallucinations on noise
            out.append({"start": round(s.start, 2), "end": round(s.end, 2), "text": s.text.strip(), "confidence": round(math.exp(getattr(s, "avg_logprob", -1.0)), 3)})
        return out


def post_process(text: str) -> str:
    """postProcessTranscript: collapse words repeated by speech recognition; keep the original script; no translation."""
    return re.sub(r"\s+", " ", re.sub(r"(?<!\S)(\S+)(\s+\1)+(?!\S)", r"\1", text)).strip()


def create_app(transcriber: Transcriber | None = None, rate_limit: int | None = None, tmp_dir: str | None = None, now_fn: Callable[[], float] | None = None) -> FastAPI:
    tr = transcriber or WhisperTranscriber()
    if os.environ.get("ASR_PRELOAD") == "1" and isinstance(tr, WhisperTranscriber):
        tr._load()  # load the model before accepting requests, so the first caller does not wait for it
    LIMIT = int(rate_limit if rate_limit is not None else os.environ.get("ASR_RATE_LIMIT", 20))  # clips per client per hour
    now = now_fn or time.time
    counts: dict[str, tuple[int, int]] = {}   # hashed client -> (hour, count), in memory only
    gate = asyncio.Semaphore(1)               # one transcription at a time on a small free host
    app = FastAPI(title="Suraksha transcription service", version=VERSION)
    app.add_middleware(CORSMiddleware, allow_origins=os.environ.get("ASR_CORS", "*").split(","), allow_methods=["GET", "POST"], allow_headers=["Content-Type"], allow_credentials=False)
    app.state.created_files = []              # test hook: every temp file path ever made

    def check_rate(request: Request) -> None:
        who = hashlib.sha256((request.client.host if request.client else "?").encode()).hexdigest()
        hour = int(now() // 3600)
        h, c = counts.get(who, (hour, 0))
        c = c + 1 if h == hour else 1
        if c > LIMIT:
            raise HTTPException(429, "rate limit reached")
        counts[who] = (hour, c)

    @app.get("/health")
    def health():
        """healthCheck: lets the client show a 'waking up' message on free hosting."""
        return {"status": "ok", "model": tr.name, "version": VERSION, "time": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")}

    @app.post("/transcribe")
    async def transcribe(request: Request, file: UploadFile = File(...)):
        check_rate(request)
        # validateUpload: size first (read at most MAX_BYTES + 1), then type
        data = await file.read(MAX_BYTES + 1)
        if len(data) > MAX_BYTES:
            raise HTTPException(413, {"code": "too_big"})
        if not data:
            raise HTTPException(422, {"code": "silent"})
        ctype = (file.content_type or "").split(";")[0].lower()
        if ctype not in OK_TYPES and not OK_EXT.search(file.filename or ""):
            raise HTTPException(415, {"code": "bad_type"})
        started = time.time()
        fd, path = tempfile.mkstemp(suffix=os.path.splitext(file.filename or "")[1] or ".bin", dir=tmp_dir)
        app.state.created_files.append(path)
        try:  # deleteAfterProcessing: the finally block runs even when decoding or transcription fails
            with os.fdopen(fd, "wb") as f:
                f.write(data)
            del data
            loop = asyncio.get_running_loop()
            try:
                audio = await loop.run_in_executor(None, load_audio, path)
            except ValueError:
                raise HTTPException(415, {"code": "bad_type"})
            dur = duration_seconds(audio)
            if dur > MAX_SECONDS:
                raise HTTPException(422, {"code": "too_long"})
            if is_silent(audio):
                raise HTTPException(422, {"code": "silent"})
            audio = normalize(audio)
            async with gate:
                try:
                    segs = await asyncio.wait_for(loop.run_in_executor(None, tr.transcribe, audio), TIMEOUT_SECONDS)
                except asyncio.TimeoutError:
                    raise HTTPException(504, {"code": "timeout"})
            segs = [{**s, "text": post_process(s["text"])} for s in segs if s.get("text", "").strip()]
            log.info("transcribe ok duration=%.1fs took=%.1fs segments=%d", dur, time.time() - started, len(segs))  # status and duration only
            return {"segments": segs, "duration": round(dur, 2)}
        except HTTPException as e:
            log.info("transcribe rejected status=%s", e.status_code)
            raise
        except Exception:
            log.info("transcribe failed")
            raise HTTPException(500, {"code": "failed"})
        finally:
            try:
                os.remove(path)
            except OSError:
                pass

    return app


app = create_app() if os.environ.get("ASR_AUTOSTART", "1") == "1" else None
