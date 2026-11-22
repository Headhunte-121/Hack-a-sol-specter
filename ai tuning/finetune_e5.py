"""Fine-tune multilingual-e5-small (CPU, time-boxed) on a subsample of external+synthetic.
No test-set feedback during training: fixed epochs / fixed LR; wild_big only scored at the end."""
import time, warnings, sys
import numpy as np, torch
from sklearn.metrics import f1_score, roc_auc_score
from transformers import AutoModel, AutoTokenizer
from common import D, load_all

warnings.filterwarnings("ignore")
CAP_MIN = float(sys.argv[1]) if len(sys.argv) > 1 else 14.0
N_EXT = int(sys.argv[3]) if len(sys.argv) > 3 else 6800   # 3rd arg: external rows to use
EPOCHS, BS, MAXLEN = 2, 32, 96
DEV = 'cuda' if torch.cuda.is_available() else 'cpu'
print('device:', DEV, flush=True)
V2 = len(sys.argv) > 2 and sys.argv[2] == 'v2'   # also train on synthetic_v2 (varied genuine/scam templates)
torch.manual_seed(0); rng = np.random.default_rng(0)
t0 = time.time()

ext, syn, wild = load_all()
ext_s = ext.sample(n=min(N_EXT, len(ext)), random_state=0)
import pandas as pd
syn_all = pd.concat([syn, pd.read_csv(D / 'synthetic_v2.csv')]) if V2 else syn
tr_text = ext_s.text.tolist() + syn_all.text.tolist()
tr_y = np.concatenate([ext_s.label.values, syn_all.label.values]).astype(np.float32)
print(f"train rows={len(tr_text)} scam share={tr_y.mean():.2f}", flush=True)

MID = "intfloat/multilingual-e5-small"
tok = AutoTokenizer.from_pretrained(MID); enc = AutoModel.from_pretrained(MID).to(DEV)
enc.embeddings.word_embeddings.weight.requires_grad = False   # 96M of 118M params: skip them
head = torch.nn.Linear(enc.config.hidden_size, 1).to(DEV)

def forward(texts):
    b = tok(["query: " + t for t in texts], padding=True, truncation=True, max_length=MAXLEN, return_tensors="pt").to(DEV)
    with torch.autocast(DEV, dtype=torch.bfloat16, enabled=(DEV == "cuda")):
        h = enc(**b).last_hidden_state
    h = h.float(); m = b["attention_mask"].unsqueeze(-1)
    return head(torch.nn.functional.normalize((h * m).sum(1) / m.sum(1), dim=-1) * 8.0).squeeze(-1)  # scale: normalized emb is small-norm

params = [{"params": [p for p in enc.parameters() if p.requires_grad], "lr": 3e-5}, {"params": head.parameters(), "lr": 2e-3}]
opt = torch.optim.AdamW(params, weight_decay=0.01)
steps_total = EPOCHS * (len(tr_text) // BS)
sched = torch.optim.lr_scheduler.LambdaLR(opt, lambda s: min(1.0, (s + 1) / 30) * max(0.05, 1 - s / steps_total))
lossf = torch.nn.BCEWithLogitsLoss()

enc.train(); step = 0; stopped = False
for ep in range(EPOCHS):
    perm = rng.permutation(len(tr_text))
    for i in range(0, len(perm) - BS + 1, BS):
        idx = perm[i:i + BS]
        loss = lossf(forward([tr_text[j] for j in idx]), torch.tensor(tr_y[idx]).to(DEV))
        opt.zero_grad(); loss.backward(); torch.nn.utils.clip_grad_norm_(enc.parameters(), 1.0); opt.step(); sched.step(); step += 1
        if step % 20 == 0:
            el = time.time() - t0
            print(f"ep{ep} step {step}/{steps_total} loss={loss.item():.3f} elapsed={el/60:.1f}min eta={(el/step*(steps_total-step))/60:.1f}min", flush=True)
        if time.time() - t0 > CAP_MIN * 60:
            stopped = True; break
    if stopped: print("TIME CAP HIT - stopping early", flush=True); break

enc.eval(); out = []
with torch.no_grad():
    for i in range(0, len(wild), 64):
        out.append(torch.sigmoid(forward(wild.text.iloc[i:i + 64].tolist())).cpu().numpy())
p = np.concatenate(out); y = wild.label.values
tag = ("_v2" if V2 else "") + (f"_n{N_EXT}" if len(sys.argv) > 3 else "")
np.save(D / f"probs_finetuned{tag}.npy", p)
print(f"steps={step}/{steps_total} F1@0.5={f1_score(y, p > 0.5, average='macro'):.3f} AUC={roc_auc_score(y, p):.3f} total={(time.time()-t0)/60:.1f}min")
