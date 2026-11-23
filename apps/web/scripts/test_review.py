"""Tests for review.py: python -X utf8 -m pytest -q scripts/test_review.py (from apps/web)."""
import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent))
import review  # noqa: E402

SOURCE = '''S = {
 "a.one": ("Hello {name}", "नमस्ते {name}", "जोहार {name}"),
 "a.two": ("Same", "वही",
   "वही"),
 # a comment that must survive
 "a.three": ("Call 1930", "1930 पर कॉल करें", "1930 म कॉल करव"),
}
'''


def make(tmp_path: Path) -> Path:
    p = tmp_path / "strings_x.py"
    p.write_bytes(SOURCE.replace("\n", "\r\n").encode("utf-8"))  # Windows line endings, as in the repository
    return p


def test_a_fix_replaces_only_the_chosen_translation(tmp_path):
    p = make(tmp_path)
    review.apply_fix("a.one", 2, "जोहार, {name}", tmp_path)
    s = p.read_bytes().decode("utf-8")
    assert '"नमस्ते {name}"' in s and '"जोहार, {name}"' in s and '"जोहार {name}"' not in s
    assert "# a comment that must survive" in s and "\r\n" in s


def test_two_equal_translations_are_replaced_independently(tmp_path):
    p = make(tmp_path)
    review.apply_fix("a.two", 2, "वही बात", tmp_path)
    s = p.read_bytes().decode("utf-8")
    assert '"वही",' in s and '"वही बात"' in s


def test_a_missing_key_is_reported(tmp_path):
    make(tmp_path)
    with pytest.raises(SystemExit):
        review.apply_fix("nope", 1, "x", tmp_path)


def test_corrections_must_keep_placeholders_and_avoid_latin_letters():
    review.check_correction("k", "hi", "Hello {name}", "नमस्ते {name}")
    with pytest.raises(SystemExit):
        review.check_correction("k", "hi", "Hello {name}", "नमस्ते")  # placeholder dropped
    with pytest.raises(SystemExit):
        review.check_correction("k", "hi", "Call UPI", "UPI पर कॉल करें")  # Latin letters
    review.check_correction("k", "cg", "Hello {name}", "जोहार {name}")


def test_a_review_goes_stale_when_the_text_changes():
    r = {"version": 1, "entries": {"k": {"hi": {"status": "ok", "hash": review.digest("Hello", "नमस्ते")}}}}
    assert review.state_of(r, "k", "hi", "Hello", "नमस्ते") == "ok"
    assert review.state_of(r, "k", "hi", "Hello", "नमस्कार") == "changed since review"
    assert review.state_of(r, "k", "hi", "Hello there", "नमस्ते") == "changed since review"
    assert review.state_of(r, "k", "cg", "Hello", "जोहार") == "needs review"
    r["entries"]["k"]["hi"]["status"] = "unsure"
    assert review.state_of(r, "k", "hi", "Hello", "नमस्ते") == "unsure"
