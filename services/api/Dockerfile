FROM python:3.11-slim
WORKDIR /srv
ENV PYTHONUNBUFFERED=1 API_DB=/data/reports.db
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app ./app
VOLUME /data
EXPOSE 7860
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
