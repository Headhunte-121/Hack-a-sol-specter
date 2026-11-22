"""Convert the Hindi fine-tuned Whisper checkpoint to the CTranslate2 format used by faster-whisper.

    pip install ctranslate2 transformers[torch]
    python convert_model.py            # writes ./models/whisper-hindi-small-ct2
    ASR_MODEL=./models/whisper-hindi-small-ct2 uvicorn app.main:app --port 8001

Model: vasista22/whisper-hindi-small (Apache-2.0). Without conversion the service uses the multilingual `small` model with the language forced to Hindi.
"""
import subprocess
import sys

OUT = "models/whisper-hindi-small-ct2"
subprocess.check_call([
    sys.executable, "-m", "ctranslate2.converters.transformers",
    "--model", "vasista22/whisper-hindi-small", "--output_dir", OUT, "--quantization", "int8",
    "--copy_files", "tokenizer.json", "preprocessor_config.json",
])
print("converted to", OUT)
