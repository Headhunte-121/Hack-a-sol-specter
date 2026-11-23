"""train.py must refuse a truncated corpus and a corpus that contains frozen evaluation text."""
from __future__ import annotations

import pandas as pd
import pytest

import leak_check
import train


def big_corpus(extra_texts=()):
    rows = [f"filler message number {i} about topic {i % 7} and item {i % 13} with word{i}" for i in range(train.MIN_EXTERNAL_ROWS)]
    return pd.DataFrame({"text": rows + list(extra_texts)})


def test_refuses_a_small_corpus(capsys):
    with pytest.raises(SystemExit) as e:
        train.refuse_unsafe_corpus(pd.DataFrame({"text": ["a short corpus"] * 10}))
    assert e.value.code == 2 and "Refusing to train" in capsys.readouterr().err


def test_allow_small_skips_the_size_refusal(tmp_path, monkeypatch):
    monkeypatch.setattr(train, "FROZEN", tmp_path)
    train.refuse_unsafe_corpus(pd.DataFrame({"text": ["a short corpus about nothing at all"]}), allow_small=True)


def test_refuses_a_corpus_with_a_frozen_text(tmp_path, monkeypatch, capsys):
    fd = tmp_path / "frozen"
    fd.mkdir()
    (fd / "blind_v1.csv").write_text("id,text,label\nb1,Frozen sample about a courier delay at the depot,0\n", encoding="utf-8")
    monkeypatch.setattr(train, "FROZEN", fd)
    monkeypatch.setattr(train, "ROOT", tmp_path)
    with pytest.raises(SystemExit) as e:
        train.refuse_unsafe_corpus(big_corpus(["frozen sample about a courier delay at the depot!"]))
    assert e.value.code == 1 and "match frozen evaluation texts" in capsys.readouterr().err


def test_clean_corpus_passes_and_a_missing_frozen_dir_warns_loudly(tmp_path, monkeypatch, capsys):
    monkeypatch.setattr(train, "FROZEN", tmp_path / "missing")
    monkeypatch.setattr(train, "ROOT", tmp_path)
    train.refuse_unsafe_corpus(big_corpus())
    cap = capsys.readouterr()
    assert "WARNING: frozen evaluation directory" in cap.err and "0 of" in cap.out
