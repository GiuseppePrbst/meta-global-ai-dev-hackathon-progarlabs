"""Open-set metrics, pairing, leakage and freeze: synthetic rows only."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parents[3]))
from evaluations import open_set_eval as ose


def row(
    image,
    label,
    negative,
    proposed,
    accepted,
    assessment="not_assessed",
    status="completed",
):
    return {
        "image_id": image,
        "label": label,
        "negative": negative,
        "proposed": proposed,
        "accepted": accepted,
        "catalog_assessment": assessment,
        "status": status,
    }


ROWS = [
    row("p1", "a", False, ["a"], "a"),
    row("p2", "a", False, ["b", "a"], "b"),  # accepted wrong species
    row("p3", "b", False, ["b"], None),  # unnecessary abstention
    row("p4", "b", False, [], None),
    row(
        "n1", "x", True, ["a"], None, "out_of_catalog_suspected"
    ),  # proposed, not accepted
    row("n2", "x", True, ["a"], "a"),  # false acceptance
    row("n3", "y", True, [], None, "non_diagnostic_photo"),
    row("e1", "a", False, [], None, status="provider_error"),
]


def test_metrics_keep_numerators_and_denominators_apart():
    m = ose.metrics(ROWS)
    assert m["top1_proposed"] == {"k": 2, "n": 4, "rate": 0.5, "ci95": ose.wilson(2, 4)}
    assert m["top3_proposed"]["k"] == 3
    assert m["correct_accepted_on_positives"]["k"] == 1
    assert m["coverage_positives"]["k"] == 2
    assert m["selective_risk"] == {
        "k": 1,
        "n": 2,
        "rate": 0.5,
        "ci95": ose.wilson(1, 2),
    }
    assert m["unnecessary_abstention"]["k"] == 1
    assert (
        m["negatives_with_proposal"]["k"] == 2
        and m["negatives_with_proposal"]["n"] == 3
    )
    assert m["negatives_false_acceptance"]["k"] == 1
    assert m["negatives_flagged_out_of_catalog"]["k"] == 1
    assert m["provider_errors"] == {
        "k": 1,
        "n": 8,
        "rate": 0.125,
        "ci95": ose.wilson(1, 8),
    }


def test_always_abstaining_cannot_look_good():
    lazy = [dict(r, accepted=None, proposed=[]) for r in ROWS]
    m = ose.metrics(lazy)
    assert m["negatives_false_acceptance"]["k"] == 0
    assert m["coverage_positives"]["rate"] == 0  # the cost is visible
    assert m["selective_risk"]["rate"] is None and m["selective_risk"]["ci95"] is None


def test_wilson_interval_bounds():
    assert ose.wilson(0, 0) is None
    low, high = ose.wilson(11, 12)
    assert 0.6 < low < 0.917 < high <= 1
    assert ose.wilson(0, 12)[0] == 0


def test_paired_outcomes_on_identical_cases():
    other = [dict(r, accepted=None) if r["negative"] else r for r in ROWS]
    pairs = ose.paired(ROWS, other)
    assert pairs["n"] == 8
    assert pairs["only_second"] == 1  # n2 fixed by abstaining
    assert pairs["only_first"] == 0


def test_leak_and_freeze_controls():
    excluded = {
        "image_ids": {"i1"},
        "occurrences": {"o1"},
        "groups": {"g1"},
        "acquisition": {"commons:a|2020-01-01"},
        "phash": ["ffffffffffffffff"],
    }
    clean = {
        "image_id": "i9",
        "occurrence_id": "o9",
        "individual_group": "g9",
        "perceptual_hash": "0000000000000000",
    }
    assert not ose.leaks(clean, excluded)
    for change in (
        {"image_id": "i1"},
        {"occurrence_id": "o1"},
        {"individual_group": "g1"},
        {"acquisition_group": "commons:a|2020-01-01"},
        {"perceptual_hash": "fffffffffffffff0"},
    ):
        assert ose.leaks(clean | change, excluded)
    cases = [
        {"image_id": "a", "species_id": "s", "sha256": "1"},
        {"image_id": "b", "species_id": "t", "sha256": "2"},
    ]
    assert ose.freeze(cases) == ose.freeze(list(reversed(cases)))
    assert ose.freeze(cases) != ose.freeze(cases[:1])


def test_published_eval_set_matches_its_freeze_hash():
    import json

    data = json.loads(
        (
            Path(__file__).parents[3] / "evaluations/botanical/open-set-eval-set.json"
        ).read_text(encoding="utf-8")
    )
    kept = [c for c in data["cases"] if not c["agent_visual_check"]["excluded"]]
    assert ose.freeze(kept) == data["freeze_sha256"]
    assert all(
        c["agent_visual_check"]["reviewer"].startswith("claude") for c in data["cases"]
    )
    assert "expert" not in data["label_status"].split("(")[0]
