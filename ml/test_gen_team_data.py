"""Tests for the generator's frozen-text filter and the committed generated/team CSVs."""
from __future__ import annotations

import io
from contextlib import redirect_stdout

import pytest

import gen_team_data as g
import leak_check as lc


def test_filter_frozen_drops_matching_rows_and_prints_no_text():
    index = lc.FrozenIndex({"blind_v1": ["Frozen example about a gas booking confirmation"]})
    rows = [{"text": "frozen EXAMPLE about a gas booking confirmation!", "label": 0, "lang": "english", "group": "a"},
            {"text": "A different message about the weather in the hills", "label": 0, "lang": "english", "group": "b"}]
    buf = io.StringIO()
    with redirect_stdout(buf):
        kept = g.filter_frozen(rows, index, "unit")
    assert [r["group"] for r in kept] == ["b"]
    assert "removed 1" in buf.getvalue() and "gas booking" not in buf.getvalue()


def test_main_refuses_when_the_frozen_directory_is_missing(tmp_path, monkeypatch, capsys):
    monkeypatch.setattr(lc, "DEFAULT_FROZEN", tmp_path / "missing")
    monkeypatch.setattr(g, "OUT_DIR", tmp_path / "out")
    with pytest.raises(SystemExit) as e:
        g.main([])
    assert e.value.code == 2 and "refusing to write generated data" in capsys.readouterr().err
    assert not (tmp_path / "out").exists()                      # nothing is written


def test_v2_variants_are_labelled_and_grouped_consistently():
    gen, scam = g.make_v2_genuine(), g.make_v2_scam()
    assert gen and scam
    assert {r["label"] for r in gen} == {0} and {r["label"] for r in scam} == {1}
    for r in gen + scam:
        assert ":v2" in r["group"] and r["lang"] in ("english", "hindi", "hinglish") and r["text"].strip()
    assert len({r["group"] for r in gen}) >= 20                  # one group per sentence structure, so structures can fall in different splits


@pytest.mark.skipif(not lc.DEFAULT_FROZEN.is_dir(), reason="frozen evaluation directory not available here")
def test_committed_training_sources_contain_no_frozen_text():
    files = [f for f in lc.training_sources() if f.name != "corpus.csv"]      # corpus.csv is generated and may be stale
    assert files
    assert lc.run(lc.DEFAULT_FROZEN, files, drop=False, out=io.StringIO()) == 0
