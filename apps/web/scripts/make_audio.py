"""Turn team recordings into the small lesson audio files the app plays.

For every recording named <lesson_id>.<lang>.<ext> (for example upi_pin.hi.m4a, atm_pin.cg.wav, safe_habits.hi.mp3) in the input folder this:
  1. trims the silence from the start and the end,
  2. normalises the loudness to about -16 LUFS (two passes: measure, then correct),
  3. makes it mono,
  4. writes AAC in an .m4a file at 32 kbps with the index at the front, to public/audio/<lesson_id>.<lang>.m4a.
That is about 0.24 MB for each minute, so a one-minute lesson in three languages stays far below the 1.5 MB limit the content check enforces.

Needs ffmpeg on the PATH (https://ffmpeg.org). Nothing is uploaded and nothing is downloaded: the recordings stay on this computer.

  python -X utf8 scripts/make_audio.py                      # every recording in recordings/raw
  python -X utf8 scripts/make_audio.py recordings/raw/upi_pin.hi.wav
  python -X utf8 scripts/make_audio.py --force --lufs -16 --bitrate 32k --out public/audio

Afterwards run  python -X utf8 scripts/content_source.py  so the lessons declare the new files (see docs/lesson_audio.md).
Run from apps/web. The raw recordings folder is not committed (see .gitignore); the finished .m4a files are small enough to commit.
"""
from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

WEB = Path(__file__).resolve().parent.parent
DEFAULT_IN = WEB / "recordings" / "raw"
DEFAULT_OUT = WEB / "public" / "audio"
LANGS = ("hi", "cg", "en")
INPUT_TYPES = {".wav", ".mp3", ".m4a", ".aac", ".ogg", ".oga", ".opus", ".webm", ".mp4", ".3gp", ".amr", ".flac"}
MAX_BYTES = 1_500_000  # the content check refuses a recording of this size or more
NAME = re.compile(r"^(?P<lesson>[a-z0-9_]+)\.(?P<lang>hi|cg|en)$")


def parse_name(path: Path) -> tuple[str, str] | None:
    """(lesson id, language) from a file name such as upi_pin.hi.wav, or None when it does not follow the pattern."""
    m = NAME.match(path.stem)
    return (m["lesson"], m["lang"]) if m and path.suffix.lower() in INPUT_TYPES else None


def output_path(src: Path, out_dir: Path) -> Path | None:
    parsed = parse_name(src)
    return out_dir / f"{parsed[0]}.{parsed[1]}.m4a" if parsed else None


def trim_filter() -> str:
    """Cut silence at the start, then (by reversing the audio) at the end. A high-pass takes out the rumble of a phone microphone."""
    cut = "silenceremove=start_periods=1:start_duration=0.1:start_threshold=-50dB"
    return f"highpass=f=70,{cut},areverse,{cut},areverse"


def loudnorm_filter(lufs: float, measured: dict | None = None) -> str:
    base = f"loudnorm=I={lufs}:TP=-1.5:LRA=11"
    if not measured:
        return base
    return (f"{base}:measured_I={measured['input_i']}:measured_TP={measured['input_tp']}:measured_LRA={measured['input_lra']}"
            f":measured_thresh={measured['input_thresh']}:offset={measured['target_offset']}:linear=true")


def measure_command(src: Path, lufs: float) -> list[str]:
    return ["ffmpeg", "-hide_banner", "-nostdin", "-i", str(src), "-af", f"{trim_filter()},{loudnorm_filter(lufs)}:print_format=json", "-f", "null", "-"]


def encode_command(src: Path, dst: Path, lufs: float, bitrate: str, measured: dict | None) -> list[str]:
    return ["ffmpeg", "-hide_banner", "-nostdin", "-y", "-i", str(src), "-vn", "-af", f"{trim_filter()},{loudnorm_filter(lufs, measured)}",
            "-ac", "1", "-ar", "24000", "-c:a", "aac", "-b:a", bitrate, "-movflags", "+faststart", str(dst)]


def parse_loudnorm(stderr: str) -> dict | None:
    """The measurements ffmpeg prints as a JSON block at the end of the first pass (None when it cannot be read)."""
    blocks = re.findall(r"\{[^{}]*\}", stderr, re.S)
    for text in reversed(blocks):
        try:
            data = json.loads(text)
        except ValueError:
            continue
        if all(k in data for k in ("input_i", "input_tp", "input_lra", "input_thresh", "target_offset")) and data["input_i"] not in ("-inf", "inf"):
            return data
    return None


def find_inputs(paths: list[str], in_dir: Path) -> list[Path]:
    found: list[Path] = []
    for p in paths or [str(in_dir)]:
        path = Path(p)
        found += sorted(f for f in path.iterdir() if f.is_file()) if path.is_dir() else [path]
    return found


def process(src: Path, dst: Path, lufs: float, bitrate: str, dry_run: bool = False) -> str:
    if dry_run:
        print(" ".join(encode_command(src, dst, lufs, bitrate, None)))
        return "dry-run"
    dst.parent.mkdir(parents=True, exist_ok=True)
    first = subprocess.run(measure_command(src, lufs), capture_output=True, text=True, encoding="utf-8", errors="replace")
    measured = parse_loudnorm(first.stderr) if first.returncode == 0 else None
    if first.returncode != 0:
        raise RuntimeError(first.stderr.strip().splitlines()[-1] if first.stderr.strip() else "ffmpeg could not read the file")
    if measured is None:
        print("  could not measure the loudness; using a single pass", file=sys.stderr)
    done = subprocess.run(encode_command(src, dst, lufs, bitrate, measured), capture_output=True, text=True, encoding="utf-8", errors="replace")
    if done.returncode != 0:
        raise RuntimeError(done.stderr.strip().splitlines()[-1] if done.stderr.strip() else "ffmpeg failed")
    size = dst.stat().st_size
    if size >= MAX_BYTES:
        raise RuntimeError(f"{dst.name} is {size} bytes, over the {MAX_BYTES} byte limit: record a shorter lesson or use --bitrate 24k")
    return f"{size / 1024:.0f} KB"


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Trim, normalise and compress lesson recordings to mono 32 kbps AAC (.m4a).")
    ap.add_argument("files", nargs="*", help="recordings to process (default: everything in --in)")
    ap.add_argument("--in", dest="in_dir", type=Path, default=DEFAULT_IN, help=f"folder of raw recordings (default {DEFAULT_IN})")
    ap.add_argument("--out", type=Path, default=DEFAULT_OUT, help=f"where the .m4a files go (default {DEFAULT_OUT})")
    ap.add_argument("--lufs", type=float, default=-16.0, help="target loudness in LUFS (default -16)")
    ap.add_argument("--bitrate", default="32k", help="AAC bit rate (default 32k)")
    ap.add_argument("--force", action="store_true", help="redo files that are already up to date")
    ap.add_argument("--dry-run", action="store_true", help="only print the ffmpeg commands")
    args = ap.parse_args(argv)

    if not args.dry_run and shutil.which("ffmpeg") is None:
        print("ffmpeg was not found on the PATH. Install it from https://ffmpeg.org and open a new terminal.", file=sys.stderr)
        return 2
    try:
        inputs = find_inputs(args.files, args.in_dir)
    except FileNotFoundError as e:
        print(f"no such folder or file: {e.filename}", file=sys.stderr)
        return 2
    failures = 0
    for src in inputs:
        dst = output_path(src, args.out)
        if dst is None:
            print(f"skip {src.name}: name it <lesson_id>.<hi|cg|en>.<wav|mp3|m4a|...>, for example upi_pin.hi.wav")
            continue
        if not args.force and dst.exists() and dst.stat().st_mtime >= src.stat().st_mtime:
            print(f"up to date {dst.name}")
            continue
        try:
            print(f"{src.name} -> {dst.name}: {process(src, dst, args.lufs, args.bitrate, args.dry_run)}")
        except Exception as e:  # report and carry on with the other files
            failures += 1
            print(f"FAILED {src.name}: {e}", file=sys.stderr)
    if not inputs:
        print(f"no recordings found in {args.in_dir}")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
