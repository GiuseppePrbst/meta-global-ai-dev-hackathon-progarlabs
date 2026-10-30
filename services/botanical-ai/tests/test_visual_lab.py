import json
import sys
import zipfile
from pathlib import Path

import httpx
import pytest
from bosque_ai.meta import MetaAPIError, MetaResponsesClient
from PIL import Image
from pydantic import SecretStr

sys.path.insert(0, str(Path(__file__).parents[3]))
from bosque_api.config import Settings

from tools.meta_sam_api_lab import lab, media


@pytest.mark.parametrize(
    "name",
    [
        "../private.mp4",
        "/absolute.mp4",
        "C:/private.mp4",
        "folder/CON.jpg",
        "folder/file. ",
    ],
)
def test_zip_rejects_unsafe_names(tmp_path, name):
    archive = tmp_path / "unsafe.zip"
    with zipfile.ZipFile(archive, "w") as z:
        z.writestr(name, b"SYNTHETIC")
    with pytest.raises(ValueError):
        media.inventory(archive)


def test_zip_inventory_extract_crc_duplicates_and_overwrite(tmp_path):
    archive = tmp_path / "safe.zip"
    with zipfile.ZipFile(archive, "w") as z:
        z.writestr("folder/example.mp4", b"SYNTHETIC")
        z.writestr("folder/duplicate.mp4", b"SYNTHETIC")
    report = media.inventory(archive)
    assert len(report["sha256"]) == 64 and report["possible_content_duplicates"] == [
        [0, 1]
    ]
    extracted = media.extract(archive, tmp_path / "private", 0)
    assert extracted.read_bytes() == b"SYNTHETIC"
    with pytest.raises(ValueError):
        media.extract(archive, tmp_path / "private", 0)
    with pytest.raises(ValueError):
        media.private_path(Path(__file__))


async def test_video_wire_cleanup_even_when_provider_fails(tmp_path, monkeypatch):
    source = tmp_path / "synthetic.mp4"
    source.write_bytes(b"SYNTHETIC")
    calls = []
    records = []

    class Ledger:
        def __init__(self, config):
            pass

        def reserve(self, owner, operation):
            assert owner == "sam-api-lab"
            return "synthetic-reservation"

        def finish(self, identifier, status, usage):
            records.append(status)

    def handle(request):
        calls.append((request.method, request.url.path))
        if request.url.path == "/v1/files":
            assert (
                b"expires_after[seconds]" in request.content
                and b"3600" in request.content
            )
            assert b"user_data" in request.content
            return httpx.Response(
                200, json={"id": "file-synthetic", "expires_at": 9999}
            )
        if request.method == "DELETE":
            return httpx.Response(200, json={"deleted": True})
        body = json.loads(request.content)
        assert body["input"][0]["content"][1] == {
            "type": "input_video",
            "file_id": "file-synthetic",
        }
        assert (
            body["model"] == "sam-3.1"
            and body["metadata"]["mask_encoding"] == "one_bit"
        )
        return httpx.Response(500, text="PRIVATE BODY")

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
        },
    )
    config = Settings(
        _env_file=None,
        meta_enabled=True,
        budget_lifetime_units=1000000,
        meta_reservation_units=20000,
    )
    client = MetaResponsesClient(
        SecretStr("test"), transport=httpx.MockTransport(handle)
    )
    with pytest.raises(MetaAPIError):
        await lab.run_experiment(
            config,
            source,
            tmp_path / "results",
            "tree",
            video=True,
            authorized=True,
            client=client,
        )
    result = json.loads((tmp_path / "results/result.json").read_text())
    assert result["cleanup"] == "deleted" and records == ["provider_error"]
    assert calls[-1] == ("DELETE", "/v1/files/file-synthetic")


def test_zip_open_failure_cannot_delete_existing_destination(tmp_path, monkeypatch):
    archive = tmp_path / "safe.zip"
    with zipfile.ZipFile(archive, "w") as z:
        z.writestr("example.mp4", b"SYNTHETIC")
    output = tmp_path / "private"
    output.mkdir()
    existing = output / "source-000.mp4"
    existing.write_bytes(b"EXISTING")

    def corrupt_header(*args):
        raise zipfile.BadZipFile("synthetic corrupt local header")

    monkeypatch.setattr(zipfile.ZipFile, "open", corrupt_header)
    with pytest.raises(zipfile.BadZipFile):
        media.extract(archive, output, 0)
    assert existing.read_bytes() == b"EXISTING"


async def test_image_empty_result_is_not_provider_error(tmp_path, monkeypatch):
    source = tmp_path / "synthetic.png"
    Image.new("RGB", (4, 3), "green").save(source)
    monkeypatch.setattr(
        lab,
        "ExecutionStore",
        lambda c: type(
            "Ledger", (), {"reserve": lambda *a: "one", "finish": lambda *a: None}
        )(),
    )
    stream = 'data: {"type":"response.completed","response":{"usage":{"images_processed":1}}}\n\n'
    client = MetaResponsesClient(
        SecretStr("test"),
        transport=httpx.MockTransport(lambda r: httpx.Response(200, text=stream)),
    )
    config = Settings(
        _env_file=None,
        meta_enabled=True,
        budget_lifetime_units=1000000,
        meta_reservation_units=5000,
    )
    result = await lab.run_experiment(
        config, source, tmp_path / "empty", "tree", authorized=True, client=client
    )
    assert result["status"] == "no_matches" and result["masks"] == 0
    assert result["usage"] == {"images_processed": 1}
    assert (tmp_path / "empty/rendered/000000.png").is_file()


async def test_stream_refusal_and_incomplete_never_become_empty_matches():
    for event in ["response.refusal.done", "response.incomplete"]:
        client = MetaResponsesClient(
            SecretStr("test"),
            transport=httpx.MockTransport(
                lambda r, kind=event: httpx.Response(
                    200, text=f'data: {{"type":"{kind}"}}\n\n'
                )
            ),
        )
        with pytest.raises(MetaAPIError):
            await client.output_text(
                "sam-3.1",
                "tree",
                b"SYNTHETIC",
                "image/jpeg",
                stream=True,
                allow_empty=True,
            )


async def test_spatial_box_is_integer_and_invalid_box_never_reserves(
    tmp_path, monkeypatch
):
    source = tmp_path / "synthetic.png"
    Image.new("RGB", (10, 8), "green").save(source)
    calls = []

    class Ledger:
        def __init__(self, config):
            pass

        def reserve(self, *args):
            calls.append("reserved")
            return "one"

        def finish(self, *args):
            pass

    def handle(request):
        payload = json.loads(request.content)
        # Images have no propagation; the official builder text replaces any concept.
        assert "propagation_direction" not in payload["metadata"]
        assert payload["input"][0]["content"][0]["text"] == (
            "<0f>1<|box;x1=1;y1=2;x2=8;y2=7;w=10;h=8|>"
        )
        return httpx.Response(200, text='data: {"type":"response.completed"}\n\n')

    monkeypatch.setattr(lab, "ExecutionStore", Ledger)
    config = Settings(
        _env_file=None,
        meta_enabled=True,
        budget_lifetime_units=1000000,
        meta_reservation_units=5000,
    )
    client = MetaResponsesClient(
        SecretStr("test"), transport=httpx.MockTransport(handle)
    )
    result = await lab.run_experiment(
        config,
        source,
        tmp_path / "box",
        authorized=True,
        client=client,
        object_box=[1.2, 2.4, 8.1, 7.1],
    )
    assert result["initial_box"] == [1, 2, 9, 8] and calls == ["reserved"]
    with pytest.raises(ValueError):
        await lab.run_experiment(
            config,
            source,
            tmp_path / "bad",
            authorized=True,
            client=client,
            object_box=[0, 0, 100, 10],
        )
    with pytest.raises(ValueError, match="never both"):
        await lab.run_experiment(
            config,
            source,
            tmp_path / "mixed",
            "vegetation",
            authorized=True,
            client=client,
            object_box=[1, 1, 5, 5],
        )
    assert calls == ["reserved"]


async def test_cleanup_failure_and_unsafe_id_stay_pending():
    calls = []

    def handle(request):
        calls.append(request.url.path)
        return httpx.Response(503)

    client = MetaResponsesClient(
        SecretStr("test"), transport=httpx.MockTransport(handle)
    )
    assert await lab.cleanup_remote(client, {"file_id": "file-synthetic"}) == "pending"
    assert await lab.cleanup_remote(client, {"file_id": "../private"}) == "pending"
    assert calls == ["/v1/files/file-synthetic"]


def test_synthetic_mask_render_tracks_revisions_and_gaps(tmp_path, monkeypatch):
    from types import SimpleNamespace as NS

    import meta_sam_parser

    monkeypatch.setattr(
        meta_sam_parser, "decode_mask_to_raster", lambda mask: [1, 0, 0, 1]
    )
    originals = []
    for index in range(3):
        path = tmp_path / f"{index}.png"
        Image.new("RGB", (8, 6), "white").save(path)
        originals.append(path)

    def record(frame, revision):
        return NS(
            kind="mask",
            frame=NS(frame_index=frame),
            object_id="1",
            revision=revision,
            confidence=None,
            mask=NS(width=2, height=2),
            bounds=NS(left=1, top=1, right=5, bottom=5),
        )

    output = tmp_path / "render"
    output.mkdir()
    result = lab.render_result(
        NS(diagnostics=[], records=[record(0, 0), record(0, 1), record(2, 0)]),
        originals,
        output,
        10,
    )
    assert result["masks"] == 2 and result["no_mask_frames"] == 1
    assert result["tracks"] == [
        {"id": "1", "first_frame": 0, "last_frame": 2, "visible_frames": 2, "gaps": 1}
    ]
    assert Image.open(output / "masks/f000000-o1.png").size == (8, 6)
    assert (output / "crop-1.png").is_file()
    bad = record(0, 0)
    bad.bounds.right = 100
    with pytest.raises(ValueError):
        lab.mask_frame(bad, 8, 6)


def test_viewer_private_projection_upload_and_origin_guards(tmp_path):
    from fastapi.testclient import TestClient

    from tools.meta_sam_api_lab.viewer import create_viewer

    output = tmp_path / "outputs/synthetic"
    output.mkdir(parents=True)
    lab.write_json(
        output / "result.json",
        {
            "status": "no_matches",
            "media": "image",
            "concept": "tree",
            "file_id": "file-private",
            "source_sha256": "private",
        },
    )
    (tmp_path / "private-config.json").write_text("PRIVATE")
    client = TestClient(
        create_viewer(tmp_path, tmp_path / "private-config.json"),
        base_url="http://127.0.0.1:8876",
    )
    assert client.get("/", headers={"Host": "attacker.example"}).status_code == 403
    assert client.post("/api/upload").status_code == 403
    assert (
        client.post(
            "/api/upload",
            headers={"X-Lab-Request": "1", "Origin": "http://attacker.example"},
        ).status_code
        == 403
    )
    assert client.get("/assets/private-config.json").status_code == 404
    assert client.get("/assets/outputs/synthetic/result.json").status_code == 404
    saved = client.get("/api/result/synthetic")
    assert saved.status_code == 200 and "private" not in saved.text
    assert saved.headers["Cache-Control"] == "no-store"
    uploaded = client.post(
        "/api/upload",
        headers={"X-Lab-Request": "1"},
        files={"file": ("synthetic.png", b"SYNTHETIC", "image/png")},
    )
    assert uploaded.status_code == 200
    assert uploaded.json()["source"] in client.get("/api/catalog").json()["sources"]
