"""Personal-data and secret scan for training and evaluation CSVs.

Scans all CSV files in data/team/ and data/challenge_team.csv (if present).
Errors if real Aadhaar, card, PAN, email, unlisted mobile numbers, or real UPI handles are found.
Exits 0 on clean, non-zero if findings exist.
"""

from __future__ import annotations

import csv
import glob
import os
import re
import sys
from pathlib import Path

# Explicitly allowed synthetic phone prefixes (5 digits)
ALLOWED_PHONE_PREFIXES = {
    "98765", "99999", "90000", "91234", "80000", "70000", "60000",
    "88990", "60012", "98123", "90001", "90002", "98760",
}

# Explicitly allowed synthetic UPI handle usernames
ALLOWED_UPI_USERS = {"name", "shop", "user", "payee", "ramesh", "xyz", "merchant"}

# Common UPI PSP / bank handles
UPI_HANDLES = (
    "okaxis|okhdfcbank|oksbi|paytm|ybl|apl|upi|axisbank|sbi|icici|hdfcbank|"
    "fbl|ibl|kotak|barodampay|federal"
)

# Regex patterns
RE_PAN = re.compile(r"\b[A-Z]{5}[0-9]{4}[A-Z]\b")
RE_EMAIL = re.compile(r"\b[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+\b")
RE_CARD = re.compile(r"\b\d{16}\b")
# 12-digit runs (Aadhaar-like), excluding transaction reference numbers (Ref, URN, Txn, RRN)
RE_REF = re.compile(r"(?:ref(?:erence)?(?:\s*no\.?)?|urn|rrn|txn(?:\s*id)?|transaction|संदर्भ\s*संख्या)\s*[:#]?\s*\b\d{12}\b", re.IGNORECASE)
RE_12DIGIT = re.compile(r"\b\d{12}\b")
# 10-digit mobile number in Indian format (starting with 6-9)
RE_PHONE = re.compile(r"(?<!\d)([6-9]\d{4}\s?\d{5})(?!\d)")
# UPI handles
RE_UPI = re.compile(rf"\b([a-zA-Z0-9_.-]+)@({UPI_HANDLES})\b", re.IGNORECASE)


def check_text(text: str) -> list[tuple[str, str]]:
    """Check a single text snippet for PII violations. Returns list of (rule, match)."""
    findings: list[tuple[str, str]] = []

    # 1. PAN card
    for m in RE_PAN.finditer(text):
        findings.append(("PAN pattern", m.group(0)))

    # 2. Email addresses
    for m in RE_EMAIL.finditer(text):
        findings.append(("Email address", m.group(0)))

    # 3. 16-digit card numbers
    for m in RE_CARD.finditer(text):
        findings.append(("16-digit card number", m.group(0)))

    # 4. 12-digit Aadhaar runs (excluding transaction reference numbers)
    # Mask out reference numbers first
    masked_text = RE_REF.sub(" " * 20, text)
    for m in RE_12DIGIT.finditer(masked_text):
        findings.append(("12-digit Aadhaar-like number", m.group(0)))

    # 5. Mobile numbers
    for m in RE_PHONE.finditer(text):
        raw_num = m.group(1).replace(" ", "")
        prefix = raw_num[:5]
        if prefix not in ALLOWED_PHONE_PREFIXES:
            findings.append((f"Non-synthetic mobile number ({raw_num})", m.group(0)))

    # 6. UPI handles
    for m in RE_UPI.finditer(text):
        user = m.group(1).lower()
        if user not in ALLOWED_UPI_USERS:
            findings.append((f"Non-whitelisted UPI handle ({m.group(0)})", m.group(0)))

    return findings


def scan_file(path: Path) -> list[tuple[str, int, str, str]]:
    """Scan a CSV file. Returns list of (file, row_idx, rule, matched_text)."""
    findings: list[tuple[str, int, str, str]] = []
    if not path.is_file():
        return findings

    with open(path, encoding="utf-8", errors="replace") as fp:
        reader = csv.DictReader(fp)
        for row_idx, row in enumerate(reader, start=2):  # 1-based, row 2 is first data row
            text = row.get("text", "")
            for rule, match in check_text(text):
                findings.append((str(path), row_idx, rule, match))
    return findings


def main() -> int:
    # Locate data/team directory relative to this script or repo root
    script_dir = Path(__file__).resolve().parent
    repo_root = script_dir.parent
    team_dir = repo_root / "data" / "team"
    challenge_file = repo_root / "data" / "challenge_team.csv"

    files_to_check: list[Path] = []
    if team_dir.is_dir():
        files_to_check.extend(team_dir.glob("*.csv"))
    if challenge_file.is_file():
        files_to_check.append(challenge_file)

    all_findings: list[tuple[str, int, str, str]] = []
    for f in sorted(files_to_check):
        findings = scan_file(f)
        all_findings.extend(findings)

    if all_findings:
        print(f"FAILED: Found {len(all_findings)} personal-data / secret violations:")
        for file_path, row_idx, rule, match in all_findings:
            print(f"  {file_path}:{row_idx}: [{rule}] -> {match}")
        return 1

    print(f"OK: Scanned {len(files_to_check)} CSV file(s). No personal data or secret violations found.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
