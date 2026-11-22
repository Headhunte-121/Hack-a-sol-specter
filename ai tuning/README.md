# AI tuning: model experiments for the scam-message detector (GT-02)

Goal: classify an SMS/WhatsApp message as **scam or genuine** in English, Hindi (Devanagari) and Hinglish, with a model small enough to consider running offline.
Status: experiments only. These large models (e5, fine-tuned e5) are **not** what ships on the phone: the app spec requires a small linear model (< 5 MB) that runs in plain TypeScript, built by the pipeline in [`../ml`](../ml). The experiments here show the accuracy ceiling and which data/features help. Last updated 2026-11-22.

## Data

| File | What it is | Caveat |
|---|---|---|
| `make_dataset.py` -> `data/synthetic.csv` | 72 hand-written templates (12 scam + 12 genuine per language) expanded to 1,202 rows | Template-generated. Splits are by template so paraphrases never straddle train/test. |
| `make_wild_big.py` -> `data/wild_big.csv` | **160 hand-written test messages** (80 scam / 80 genuine; en / hi / hinglish), incl. hard negatives (genuine OTPs, KYC confirmations, bills) | Written by us, not real traffic. Some messages are translations of each other. Never used for training. |
| `data/ext/` (not committed) | Public sets from Hugging Face, see below | Mostly English, partly LLM-generated, heavily templated. **Verify each licence before shipping anything trained on them.** |

External sets used (downloaded 2026-11-22, `huggingface_hub.snapshot_download`):

| Source | Usable rows after dedupe | Notes |
|---|---|---|
| `Shade63/scam-classification-multiclass` | 7,730 | English, generated with an ML tool per its card. Only the CSV is used; the bundled `.pkl` and scripts are untrusted and **not** loaded or run. |
| `CloveAI/india-spam-sms` | 5,044 | English, Indian formats. Empty README, provenance unclear. |
| `bolewara/hinglish-scam-text-dataset` | 3,536 | Mostly the English UCI SMS set; almost no Hinglish. |
| `ysangam/Indian_Cyber_Scam_PhoneCall_Hinglish_Dataset` | 743 | Scam **call** scripts. 10k rows = 743 unique texts. Useful for the call detector. |

Dedupe key = lowercase text with digits and URLs masked. **None of the external data contains Devanagari.**

## Scripts

| Script | Purpose |
|---|---|
| `make_dataset.py`, `make_wild_big.py` | Build synthetic training data and the hand-written test set |
| `benchmark.py` | 10 classic TF-IDF models, template-grouped splits + 40-message set |
| `benchmark_transformer.py` | multilingual-e5-small frozen embeddings vs TF-IDF |
| `eval_wild_big.py` | Synthetic-trained models on the 160-message set, with bootstrap CIs |
| `train_external.py` | Train on external / synthetic / both, test on the 160 set |
| `common.py`, `probs_frozen.py` | Shared loaders; saves frozen-model probabilities |
| `finetune_e5.py` | CPU fine-tune of e5-small (time-boxed) |
| `tune_threshold.py` | Group-aware cross-fitted threshold selection, AUC |

Reproduce (Python 3.14, scikit-learn, torch CPU, transformers):

```bash
cd "ai tuning"
python make_dataset.py && python make_wild_big.py
python benchmark.py                     # classic models
python train_external.py                # needs data/ext/ (see table above), ~2 min
python probs_frozen.py && python tune_threshold.py
python finetune_e5.py 14                # optional, CPU, 14-minute cap
python finetune_e5.py 25 v2 20000       # GPU (CUDA PyTorch): all data in about 1 minute
```

## Findings so far

**1. Small tests mislead.** On a 40-message set the classic char(1-3) TF-IDF + LR looked best (F1 0.90); on 160 messages it was the worst (0.80). Always report a confidence interval; the 160-message 95% CI on F1 is about +/-0.05.

**2. Synthetic-only training, 160-message test** (`eval_wild_big.py`):

| Model | F1 | 95% CI | Scam caught | Genuine flagged |
|---|---|---|---|---|
| TF-IDF word + CNB | 0.875 | 0.82-0.92 | 90% | 15% |
| hybrid TF-IDF char(1-3) + e5 | 0.874 | 0.82-0.92 | 95% | 20% |
| e5-small emb + LR | 0.862 | 0.81-0.91 | 82% | 10% |
| TF-IDF char(1-3) + LR | 0.803 | 0.74-0.86 | 94% | 33% |

Most errors were genuine messages flagged as scams: the genuine class in the synthetic data is too narrow.

**3. Adding public data** (`train_external.py`, 134 s total):

| Train data | Model | F1 | en | hi | hinglish |
|---|---|---|---|---|---|
| external only | TF-IDF word+char | 0.706 | 0.92 | **0.50** | 0.70 |
| external only | e5 emb + LR | 0.844 | 0.85 | **0.88** | 0.80 |
| external + synthetic | e5 emb + LR | 0.875 | 0.85 | 0.92 | 0.86 |
| external + synthetic | hybrid | 0.881 | 0.92 | 0.87 | 0.86 |

- Multilingual embeddings transfer across languages: trained on English-only data, e5 still scores 0.88 on Hindi. TF-IDF cannot (0.40-0.52).
- Public data cut false alarms (20% -> 7%) but lowered scam recall (95% -> 84%) at the default 0.5 threshold.
- F1 gain over synthetic-only is within noise.

**4. Threshold tuning** (`tune_threshold.py`; thresholds chosen on 4 folds, scored on the held-out fold; folds are grouped so translated/paraphrased messages never span folds):

| Model | AUC (95% CI) | Setting | F1 | Scam caught | Genuine flagged |
|---|---|---|---|---|---|
| e5 emb + LR | 0.960 (0.93-0.98) | fixed 0.50 | 0.875 | 82% | 7.5% |
| e5 emb + LR | | recall >= 95% rule (t~0.28) | 0.894 | 94% | 15% |
| hybrid | 0.958 (0.93-0.99) | fixed 0.50 | 0.881 | 84% | 7.5% |
| hybrid | | max-F2 rule (t~0.32) | 0.906 | 94% | 12.5% |

AUC ~0.96 for both: the models rank messages well; the default 0.5 cut-off is just too strict for a tool where a missed scam costs more than a false alarm. A threshold near 0.3 is the sensible operating point.

**5. Fine-tuning e5-small** (`finetune_e5.py`, CPU, 13 min, 500 steps, 8,002 rows = 6,800 external + 1,202 synthetic, embeddings layer frozen):
F1@0.5 = **0.919**, AUC = **0.974** (CI 0.95-0.99), scam caught 93%, genuine flagged 9%, 13 errors / 160.
Best single model so far. Its probabilities are saturated (training loss ~0.001), so threshold tuning does nothing for it; use 0.5.

**GPU re-run** (RTX 5050 Laptop, CUDA PyTorch 2.14.1+cu130, bf16): the same fine-tune on *all* external data + both synthetic sets (19.6k rows, 2 epochs) takes **0.9 min instead of ~13 min** and gives F1@0.5 = 0.919, AUC = 0.972. Seeing 3x more data did not move the score, so the limit is data quality/diversity, not quantity.

**6. Accuracy-improvement round** (`make_dataset_v2.py`, `translate_mt.py`, `features.py`, `train_v2.py`):

- **Varied templates (`synthetic_v2.csv`, 1,352 rows):** 24 new templates per language, mostly *hard-negative genuine* messages (OTP/reset codes, EMI, flight, premium, subsidy credit, receipts, bank holiday) plus new scam topics (fake Netflix/subsidy/scheme/job-fee/crypto/pension/tax). Topics were chosen to differ from the test set, but some overlap (OTP, KYC) is unavoidable, so scores for models trained on this are slightly optimistic.
- **Machine-translated Hindi (`mt_hi_raw.csv`, 2,398 rows):** 2,400 English external messages translated with `Helsinki-NLP/opus-mt-en-hi` (6.4 min) plus a crude romanised "Hinglish-ish" copy (`translit.py`). **Translation quality is poor** (garbled on slangy SMS), so this is noisy augmentation. Used for training only.
- **Rule features (`features.py`, 18 signals):** URL shorteners, suspicious TLDs, APK/remote-access, OTP/PIN requests *not* negated by "do not share", payment/fee requests, urgency, threats, prize claims, authority impersonation, "reassuring" official-channel wording, secrecy. They work in all three languages, are explainable (`explain(text)`), and a rules-only LR already reaches F1 0.81.

Ablation, test = 160 hand-written messages (AUC 95% CIs are about +/-0.025, so single steps are within noise; the trend is consistent):

| Training mix | emb + LR | hybrid (char TF-IDF + e5) | hybrid + rules |
|---|---|---|---|
| A: external + synthetic v1 | 0.960 | 0.958 | 0.965 |
| B: A + varied templates | 0.968 | 0.974 | 0.978 |
| C: B + MT Hindi / romanised | 0.970 | 0.975 | **0.982** |

(AUC.) Takeaways: varied genuine/scam templates helped most (+0.01-0.016 AUC); rule features add a small consistent gain (+0.004-0.007); noisy MT Hindi added roughly nothing.

**7. Ensemble (fine-tuned e5 + hybrid-with-rules C, probabilities averaged, threshold 0.5):**
AUC **0.989**, F1 **0.950**, scam caught **95%**, genuine flagged **5%**, **8 errors / 160**. Chosen after comparing three combinations on the test set, so expect a small optimistic bias.
Remaining errors: Hindi/Hinglish PM-Kisan and redelivery-fee scams (missed), and a few genuine bank/cashback/UPI-OTP/Aadhaar-portal messages (flagged).

## Model sizes (offline feasibility)

| Model | Approx. size |
|---|---|
| TF-IDF char(1-3) + LR, JSON export | ~78 KB (grows with real data, still < 1 MB) |
| multilingual-e5-small, fp32 | ~470 MB (~120 MB int8, estimated, not yet measured) |

IndicBERT (`ai4bharat/indic-bert`) is gated on Hugging Face and was not tested.

## Honest limitations

- The test set was written by us. Real-world accuracy will be lower.
- Public training sets are English-only, partly generated, and templated (14k rows -> ~7.7k unique after masking).
- No real Hindi or Hinglish scam traffic is in the training data.
- Group-aware CV groups are inferred from embedding similarity, not hand-labelled.

## Next steps

Translate English external data into Hindi/Hinglish, add rule features (URL shorteners, OTP/PIN requests), add more hard-negative genuine messages, then quantise and export the chosen model. The shipped on-device model is built in `ml/`.
