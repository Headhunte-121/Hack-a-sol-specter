FROM python:3.11-slim
WORKDIR /srv
ENV PYTHONUNBUFFERED=1 ASR_MODEL=small ASR_DEVICE=cpu
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app ./app
EXPOSE 7860
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
