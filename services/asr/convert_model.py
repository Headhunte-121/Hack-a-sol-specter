"""Download the Hindi fine-tuned Whisper checkpoint and convert it to the CTranslate2 format used by faster-whisper.

    pip install ctranslate2 "transformers[torch]" huggingface_hub
    python convert_model.py                    # downloads about 1 GB, writes ./models/whisper-hindi-small-ct2 (about 250 MB)
    ASR_MODEL=small ASR_HINDI_MODEL=./models/whisper-hindi-small-ct2 uvicorn app.main:app --port 8001

Model: vasista22/whisper-hindi-small (Apache-2.0). It hears Hindi and Hinglish far better than the multilingual `small` model,
but it writes English as Devanagari sounds, so the service keeps `small` for language detection and English speech and uses
this one only when the speech is Hindi (see ASR_HINDI_MODEL in README.md).
"""
import subprocess
import sys
import tempfile

from huggingface_hub import snapshot_download
from transformers import WhisperTokenizerFast

REPO = "vasista22/whisper-hindi-small"
OUT = sys.argv[1] if len(sys.argv) > 1 else "models/whisper-hindi-small-ct2"

with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as tmp:
    src = snapshot_download(REPO, local_dir=tmp, allow_patterns=["*.json", "*.txt", "pytorch_model.bin"])
    # The repository ships vocab.json and merges.txt only; faster-whisper reads tokenizer.json from the model folder.
    WhisperTokenizerFast.from_pretrained(src).save_pretrained(src)
    subprocess.check_call([
        sys.executable, "-m", "ctranslate2.converters.transformers",
        "--model", src, "--output_dir", OUT, "--quantization", "int8",
        "--copy_files", "tokenizer.json", "preprocessor_config.json",
    ])
print("converted to", OUT)
