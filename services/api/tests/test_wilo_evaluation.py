"""Wilo ASR evaluator: alignment, scoring and publication rules on tiny synthetic fixtures.

CI never needs the private recordings or network access.
"""

import hashlib
import json
import subprocess
import sys
import wave
from io import BytesIO
from pathlib import Path

import pytest

ROOT = Path(__file__).parents[3]
sys.path.insert(0, str(ROOT / "evaluations"))

import wilo_asr  # noqa: E402
import wilo_real  # noqa: E402

BANK = [
    {
        "utterance_id": "01-ES",
        "language": "es",
        "category": "general",
        "reference_text": "Hola Wilo, ¿me ayudas?",
    },
    {
        "utterance_id": "01-EN",
        "language": "en",
        "category": "general",
        "reference_text": "Hey Wilo, can you help me?",
    },
    {
        "utterance_id": "27-ES",
        "language": "es",
        "category": "scientific_names",
        "reference_text": "Wilo, quiero saber sobre Nothofagus dombeyi.",
    },
    {
        "utterance_id": "33-MIXED",
        "language": "mixed",
        "category": "code_switch",
        "reference_text": "Hola Wilo, can you explain what a coigüe is?",
    },
]


def test_reading_order_follows_the_reported_script():
    assert wilo_real.reading_order(BANK) == ["01-ES", "27-ES", "33-MIXED", "01-EN"]


def test_alignment_never_trusts_file_numbers_and_keeps_extras_pending():
    order = wilo_real.reading_order(BANK)
    texts = {r["utterance_id"]: r["reference_text"] for r in BANK}
    drafts = [
        ("A001", "Oye, ¿sabes dónde estoy?"),  # spontaneous extra: no script line
        ("A002", "hola wilo me ayudas"),
        ("A003", "hola wilo me ayudas"),  # retake of the same line
        ("A004", "Wilo quiero saber sobre Notofagus dombeyi"),
        ("A005", "hola wilo can you explain what a coigue is"),
        ("A006", "hey wilo can you help me"),
    ]
    rows = {r["clip_id"]: r for r in wilo_real.align(order, texts, drafts)}
    assert rows["A001"]["review_status"] == "pending_review" and rows["A001"]["utterance_id"] == ""
    assert rows["A002"]["utterance_id"] == "01-ES" and rows["A003"]["retake"]
    assert rows["A004"]["utterance_id"] == "27-ES"
    assert rows["A005"]["utterance_id"] == "33-MIXED" and rows["A006"]["utterance_id"] == "01-EN"


def test_edit_operations_and_wer():
    ops = wilo_real.edit_ops("a b c d".split(), "a x c d e".split())
    assert ops == {"substitutions": 1, "deletions": 0, "insertions": 1}
    assert wilo_asr.wer("Hola Wilo", "hola willow") == 0.5
    assert wilo_asr.cer("coigüe", "coigue") == 0


def test_term_classes_score_scientific_and_park_names():
    classes = {
        "scientific": ["Nothofagus", "Nothofagus dombeyi"],
        "park": ["Puyehue"],
        "trail": [],
        "common_name": ["Wilo"],
    }
    row = wilo_real.score_row(
        "Wilo, Nothofagus dombeyi en Puyehue", "Willow, Nothofagus dombeyi en Pullehue", classes
    )
    assert (row["scientific_terms"], row["scientific_hits"]) == (1, 1)  # genus not double counted
    assert row["park_hits"] == 0 and row["park_missed"] == ["Puyehue"]
    assert row["common_name_missed"] == ["Wilo"]


def test_summary_only_scores_aligned_clips_and_splits_languages(tmp_path, monkeypatch):
    package = tmp_path / "pkg"
    (package / "metadata").mkdir(parents=True)
    with (package / "metadata/reference_bank.csv").open("w", encoding="utf-8-sig", newline="") as f:
        import csv

        writer = csv.DictWriter(f, fieldnames=list(BANK[0]))
        writer.writeheader()
        writer.writerows(BANK)
    out = tmp_path / "results"
    out.mkdir()
    (out / "alignment.json").write_text(
        json.dumps(
            [
                {
                    "clip_id": "A1",
                    "utterance_id": "01-ES",
                    "alignment_score": 1,
                    "retake": False,
                    "review_status": "script_aligned",
                },
                {
                    "clip_id": "A2",
                    "utterance_id": "01-EN",
                    "alignment_score": 1,
                    "retake": False,
                    "review_status": "script_aligned",
                },
                {
                    "clip_id": "A3",
                    "utterance_id": "",
                    "alignment_score": 0,
                    "retake": False,
                    "review_status": "pending_review",
                },
            ]
        )
    )
    rows = [
        {
            "clip_id": "A1",
            "condition": "kw_auto",
            "duration_ms": 2000,
            "latency_ms": 900,
            "transcript": "Hola Wilo, ¿me ayudas?",
        },
        {
            "clip_id": "A2",
            "condition": "kw_auto",
            "duration_ms": 2000,
            "latency_ms": 1100,
            "transcript": "Hey Willow, can you help me?",
        },
        {
            "clip_id": "A3",
            "condition": "kw_auto",
            "duration_ms": 2000,
            "latency_ms": 1000,
            "transcript": "texto privado espontáneo",
        },
        {
            "clip_id": "A1",
            "condition": "kw_es",
            "duration_ms": 2000,
            "error": "MetaRetryableError",
            "status_code": 429,
        },
    ]
    (out / "real.jsonl").write_text(
        "\n".join(json.dumps(r, ensure_ascii=False) for r in rows), encoding="utf-8"
    )
    monkeypatch.setattr(wilo_real, "PACKAGE", package)
    monkeypatch.setattr(wilo_real, "REAL_OUT", out)
    monkeypatch.setattr(wilo_real, "ROOT", tmp_path)
    (tmp_path / "evaluations/wilo").mkdir(parents=True)
    wilo_real.summarize_real(None)
    summary = json.loads(
        (tmp_path / "evaluations/wilo/asr-real-summary.json").read_text(encoding="utf-8")
    )
    auto = summary["conditions"]["kw_auto"]
    assert auto["scored_clips"] == 2  # the pending clip is transcribed but never scored
    assert auto["by_language"]["es"]["wer_mean"] == 0
    assert auto["by_language"]["en"]["wer_mean"] == 0.1667
    assert summary["conditions"]["kw_es"]["errors"] == 1
    assert "texto privado" not in json.dumps(summary) and "Willow" not in json.dumps(summary)


def test_evaluation_scripts_reserve_before_any_meta_call():
    """Every live path goes through transcribe()/realtime() or the API, which reserve first."""
    for name in ("wilo_asr.py", "wilo_real.py", "wilo_scenarios.py"):
        source = (ROOT / "evaluations" / name).read_text(encoding="utf-8")
        assert "httpx.post" not in source and "httpx.Client(" not in source, name
    source = (ROOT / "evaluations/wilo_asr.py").read_text(encoding="utf-8")
    for function in ("async def transcribe(", "async def realtime("):
        body = source[source.index(function) :]
        assert body.index("ledger.reserve") < body.index(
            "MetaVoiceAdapter(client" if "transcribe" in function else "websockets.connect("
        )


def test_no_media_or_private_results_are_versioned():
    tracked = subprocess.run(
        ["git", "-C", str(ROOT), "ls-files"], capture_output=True, text=True
    ).stdout.split()
    media = [p for p in tracked if p.lower().endswith((".wav", ".m4a", ".mp3", ".ogg", ".flac"))]
    assert media == []
    assert not any(
        p.endswith(("real.jsonl", "e2e-real.json", "alignment_review.csv")) for p in tracked
    )


@pytest.mark.parametrize("seconds", [0.5])
def test_wav_fixture_matches_backend_contract(seconds):
    from bosque_ai.voice import prepare_audio

    out = BytesIO()
    with wave.open(out, "wb") as w:
        w.setparams((1, 2, 16000, 0, "NONE", "not compressed"))
        w.writeframes(b"\x00" * int(32000 * seconds))
    audio, duration = prepare_audio(out.getvalue())
    assert duration == 500 and hashlib.sha256(audio).hexdigest()
