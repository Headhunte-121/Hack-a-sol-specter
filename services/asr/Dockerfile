FROM python:3.11-slim
WORKDIR /srv
RUN apt-get update && apt-get install -y --no-install-recommends git ffmpeg && rm -rf /var/lib/apt/lists/*

ARG REPO=https://github.com/Headhunte-121/Hack-a-sol-specter
ARG REF=main
RUN git clone --depth 1 --branch ${REF} ${REPO} /tmp/repo \
 && cp -r /tmp/repo/services/asr/app /srv/app \
 && cp /tmp/repo/services/asr/requirements.txt /srv/requirements.txt \
 && rm -rf /tmp/repo

RUN pip install --no-cache-dir -r requirements.txt

ENV PYTHONUNBUFFERED=1 \
    HF_HOME=/srv/hf-cache \
    ASR_MODEL=small \
    ASR_DEVICE=cpu \
    ASR_CORS=*

RUN python -c "from faster_whisper import WhisperModel; WhisperModel('small', device='cpu', compute_type='int8')" \
 && chmod -R a+rwX /srv/hf-cache

EXPOSE 8001
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8001}"]
