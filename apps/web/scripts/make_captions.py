"""Make timed captions for the lesson recordings, so the player can highlight the line being spoken and show the text.

Each recording public/audio/<lesson_id>.<lang>.m4a is sent to a speech server (the transcription service in services/asr, which answers
POST /transcribe with timed segments) and the result is written next to it as public/audio/<lesson_id>.<lang>.json:

    {"version": 1, "lang": "hi", "duration": 61.2, "segments": [{"start": 0.0, "end": 4.1, "text": "..."}]}

The server's address is read from the ASR_URL environment variable (for example http://localhost:8001). Nothing is stored in the script
and no key is needed. Start the speech server first (see services/asr/README.md), then from apps/web:

  set ASR_URL=http://localhost:8001                      (PowerShell: $env:ASR_URL = "http://localhost:8001")
  python -X utf8 scripts/make_captions.py                # every recording that has no captions yet
  python -X utf8 scripts/make_captions.py public/audio/upi_pin.hi.m4a --force

The speech model is built for Hindi and English. It does not know Chhattisgarhi, so captions for Chhattisgarhi recordings are only a
first draft: a native speaker must correct the text in the JSON before it is shown to people. The server allows 20 clips an hour for each
client, so a long list may need two runs: files that already have captions are skipped.
Afterwards run  python -X utf8 scripts/content_source.py  so the lessons declare the captions (see docs/lesson_audio.md).
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import uuid
from pathlib import Path
from urllib import error, request

WEB = Path(__file__).resolve().parent.parent
DEFAULT_DIR = WEB / "public" / "audio"
ENV_VAR = "ASR_URL"
SPOKEN_TYPES = {".m4a": "audio/mp4", ".mp3": "audio/mpeg", ".wav": "audio/wav", ".ogg": "audio/ogg", ".webm": "audio/webm", ".aac": "audio/aac"}


def parse_name(path: Path) -> tuple[str, str] | None:
    """(lesson id, language) from <lesson_id>.<hi|cg|en>.<ext>, or None."""
    parts = path.name.split(".")
    return (parts[0], parts[1]) if len(parts) == 3 and parts[1] in ("hi", "cg", "en") and path.suffix.lower() in SPOKEN_TYPES else None


def caption_path(audio: Path) -> Path:
    return audio.with_suffix(".json")


def multipart(field: str, filename: str, content_type: str, data: bytes) -> tuple[bytes, str]:
    """A multipart/form-data body with one file field (built by hand so the script needs nothing beyond the standard library)."""
    boundary = uuid.uuid4().hex
    head = f'--{boundary}\r\nContent-Disposition: form-data; name="{field}"; filename="{filename}"\r\nContent-Type: {content_type}\r\n\r\n'.encode()
    tail = f"\r\n--{boundary}--\r\n".encode()
    return head + data + tail, f"multipart/form-data; boundary={boundary}"


def normalise_segments(segments: list[dict], duration: float | None = None) -> list[dict]:
    """Clean what the server sent: drop empty lines, sort, round to centiseconds, never let a line start before the last one ends or run
    past the end of the recording."""
    out: list[dict] = []
    for s in sorted((s for s in segments if str(s.get("text", "")).strip()), key=lambda s: float(s["start"])):
        start, end = max(0.0, float(s["start"])), float(s["end"])
        if out:
            start = max(start, out[-1]["end"])
        if duration is not None:
            end = min(end, duration)
        end = max(end, start)
        out.append({"start": round(start, 2), "end": round(end, 2), "text": " ".join(str(s["text"]).split())})
    return out


def build_captions(lang: str, response: dict) -> dict:
    duration = round(float(response["duration"]), 2) if response.get("duration") is not None else None
    return {"version": 1, "lang": lang, "duration": duration, "segments": normalise_segments(response.get("segments", []), duration)}


def transcribe(base_url: str, audio: Path, timeout: float) -> dict:
    body, content_type = multipart("file", audio.name, SPOKEN_TYPES[audio.suffix.lower()], audio.read_bytes())
    req = request.Request(base_url.rstrip("/") + "/transcribe", data=body, method="POST",
                          headers={"Content-Type": content_type, "ngrok-skip-browser-warning": "true"})
    with request.urlopen(req, timeout=timeout) as r:  # noqa: S310 - the address is the one the person set in ASR_URL
        return json.loads(r.read().decode("utf-8"))


def explain(e: Exception) -> str:
    if isinstance(e, error.HTTPError):
        return {413: "the recording is too big (limit 5 MB)", 415: "the server cannot read this audio type", 422: "the server heard no speech or the clip is too long",
                429: "the server's hourly limit was reached: run the script again later, it skips files that are done", 504: "the server took too long"}.get(e.code, f"the server answered {e.code}")
    if isinstance(e, error.URLError):
        return f"could not reach the speech server ({e.reason})"
    return str(e)


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Write timed caption files for the lesson recordings using a speech server.")
    ap.add_argument("files", nargs="*", help="recordings (default: every <lesson>.<lang>.m4a in --dir)")
    ap.add_argument("--dir", type=Path, default=DEFAULT_DIR, help=f"folder of recordings (default {DEFAULT_DIR})")
    ap.add_argument("--force", action="store_true", help="redo files that already have captions")
    ap.add_argument("--timeout", type=float, default=180.0, help="seconds to wait for one recording (default 180)")
    args = ap.parse_args(argv)

    base = os.environ.get(ENV_VAR, "").strip()
    if not base:
        print(f"Set the {ENV_VAR} environment variable to the speech server's address, for example http://localhost:8001", file=sys.stderr)
        return 2
    files = [Path(f) for f in args.files] if args.files else sorted(args.dir.glob("*.m4a")) if args.dir.exists() else []
    if not files:
        print(f"no recordings found in {args.dir}")
        return 0
    failures = 0
    for audio in files:
        parsed = parse_name(audio)
        if parsed is None:
            print(f"skip {audio.name}: name it <lesson_id>.<hi|cg|en>.m4a")
            continue
        out = caption_path(audio)
        if out.exists() and not args.force:
            print(f"has captions {out.name}")
            continue
        try:
            captions = build_captions(parsed[1], transcribe(base, audio, args.timeout))
        except Exception as e:  # report and carry on with the other files
            failures += 1
            print(f"FAILED {audio.name}: {explain(e)}", file=sys.stderr)
            continue
        if not captions["segments"]:
            failures += 1
            print(f"FAILED {audio.name}: no text came back", file=sys.stderr)
            continue
        out.write_text(json.dumps(captions, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
        note = "  (a draft: Chhattisgarhi must be corrected by a native speaker)" if parsed[1] == "cg" else ""
        print(f"{audio.name} -> {out.name}: {len(captions['segments'])} lines{note}")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
