"""Spatial SAM prompts, corrections, metrics and resolution: synthetic data only."""

import json
import sys
from pathlib import Path
from types import SimpleNamespace as NS
from typing import ClassVar

import httpx
import pytest
from bosque_ai.meta import MetaResponsesClient
from PIL import Image
from pydantic import SecretStr, ValidationError

sys.path.insert(0, str(Path(__file__).parents[3]))
from bosque_api.config import Settings

from tools.meta_sam_api_lab import lab, media, metrics
from tools.meta_sam_api_lab.lab import FrameSpec, ObjectSpec, PointSpec


def obj(identifier, *prompts):
    return ObjectSpec(id=identifier, prompts=list(prompts))


@pytest.mark.parametrize("size", [(640, 360), (960, 540), (1280, 720), (1920, 1080)])
def test_float_boxes_points_and_edges_follow_official_builder(size):
    width, height = size
    text, normalized, earliest = lab.spatial_prompt(
        [
            obj(
                1,
                FrameSpec(
                    box=[0.4, 0.6, width - 0.2, height - 0.0],
                    points=[
                        PointSpec(x=width, y=height),
                        PointSpec(x=10.9, y=5.1, label="negative"),
                    ],
                ),
            )
        ],
        size,
        1,
        "both",
    )
    view = f"w={width};h={height}"
    # Half-open builder edges become inclusive x2/y2 on the wire.
    assert text == (
        f"<0f>1<|box;x1=0;y1=0;x2={width - 1};y2={height - 1};{view}|>"
        f"<|point;x={width - 1};y={height - 1};{view}|>-<|point;x=10;y=5;{view}|>"
    )
    assert normalized[0]["prompts"][0]["box"] == [0, 0, width, height]
    assert earliest == 0


@pytest.mark.parametrize(
    ("box", "points", "message"),
    [
        ([-1, 0, 10, 10], [], "prepared media pixels"),
        ([0, 0, 641, 10], [], "prepared media pixels"),
        ([5, 5, 5, 20], [], "invalid_box"),  # zero width
        ([5, 5, 20, 5], [], "invalid_box"),  # zero height
        (None, [PointSpec(x=10, y=361)], "prepared media pixels"),
        (None, [], "empty_prompt"),
    ],
)
def test_invalid_selection_is_rejected_not_clamped(box, points, message):
    with pytest.raises(ValueError, match=message):
        lab.spatial_prompt(
            [obj(1, FrameSpec(box=box, points=points))], (640, 360), 1, "both"
        )


def test_multiple_objects_frames_corrections_and_provider_rules():
    objects = [
        obj(
            1,
            FrameSpec(frame=10, box=[10, 10, 50, 60]),
            FrameSpec(frame=25, points=[PointSpec(x=30, y=30)]),
            FrameSpec(frame=35, points=[PointSpec(x=5, y=5, label="negative")]),
        ),
        obj(2, FrameSpec(frame=40, box=[100, 100, 150, 140])),
    ]
    text, _, earliest = lab.spatial_prompt(objects, (640, 360), 50, "forward")
    view = "w=640;h=360"
    assert text == (
        f"<10f>1<|box;x1=10;y1=10;x2=49;y2=59;{view}|>"
        f"<25f>1<|point;x=30;y=30;{view}|>"
        f"<35f>1-<|point;x=5;y=5;{view}|>"
        f"<40f>2<|box;x1=100;y1=100;x2=149;y2=139;{view}|>"
    )
    assert earliest == 10
    assert lab.frames_processed(50, 10, "forward") == 40
    assert lab.frames_processed(50, 10, "backward") == 11
    assert lab.frames_processed(50, 10, "both") == 50
    with pytest.raises(ValueError, match="duplicate_frame"):  # two boxes, same frame
        lab.spatial_prompt(
            [obj(1, FrameSpec(frame=3, box=[0, 0, 5, 5]), FrameSpec(frame=3))],
            (640, 360),
            50,
            "both",
        )
    with pytest.raises(ValueError, match="duplicate_object_id"):
        lab.spatial_prompt(
            [obj(1, FrameSpec(box=[0, 0, 5, 5])), obj(1, FrameSpec(box=[1, 1, 6, 6]))],
            (640, 360),
            1,
            "both",
        )
    with pytest.raises(ValueError, match="outside prepared media"):
        lab.spatial_prompt(
            [obj(1, FrameSpec(frame=50, box=[0, 0, 5, 5]))], (640, 360), 50, "both"
        )
    with pytest.raises(ValueError, match="after frame 0"):
        lab.spatial_prompt(
            [obj(1, FrameSpec(box=[0, 0, 5, 5]))], (640, 360), 50, "backward"
        )
    with pytest.raises(ValueError, match="1-16"):
        lab.spatial_prompt(
            [obj(i, FrameSpec(box=[0, 0, 5, 5])) for i in range(1, 18)],
            (640, 360),
            1,
            "both",
        )
    with pytest.raises(ValidationError):
        ObjectSpec(id=0, prompts=[FrameSpec(box=[0, 0, 1, 1])])


def test_plan_never_mixes_concept_and_spatial_and_images_stay_on_frame_zero():
    image = {"media": "image", "width": 640, "height": 360, "frames": 1, "fps": 1}
    video = {"media": "video", "width": 960, "height": 540, "frames": 50, "fps": 10}
    spatial = [obj(1, FrameSpec(frame=0, box=[0, 0, 5, 5]))]
    for concept, objects in [("tree", spatial), (None, None), ("pine", None)]:
        with pytest.raises(ValueError):
            lab.plan_request(image, concept, objects, None)
    with pytest.raises(ValueError):
        lab.plan_request(
            image, None, [obj(1, FrameSpec(frame=1, box=[0, 0, 5, 5]))], None
        )
    with pytest.raises(ValueError):
        lab.plan_request(image, "tree", None, "forward")
    planned = lab.plan_request(image, None, spatial, "forward")
    assert (
        planned["direction"] is None and planned["concept"] is None
    )  # no image propagation
    assert planned["preview_estimated_usd"] == 0.0025
    planned = lab.plan_request(
        video, None, [obj(1, FrameSpec(frame=30, box=[0, 0, 5, 5]))], "backward"
    )
    assert (
        planned["prompt"].startswith("<30f>1<|box")
        and "w=960;h=540" in planned["prompt"]
    )
    assert (
        planned["frames_processed_estimate"] == 31
        and planned["prompt_time_seconds"] == 3
    )
    assert planned["preview_estimated_usd"] == pytest.approx(
        50 * 0.0002
    )  # 50-frame minimum
    assert (
        lab.plan_request(video, "tree", None, None)["frames_processed_estimate"] == 50
    )


class Ledger:
    calls: ClassVar[list] = []

    def __init__(self, config):
        pass

    def reserve(self, *args):
        Ledger.calls.append("reserved")
        return "one"

    def finish(self, *args):
        Ledger.calls.append(args[1])


CONFIG = Settings(
    _env_file=None,
    meta_enabled=True,
    budget_lifetime_units=1000000,
    meta_reservation_units=30000,
)


async def test_video_spatial_request_sends_direction_confidence_string_and_versions(
    tmp_path, monkeypatch
):
    source = tmp_path / "synthetic.mp4"
    source.write_bytes(b"SYNTHETIC")
    sent = []

    def handle(request):
        if request.url.path == "/v1/files":
            return httpx.Response(200, json={"id": "file-synthetic"})
        if request.method == "DELETE":
            return httpx.Response(200, json={"deleted": True})
        sent.append(json.loads(request.content))
        return httpx.Response(500, text="SYNTHETIC")

    Ledger.calls = []
    monkeypatch.setattr(lab, "ExecutionStore", Ledger)
    monkeypatch.setattr(
        lab,
        "probe",
        lambda p: {
            "codec": "h264",
            "duration_seconds": 5,
            "frames": 50,
            "fps": 10,
            "width": 640,
            "height": 360,
            "rotation": 0,
        },
    )
    client = MetaResponsesClient(
        SecretStr("test"), transport=httpx.MockTransport(handle)
    )
    objects = [obj(4, FrameSpec(frame=12, box=[10.5, 20.5, 99.2, 120]))]
    with pytest.raises(Exception):  # noqa: B017 - provider 500 is the synthetic outcome
        await lab.run_experiment(
            CONFIG,
            source,
            tmp_path / "correction",
            video=True,
            authorized=True,
            client=client,
            objects=objects,
            direction="backward",
            include_confidence=True,
            parent_experiment_id="parent-001",
            correction_reason="caja demasiado amplia",
        )
    body = sent[0]
    assert body["metadata"] == {
        "mask_encoding": "one_bit",
        "propagation_direction": "backward",
        "include_confidence": "true",
    }
    assert body["input"][0]["content"][0]["text"] == (
        "<12f>4<|box;x1=10;y1=20;x2=99;y2=119;w=640;h=360|>"
    )
    manifest = json.loads((tmp_path / "correction/result.json").read_text())
    assert manifest["status"] == "provider_error" and manifest["cleanup"] == "deleted"
    assert manifest["parent_experiment_id"] == "parent-001"
    assert manifest["correction_reason"] == "caja demasiado amplia"
    assert manifest["prompt_mode"] == "spatial" and manifest["concept"] is None
    assert manifest["model_version"] == "sam-3.1" and manifest["created_at"]
    assert manifest["frames_processed_estimate"] == 13
    assert Ledger.calls == ["reserved", "provider_error"]


async def test_rotated_video_unsafe_parent_and_existing_output_never_reserve(
    tmp_path, monkeypatch
):
    source = tmp_path / "synthetic.mp4"
    source.write_bytes(b"SYNTHETIC")
    Ledger.calls = []
    monkeypatch.setattr(lab, "ExecutionStore", Ledger)
    monkeypatch.setattr(
        lab,
        "probe",
        lambda p: {
            "codec": "h264",
            "duration_seconds": 5,
            "frames": 50,
            "fps": 10,
            "width": 640,
            "height": 360,
            "rotation": 90,
        },
    )
    objects = [obj(1, FrameSpec(box=[0, 0, 5, 5]))]
    with pytest.raises(ValueError, match="Rotated"):
        await lab.run_experiment(
            CONFIG,
            source,
            tmp_path / "rot",
            video=True,
            authorized=True,
            objects=objects,
        )
    with pytest.raises(ValueError, match="parent"):
        await lab.run_experiment(
            CONFIG,
            source,
            tmp_path / "parent",
            video=True,
            authorized=True,
            objects=objects,
            parent_experiment_id="../x",
            correction_reason="x",
        )
    (tmp_path / "exists").mkdir()
    with pytest.raises(FileExistsError):  # history is never overwritten
        await lab.run_experiment(
            CONFIG,
            source,
            tmp_path / "exists",
            video=True,
            authorized=True,
            objects=objects,
        )
    assert Ledger.calls == []


def test_backward_records_are_indexed_by_frame_and_keep_confidence(
    tmp_path, monkeypatch
):
    import meta_sam_parser

    monkeypatch.setattr(
        meta_sam_parser, "decode_mask_to_raster", lambda mask: [1, 1, 1, 1]
    )
    originals = []
    for index in range(4):
        path = tmp_path / f"{index}.png"
        Image.new("RGB", (8, 6), "white").save(path)
        originals.append(path)

    def record(frame, confidence):
        return NS(
            kind="mask",
            frame=NS(frame_index=frame),
            object_id="7",
            revision=1,
            confidence=confidence,
            mask=NS(width=2, height=2),
            bounds=NS(left=2, top=1, right=4, bottom=3),
        )

    output = tmp_path / "render"
    output.mkdir()
    # Backward propagation streams descending frames; frame 1 has no mask.
    summary = lab.render_result(
        NS(diagnostics=[], records=[record(3, 0.9), record(2, 0.7), record(0, None)]),
        originals,
        output,
        10,
    )
    assert [len(f["objects"]) for f in summary["frames"]] == [1, 0, 1, 1]
    assert summary["frames"][3]["objects"][0]["confidence"] == 0.9
    assert summary["frames"][0]["objects"][0]["confidence"] is None
    assert summary["tracks"] == [
        {"id": "7", "first_frame": 0, "last_frame": 3, "visible_frames": 3, "gaps": 1}
    ]
    assert (output / "crop-7.png").is_file()


def test_mask_metrics_and_tracking_need_human_reference():
    reference = metrics.polygon_mask((10, 10), [[[0, 0], [4, 0], [4, 9], [0, 9]]])
    predicted = Image.new("1", (10, 10))
    predicted.paste(1, (0, 0, 5, 5))  # top half of the 5x10 reference
    result = metrics.mask_metrics(predicted, reference)
    assert result["true_positive_px"] == 25 and result["false_negative_px"] == 25
    assert result["iou"] == 0.5 and result["dice"] == pytest.approx(2 / 3)
    assert result["precision"] == 1 and result["recall"] == 0.5
    empty = metrics.mask_metrics(Image.new("1", (10, 10)), Image.new("1", (10, 10)))
    assert empty["iou"] is None and empty["precision"] is None  # no 0/0 scores
    with pytest.raises(ValueError):
        metrics.polygon_mask((10, 10), [[[0, 0], [1, 1]]])
    with pytest.raises(ValueError):
        metrics.mask_metrics(Image.new("1", (3, 3)), reference)
    tracks = metrics.track_metrics(
        {
            0: {"r1": ("1", 0.8)},
            1: {"r1": ("1", 0.6)},
            2: {"r1": (None, 0)},
            3: {"r1": ("2", 0.7)},
            4: {"r1": ("2", 0.3)},
        }
    )
    assert tracks["r1"] == {
        "reference_frames": 5,
        "associated_frames": 3,
        "lost_frames": 2,
        "identity_switches": 1,
        "fragments": 2,
        "threshold_iou": 0.5,
    }


def test_viewer_preview_and_review_never_touch_result_or_budget(tmp_path, monkeypatch):
    from fastapi.testclient import TestClient

    from tools.meta_sam_api_lab import viewer

    (tmp_path / "photos").mkdir()
    Image.new("RGB", (64, 36), "green").save(tmp_path / "photos/synthetic.jpg")
    output = tmp_path / "outputs/synthetic"
    (output / "frames").mkdir(parents=True)
    (output / "masks").mkdir()
    Image.new("RGB", (64, 36)).save(output / "frames/000001.jpg")
    mask = Image.new("L", (64, 36))
    mask.paste(255, (0, 0, 32, 36))
    mask.save(output / "masks/f000000-o1.png")
    result = {
        "status": "completed",
        "media": "image",
        "concept": None,
        "prompt_mode": "spatial",
        "file_id": "file-private",
        "frames": [
            {
                "frame": 0,
                "source": "frames/000001.jpg",
                "objects": [
                    {"id": "1", "mask": "masks/f000000-o1.png", "box": [0, 0, 32, 36]}
                ],
            }
        ],
    }
    lab.write_json(output / "result.json", result)
    before = (output / "result.json").read_bytes()
    monkeypatch.setattr(
        viewer, "run_experiment", lambda *a, **k: pytest.fail("preview must not run")
    )
    client = TestClient(
        viewer.create_viewer(tmp_path, tmp_path / "missing-config.json"),
        base_url="http://127.0.0.1:8876",
    )
    headers = {"X-Lab-Request": "1"}
    info = client.get("/api/source", params={"path": "photos/synthetic.jpg"}).json()
    assert info == {"media": "image", "width": 64, "height": 36, "frames": 1, "fps": 1}
    spatial = {
        "source": "photos/synthetic.jpg",
        "objects": [{"id": 1, "prompts": [{"frame": 0, "box": [1.5, 2.5, 30.2, 20]}]}],
    }
    preview = client.post("/api/preview", json=spatial, headers=headers)
    assert preview.status_code == 200
    data = preview.json()
    assert data["prompt"] == "<0f>1<|box;x1=1;y1=2;x2=30;y2=19;w=64;h=36|>"
    assert data["budget"] == {"status": "unavailable", "can_reserve": False}
    mixed = client.post(
        "/api/preview", json={**spatial, "concept": "tree"}, headers=headers
    )
    assert mixed.status_code == 422
    outside = {**spatial, "objects": [{"id": 1, "prompts": [{"box": [0, 0, 65, 5]}]}]}
    assert client.post("/api/run", json=outside, headers=headers).status_code == 422
    assert client.get("/geometry.js").status_code == 200
    assert client.get("/secret.js").status_code == 404
    reference = {
        "reviewer": "synthetic-reviewer",
        "quality": "partial",
        "references": [
            {
                "reference_id": "r1",
                "frame": 0,
                "polygons": [[[0, 0], [64, 0], [64, 36], [0, 36]]],
            }
        ],
    }
    review = client.post("/api/review/synthetic", json=reference, headers=headers)
    assert review.status_code == 200
    evaluation = review.json()["evaluations"][0]
    assert evaluation["best_predicted_id"] == "1"
    assert evaluation["metrics"]["iou"] == pytest.approx(0.5)
    assert client.get("/api/review/synthetic").json()["quality"] == "partial"
    bad = {**reference, "quality": "great"}
    assert (
        client.post("/api/review/synthetic", json=bad, headers=headers).status_code
        == 422
    )
    assert (output / "result.json").read_bytes() == before
    projected = client.get("/api/result/synthetic").text
    assert "file-private" not in projected


def test_resolution_matrix_validates_widths_without_ffmpeg(tmp_path):
    with pytest.raises(ValueError, match="width"):
        media.prepare_clip(tmp_path / "x.mp4", tmp_path / "out", width=1920)
    with pytest.raises(ValueError, match="width"):
        media.prepare_clip(tmp_path / "x.mp4", tmp_path / "out", width=700)
    assert media.WIDTHS == (640, 960, 1280)
