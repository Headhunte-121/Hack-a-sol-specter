import io
import os
import wave

import numpy as np
import pytest
from fastapi.testclient import TestClient

from app.main import MAX_BYTES, PROMPTS, create_app, pick_language, post_process


def wav_bytes(seconds: float, freq: float = 220.0, amp: float = 0.3, sr: int = 16000) -> bytes:
    t = np.arange(int(seconds * sr)) / sr
    pcm = (np.sin(2 * np.pi * freq * t) * amp * 32767).astype(np.int16)
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes(pcm.tobytes())
    return buf.getvalue()


class Fake:
    name = "fake"

    def __init__(self, boom=False):
        self.boom, self.calls = boom, 0

    def transcribe(self, audio):
        self.calls += 1
        if self.boom:
            raise RuntimeError("model crashed")
        return [{"start": 0.0, "end": 2.0, "text": "आप आप आप अभी बताइए", "confidence": 0.9}, {"start": 2.0, "end": 3.0, "text": "  ", "confidence": 0.1}]


@pytest.fixture
def setup(tmp_path):
    fake = Fake()
    app = create_app(transcriber=fake, rate_limit=100, tmp_dir=str(tmp_path))
    return app, TestClient(app), fake, tmp_path


def up(c, data, name="clip.wav", ctype="audio/wav"):
    return c.post("/transcribe", files={"file": (name, data, ctype)})


def test_health(setup):
    _, c, _, _ = setup
    j = c.get("/health").json()
    assert j["status"] == "ok" and j["model"] == "fake"
    assert j["hindi_model"] is None  # a transcriber without Hindi routing says so


def test_health_names_the_hindi_model_when_routing_is_on():
    from app.main import WhisperTranscriber

    assert WhisperTranscriber(model="small", hindi_model="/models/hi").hindi_name == "hi"
    assert WhisperTranscriber(model="small", hindi_model="").hindi_name is None


def test_success_returns_timestamped_text_and_cleans_repeats(setup):
    _, c, fake, _ = setup
    r = up(c, wav_bytes(3))
    assert r.status_code == 200
    j = r.json()
    assert j["duration"] == pytest.approx(3.0, abs=0.1)
    assert j["segments"] == [{"start": 0.0, "end": 2.0, "text": "आप अभी बताइए", "confidence": 0.9}]  # empty segment dropped, repeats collapsed
    assert fake.calls == 1


def test_audio_is_deleted_after_success_and_after_failure(setup):
    app, c, _, tmp = setup
    assert up(c, wav_bytes(2)).status_code == 200
    assert os.listdir(tmp) == []  # deleteAfterProcessing
    boom_app = create_app(transcriber=Fake(boom=True), tmp_dir=str(tmp))
    r = up(TestClient(boom_app), wav_bytes(2))
    assert r.status_code == 500
    assert os.listdir(tmp) == []  # deleted even though transcription crashed
    assert len(boom_app.state.created_files) == 1


def test_size_limit(setup):
    _, c, fake, tmp = setup
    r = up(c, b"\0" * (MAX_BYTES + 10))
    assert r.status_code == 413 and r.json()["detail"]["code"] == "too_big"
    assert fake.calls == 0 and os.listdir(tmp) == []


def test_type_limit(setup):
    _, c, _, _ = setup
    assert up(c, b"hello", name="notes.txt", ctype="text/plain").status_code == 415
    assert up(c, b"not really audio", name="x.wav", ctype="audio/wav").status_code == 415  # cannot be decoded


def test_length_limit(setup):
    _, c, fake, _ = setup
    r = up(c, wav_bytes(181, sr=8000) if False else wav_bytes(181, sr=4000))
    assert r.status_code == 422 and r.json()["detail"]["code"] == "too_long"
    assert fake.calls == 0


def test_silent_and_empty_files_are_rejected(setup):
    _, c, fake, _ = setup
    assert up(c, wav_bytes(3, amp=0.0)).json()["detail"]["code"] == "silent"
    assert up(c, b"").status_code == 422
    assert fake.calls == 0


def test_rate_limit(tmp_path):
    c = TestClient(create_app(transcriber=Fake(), rate_limit=2, tmp_dir=str(tmp_path)))
    codes = [up(c, wav_bytes(1)).status_code for _ in range(3)]
    assert codes == [200, 200, 429]


def test_post_process():
    assert post_process("है है है ठीक ठीक है") == "है ठीक है"


def test_pick_language_hindi_or_english_only():
    assert pick_language({"hi": 0.49, "ur": 0.11, "en": 0.31}) == "hi"  # a Hinglish call
    assert pick_language({"hi": 0.0, "en": 0.99}) == "en"               # an English call
    assert pick_language({"ur": 0.6, "hi": 0.1, "en": 0.3}) == "hi"     # Hindi speech heard as Urdu is written as Hindi
    assert pick_language({}) == "hi"
    assert set(PROMPTS) == {"hi", "en"} and all(PROMPTS.values())


class _Seg:
    start, end, text, no_speech_prob, compression_ratio, avg_logprob = 0.0, 1.0, " नमस्ते ", 0.0, 1.0, -0.2


class _HindiOnlyModel:
    """Like a Hindi fine-tune: the language detector has nothing to return."""

    def __init__(self):
        self.lang = None

    def detect_language(self, audio):
        raise IndexError("list index out of range")

    def transcribe(self, audio, language=None, **kw):
        self.lang = language
        return [_Seg()], None


def test_a_model_without_a_language_detector_is_treated_as_hindi():
    from app.main import WhisperTranscriber

    t = WhisperTranscriber(model="x")
    t._model = _HindiOnlyModel()
    out = t.transcribe(np.zeros(16000, dtype=np.float32))
    assert t._model.lang == "hi"
    assert out[0]["text"] == "नमस्ते"


def test_asr_language_setting_skips_detection(monkeypatch):
    from app.main import WhisperTranscriber

    monkeypatch.setenv("ASR_LANGUAGE", "en")
    t = WhisperTranscriber(model="x")
    t._model = _HindiOnlyModel()
    t.transcribe(np.zeros(16000, dtype=np.float32))
    assert t._model.lang == "en"


class _Router:
    """A multilingual model that detects the language, plus a record of which model transcribed."""

    def __init__(self, tag, probs):
        self.tag, self.probs, self.used = tag, probs, False

    def detect_language(self, audio):
        return "x", 0.9, self.probs

    def transcribe(self, audio, language=None, **kw):
        self.used = True
        return [_Seg()], None


def _routed(probs):
    from app.main import WhisperTranscriber

    t = WhisperTranscriber(model="small", hindi_model="hindi-ft")
    t._model, t._hindi = _Router("base", probs), _Router("hindi", {})
    t.transcribe(np.zeros(16000, dtype=np.float32))
    return t


def test_hindi_speech_goes_to_the_hindi_model_when_one_is_set():
    t = _routed([("hi", 0.8), ("en", 0.1)])
    assert t._hindi.used and not t._model.used


def test_english_speech_stays_on_the_multilingual_model():
    t = _routed([("en", 0.9), ("hi", 0.05)])
    assert t._model.used and not t._hindi.used


def test_without_a_hindi_model_everything_uses_the_default_model():
    from app.main import WhisperTranscriber

    t = WhisperTranscriber(model="small", hindi_model="")
    t._model = _Router("base", [("hi", 0.9)])
    t.transcribe(np.zeros(16000, dtype=np.float32))
    assert t._model.used


def test_decoding_uses_short_windows_so_long_hindi_is_not_cut_off():
    from app.main import CHUNK_SECONDS, WhisperTranscriber

    seen = {}

    class Rec(_HindiOnlyModel):
        def transcribe(self, audio, language=None, **kw):
            seen.update(kw)
            return super().transcribe(audio, language=language, **kw)

    t = WhisperTranscriber(model="x")
    t._model = Rec()
    t.transcribe(np.zeros(16000, dtype=np.float32))
    assert seen["chunk_length"] == CHUNK_SECONDS == 15
