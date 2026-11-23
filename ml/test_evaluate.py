"""evaluate.py end to end on synthetic data in a temp folder (the real challenge / frozen sets are never scored by this test)."""
from __future__ import annotations

import csv
import json

import numpy as np
import pandas as pd
import pytest

import evaluate as ev

MODEL = ev.MODEL


def make_corpus(tmp):
    rows = []
    for i in range(40):
        scam = i % 2
        rows.append({"text": f"Your account is blocked, share OTP now {i}" if scam else f"Delivery update: parcel {i} arrives tomorrow",
                     "label": scam, "source": "team_syn1" if i % 4 else "cloveai", "group": f"g{i % 10}", "lang": "english", "split": "test"})
    for i in range(10):
        rows.append({"text": f"Bank notice number {i} about your statement", "label": 0, "source": "team_trap_genuine_v1", "group": f"bank:{i % 3}", "lang": "english", "split": "test"})
    (tmp / "proc").mkdir()
    pd.DataFrame(rows).to_csv(tmp / "proc" / "corpus.csv", index=False)
    pd.DataFrame({"text": ["Pay a fee to claim your prize now", "Your order has shipped"] * 5, "label": [1, 0] * 5, "lang": ["english"] * 10,
                  "source": ["challenge_v1"] * 10}).to_csv(tmp / "proc" / "challenge.csv", index=False)


def make_frozen(tmp):
    fd = tmp / "frozen"
    (fd / "voice").mkdir(parents=True)
    (fd / "voice_hi").mkdir()
    item = lambda t, l: {"id": "x", "text": t, "label": l}
    two = [item("Pay a fee to claim your prize now", 1), item("Your order has shipped today", 0)]
    for rel in ("eval_in.json", "eval_otp_in.json", "eval_evasion_in.json", "voice/cvm_in_asr.json", "voice_hi/cvm_in_orig.json"):
        (fd / rel).write_text(json.dumps(two), encoding="utf-8")
    with open(fd / "blind_v1.csv", "w", encoding="utf-8", newline="") as fp:
        w = csv.writer(fp)
        w.writerow(["id", "text", "label"])
        w.writerows([["b1", "Pay a fee to claim your prize now", 1], ["b2", "Your order has shipped today", 0]])
    return fd


@pytest.fixture
def env(tmp_path, monkeypatch):
    make_corpus(tmp_path)
    monkeypatch.setattr(ev, "PROC", tmp_path / "proc")
    monkeypatch.setattr(ev, "ART", tmp_path / "art")
    return tmp_path, make_frozen(tmp_path)


def test_dev_run_scores_only_the_test_split_and_writes_a_report(env):
    tmp, fd = env
    out = tmp / "out"
    ev.main(["--out-dir", str(out), "--frozen-dir", str(fd)])
    res = json.loads((out / "evaluation.json").read_text(encoding="utf-8"))
    assert "challenge" not in res and "frozen" not in res
    assert res["thresholds"] == json.loads(MODEL.read_text(encoding="utf-8"))["thresholds"]            # read from model.json, not hard-coded
    assert res["test"]["family_table"]["genuine_families"] >= 1 and len(res["test"]["curve"]) == len(ev.CURVE_CUTS)
    assert set(res["test"]["ci95@0.5"]) >= {"precision", "recall", "f1", "false_alarm_rate"}
    assert not (tmp / "art" / "measurements.json").exists()                                              # a dev run is not a measurement
    text = (out / "evaluation_report.md").read_text(encoding="utf-8")
    assert "Trade-off curve" in text and "Genuine message families" in text


def test_measure_run_logs_a_measurement_hashes_the_frozen_files_and_enforces_the_budget(env):
    tmp, fd = env
    out = tmp / "out"
    ev.main(["--measure", "--out-dir", str(out), "--frozen-dir", str(fd), "--tag", "unit test"])
    res = json.loads((out / "evaluation.json").read_text(encoding="utf-8"))
    assert set(res["frozen"]) == {"probe_eval_in", "otp", "clips_asr_40", "clips_hi_24", "evasion_274", "blind_v1"}
    assert res["frozen"]["blind_v1"]["scams"] == 1 and res["frozen"]["blind_v1"]["genuine"] == 1
    hashes = res["hashes"]
    assert len(hashes["model.json"]) == 64 and "blind_v1.csv" in hashes["frozen_evaluation_files"] and "eval_in.json" in hashes["frozen_evaluation_files"]
    assert "Comparison with the two earlier models" in (out / "evaluation_report.md").read_text(encoding="utf-8")
    log = json.loads((tmp / "art" / "measurements.json").read_text(encoding="utf-8"))
    assert len(log) == 1 and log[0]["tag"] == "unit test"
    (tmp / "art" / "measurements.json").write_text(json.dumps([{}] * ev.MEASUREMENT_BUDGET), encoding="utf-8")
    with pytest.raises(SystemExit) as e:
        ev.main(["--measure", "--out-dir", str(out), "--frozen-dir", str(fd)])
    assert e.value.code == 2                                                                            # budget used up: refuses
    ev.main(["--measure", "--allow-extra-measurement", "--out-dir", str(out), "--frozen-dir", str(fd)])


def test_bootstrap_interval_contains_the_estimate_and_widens_with_clusters():
    y = np.array([1] * 100 + [0] * 100)
    pred = np.array([1] * 90 + [0] * 10 + [0] * 95 + [1] * 5)
    ci = ev.bootstrap_ci(y, pred)
    assert ci["recall"][0] <= 0.90 <= ci["recall"][1] and ci["false_alarm_rate"][0] <= 0.05 <= ci["false_alarm_rate"][1]
    clustered = ev.bootstrap_ci(y, pred, groups=np.repeat(np.arange(20), 10))
    assert clustered["recall"][1] - clustered["recall"][0] >= ci["recall"][1] - ci["recall"][0] - 1e-9


def test_wilson_interval():
    lo, hi = ev.wilson(10, 20)
    assert 0.29 < lo < 0.5 < hi < 0.71
    assert ev.wilson(0, 0) == (0.0, 1.0)
