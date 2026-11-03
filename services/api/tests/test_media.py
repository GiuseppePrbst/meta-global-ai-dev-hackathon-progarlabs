import importlib.util
import json
from importlib.resources import files
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from bosque_api.biodiversity import get_taxa
from bosque_api.config import Settings
from bosque_api.main import create_app
from bosque_api.media import MediaAsset, get_media

REPO = Path(__file__).parents[3]


@pytest.fixture
def client():
    return TestClient(create_app(Settings(_env_file=None, service_mode="demo")))


def asset_payload(**overrides):
    payload = {
        "asset_id": "ext-test-001",
        "taxon_id": "nothofagus-dombeyi",
        "media_type": "image",
        "visual_role": "hoja",
        "title": "Hojas de prueba",
        "alt_text": "Hojas verdes de prueba sobre fondo claro.",
        "caption": "Prueba de contrato.",
        "source_type": "external",
        "source_url": "https://commons.wikimedia.org/wiki/File:Prueba.jpg",
        "public_url": "https://upload.wikimedia.org/prueba.jpg",
        "license": "CC BY 4.0",
        "attribution": "Autor de prueba, Wikimedia Commons",
        "redistribution": "with_attribution",
        "review_status": "agent_visual_check",
        "publication_status": "public_approved",
    }
    payload.update(overrides)
    return payload


def test_external_assets_mirror_taxon_media_once():
    external = [a for a in get_media() if a.source_type == "external"]
    recorded = sum(len(t.media) for t in get_taxa())
    assert len(external) == recorded == 45
    assert all(a.taxon_id and a.license and a.attribution for a in external)
    assert not any("NC" in a.license or "ND" in a.license for a in external)


def test_owner_catalog_starts_empty_until_rights_are_confirmed():
    content = files("bosque_api").joinpath("resources/media-assets.json").read_text("utf-8")
    assert json.loads(content) == []


def test_private_or_pending_material_cannot_be_validated_as_public():
    with pytest.raises(ValidationError):
        MediaAsset(**asset_payload(publication_status="private_research"))
    with pytest.raises(ValidationError):
        MediaAsset(**asset_payload(publication_status="hackathon_showcase_candidate"))


def test_coordinates_and_local_paths_are_rejected_by_schema():
    with pytest.raises(ValidationError):
        MediaAsset(**asset_payload(gps={"lat": -40.5, "lon": -72.9}))
    with pytest.raises(ValidationError):
        MediaAsset(**asset_payload(public_url="/srv/private/x.jpg"))


def test_non_commercial_and_no_derivative_licenses_are_not_served():
    for license_name in ("CC BY-NC 4.0", "CC BY-NC-ND 4.0", "CC BY-ND 2.0"):
        with pytest.raises(ValidationError):
            MediaAsset(**asset_payload(license=license_name))
    assert MediaAsset(**asset_payload(license="CC BY-SA 4.0")).license == "CC BY-SA 4.0"


def test_video_requires_duration():
    with pytest.raises(ValidationError):
        MediaAsset(**asset_payload(media_type="video"))


def test_endpoints_list_public_media_with_filters(client):
    page = client.get("/taxa/nothofagus-dombeyi/media").json()
    assert page["total"] == len(page["items"]) and page["total"] >= 1
    assert all(item["publication_status"] == "public_approved" for item in page["items"])
    assert (
        client.get("/taxa/nothofagus-dombeyi/media", params={"media_type": "video"}).json()["total"]
        == 0
    )
    assert client.get("/taxa/nothofagus-dombeyi/media", params={"limit": 1}).json()["limit"] == 1
    assert client.get("/taxa/no-existe/media").status_code == 404
    assert client.get("/taxa/nothofagus-dombeyi/media", params={"limit": 101}).status_code == 422


def test_asset_detail_is_public_and_unknown_ids_fail(client):
    first = next(a for a in get_media() if a.source_type == "external")
    body = client.get(f"/media/{first.asset_id}").json()
    assert body["source_url"] == first.source_url and body["license"] == first.license
    assert client.get("/media/no-existe").status_code == 404
    assert client.get("/media/..%2Fsecret").status_code == 404


def test_media_responses_expose_no_local_paths_or_coordinates(client):
    text = client.get("/taxa/nothofagus-dombeyi/media").text
    for marker in ("D:/", "D:\\", "C:\\", "gps", "lat", "lon", "originals", "sha256"):
        assert marker not in text


def test_media_contracts_are_documented_and_taxa_keep_their_shape(client):
    paths = client.get("/openapi.json").json()["paths"]
    assert "/taxa/{taxon_id}/media" in paths and "/media/{asset_id}" in paths
    assert "media" in client.get("/taxa/nothofagus-dombeyi").json()


def load_ingest():
    spec = importlib.util.spec_from_file_location(
        "content_library_ingest", REPO / "evaluations" / "content_library_ingest.py"
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.mark.parametrize(
    "name", ["../escape.jpg", "/abs.jpg", "C:\\x.jpg", "dir\\x.jpg", "a/../b.jpg"]
)
def test_ingest_rejects_unsafe_zip_members(name):
    with pytest.raises(ValueError):
        load_ingest().safe_member(name)


def test_ingest_ids_are_stable_and_ascii():
    ingest = load_ingest()
    assert ingest.safe_member("folder/IMG_5099.JPG") == "IMG_5099.JPG"
    assert ingest.asset_id("IMG_5099.JPG") == "own-img-5099"
    assert ingest.asset_id("Foto Año (1).jpg") == "own-foto-a-o-1"
