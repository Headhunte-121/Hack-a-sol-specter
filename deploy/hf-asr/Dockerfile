# Suraksha transcription service, packaged for a Hugging Face Docker Space (free "CPU basic": 2 vCPU, 16 GB).
# The service code is taken from the public repository at build time, so this folder holds no copy of it.
# The Whisper model is downloaded while the Space builds, so the first call does not wait for a download.
FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends git && rm -rf /var/lib/apt/lists/*
WORKDIR /srv

ARG REPO=https://github.com/Headhunte-121/Hack-a-sol-specter
ARG REF=main
RUN git clone --depth 1 --branch ${REF} ${REPO} /tmp/repo \
 && cp -r /tmp/repo/services/asr/app /srv/app \
 && cp /tmp/repo/services/asr/requirements.txt /srv/requirements.txt \
 && rm -rf /tmp/repo
RUN pip install --no-cache-dir -r requirements.txt

# Spaces run the container as user 1000: keep the model cache in a folder that user can read and write.
ENV HF_HOME=/srv/hf-cache ASR_MODEL=small ASR_DEVICE=cpu
RUN python -c "from faster_whisper import WhisperModel; WhisperModel('small', device='cpu', compute_type='int8')" \
 && chmod -R a+rwX /srv/hf-cache

ENV PYTHONUNBUFFERED=1 \
    ASR_PRELOAD=1 \
    ASR_RATE_LIMIT=60 \
    FORWARDED_ALLOW_IPS=* \
    ASR_CORS=https://hack-a-sol-specter.vercel.app,http://localhost:4173,http://localhost:5173

EXPOSE 7860
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860", "--proxy-headers"]
