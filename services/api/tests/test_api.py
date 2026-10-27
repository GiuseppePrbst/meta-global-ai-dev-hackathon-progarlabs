from io import BytesIO

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from bosque_api.config import Settings
from bosque_api.main import MAX_IMAGE_BYTES, create_app


@pytest.fixture
def client():
    return TestClient(create_app(Settings(_env_file=None, database_url="", ai_provider="mock")))


def image_bytes(format="PNG"):
    output = BytesIO()
    Image.new("RGB", (2, 2), "green").save(output, format=format)
    return output.getvalue()


def test_health_reports_process_without_claiming_database(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "service": "bosque-api",
        "database": "not_configured",
        "ai_provider": "mock",
    }


def test_species_provisional_catalog_and_detail(client):
    response = client.get("/species")
    assert response.status_code == 200
    species = response.json()
    assert len(species) == 8
    assert len({item["id"] for item in species}) == 8
    assert all(item["taxonomic_status"] == "provisional" for item in species)
    assert all(item["provenance"]["status"] == "pending_validation" for item in species)
    assert client.get(f"/species/{species[0]['id']}").json() == species[0]
    assert client.get("/species/not-found").status_code == 404


@pytest.mark.parametrize(
    "format,mime", [("PNG", "image/png"), ("JPEG", "image/jpeg"), ("WEBP", "image/webp")]
)
def test_mock_identification_never_invents_candidates(client, format, mime):
    response = client.post(
        "/identify",
        files={"file": ("image", image_bytes(format), mime)},
        data={"adult_confirmed": "true", "rights_confirmed": "true"},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "insufficient_evidence"
    assert response.json()["provider"] == "mock"
    assert response.json()["candidates"] == []
    assert response.json()["model"] is None


@pytest.mark.parametrize(
    "data",
    [
        {},
        {"adult_confirmed": "false", "rights_confirmed": "true"},
        {"adult_confirmed": "true", "rights_confirmed": "false"},
    ],
)
def test_identify_requires_adult_and_rights_confirmation(client, data):
    assert (
        client.post(
            "/identify", files={"file": ("tree.png", image_bytes(), "image/png")}, data=data
        ).status_code
        == 422
    )


@pytest.mark.parametrize(
    "content,mime,status",
    [
        (b"not an image", "image/png", 422),
        (b"<svg></svg>", "image/svg+xml", 415),
        (image_bytes(), "image/jpeg", 415),
        (b"x" * (MAX_IMAGE_BYTES + 1), "image/png", 413),
    ],
    ids=["invalid-image", "unsupported-svg", "mime-mismatch", "too-large"],
)
def test_identify_validates_uploaded_content(client, content, mime, status):
    response = client.post(
        "/identify",
        files={"file": ("tree", content, mime)},
        data={"adult_confirmed": "true", "rights_confirmed": "true"},
    )
    assert response.status_code == status


@pytest.mark.parametrize("key,status", [("", 503), ("test-placeholder", 501)])
def test_meta_mode_does_not_pretend_pipeline_is_implemented(key, status):
    client = TestClient(create_app(Settings(_env_file=None, ai_provider="meta", model_api_key=key)))
    response = client.post(
        "/identify",
        files={"file": ("tree.png", image_bytes(), "image/png")},
        data={"adult_confirmed": "true", "rights_confirmed": "true"},
    )
    assert response.status_code == status


def test_missing_database_is_explicit(client):
    assert client.get("/observations").status_code == 503
    assert (
        client.post("/observations", json={"notes": "observación sin guardar"}).status_code == 503
    )


@pytest.mark.parametrize(
    "body",
    [
        {"species_id": "not-in-catalog"},
        {"notes": "x" * 2001},
        {"location": {"type": "Point", "coordinates": [181, 0]}},
        {"location": {"type": "Point", "coordinates": [0, 91]}},
        {"location": {"type": "Point", "coordinates": [0, 0, 0]}},
    ],
)
def test_observation_validation_precedes_database(client, body):
    assert client.post("/observations", json=body).status_code == 422


def test_forest_metadata_and_explicit_unimplemented_analysis(client):
    sources = client.get("/forest/sources").json()
    assert sources[0]["license"] == "CC-BY-4.0"
    assert sources[0]["status"] == "not_configured"
    response = client.post(
        "/forest/analyze",
        json={
            "source_id": "chmv2",
            "area": {
                "type": "Polygon",
                "coordinates": [[[0, 0], [1, 0], [1, 1], [0, 0]]],
            },
        },
    )
    assert response.status_code == 501
    assert "CHMv2" in response.json()["detail"]


def test_openapi_and_cors(client):
    schema = client.get("/openapi.json").json()
    assert "/identify" in schema["paths"]
    assert "/observations" in schema["paths"]
    response = client.options(
        "/identify",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "POST",
        },
    )
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"
    response = client.options(
        "/identify",
        headers={"Origin": "https://untrusted.example", "Access-Control-Request-Method": "POST"},
    )
    assert "access-control-allow-origin" not in response.headers
