import json
import sys
from importlib.resources import files
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from bosque_api.biodiversity import (
    ConservationScope,
    IdentificationCapability,
    Taxon,
    get_conservation,
    get_taxa,
    parse_scopes,
    regional_conservation,
)
from bosque_api.catalog import get_species
from bosque_api.config import Settings
from bosque_api.main import create_app

sys.path.insert(0, str(Path(__file__).parents[3]))

TREES = {
    "nothofagus-dombeyi",
    "eucryphia-cordifolia",
    "aextoxicon-punctatum",
    "weinmannia-trichosperma",
    "laureliopsis-philippiana",
    "podocarpus-nubigenus",
    "nothofagus-betuloides",
    "nothofagus-pumilio",
}


@pytest.fixture
def client():
    return TestClient(create_app(Settings(_env_file=None, service_mode="demo")))


def raw_taxa():
    return json.loads(files("bosque_api").joinpath("resources/taxa.json").read_text("utf-8"))


def test_eight_tree_ids_survive_and_are_not_duplicated():
    taxa = {t.id: t for t in get_taxa()}
    assert TREES <= set(taxa) and {s.id for s in get_species()} == TREES
    for raw in raw_taxa():
        if raw.get("species_ref"):  # name, taxonomy and traits come from species.json
            assert "scientific_name" not in raw and "common_names" not in raw
    species = {s.id: s for s in get_species()}
    assert taxa["nothofagus-dombeyi"].profile.traits == species["nothofagus-dombeyi"].morphology


def test_kingdoms_are_valid_and_ids_unique():
    taxa = get_taxa()
    assert len({t.id for t in taxa}) == len(taxa)
    assert {t.classification.kingdom for t in taxa} == {"Plantae", "Animalia", "Fungi"}
    with pytest.raises(ValidationError):
        Taxon.model_validate({**raw_taxa()[8], "classification": {"kingdom": "Protista"}})


def test_presence_requires_evidence_and_regional_fungi_have_none():
    bad = {**raw_taxa()[8], "park_evidence": []}  # a bird documented in the park
    with pytest.raises(ValidationError, match="Presencia"):
        Taxon.model_validate(bad)
    fungi = [t for t in get_taxa() if t.classification.kingdom == "Fungi"]
    assert fungi and all(t.puyehue_status != "documented_in_park" for t in fungi)
    assert all(not t.park_evidence for t in fungi)


def test_unresolved_and_reconciled_taxonomy_is_explicit():
    taxa = {t.id: t for t in get_taxa()}
    assert taxa["amanita-gayana"].taxonomy.status == "unresolved"
    assert taxa["amanita-gayana"].identification.level == 0
    bandurria = taxa["theristicus-melanopis"].taxonomy
    assert (
        bandurria.status == "name_discrepancy"
        and "Theristicus caudatus" in bandurria.synonyms_reviewed
    )


def test_capability_level_must_match_status_and_evidence():
    with pytest.raises(ValidationError):
        IdentificationCapability(status="recognition_enabled", level=1, notes="x")
    with pytest.raises(ValidationError):  # experimental without pipeline/evaluation
        IdentificationCapability(status="recognition_experimental", level=1, notes="x")
    for taxon in get_taxa():
        if taxon.classification.kingdom != "Plantae":
            assert taxon.identification.level <= 1  # no fauna/fungi capture enabled


def test_sensitive_fauna_never_expose_coordinates(client):
    body = client.get("/taxa/leopardus-guigna").json()
    assert body["sensitivity"] == "location_sensitive"

    def keys(value):
        if isinstance(value, dict):
            return set(value) | {k for v in value.values() for k in keys(v)}
        return {k for v in value for k in keys(v)} if isinstance(value, list) else set()

    assert not keys(body) & {"location", "geometry", "lat", "lon", "latitude", "longitude"}
    assert all(e["precision"] == "park_scale_no_coordinates" for e in body["park_evidence"])


def test_parse_scopes_chains_ranges_in_book_order():
    olivillo = parse_scopes("VU (XV-V-RM ); LC (VI-XII)\n")
    assert olivillo[0].regions[-1] == "metropolitana" and "los-lagos" in olivillo[1].regions
    assert parse_scopes("NT") == [
        ConservationScope(
            category="NT", regions=olivillo[0].regions + olivillo[1].regions, scope_text="nacional"
        )
    ]
    with pytest.raises(ValueError):
        parse_scopes("VU (XV-ZZ)")
    with pytest.raises(ValueError):
        parse_scopes("VU (X-XII); NT (XI)")


def test_olivillo_is_vu_north_and_lc_in_los_lagos():
    assert regional_conservation("aextoxicon-punctatum", "valparaiso").applicable_category == "VU"
    lagos = regional_conservation("aextoxicon-punctatum", "los-lagos")
    assert (lagos.applicable_category, lagos.process, lagos.decree) == ("LC", 14, "DS 79/2018 MMA")


def test_guina_depends_on_region_and_stays_indeterminate_without_one():
    assert regional_conservation("leopardus-guigna", "los-rios").applicable_category == "VU"
    assert regional_conservation("leopardus-guigna", "los-lagos").applicable_category == "NT"
    unknown = regional_conservation("leopardus-guigna", None)
    assert unknown.regional_status == "indeterminate" and unknown.applicable_category is None
    assert unknown.park_regions == {"los-rios": "VU", "los-lagos": "NT"}


def test_taxon_without_rce_record_is_never_lc():
    result = regional_conservation("nothofagus-dombeyi", "los-lagos")
    assert result.record_status == "no_rce_record_found" and result.applicable_category is None
    assert "no equivale" in result.notes[0]


def test_rce_is_not_iucn_and_versioned():
    data = get_conservation()
    assert data.source.sha256.startswith("1a1dadba") and "marzo 2026" in data.source.version_text
    note = regional_conservation("puma-concolor", "los-lagos").notes[-1]
    assert "no es una categoría UICN" in note


def test_rce_import_is_idempotent_and_fails_closed():
    from evaluations.rce_import import build

    row = [
        "Leopardus guigna",
        "güiña",
        "Felis guigna",
        None,
        "Animalia",
        "",
        "",
        "",
        "",
        "NO",
        "IV-XI",
    ]
    row += (
        [0] * 4 + [1] * 11 + [0] * 6 + ["VU (XV-XIV); NT (X-XII)", "RCE", "--", 7, "DS 42/2011 MMA"]
    )
    names = {"leopardus-guigna": ["Leopardus guigna"], "x-y": ["Nada nada"]}
    first, second = build([tuple(row)], names, "v"), build([tuple(row)], names, "v")
    assert first == second and first["not_found"] == {"x-y": ["nada nada"]}
    assert first["assessments"][0]["distribution_regions"][-1] == "aysen"
    by_synonym = build([tuple(row)], {"leopardus-guigna": ["Felis guigna"]}, "v")
    assert by_synonym["assessments"][0]["rce_name"] == "Leopardus guigna"


def test_endpoints_filter_paginate_and_stay_public(client):
    page = client.get("/taxa", params={"kingdom": "Animalia", "limit": 3})
    assert page.status_code == 200 and page.json()["total"] == 8 and len(page.json()["items"]) == 3
    assert client.get("/taxa", params={"limit": 101}).status_code == 422
    assert client.get("/taxa", params={"kingdom": "Protista"}).status_code == 422
    regional = client.get("/taxa", params={"puyehue_status": "regional_candidate"}).json()
    assert {i["kingdom"] for i in regional["items"]} == {"Fungi"}
    assert (
        client.get("/taxa", params={"rce_category": "VU"}).json()["items"][0]["id"]
        == "leopardus-guigna"
    )
    assert client.get("/taxa/no-existe").status_code == 404
    assert (
        client.get("/taxa/leopardus-guigna/conservation", params={"region": "narnia"}).status_code
        == 422
    )
    park = client.get("/parks/puyehue/biodiversity").json()
    assert park["regions"] == ["los-rios", "los-lagos"] and park["counts"]["Plantae"] == {
        "documented_in_park": 8
    }
    assert client.get("/parks/torres/biodiversity").status_code == 404
    assert client.get("/species").json()[0]["id"] in TREES  # legacy contract intact


def test_openapi_documents_biodiversity_contracts(client):
    paths = client.get("/openapi.json").json()["paths"]
    for path in (
        "/taxa",
        "/taxa/{taxon_id}",
        "/taxa/{taxon_id}/conservation",
        "/parks/{park_id}/biodiversity",
    ):
        assert path in paths
    assert "/species" in paths and "/identify" in paths


def test_rce_import_rejects_changed_headers():
    from evaluations.rce_import import check_headers

    header = [""] * 40
    with pytest.raises(SystemExit):
        check_headers(tuple(header))
