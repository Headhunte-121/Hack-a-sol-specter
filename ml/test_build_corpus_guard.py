"""Tests for the build_corpus environment guard and frozen-text exclusion (tiny synthetic data in a temp folder)."""
from __future__ import annotations

import csv

import pandas as pd
import pytest

import build_corpus as bc

FULL = {"shade63": 8000, "cloveai": 9000, "bolewara_uci": 3000, "ysangam_calls": 700}


def test_guard_accepts_the_real_sized_data():
    assert bc.check_environment(FULL, True) == []


def test_guard_rejects_a_small_corpus():
    problems = bc.check_environment({"shade63": 300, "cloveai": 200, "bolewara_uci": 50, "ysangam_calls": 20}, True)
    assert any("usable external rows" in p for p in problems)


def test_guard_rejects_a_missing_source_even_when_the_rest_is_large():
    problems = bc.check_environment({**FULL, "cloveai": 0, "shade63": 20000}, True)
    assert any("'cloveai'" in p for p in problems)


def test_guard_rejects_a_missing_challenge_file():
    assert any("wild_big.csv" in p for p in bc.check_environment(FULL, False))


def test_guard_can_be_disabled_for_tests():
    assert bc.check_environment({}, False, allow_small=True) == []


def make_repo(tmp_path, with_challenge=True):
    root = tmp_path / "repo"
    ai = root / "ai tuning" / "data"
    ai.mkdir(parents=True)
    (root / "data" / "team").mkdir(parents=True)
    for name, pre in (("synthetic.csv", "alpha"), ("synthetic_v2.csv", "beta")):
        with open(ai / name, "w", encoding="utf-8", newline="") as fp:
            w = csv.writer(fp)
            w.writerow(["text", "label", "template_id"])
            for t in range(6):
                for k in range(3):
                    w.writerow([f"{pre} template {t} says pay {k + 1} rupees fee to claim", t % 2, f"{pre}{t}"])
    if with_challenge:
        (ai / "wild_big.csv").write_text("text,label,lang\nSomething written for the challenge set only,0,english\n", encoding="utf-8")
    return root, ai


def patch_paths(monkeypatch, root, ai):
    monkeypatch.setattr(bc, "ROOT", root)
    monkeypatch.setattr(bc, "AI", ai)
    monkeypatch.setattr(bc, "OUT", root / "data" / "processed")
    monkeypatch.setattr(bc, "FROZEN", root / "data" / "real" / "none")


def test_build_refuses_to_run_on_incomplete_data(tmp_path, monkeypatch, capsys):
    root, ai = make_repo(tmp_path)
    patch_paths(monkeypatch, root, ai)
    with pytest.raises(SystemExit) as e:
        bc.main([])
    assert e.value.code == 2
    err = capsys.readouterr()
    assert "environment guard: usable external rows = 0" in err.out and "refusing to build" in err.err
    assert not (root / "data" / "processed" / "corpus.csv").exists()          # nothing is written when the guard trips


def test_build_refuses_when_the_challenge_file_is_missing(tmp_path, monkeypatch):
    root, ai = make_repo(tmp_path, with_challenge=False)
    patch_paths(monkeypatch, root, ai)
    with pytest.raises(SystemExit) as e:
        bc.main([])
    assert e.value.code == 2


def test_allow_small_builds_and_excludes_frozen_texts(tmp_path, monkeypatch, capsys):
    root, ai = make_repo(tmp_path)
    patch_paths(monkeypatch, root, ai)
    fd = root / "data" / "real" / "none"
    fd.mkdir(parents=True)
    monkeypatch.setattr(bc, "FROZEN", fd)
    (fd / "blind_v1.csv").write_text("id,text,label\nb1,ALPHA template 2 says pay 9 rupees fee to claim,0\n", encoding="utf-8")   # masked-equal to the alpha-2 rows (they dedupe to one)
    bc.main(["--allow-small"])
    out = capsys.readouterr().out
    assert "guard disabled by --allow-small" in out and "dropped 1 training rows" in out
    corpus = pd.read_csv(root / "data" / "processed" / "corpus.csv")
    assert not corpus.text.str.contains("alpha template 2 ", case=False).any()
    assert corpus.text.str.contains("beta template 2 ").any()                 # other rows stay
