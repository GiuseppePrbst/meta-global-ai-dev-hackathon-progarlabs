"""Biodiversity contract examples for the frontend, produced by the real API.

GET examples are live responses of the in-process app (versioned catalog data).
The identification and capture examples reuse validated models with fixture
values and say so in `note`. Run: python -m evaluations.biodiversity_contract_examples
"""

import json
from pathlib import Path

from bosque_ai.contracts import Candidate, Identification
from bosque_api.config import Settings
from bosque_api.main import create_app
from fastapi.testclient import TestClient

OUT = Path(__file__).parent / "biodiversity" / "contract-examples.json"
LIVE = [
    ("tree_with_recognition", "/taxa/nothofagus-dombeyi", "Árbol del catálogo de reconocimiento"),
    ("bird_educational_not_evaluated", "/taxa/pteroptochos-tarnii", "Ave con ficha educativa"),
    ("fungus_regional_candidate", "/taxa/cyttaria-hariotii", "Hongo candidato regional"),
    (
        "olivillo_rce_los_lagos",
        "/taxa/aextoxicon-punctatum/conservation?region=los-lagos",
        "Olivillo LC en Los Lagos (VU al norte)",
    ),
    ("guina_rce_los_rios", "/taxa/leopardus-guigna/conservation?region=los-rios", "VU"),
    ("guina_rce_los_lagos", "/taxa/leopardus-guigna/conservation?region=los-lagos", "NT"),
    (
        "guina_rce_region_unknown",
        "/taxa/leopardus-guigna/conservation",
        "Sin región: indeterminado, con ambas categorías del parque",
    ),
    (
        "taxon_without_rce_record",
        "/taxa/nothofagus-dombeyi/conservation?region=los-lagos",
        "Ausencia en la nómina no equivale a LC",
    ),
    ("taxon_without_authorized_media", "/taxa/boletus-chilensis", "media vacío"),
    ("park_scale_presence_no_coordinates", "/taxa/leopardus-guigna", "Escala parque, sensible"),
    ("puyehue_biodiversity", "/parks/puyehue/biodiversity", "Resumen del piloto"),
    ("taxa_page_fauna", "/taxa?kingdom=Animalia&limit=3", "Paginación"),
]


def main():
    client = TestClient(create_app(Settings(_env_file=None)))
    examples = []
    for case, route, note in LIVE:
        response = client.get(route)
        examples.append(
            {
                "case": case,
                "route": f"GET {route}",
                "http_status": response.status_code,
                "source": "live_response_versioned_catalog",
                "note": note,
                "body": response.json(),
            }
        )
    out_of_catalog = Identification(
        status="insufficient_evidence",
        provider="meta",
        model="muse-spark-1.3",
        message="Lo visible no corresponde a ninguna especie del catálogo.",
        execution_status="completed",
        prompt_version="open-set-verify-v2",
        catalog_assessment="out_of_catalog_suspected",
        acceptance="not_accepted",
        exploratory_candidates=[
            Candidate(species_id="nothofagus-pumilio", evidence="hoja caduca dentada")
        ],
        similar_out_of_catalog=["Nothofagus antarctica"],
        strategy="verify",
        observed_traits=["hojas pequeñas de margen irregular"],
    )
    examples.append(
        {
            "case": "identification_out_of_catalog",
            "route": "POST /identify",
            "http_status": 200,
            "source": "fixture_validated_by_model",
            "note": "Fixture (valores de ejemplo); exploratory_candidates no se presentan.",
            "body": out_of_catalog.model_dump(mode="json"),
        }
    )
    captures = json.loads(
        (Path(__file__).parent / "expeditions-contract-examples.json").read_text("utf-8")
    )["examples"]
    pending = next(e for e in captures if e["case"] == "capture_without_location")
    examples.append(
        {
            **pending,
            "case": "personal_capture_pending_identification",
            "source": "fixture_from_expeditions_contract_examples",
            "note": "Fixture existente: hallazgo personal sin identificación aceptada "
            "ni especie asignada; no es ocurrencia pública.",
        }
    )
    OUT.write_text(
        json.dumps(
            {"classification": "contract_examples", "date": "2026-10-31", "examples": examples},
            indent=1,
            ensure_ascii=False,
        )
        + "\n",
        encoding="utf-8",
    )
    print(len(examples))


if __name__ == "__main__":
    main()
