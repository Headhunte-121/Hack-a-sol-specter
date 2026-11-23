"""Tests for make_audio.py and make_captions.py: python -X utf8 -m pytest -q scripts/test_audio_tools.py (from apps/web).
They test the logic that does not need ffmpeg or a speech server: file names, the ffmpeg command lines, reading the loudness
measurement, and cleaning the caption segments."""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import make_audio  # noqa: E402
import make_captions  # noqa: E402


def test_recording_names_give_lesson_and_language():
    assert make_audio.parse_name(Path("upi_pin.hi.wav")) == ("upi_pin", "hi")
    assert make_audio.parse_name(Path("safe_habits.cg.MP3")) == ("safe_habits", "cg")
    assert make_audio.parse_name(Path("upi_pin.fr.wav")) is None  # not one of hi, cg, en
    assert make_audio.parse_name(Path("upi_pin.wav")) is None
    assert make_audio.parse_name(Path("notes.hi.txt")) is None
    assert make_audio.output_path(Path("raw/atm_pin.en.wav"), Path("out")) == Path("out/atm_pin.en.m4a")
    assert make_audio.output_path(Path("raw/readme.txt"), Path("out")) is None


def test_the_encode_command_is_mono_32k_aac_with_the_index_first():
    cmd = make_audio.encode_command(Path("in.wav"), Path("out.m4a"), -16.0, "32k", None)
    assert cmd[0] == "ffmpeg"
    assert cmd[cmd.index("-ac") + 1] == "1"
    assert cmd[cmd.index("-c:a") + 1] == "aac"
    assert cmd[cmd.index("-b:a") + 1] == "32k"
    assert cmd[cmd.index("-movflags") + 1] == "+faststart"
    assert cmd[-1] == "out.m4a"
    af = cmd[cmd.index("-af") + 1]
    assert af.count("silenceremove") == 2 and af.count("areverse") == 2  # silence trimmed at both ends
    assert "loudnorm=I=-16.0" in af


def test_the_second_pass_uses_the_measured_loudness():
    measured = {"input_i": "-23.1", "input_tp": "-4.2", "input_lra": "6.0", "input_thresh": "-33.5", "target_offset": "0.4"}
    f = make_audio.loudnorm_filter(-16.0, measured)
    assert "measured_I=-23.1" in f and "measured_TP=-4.2" in f and "offset=0.4" in f and f.endswith("linear=true")
    assert "measured_I" not in make_audio.loudnorm_filter(-16.0)


def test_loudness_is_read_from_the_end_of_ffmpeg_output():
    out = 'size=N/A time=00:00:59\n[Parsed_loudnorm_5 @ 0x1] \n{\n\t"input_i" : "-23.10",\n\t"input_tp" : "-4.20",\n\t"input_lra" : "6.00",\n\t"input_thresh" : "-33.50",\n\t"output_i" : "-16.0",\n\t"target_offset" : "0.40"\n}\n'
    got = make_audio.parse_loudnorm(out)
    assert got and got["input_i"] == "-23.10" and got["target_offset"] == "0.40"
    assert make_audio.parse_loudnorm("no json here") is None
    assert make_audio.parse_loudnorm('{"input_i": "-inf", "input_tp": "0", "input_lra": "0", "input_thresh": "0", "target_offset": "0"}') is None  # silence


def test_a_folder_is_expanded_in_name_order(tmp_path):
    for n in ("b.hi.wav", "a.hi.wav"):
        (tmp_path / n).write_bytes(b"x")
    assert [p.name for p in make_audio.find_inputs([], tmp_path)] == ["a.hi.wav", "b.hi.wav"]
    assert make_audio.find_inputs([str(tmp_path / "b.hi.wav")], tmp_path) == [tmp_path / "b.hi.wav"]


def test_dry_run_only_prints(capsys):
    assert make_audio.process(Path("in.wav"), Path("out.m4a"), -16.0, "32k", dry_run=True) == "dry-run"
    assert "ffmpeg" in capsys.readouterr().out


def test_caption_files_sit_next_to_the_recording():
    assert make_captions.caption_path(Path("public/audio/upi_pin.hi.m4a")) == Path("public/audio/upi_pin.hi.json")
    assert make_captions.parse_name(Path("upi_pin.cg.m4a")) == ("upi_pin", "cg")
    assert make_captions.parse_name(Path("upi_pin.json")) is None


def test_the_upload_is_multipart_with_one_file_field():
    body, content_type = make_captions.multipart("file", "a.m4a", "audio/mp4", b"DATA")
    boundary = content_type.split("boundary=")[1]
    assert body.startswith(f"--{boundary}\r\n".encode()) and body.endswith(f"--{boundary}--\r\n".encode())
    assert b'name="file"; filename="a.m4a"' in body and b"DATA" in body


def test_segments_are_cleaned_sorted_and_kept_inside_the_recording():
    raw = [{"start": 5, "end": 9.5, "text": " दो   शब्द "}, {"start": 0, "end": 5.3, "text": "एक"}, {"start": 9, "end": 9.4, "text": "  "}, {"start": 8, "end": 99, "text": "तीन"}]
    got = make_captions.normalise_segments(raw, 10.0)
    assert [s["text"] for s in got] == ["एक", "दो शब्द", "तीन"]
    assert got[1]["start"] == 5.3  # does not start before the line before it ends
    assert got[2]["start"] >= got[1]["end"] and got[2]["end"] == 10.0
    assert all(a["end"] <= b["start"] for a, b in zip(got, got[1:]))


def test_the_caption_file_has_the_shape_the_player_and_the_content_check_read():
    c = make_captions.build_captions("hi", {"duration": 61.234, "segments": [{"start": 0, "end": 4.1, "text": "नमस्ते", "confidence": 0.9}]})
    assert c == {"version": 1, "lang": "hi", "duration": 61.23, "segments": [{"start": 0.0, "end": 4.1, "text": "नमस्ते"}]}
    json.dumps(c, ensure_ascii=False)


def test_without_a_server_address_it_stops_with_a_clear_message(monkeypatch, capsys):
    monkeypatch.delenv(make_captions.ENV_VAR, raising=False)
    assert make_captions.main([]) == 2
    assert make_captions.ENV_VAR in capsys.readouterr().err
