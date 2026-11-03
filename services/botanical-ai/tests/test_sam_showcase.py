import json
import sys
from pathlib import Path

import numpy as np
import pytest
from PIL import Image

sys.path.insert(0, str(Path(__file__).parents[3]))
from evaluations import sam_showcase as sc
from tools.meta_sam_api_lab import showcase


def scene(**extra):
    return {
        "scene_id": "birds-x",
        "domain": "birds",
        "media": "image",
        "specific": ["parrot"],
        "scientific": "Enicognathus leptorhynchus",
        "reference_boxes": [[0.1, 0.1, 0.5, 0.5]],
        **extra,
    }


def test_plan_sends_one_noun_phrase_per_call_and_never_mixes_prompt_types():
    exps = sc.plan([scene()])
    concepts = [e["concept"] for e in exps if e["mode"] == "concept"]
    assert concepts == ["bird", "animal", "parrot", "Enicognathus leptorhynchus"]
    assert all("," not in c and " and " not in c for c in concepts)
    spatial = [e for e in exps if e["mode"] != "concept"]
    assert {e["family"] for e in spatial} == {
        "spatial_box",
        "spatial_point_pos",
        "spatial_point_posneg",
    }
    assert all("concept" not in e for e in spatial)
    assert len({e["exp_id"] for e in exps}) == len(exps)


def test_spatial_prompts_stay_inside_prepared_pixels():
    assert sc.to_pixels([0.0, 0.0, 1.2, 1.0], (640, 360)) == [0, 0, 640, 360]
    pos, neg = sc.derived_points([0.1, 0.1, 0.3, 0.3], (1000, 500), negative=True)
    assert (pos["x"], pos["y"], pos["label"]) == (200, 100, "positive")
    assert (
        neg["label"] == "negative" and neg["x"] > 900
    )  # farthest corner, outside the box
    objs = sc.objects_for(
        {"mode": "box", "boxes": [[0.1, 0.1, 0.3, 0.3]] * 2}, (640, 360)
    )
    assert [o.id for o in objs] == [1, 2]


def test_box_matching_counts_misses_and_extras():
    refs = [[0.1, 0.1, 0.3, 0.3], [0.6, 0.6, 0.9, 0.9]]
    assert sc.match([[0.1, 0.1, 0.3, 0.3]], refs) == {
        "tp": 1,
        "fp": 0,
        "fn": 1,
        "mean_matched_iou": 1.0,
    }
    assert sc.match([[0.5, 0.0, 0.55, 0.05]], refs)["fp"] == 1
    assert sc.match([], refs)["fn"] == 2


def test_muse_advice_is_validated_before_any_sam_call(tmp_path):
    advice = {
        "status": "completed",
        "recommended_concept": "bird, tree",
        "organisms": [
            {
                "label": "x",
                "kingdom_guess": "Animalia",
                "sam_concept": "bird",
                "box_0_1000": [100, 100, 400, 300],
            },
            {
                "label": "bad",
                "kingdom_guess": "Animalia",
                "sam_concept": "bird",
                "box_0_1000": [500, 100, 400, 300],
            },
        ],
    }
    (tmp_path / "advice-s1.json").write_text(json.dumps(advice), encoding="utf-8")
    exps = sc.muse_experiments(["s1"], tmp_path)
    assert [e["mode"] for e in exps] == [
        "muse_box"
    ]  # list concept rejected, inverted box dropped
    assert exps[0]["boxes"] == [[0.1, 0.1, 0.4, 0.3]]


def masks(size=(40, 30)):
    a = np.zeros(size[::-1], bool)
    a[5:15, 5:15] = True
    b = np.zeros(size[::-1], bool)
    b[18:28, 20:35] = True
    if size[0] >= 120:  # large enough for an interior far from the contour glow
        b[30:80, 50:110] = True
    return [
        {"id": "0", "array": a, "color_index": 0},
        {"id": "1", "array": b, "color_index": 1},
    ]


def test_renderer_colours_only_provider_masks_and_isolates_selection():
    image = Image.new("RGB", (120, 90), (100, 100, 100))
    objs = masks((120, 90))
    over = np.asarray(showcase.draw_masks(image, objs, mode="overlay", phase=1.0))
    assert tuple(over[5, 115]) == (100, 100, 100)  # far from any mask: untouched
    assert tuple(over[10, 10]) != (100, 100, 100)
    iso = np.asarray(showcase.draw_masks(image, objs, mode="isolate", selected="1"))
    # unselected object removed (only faint glow of the selection may reach it)
    assert np.abs(iso[10, 10].astype(int) - showcase.BG).max() <= 8
    assert tuple(iso[55, 80]) == (100, 100, 100)  # selected object keeps its pixels


def test_frames_without_masks_render_as_original():
    image = Image.new("RGB", (40, 30), (90, 120, 60))
    assert np.array_equal(np.asarray(showcase.draw_masks(image, [])), np.asarray(image))


@pytest.fixture
def viewer(tmp_path):
    from fastapi.testclient import TestClient

    from tools.meta_sam_api_lab.viewer import create_viewer

    root, show = tmp_path / "lab", tmp_path / "showcase"
    (root / "outputs").mkdir(parents=True)
    run = show / "runs" / "birds-x--c-bird"
    (run / "frames").mkdir(parents=True)
    (run / "masks").mkdir()
    Image.new("RGB", (8, 8)).save(run / "frames" / "000001.jpg")
    Image.new("L", (8, 8), 255).save(run / "masks" / "f000000-o0.png")
    (run / "provider-output.txt").write_text("raw", encoding="utf-8")
    (run / "result.json").write_text(
        json.dumps(
            {
                "status": "completed",
                "media": "image",
                "masks": 1,
                "source_ref": "birds-x",
                "prompt_mode": "concept",
                "prompt": "bird",
                "model": "sam-3.1",
                "frames": [
                    {
                        "frame": 0,
                        "source": "frames/000001.jpg",
                        "objects": [{"id": "0", "mask": "masks/f000000-o0.png"}],
                    }
                ],
            }
        ),
        encoding="utf-8",
    )
    (show / "scenes.json").write_text(
        json.dumps([scene(license="CC BY 4.0")]), encoding="utf-8"
    )
    (show / "metrics.json").write_text(
        json.dumps({"birds-x--c-bird": {"reference_status": "agent_grabcut_reviewed"}}),
        encoding="utf-8",
    )
    (show / "gallery.json").write_text(
        json.dumps({"birds-x--c-bird": {"tag": "Multiinstancia", "note": "dos aves"}}),
        encoding="utf-8",
    )
    app = create_viewer(root, tmp_path / "missing.json", 8876, show)
    return TestClient(app, base_url="http://127.0.0.1:8876")


def test_showcase_routes_are_read_only_and_confined(viewer):
    runs = viewer.get("/api/showcase/runs").json()["runs"]
    assert runs[0]["domain"] == "birds" and runs[0]["masks"] == 1
    detail = viewer.get("/api/showcase/run/birds-x--c-bird").json()
    assert (
        detail["license"] == "CC BY 4.0"
        and detail["prompt"] == "bird"
        and detail["muse"] is None
    )
    assert detail["metrics"]["reference_status"] == "agent_grabcut_reviewed"
    assert detail["editorial"]["tag"] == runs[0]["tag"] == "Multiinstancia"
    assert (
        viewer.get("/showcase-assets/birds-x--c-bird/masks/f000000-o0.png").status_code
        == 200
    )
    for bad in (
        "provider-output.txt",
        "result.json",
        "../birds-x--c-bird/result.json",
        "frames/../result.json",
    ):
        assert viewer.get(f"/showcase-assets/birds-x--c-bird/{bad}").status_code == 404
    assert viewer.get("/api/showcase/run/..%2F..%2Fetc").status_code == 404
    assert (
        viewer.post("/api/showcase/runs", headers={"x-lab-request": "1"}).status_code
        == 405
    )
    assert viewer.get("/showcase").status_code == 200
    assert viewer.get("/showcase-core.js").status_code == 200


def credit(**extra):
    from tools.meta_sam_api_lab.lab import CreditAuthorization

    data = {
        "snapshot_usd": 140.86,
        "snapshot_at": "2026-11-02",
        "source": "owner billing screenshot",
        "responsible": "owner",
        "authorized_new_usd": 130,
        "safety_margin_usd": 10.86,
        **extra,
    }
    return CreditAuthorization(**data)


def test_free_credit_capacity_must_fit_inside_snapshot_and_never_authorizes_card_spend():
    from pydantic import ValidationError

    assert credit().paid_spend_authorized is False
    with pytest.raises(ValidationError):
        credit(authorized_new_usd=135)  # 135 + 10.86 > 140.86
    with pytest.raises(ValidationError):
        credit(paid_spend_authorized=True)


def test_campaign_above_usd_50_requires_matching_credit_authorization():
    from pydantic import ValidationError

    from tools.meta_sam_api_lab.lab import Campaign

    base = {
        "authorization_date": "2026-11-02",
        "phase_caps_usd": {"I": 130},
        "daily_requests": None,
        "reservation_usd": 0.01,
        "historical_reserved_usd": 1,
    }
    with pytest.raises(ValidationError):
        Campaign(authorized_usd=180, **base)
    assert (
        Campaign(
            authorized_usd=180, credit_authorization=credit(), **base
        ).authorized_usd
        == 180
    )
    with pytest.raises(ValidationError):
        Campaign(authorized_usd=181, credit_authorization=credit(), **base)


def test_credit_view_keeps_history_apart_and_bounds_remaining_credit():
    from tools.meta_sam_api_lab.costs import credit_view

    report = {
        "reserved_usd": {"total": 60.0, "by_identity": {"sam-api-lab:I": 11.0}},
        "estimated_usd": {"total": 12.0, "by_identity": {"sam-api-lab:I": 2.5}},
    }
    view = credit_view(report, credit(), "I")
    assert (
        view["historical_reserved_usd"] == 49.0
        and view["new_campaign_reserved_usd"] == 11.0
    )
    assert view["historical_estimated_cost_usd"] == 9.5
    assert (
        view["provider_credit_remaining_estimate_usd"] == 129.86
    )  # snapshot - reservations
    assert view["paid_spend_verified_usd"] is None


def square(size, x0, y0, x1, y1):
    m = np.zeros(size, bool)
    m[y0:y1, x0:x1] = True
    return m


def test_mask_metrics_match_instances_and_respect_partial_references():
    pytest.importorskip("cv2")
    from evaluations.sam_references import evaluate

    refs = [square((60, 80), 5, 5, 25, 25), square((60, 80), 40, 30, 70, 55)]
    pred = [square((60, 80), 6, 6, 25, 25), square((60, 80), 0, 40, 4, 44)]
    full = evaluate(pred, refs, complete=True, tolerance=2)
    assert (full["matched"], full["missed"], full["false_positives"]) == (1, 1, 1)
    assert 0.85 < full["mean_mask_iou"] < 1 and full["boundary_f1"] > 0.9
    partial = evaluate(pred, refs, complete=False, tolerance=2)
    assert partial["false_positives"] is None and partial["pixel_precision"] is None


def test_fragmented_reference_is_counted():
    pytest.importorskip("cv2")
    from evaluations.sam_references import evaluate

    ref = [square((40, 40), 0, 0, 40, 20)]
    pred = [square((40, 40), 0, 0, 20, 20), square((40, 40), 20, 0, 40, 20)]
    assert evaluate(pred, ref, complete=True, tolerance=1)["fragmented_references"] == 1


def test_iou_and_boundary_helpers():
    from evaluations.sam_references import boundary, iou

    a = square((10, 10), 0, 0, 5, 5)
    assert iou(a, a) == 1.0 and iou(a, ~a) == 0.0
    assert boundary(a).sum() == 16  # ring of a 5x5 square
