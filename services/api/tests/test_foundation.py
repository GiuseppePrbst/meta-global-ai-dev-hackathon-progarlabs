import hashlib
import json
import runpy
from io import BytesIO
from pathlib import Path

import httpx
import pytest
from bosque_ai.meta import MetaResponsesClient
from fastapi import HTTPException
from fastapi.testclient import TestClient
from PIL import Image, PngImagePlugin

from bosque_api.catalog import get_species
from bosque_api.config import Settings
from bosque_api.images import prepare_image
from bosque_api.main import create_app


def photo():
    output = BytesIO()
    meta = PngImagePlugin.PngInfo()
    meta.add_text("private", "private-location")
    Image.new("RGB", (4, 3), "green").save(output, "PNG", pnginfo=meta)
    return output.getvalue()


def test_image_normalization_removes_metadata():
    normalized = prepare_image(photo(), "image/png")
    assert b"private-location" not in normalized
    with Image.open(BytesIO(normalized)) as image:
        assert image.format == "JPEG" and image.size == (4, 3)
        assert not image.getexif()


def test_orientation_and_dimension_policy():
    output = BytesIO()
    exif = Image.Exif()
    exif[274] = 6
    Image.new("RGB", (4, 3)).save(output, "JPEG", exif=exif)
    with Image.open(BytesIO(prepare_image(output.getvalue(), "image/jpeg"))) as clean:
        assert clean.size == (3, 4) and not clean.getexif()
    output = BytesIO()
    Image.new("RGB", (8193, 1)).save(output, "PNG")
    with pytest.raises(HTTPException) as exc:
        prepare_image(output.getvalue(), "image/png")
    assert exc.value.status_code == 422


def test_segment_image_applies_mask_and_preserves_frame(monkeypatch):
    import meta_sam_parser
    from bosque_ai.segmentation import Mask, SegmentationResult

    from bosque_api.images import segment_image

    monkeypatch.setattr(meta_sam_parser, "decode_mask_to_raster", lambda mask: bytes([1, 0, 0, 0]))
    mask = Mask(
        object_id="0",
        width=2,
        height=2,
        encoding="one_bit",
        payload="synthetic",
        bounds=(0, 0, 4, 3),
    )
    result = SegmentationResult(status="completed", model="test", width=4, height=3, masks=[mask])
    with Image.open(BytesIO(segment_image(prepare_image(photo(), "image/png"), result))) as image:
        assert image.size == (4, 3)
        assert max(image.getpixel((3, 2))) < 40


def test_catalog_snapshot_is_traceable_and_taxa_unique():
    species = get_species()
    assert len({s.accepted_name for s in species}) == 8
    assert all(s.taxonomy.verification_status == "source_checked" for s in species)
    snapshot = Path(__file__).parents[3] / "data/public/taxonomy-gbif-2026-10-27.json"
    assert hashlib.sha256(snapshot.read_bytes()).hexdigest() == (
        "a1b3793e3f061078a16d90ae6fc9ce70c6a51c18b820809e72a97cd92e1009b5"
    )
    records = json.loads(snapshot.read_text("utf-8"))
    for item, record in zip(species, records, strict=True):
        assert record["match"]["usageKey"] == item.taxonomy.gbif_id
        assert record["match"]["canonicalName"] == item.accepted_name


def test_enabled_meta_api_requires_auth_limits_cost_and_sanitizes(monkeypatch):
    calls = []

    def handle(request):
        calls.append(request)
        body = json.loads(request.content)
        assert body["response_format"]["type"] == "json_schema"
        assert "private-location" not in request.content.decode()
        return httpx.Response(
            200,
            json={
                "choices": [
                    {
                        "finish_reason": "stop",
                        "message": {
                            "content": json.dumps(
                                {
                                    "candidates": [],
                                    "limitations": ["synthetic"],
                                    "message": "Otra fotografía",
                                }
                            )
                        },
                    }
                ]
            },
        )

    original = MetaResponsesClient.__init__

    def init(self, key, timeout):
        original(self, key, timeout, transport=httpx.MockTransport(handle))

    monkeypatch.setattr(MetaResponsesClient, "__init__", init)
    client = TestClient(
        create_app(
            Settings(
                _env_file=None,
                ai_provider="meta",
                meta_enabled=True,
                model_api_key="test-placeholder",
                meta_access_token="local-test",
            )
        )
    )

    def send(headers=None):
        return client.post(
            "/identify",
            files={"file": ("image.png", photo(), "image/png")},
            data={"adult_confirmed": True, "rights_confirmed": True},
            headers=headers,
        )

    assert send().status_code == 401
    assert send({"Authorization": b"Bearer \xff"}).status_code == 401
    response = send({"Authorization": "Bearer local-test"})
    assert response.status_code == 200
    assert response.json()["execution_status"] == "completed"
    assert response.json()["latency_ms"] >= 0
    assert send({"Authorization": "Bearer local-test"}).status_code == 429
    assert len(calls) == 1


def test_bad_raster_does_not_break_catalog_or_mock():
    client = TestClient(create_app(Settings(_env_file=None, forest_manifest="missing.json")))
    assert client.get("/species").status_code == 200
    assert client.get("/forest/sources").json()[0]["status"] == "not_configured"
    assert (
        client.post(
            "/forest/analyze",
            json={
                "source_id": "chmv2",
                "area": {
                    "type": "Polygon",
                    "coordinates": [[[0, 0], [0.001, 0], [0, 0.001], [0, 0]]],
                },
            },
        ).status_code
        == 503
    )


def test_openapi_has_additive_contracts():
    schema = create_app(Settings(_env_file=None)).openapi()
    assert schema["paths"]["/forest/analyze"]["post"]["responses"]["200"]["content"]
    assert "taxonomy" in schema["components"]["schemas"]["Species"]["properties"]
    assert "limitations" in schema["components"]["schemas"]["Identification"]["properties"]


async def test_evaluation_runner_checks_external_rights_before_any_call(tmp_path):
    root = Path(__file__).parents[3]
    runner = runpy.run_path(str(root / "evaluations/run.py"))["run"]
    (tmp_path / "image.png").write_bytes(photo())
    manifest = tmp_path / "manifest.json"
    manifest.write_text(
        json.dumps(
            [
                {
                    "case_id": "synthetic-negative",
                    "species_id": None,
                    "file": "image.png",
                    "sha256": hashlib.sha256(photo()).hexdigest(),
                    "license": "test-only",
                    "source": "synthetic",
                    "authorized": True,
                    "photo_type": "synthetic",
                    "reviewer": "test",
                    "individual_id": "synthetic",
                    "partition": "test",
                    "validation_status": "synthetic",
                }
            ]
        ),
        encoding="utf-8",
    )
    result = await runner(manifest, tmp_path, "mock", False)
    assert result["summary"]["executed"] == 1
    assert result["summary"]["top1"] is None
    with pytest.raises(ValueError, match="autorización de envío externo"):
        await runner(manifest, tmp_path, "meta", True)


def test_smoke_generator_is_synthetic_and_has_no_metadata():
    root = Path(__file__).parents[3]
    generate = runpy.run_path(str(root / "evaluations/meta_smoke.py"))["synthetic_image"]
    with Image.open(BytesIO(generate())) as image:
        assert image.size == (128, 128) and not image.getexif()
