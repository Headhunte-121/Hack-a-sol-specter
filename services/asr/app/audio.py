"""Audio helpers: decode to mono 16 kHz float32, measure length, detect silence, light normalisation."""
from __future__ import annotations

import numpy as np

SAMPLE_RATE = 16000


def load_audio(path: str) -> np.ndarray:
    """normalizeAudio (decode step): mono, 16 kHz. Raises ValueError if the file cannot be decoded."""
    try:
        from faster_whisper.audio import decode_audio  # uses PyAV, handles mp3, m4a, ogg, webm, wav

        return np.asarray(decode_audio(path, sampling_rate=SAMPLE_RATE), dtype=np.float32)
    except ImportError:
        pass
    except Exception as e:  # corrupt or unsupported file
        raise ValueError(str(e)) from e
    import soundfile as sf  # fallback for wav / ogg / flac when faster-whisper is not installed

    try:
        data, sr = sf.read(path, dtype="float32", always_2d=True)
    except Exception as e:
        raise ValueError(str(e)) from e
    mono = data.mean(axis=1)
    if sr != SAMPLE_RATE and len(mono):
        n = int(len(mono) * SAMPLE_RATE / sr)
        mono = np.interp(np.linspace(0, len(mono) - 1, n), np.arange(len(mono)), mono).astype(np.float32)
    return mono


def duration_seconds(audio: np.ndarray) -> float:
    return len(audio) / SAMPLE_RATE


def is_silent(audio: np.ndarray, rms_threshold: float = 0.003) -> bool:
    """Reject silent files: root-mean-square level below the threshold means there is nothing to transcribe."""
    if len(audio) == 0:
        return True
    return float(np.sqrt(np.mean(np.square(audio)))) < rms_threshold


def normalize(audio: np.ndarray) -> np.ndarray:
    """Light clean-up: remove DC offset and scale the peak to 0.9. No aggressive noise reduction (it hurts phone-quality speech)."""
    audio = audio - float(np.mean(audio))
    peak = float(np.max(np.abs(audio))) if len(audio) else 0.0
    return (audio * (0.9 / peak)).astype(np.float32) if peak > 1e-6 else audio.astype(np.float32)
