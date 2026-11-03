"""Frontend contract: the committed OpenAPI/examples equal what FastAPI generates, the
routes José integrates exist with their response models, and examples validate."""

import importlib.util
import json
from pathlib import Path

import pytest

from bosque_api.atlas import ParkMap, ParkOut, TrailOut
from bosque_api.biodiversity import Taxon
from bosque_api.demo import DemoEligibility
from bosque_api.wilo import WiloAnswer

ROOT = Path(__file__).parents[3]
spec = importlib.util.spec_from_file_location("export_openapi", ROOT / "scripts/export_openapi.py")
exporter = importlib.util.module_from_spec(spec)
spec.loader.exec_module(exporter)
SCHEMA = json.loads((ROOT / "docs/api/openapi.json").read_text(encoding="utf-8"))

ESSENTIAL = {
    ("get", "/parks"): "ParkPage",
    ("get", "/parks/{park_id}"): "ParkOut",
    ("get", "/parks/{park_id}/trails"): "TrailOut",
    ("get", "/parks/{park_id}/map"): "ParkMap",
    ("get", "/trails/{trail_id}"): "TrailOut",
    ("get", "/taxa"): "TaxonPage",
    ("get", "/taxa/{taxon_id}"): "Taxon",
    ("get", "/taxa/{taxon_id}/eligibility"): "DemoEligibility",
    ("get", "/knowledge/status"): "KnowledgeStatus",
    ("post", "/guide/transcribe"): "Transcription",
    ("post", "/guide/query"): "GuideAnswer",
    ("post", "/guide/ask"): "WiloAnswer",
    ("post", "/captures/attempts"): "Capture",
    ("get", "/captures/me"): "Collection",
    ("get", "/expeditions"): "Expedition",
    ("post", "/identify"): None,
    ("get", "/health"): None,
}


def test_committed_contract_matches_fastapi():
    stale = [
        n
        for n, text in exporter.render().items()
        if (ROOT / "docs/api" / n).read_text(encoding="utf-8") != text
    ]
    assert stale == [], "run scripts/export_openapi.py"


@pytest.mark.parametrize(("method", "path"), list(ESSENTIAL))
def test_essential_operations_keep_their_response_model(method, path):
    operation = SCHEMA["paths"][path][method]
    model = ESSENTIAL[(method, path)]
    if model:
        assert model in json.dumps(
            operation["responses"][
                "200" if method == "get" or path != "/captures/attempts" else "201"
            ]
        )


def test_guide_operations_declare_bearer_and_errors():
    for path in ("/guide/transcribe", "/guide/query", "/guide/ask"):
        operation = SCHEMA["paths"][path]["post"]
        assert operation["security"] == [{"DemoBearer": []}]
        assert {"401", "429", "502", "503"} <= set(operation["responses"])


EXAMPLE_MODELS = {
    "park-puyehue.json": ParkOut,
    "trail-closure.json": TrailOut,
    "map-conguillio.json": ParkMap,
    "taxon-guigna.json": Taxon,
    "eligibility-guigna.json": DemoEligibility,
    "ask-text-mock.json": WiloAnswer,
}


@pytest.mark.parametrize("name", list(EXAMPLE_MODELS))
def test_generated_examples_validate(name):
    doc = json.loads((ROOT / "docs/api/examples" / name).read_text(encoding="utf-8"))
    assert doc["status"] == 200
    body = dict(doc["body"])
    if EXAMPLE_MODELS[name] is WiloAnswer:
        body["session_id"] = "00000000-0000-4000-8000-000000000000"
    EXAMPLE_MODELS[name].model_validate(body)


def test_observed_wilo_answer_validates_and_is_labelled():
    doc = json.loads(
        (ROOT / "docs/api/examples/observed/wilo-answer-34-mixed.json").read_text(encoding="utf-8")
    )
    assert doc["kind"].startswith("observed_real_meta")
    answer = WiloAnswer.model_validate(doc["body"])
    assert answer.map == {"park_id": "puyehue", "geometry_available": False}
    assert all(s["id"].startswith("atlas:") for s in answer.sources)


def test_mock_examples_never_look_like_real_answers():
    body = json.loads((ROOT / "docs/api/examples/ask-text-mock.json").read_text(encoding="utf-8"))[
        "body"
    ]
    assert body["status"] == "mock" and body["provider"] == "mock" and body["sources"] == []
