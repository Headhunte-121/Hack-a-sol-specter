"""Unit tests for the leak guard (synthetic texts only; nothing here comes from a real evaluation set)."""
from __future__ import annotations

import csv
import io
import json
import random

import pandas as pd

import leak_check as lc


def index_of(*texts, name="blind_v1"):
    return lc.FrozenIndex({name: list(texts)})


def rules(index, text):
    return {(h.frozen_set, h.rule) for h in index.match(text)}


# ---- the three rules -------------------------------------------------------------------------------------------
def test_exact_rule_equal_masked_key():
    i = index_of("Your OTP is 123456. Do not share it with anyone.")
    assert ("blind_v1", "exact") in rules(i, "your OTP is 987654, do not share it with anyone")      # number and punctuation do not matter
    assert ("blind_v1", "exact") in rules(i, "YOUR  OTP is 55555555 do   not share it with anyone")


def test_exact_rule_masks_links_phones_and_amounts():
    i = index_of("Pay Rs 5,000 at http://pay-now.top/x or call 9876543210 today")
    assert ("blind_v1", "exact") in rules(i, "pay rs 250 at http://other-site.xyz/y or call 9123456789 today")


def test_signature_rule_same_first_six_and_last_four_tokens():
    frozen = "dear customer your account will be blocked today unless you visit to the nearest branch"
    other = "dear customer your account will be suspended soon please finish the formalities to the nearest branch"
    assert lc.signature(lc.mask_tokens(frozen)) == lc.signature(lc.mask_tokens(other))
    assert rules(index_of(frozen), other) == {("blind_v1", "signature")}      # different key, low Jaccard: only the signature rule fires


def test_jaccard_rule_reordered_copy():
    words = ["alpha", "bravo", "charlie", "delta", "echo", "foxtrot", "golf", "hotel", "india", "juliet", "kilo", "lima",
             "mike", "november", "oscar", "papa", "quebec", "romeo"]
    frozen = " ".join(words)
    candidate = " ".join(reversed(words)) + " sierra"             # 18 shared of 19: Jaccard 0.947, different order
    assert rules(index_of(frozen), candidate) == {("blind_v1", "jaccard")}


def test_jaccard_boundary_is_inclusive_at_0_85():
    shared = [f"tk{n:02d}" for n in range(17)]
    frozen = " ".join(shared)
    at_threshold = " ".join(["xa", "xb", "xc"] + list(reversed(shared)))          # 17 / 20 = 0.85 exactly
    below = " ".join(["xa", "xb", "xc", "xd"] + list(reversed(shared)))           # 17 / 21 = 0.81
    assert ("blind_v1", "jaccard") in rules(index_of(frozen), at_threshold)
    assert rules(index_of(frozen), below) == set()


def test_unrelated_text_is_not_a_leak():
    i = index_of("Your parcel will arrive tomorrow between 10 and 12, track it in the app")
    assert i.match("Congratulations you have won a lottery, pay the processing fee to claim your prize now") == []


def test_empty_and_punctuation_only_texts_never_match():
    i = index_of("!!!", "", "Hello there friend")
    assert i.match("") == [] and i.match("!!!") == [] and i.match("   ") == []


def test_hit_names_every_frozen_set():
    i = lc.FrozenIndex({"a": ["Reset code is 1234 do not share"], "b": ["Reset code is 5678 do not share"]})
    assert {h.frozen_set for h in i.match("reset code is 9999 do not share") if h.rule == "exact"} == {"a", "b"}


def test_prefix_filter_agrees_with_brute_force():
    rnd = random.Random(1)
    vocab = [f"tk{n}" for n in range(30)]
    frozen_sets = [rnd.sample(vocab, rnd.randint(1, 25)) for _ in range(80)]
    index = lc.FrozenIndex({f"s{n}": [" ".join(s)] for n, s in enumerate(frozen_sets)})
    checked = hits = 0
    for _ in range(600):
        base = rnd.choice(frozen_sets)
        q = list(base)
        for _ in range(rnd.randint(0, 3)):                      # edit a known set a little so that near matches actually occur
            if q and rnd.random() < 0.5:
                q.pop(rnd.randrange(len(q)))
            else:
                q.append(rnd.choice(vocab))
        rnd.shuffle(q)
        q = list(dict.fromkeys(q)) or ["tk0"]
        got = {h.frozen_set for h in index.match_tokens(q) if h.rule == "jaccard"}
        want = {f"s{n}" for n, s in enumerate(frozen_sets) if lc.jaccard_ok(frozenset(q), frozenset(s))}
        assert got == want, (q, got ^ want)
        checked += 1
        hits += bool(want)
    assert hits > 50 and checked == 600                        # the comparison was not vacuous


# ---- loading the frozen files -----------------------------------------------------------------------------------
def make_frozen_dir(tmp_path):
    root = tmp_path / "repo"
    fd = root / "data" / "real" / "blind"
    (fd / "voice").mkdir(parents=True)
    (root / "ai tuning" / "data").mkdir(parents=True)
    with open(fd / "blind_v1.csv", "w", encoding="utf-8", newline="") as fp:
        w = csv.writer(fp)
        w.writerow(["id", "text", "label"])
        w.writerow(["b1", "Blind sample message about a courier delay", 0])
    (fd / "eval_in.json").write_text(json.dumps([{"id": "p1", "text": "Probe sample about an electricity refund", "label": 1}]), encoding="utf-8")
    (fd / "voice" / "cvm_in.json").write_text(json.dumps([{"id": "c1", "text": "Clip sample about a lost wallet", "label": 0}]), encoding="utf-8")
    (root / "ai tuning" / "data" / "wild_big.csv").write_text("text,label,lang\nChallenge sample about a gas bill,0,english\n", encoding="utf-8")
    return root, fd


def test_load_frozen_reads_csv_and_json_and_warns_about_missing_files(tmp_path):
    root, fd = make_frozen_dir(tmp_path)
    sets, warnings = lc.load_frozen(fd, root)
    assert sets["blind_v1"] == ["Blind sample message about a courier delay"]
    assert sets["probe_eval_in"][0].startswith("Probe sample")
    assert sets["clips_text"][0].startswith("Clip sample")
    assert sets["challenge_v1"][0].startswith("Challenge sample")
    assert any("otp" in w.lower() or "eval_otp_in.json" in w for w in warnings)         # files not created above are reported, not skipped silently


def test_missing_frozen_directory_still_protects_the_challenge_sets(tmp_path):
    root, _ = make_frozen_dir(tmp_path)
    sets, warnings = lc.load_frozen(tmp_path / "nowhere", root)
    assert list(sets) == ["challenge_v1"] and any("frozen directory not found" in w for w in warnings)


# ---- scanning and dropping ---------------------------------------------------------------------------------------
def write_team_csv(path, rows):
    with open(path, "w", encoding="utf-8", newline="") as fp:           # csv default line ending is CRLF, like data/team/*.csv
        w = csv.writer(fp)
        w.writerow(["text", "label", "lang", "group"])
        w.writerows(rows)


def test_scan_drop_keeps_other_rows_and_line_endings_and_prints_no_text(tmp_path):
    root, fd = make_frozen_dir(tmp_path)
    f = root / "data" / "team" / "gen.csv"
    f.parent.mkdir(parents=True)
    leaked = "Blind sample message about a courier delay"
    write_team_csv(f, [["Your gas cylinder is booked, delivery in two days", 0, "english", "gas:1"],
                       [leaked.upper(), 0, "english", "courier:1"],
                       ["A, quoted \"field\" survives the rewrite", 1, "english", "quote:1"]])
    out = io.StringIO()
    assert lc.run(fd, [f], drop=False, root=root, out=out) == 1
    assert "row 2 group=courier:1" in out.getvalue() and "exact: blind_v1" in out.getvalue()
    assert leaked.lower() not in out.getvalue().lower()                    # texts are never printed
    out = io.StringIO()
    assert lc.run(fd, [f], drop=True, root=root, out=out) == 1             # still non-zero: leaks were found
    raw = f.read_bytes()
    assert b"courier" not in raw and raw.count(b"\r\n") == raw.count(b"\n") == 3
    rows = list(csv.DictReader(io.StringIO(raw.decode("utf-8"), newline="")))
    assert [r["group"] for r in rows] == ["gas:1", "quote:1"] and rows[1]["text"].startswith("A, quoted")
    assert lc.run(fd, [f], drop=False, root=root, out=io.StringIO()) == 0   # clean now


def test_summary_counts_each_row_once_under_its_strongest_rule(tmp_path):
    root, fd = make_frozen_dir(tmp_path)
    f = root / "data" / "team" / "gen.csv"
    f.parent.mkdir(parents=True)
    write_team_csv(f, [["Blind sample message about a courier delay", 0, "english", "g1"]])      # exact and signature and jaccard all fire
    index, _ = lc.build_index(fd, root)
    found, bad = lc.scan_csv(f, index)
    assert bad == {1} and {x.rule for x in found} == {"exact", "signature", "jaccard"}
    assert lc.summarise(found)[str(f)] == {"exact": 1, "signature": 0, "jaccard": 0}


def test_scan_dataframe_marks_leaked_rows(tmp_path):
    root, fd = make_frozen_dir(tmp_path)
    index, _ = lc.build_index(fd, root)
    df = pd.DataFrame({"text": ["Clip sample about a lost wallet!", "Something else entirely about weather"]}, index=[10, 11])
    mask, detail = lc.scan_dataframe(df, index)
    assert list(mask) == [True, False] and list(detail) == [10]


def test_cli_rejects_a_missing_frozen_dir(tmp_path):
    assert lc.main(["--frozen-dir", str(tmp_path / "nope")]) == 2
