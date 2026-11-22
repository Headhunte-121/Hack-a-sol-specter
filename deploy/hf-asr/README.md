---
title: Suraksha Transcription
emoji: 🎧
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
---

# Suraksha transcription service

Turns a short call recording (Hindi, Hinglish or English) into timestamped text for the "Check a call" screen of the Suraksha app. Audio is written to a temporary file only while it is transcribed and is deleted straight after, even when transcription fails. Nothing about the content is logged.

- `GET /health` reports that the service is up and which model it uses.
- `POST /transcribe` takes one audio file (mp3, wav, m4a, ogg, webm; at most 5 MB and 3 minutes) and returns the text with timestamps.

Model: OpenAI Whisper "small" through faster-whisper (int8 on CPU). The service picks Hindi or English for each clip and gives Whisper a short list of scam-related words so they are spelled the standard way.

Source: `services/asr` in https://github.com/Headhunte-121/Hack-a-sol-specter. This Space builds from that repository's `main` branch; use **Factory rebuild** in the Space settings to pick up changes.
