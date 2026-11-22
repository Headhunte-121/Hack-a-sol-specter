# Specter: Cyber Fraud Detection & Digital Financial Literacy

Hack-a-Sol 5.0 (IIIT Naya Raipur) entry, GovTech & Impact track, problem statement **GT-02**: an offline-capable, local-language app that detects scam messages and scam calls, teaches payment safety, and connects citizens to official fraud reporting.

> **Status (22 Nov 2026, day 1):** the scam-message model is being built and evaluated. The app (PWA, call detector, lessons/quiz, dashboard) is not built yet.

## Repository layout

| Path | What it is |
|---|---|
| [`ai tuning/`](ai%20tuning/README.md) | Scam-message classifier experiments: data, model comparison, fine-tuning, threshold tuning, results and limitations |

More folders (web app, API, call detector) will be added here as they are built.

## AI assistance disclosure

Per the rule book, AI coding tools are declared here. The model experiments in `ai tuning/` (data generators, benchmark and fine-tuning scripts, this README) were written with **Claude Code (Anthropic, Claude Sonnet 5.5)**, driven by the team's instructions. Team members must be able to explain every part of the code; the scripts are short and each one is described in `ai tuning/README.md`.

## Credits and licences

Public datasets (downloaded from Hugging Face; **verify each licence before redistributing or shipping a model trained on them**):

- [Shade63/scam-classification-multiclass](https://huggingface.co/datasets/Shade63/scam-classification-multiclass): English, Indian-context scam/legit messages, generated with an ML tool per its card.
- [CloveAI/india-spam-sms](https://huggingface.co/datasets/CloveAI/india-spam-sms): English Indian SMS, licence/provenance not stated.
- [bolewara/hinglish-scam-text-dataset](https://huggingface.co/datasets/bolewara/hinglish-scam-text-dataset): mostly the UCI SMS Spam Collection (English), small Hinglish part.
- [ysangam/Indian_Cyber_Scam_PhoneCall_Hinglish_Dataset](https://huggingface.co/datasets/ysangam/Indian_Cyber_Scam_PhoneCall_Hinglish_Dataset): scripted scam-call text, Hinglish.

Pre-trained models: [`intfloat/multilingual-e5-small`](https://huggingface.co/intfloat/multilingual-e5-small) (embeddings, fine-tuned here) and [`Helsinki-NLP/opus-mt-en-hi`](https://huggingface.co/Helsinki-NLP/opus-mt-en-hi) (English-to-Hindi translation for data augmentation). Libraries: scikit-learn, PyTorch, Hugging Face Transformers, pandas, NumPy, SciPy.

Self-made data (in this repo): synthetic template-generated messages and a 160-message hand-written test set, all in `ai tuning/data/`. No real citizen data, phone numbers or Aadhaar numbers are used.

## Setup

See [`ai tuning/README.md`](ai%20tuning/README.md#reproduce) for how to reproduce the experiments.
