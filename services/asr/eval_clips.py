"""Send recorded clips to the transcription service and report timing and word error rate.

    python eval_clips.py <clips_folder> [service_url]

A clip `name.wav` (or mp3, m4a, ogg, webm) may have a reference transcript `name.txt`. Writes <clips_folder>/results.json.
"""
import json
import re
import sys
import time
from pathlib import Path

import httpx

EXT = {".wav", ".mp3", ".m4a", ".ogg", ".webm", ".aac", ".mp4"}


def words(text: str) -> list[str]:
    return re.findall(r"[\wऀ-ॿ]+", text.lower())


def wer(ref: list[str], hyp: list[str]) -> float:
    """Word error rate: word-level edit distance divided by the reference length."""
    d = list(range(len(hyp) + 1))
    for i, r in enumerate(ref, 1):
        prev, d[0] = d[0], i
        for j, h in enumerate(hyp, 1):
            prev, d[j] = d[j], min(d[j] + 1, d[j - 1] + 1, prev + (r != h))
    return d[len(hyp)] / max(1, len(ref))


def main() -> None:
    folder = Path(sys.argv[1])
    base = (sys.argv[2] if len(sys.argv) > 2 else "http://localhost:8001").rstrip("/")
    rows = []
    with httpx.Client(timeout=200) as c:
        print("service:", c.get(f"{base}/health").json())
        for f in sorted(p for p in folder.iterdir() if p.suffix.lower() in EXT):
            t0 = time.time()
            r = c.post(f"{base}/transcribe", files={"file": (f.name, f.read_bytes())})
            row = {"clip": f.name, "status": r.status_code, "seconds": round(time.time() - t0, 1)}
            if r.status_code == 200:
                j = r.json()
                text = " ".join(s["text"] for s in j["segments"])
                row.update(duration=j["duration"], transcript=text)
                ref = f.with_suffix(".txt")
                if ref.exists():
                    row["wer"] = round(wer(words(ref.read_text(encoding="utf-8")), words(text)), 3)
            else:
                row["error"] = r.text[:200]
            rows.append(row)
            print(f"{f.name:28s} {row['status']} {row['seconds']:>5}s  dur={row.get('duration','-')}  wer={row.get('wer','-')}")
    (folder / "results.json").write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
    scored = [r["wer"] for r in rows if "wer" in r]
    if scored:
        print(f"mean word error rate on {len(scored)} reference clips: {sum(scored)/len(scored):.3f}")


if __name__ == "__main__":
    main()
