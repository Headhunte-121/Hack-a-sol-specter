"""Generate studio-quality narration audio for lessons in Hindi, Chhattisgarhi, and English.
Output: apps/web/public/audio/video/<lesson_id>.<lang>.mp3
"""
from __future__ import annotations

import json
import os
import re
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LESSONS_PATH = ROOT / "public" / "content" / "lessons.json"
OUT_DIR = ROOT / "public" / "audio" / "video"


def fetch_tts_chunk(text: str, tl: str) -> bytes:
    q = urllib.parse.quote(text)
    url = f"https://translate.google.com/translate_tts?ie=UTF-8&tl={tl}&client=tw-ob&q={q}"
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"},
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        return resp.read()


def split_text_chunks(text: str, max_chars: int = 140) -> list[str]:
    # Split on sentence boundaries first
    sentences = re.split(r"(?<=[।!?.\n])\s*", text)
    chunks: list[str] = []
    curr = ""
    for s in sentences:
        s = s.strip()
        if not s:
            continue
        if len(curr) + len(s) + 1 <= max_chars:
            curr = f"{curr} {s}".strip()
        else:
            if curr:
                chunks.append(curr)
            # If a single sentence is longer than max_chars, split by words
            if len(s) > max_chars:
                words = s.split(" ")
                w_curr = ""
                for w in words:
                    if len(w_curr) + len(w) + 1 <= max_chars:
                        w_curr = f"{w_curr} {w}".strip()
                    else:
                        if w_curr:
                            chunks.append(w_curr)
                        w_curr = w
                if w_curr:
                    curr = w_curr
            else:
                curr = s
    if curr:
        chunks.append(curr)
    return chunks


def generate_audio(text: str, lang: str, out_file: Path) -> None:
    tl = "hi" if lang in ("hi", "cg") else "en-IN"
    chunks = split_text_chunks(text)
    combined = bytearray()
    for c in chunks:
        try:
            chunk_bytes = fetch_tts_chunk(c, tl)
            combined.extend(chunk_bytes)
        except Exception as e:
            print(f"Error fetching chunk '{c[:30]}...': {e}")

    out_file.parent.mkdir(parents=True, exist_ok=True)
    with open(out_file, "wb") as f:
        f.write(combined)
    print(f"Generated {out_file.name} ({len(combined)} bytes)")


def main():
    with open(LESSONS_PATH, encoding="utf-8") as f:
        data = json.load(f)

    lessons = data["lessons"]
    for l in lessons:
        lid = l["id"]

        # 1. Hindi Narration
        hi_parts = [
            f"{l['title']['hi']}। साइबर सुरक्षा और धोखाधड़ी से बचाव।",
            f"धोखाधड़ी का तरीका। {l['example']['hi']}",
            f"चेतावनी संकेत। {'। '.join(s['hi'] for s in l['signs'][:3])}।",
            f"सुरक्षा नियम। {l['todo']['hi']}। यदि धोखाधड़ी हो जाए, तो तुरंत 1930 साइबर हेल्पलाइन पर फोन करें।",
        ]
        hi_text = " ".join(hi_parts)
        generate_audio(hi_text, "hi", OUT_DIR / f"{lid}.hi.mp3")

        # 2. Chhattisgarhi Narration
        cg_parts = [
            f"{l['title']['cg']}। साइबर सुरक्षा अउ धोखाधड़ी ले बचाव।",
            f"धोखाधड़ी के तरीका। {l['example']['cg']}",
            f"चेतावनी संकेत। {'। '.join(s['cg'] for s in l['signs'][:3])}।",
            f"सुरक्षा नियम। {l['todo']['cg']}। अगर धोखाधड़ी हो जाय, त तुरंत 1930 साइबर हेल्पलाइन म फोन करव।",
        ]
        cg_text = " ".join(cg_parts)
        generate_audio(cg_text, "cg", OUT_DIR / f"{lid}.cg.mp3")

        # 3. English Narration
        en_parts = [
            f"{l['title']['en']}. Cyber safety and fraud prevention.",
            f"How the scam happens. {l['example']['en']}",
            f"Warning signs. {'. '.join(s['en'] for s in l['signs'][:3])}.",
            f"Safety rule. {l['todo']['en']}. In case of fraud, dial 1930 cyber helpline immediately.",
        ]
        en_text = " ".join(en_parts)
        generate_audio(en_text, "en", OUT_DIR / f"{lid}.en.mp3")

    # Clean up test files if any
    for t in ["test_hi.mp3", "test_cg.mp3", "test_en.mp3"]:
        tp = OUT_DIR / t
        if tp.exists():
            tp.unlink()

    print("All audio files generated successfully!")


if __name__ == "__main__":
    main()
