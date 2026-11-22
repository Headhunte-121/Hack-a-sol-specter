"""Shared loaders: external pool (deduped), synthetic, and the hand-written wild_big test set."""
import glob, json, re
from pathlib import Path
import pandas as pd

D = Path(__file__).parent / "data"
X = D / "ext"


def norm(s: str) -> str:
    s = s.lower()
    s = re.sub(r"https?://\S+|\b\S+\.(com|in|xyz|top|co\.in)\S*|\b(bit\.ly|tinyurl\.com|rb\.gy|cutt\.ly)\S*", " urltok ", s)
    return re.sub(r"\d+", "0", s)


def load_external():
    parts = []
    s = pd.read_csv(X / "scam-classification-multiclass/sentinel_dataset_multiclass_clean.csv")
    parts.append(pd.DataFrame({"text": s.text, "label": (s.label != 0).astype(int), "src": "shade63"}))
    c = pd.read_parquet(glob.glob(str(X / "india-spam-sms/data/*.parquet"))[0])
    parts.append(pd.DataFrame({"text": c.text, "label": c.label.astype(int), "src": "clove"}))
    b = json.load(open(X / "hinglish-scam-text-dataset/data.json", encoding="utf-8"))
    b = pd.DataFrame(b["rows"] if isinstance(b, dict) and "rows" in b else b)
    if "row" in b.columns: b = pd.DataFrame(list(b["row"]))
    elif "rows" in b.columns: b = pd.DataFrame(list(b["rows"]))
    parts.append(pd.DataFrame({"text": b.text, "label": b.label.astype(int), "src": "bolewara"}))
    y = pd.read_csv(X / "Indian_Cyber_Scam_PhoneCall_Hinglish_Dataset/India_Cyber_Scam_Hinglish_Dataset.csv")
    parts.append(pd.DataFrame({"text": y.text, "label": y.label.astype(int), "src": "ysangam_calls"}))
    ext = pd.concat(parts, ignore_index=True)
    ext["text"] = ext.text.astype(str)
    ext["key"] = ext.text.map(norm)
    return ext.drop_duplicates("key").reset_index(drop=True)


def load_all():
    ext = load_external()
    syn = pd.read_csv(D / "synthetic.csv"); syn["src"] = "synthetic"
    wild = pd.read_csv(D / "wild_big.csv")
    return ext, syn, wild
