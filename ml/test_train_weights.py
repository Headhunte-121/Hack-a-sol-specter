"""Unit tests for the sample-weight scheme and the band-cut policy in train.py (synthetic data only)."""
from __future__ import annotations

import numpy as np
import pandas as pd

import train


def make_rows(counts: dict[str, int], groups_per_source: int = 5, lang: str = "english") -> pd.DataFrame:
    rows = []
    for src, n in counts.items():
        for i in range(n):
            rows.append({"source": src, "group": f"{src}:{i % groups_per_source}", "lang": lang, "label": i % 2, "text": f"{src} {i}"})
    return pd.DataFrame(rows)


def test_generated_data_never_exceeds_its_share():
    df = make_rows({"shade63": 6000, "cloveai": 5000, "team_syn1": 500, "team_trap_genuine_v1": 400, "team_scam_gap_v1": 150})
    for share in (0.05, 0.15):
        w, rep = train.sample_weights(df, gen_share=share)
        gen = df.source.isin(train.GEN_SOURCES).values
        assert abs(w[gen].sum() / w.sum() - share) < 1e-6
        assert rep["gen_share_actual"] <= share + 1e-3


def test_no_other_source_exceeds_the_cap():
    df = make_rows({"shade63": 9000, "cloveai": 500, "bolewara_uci": 300, "team_trap_genuine_v1": 300, "team_scam_gap_v1": 100}, groups_per_source=500)
    w, rep = train.sample_weights(df, gen_share=0.15, source_cap=0.30)
    for src, share in rep["mass_share_by_source"].items():
        if src not in train.GEN_SOURCES:
            assert share <= 0.30 + 1e-3, (src, share)
    assert rep["mass_share_by_source"]["shade63"] > 0.29                # it was well above the cap, so it sits at the cap


def test_big_template_families_are_damped():
    df = make_rows({"cloveai": 1000, "team_syn1": 100}, groups_per_source=1)               # one giant family per source
    w, _ = train.sample_weights(df, gen_share=0.15, source_cap=0.99)
    small = make_rows({"cloveai": 1000, "team_syn1": 100}, groups_per_source=500)
    w_small, _ = train.sample_weights(small, gen_share=0.15, source_cap=0.99)
    assert w[df.source == "cloveai"].sum() < w_small[small.source == "cloveai"].sum() / 3


def test_non_english_rows_count_more():
    df = pd.concat([make_rows({"team_syn1": 100}, 100, "english"), make_rows({"team_syn2": 100}, 100, "hindi")], ignore_index=True)
    w, _ = train.sample_weights(df, gen_share=0.15, source_cap=0.99)
    assert w[df.lang == "hindi"].mean() > w[df.lang == "english"].mean() * 1.7


# ---- band cuts -----------------------------------------------------------------------------------------------------
def separable_slice(n=1500, seed=0):
    rng = np.random.RandomState(seed)
    y = np.array([1] * n + [0] * n)
    p = np.concatenate([np.clip(rng.beta(12, 1.2, n), 0, 1), np.clip(rng.beta(1.0, 14, n), 0, 1)])
    return p, y


def test_scam_cut_reaches_97_percent_precision_with_confidence_and_susp_cut_keeps_a_band():
    p, y = separable_slice()
    c = train.pick_cuts(p, y, use_lcb=True, log=lambda *a, **k: None)
    assert c["precision_at_scam"] >= 0.97 and c["recall_at_susp"] >= 0.97
    assert c["scam"] - c["suspicious"] >= train.BAND_MIN - 1e-9
    assert c["scam"] > 0.2                                              # the cut is not at the floor: the target needs a real threshold here
    below = [t for t in train.GRID if t < c["scam"]]
    assert all(((y[p >= t] == 1).mean() < 0.985) for t in below[-3:])   # just below the cut the point precision is already near the limit


def test_bootstrap_lower_bound_makes_the_cuts_more_conservative_than_the_point_estimate():
    p, y = separable_slice(n=300, seed=1)                               # small slice: wide confidence interval
    c = train.pick_cuts(p, y, use_lcb=True, log=lambda *a, **k: None)
    point = [t for t in train.GRID if (y[p >= t] == 1).mean() >= 0.97 and (p >= t).sum() >= train.MIN_FLAGGED]
    assert c["scam"] >= min(point) - 1e-9                               # never lower than the plain point-estimate cut
    groups = np.repeat(np.arange(30), 20)                               # 30 families of 20 rows: the same data is far less certain
    c_fam = train.pick_cuts(p, y, groups=groups, use_lcb=True, log=lambda *a, **k: None)
    assert c_fam["suspicious"] <= c["suspicious"] + 1e-9 or c_fam["scam"] >= c["scam"]


def test_unreachable_precision_falls_back_to_the_midpoint():
    y = np.array([1] * 50 + [0] * 50)
    p = np.full(100, 0.8)                                               # scores carry no information at all
    c = train.pick_cuts(y=y, p=p, log=lambda *a, **k: None)
    assert c["scam"] == train.SCAM_CUT_FALLBACK and c["suspicious"] == max(0.05, round(train.SCAM_CUT_FALLBACK - train.BAND_MIN, 2))


def test_cross_fit_uses_only_realistic_rows_and_keeps_groups_together(monkeypatch):
    # tiny synthetic matrix: the helper must return one prediction per original realistic row and never score a row with a model that saw its group
    from scipy.sparse import csr_matrix
    rng = np.random.RandomState(1)
    rows = []
    for g in range(12):
        for i in range(6):
            rows.append({"source": "team_syn1", "group": f"g{g}", "lang": "english", "label": g % 2, "text": f"t{g} {i}"})
    for i in range(30):
        rows.append({"source": "cloveai", "group": f"c{i % 3}", "lang": "english", "label": i % 2, "text": f"c{i}"})
    tr = pd.DataFrame(rows)
    X = csr_matrix(rng.rand(len(tr), 5))
    seen = []

    class FakeLR:
        def fit(self, X, y, sample_weight=None):
            return self

        def decision_function(self, X):
            return np.zeros(X.shape[0])

    monkeypatch.setattr(train, "lr", lambda C: FakeLR())
    p, y, g = train.cross_fit_realistic({"tr_aug": tr, "tr": tr}, np.ones(len(tr)), {"C": 1, "a": 1.0, "b": 0.0, "X_tr": X}, folds=3, log=lambda *a, **k: None)
    assert len(p) == len(y) == len(g) == 72 and not np.isnan(p).any() and np.allclose(p, 0.5)


def test_row_weights_stop_a_block_of_hard_negatives_from_setting_the_scam_cut():
    rng = np.random.RandomState(3)
    n = 800
    y = np.concatenate([np.ones(n), np.zeros(n), np.zeros(150)])
    p = np.concatenate([np.clip(rng.beta(12, 1.2, n), 0, 1), np.clip(rng.beta(1.0, 14, n), 0, 1), np.full(150, 0.93)])   # 150 confident false positives
    groups = np.concatenate([np.arange(n), np.arange(n, 2 * n), np.full(150, 10_000)])                                   # ... all from ONE family
    w = np.concatenate([np.ones(2 * n), np.full(150, 0.1)])
    plain = train.pick_cuts(p, y, groups=groups, log=lambda *a, **k: None)
    weighted = train.pick_cuts(p, y, groups=groups, weights=w, log=lambda *a, **k: None)
    assert weighted["scam"] <= plain["scam"]
    assert weighted["precision_at_scam"] >= 0.97


def test_point_estimate_policy_is_the_literal_rule():
    p, y = separable_slice(n=1000, seed=2)
    c = train.pick_cuts(p, y, log=lambda *a, **k: None)
    rec = lambda t: (p[y == 1] >= t).mean()
    prec = lambda t: (y[p >= t] == 1).mean()
    fa = lambda t: (p[y == 0] >= t).mean()
    ok_p = [t for t in train.GRID if prec(t) >= 0.97 and fa(t) <= train.FA_TARGET]
    ok_s = [t for t in train.GRID if rec(t) >= train.RECALL_TARGET]
    assert c["scam"] == min(ok_p)
    assert c["raw_suspicious_cut_for_recall_target"] == max(ok_s)
