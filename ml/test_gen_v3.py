"""The v3 data generators: labels, languages, groups, and that nothing they write matches a frozen evaluation text."""
import pandas as pd
import pytest

import gen_everyday_v3
import gen_gap_v3
import gen_sms_v3
import leak_check


def rows_of(module, fn):
    return getattr(module, fn)()


@pytest.mark.parametrize("module,fn,label", [(gen_gap_v3, "scam", 1), (gen_gap_v3, "genuine", 0), (gen_sms_v3, "scam", 1), (gen_sms_v3, "genuine", 0)])
def test_labels_languages_and_groups(module, fn, label):
    rows = rows_of(module, fn)
    assert len(rows) > 50
    assert {r["label"] for r in rows} == {label}
    assert {r["lang"] for r in rows} <= {"english", "hindi", "hinglish"}
    assert all(r["text"].strip() and "{" not in r["text"] and "}" not in r["text"] for r in rows), "an unfilled template slot"
    groups = {r["group"] for r in rows}
    assert len(groups) >= 15, "every template must be its own group so templates never straddle splits"


def test_scam_and_genuine_cover_the_same_topics():
    """Each topic has both sides, so the model learns the action and not the topic."""
    s = {r["group"].split(":")[0] for r in gen_gap_v3.scam()}
    g = {r["group"].split(":")[0] for r in gen_gap_v3.genuine()}
    assert {"qr_receive", "wrong_pay", "invest", "scheme", "card_apk", "arrest", "kyc_exp"} <= s
    assert {"scheme_ok", "card_ok", "otp_ok", "awareness", "refund_ok", "link_ok", "everyday"} <= g


def test_everyday_sentences_are_genuine_and_distinct():
    for lines in (gen_everyday_v3.HINGLISH, gen_everyday_v3.HINDI, gen_everyday_v3.ENGLISH):
        lines = [x.strip() for x in lines if x.strip()]
        assert len(lines) == len(set(lines))
        assert len(lines) >= 20


def test_no_generated_text_matches_a_frozen_evaluation_text():
    if not leak_check.DEFAULT_FROZEN.is_dir():
        pytest.skip("frozen evaluation directory not available in this checkout")
    index, _ = leak_check.build_index(leak_check.DEFAULT_FROZEN, gen_gap_v3.ROOT)
    for fn in ("data/team/gap_v3_scam.csv", "data/team/gap_v3_genuine.csv", "data/team/sms_v3_scam.csv", "data/team/sms_v3_genuine.csv", "data/team/everyday_v3.csv",
               "data/team/paraphrase_v3.csv"):
        p = gen_gap_v3.ROOT / fn
        if not p.exists():
            continue
        d = pd.read_csv(p)
        hits = [t for t in d.text if index.match(t)]
        assert not hits, f"{fn}: {len(hits)} rows match frozen evaluation texts"
