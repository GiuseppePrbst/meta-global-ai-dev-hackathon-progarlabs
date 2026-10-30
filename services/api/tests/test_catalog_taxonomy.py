"""Catalog synonym review: excluded names never return to aliases or labels."""

import pytest
from bosque_geo.context import taxon_aliases
from pydantic import ValidationError

from bosque_api.catalog import get_species
from bosque_api.models import Species


def test_incorrect_and_disputed_synonyms_no_longer_map_to_catalog_species():
    species = {s.id: s for s in get_species()}
    aliases = taxon_aliases([s.model_dump() for s in species.values()])
    # COL XR and WFO agree: Weinmannia corymbosa is Caldcluvia paniculata, not Tineo.
    assert "weinmannia corymbosa" not in aliases
    # Sources disagree (N. antarctica vs N. betuloides): excluded until specialist review.
    assert "betula antarctica" not in aliases
    # Verified by WFO, kept.
    assert aliases["calusparassus pumilio"] == {"nothofagus-pumilio"}
    reviews = {r.name: r.decision for s in species.values() for r in s.synonym_review}
    assert reviews["Weinmannia corymbosa Ruiz & Pav."] == "removed_incorrect"
    assert reviews["Betula antarctica G.Forst."] == "disputed_excluded"
    assert all(r.evidence for s in species.values() for r in s.synonym_review)


def test_reviewed_exclusion_cannot_silently_return():
    item = get_species()[0].model_dump()
    item["synonym_review"] = [
        {
            "name": item["synonyms"][0],
            "decision": "removed_incorrect",
            "evidence": ["synthetic"],
            "reviewed_at": "2026-10-30",
            "reviewer": "synthetic",
        }
    ]
    with pytest.raises(ValidationError, match="excluido"):
        Species.model_validate(item)


def test_comparators_are_sourced_look_alikes_outside_the_catalog():
    from bosque_api.catalog import get_comparators

    comparators = get_comparators()
    catalog = {s.scientific_name for s in get_species()}
    assert {c.scientific_name for c in comparators} == {
        "Nothofagus antarctica",
        "Nothofagus nitida",
        "Laurelia sempervirens",
        "Saxegothaea conspicua",
        "Podocarpus salignus",
        "Prumnopitys andina",
    }
    assert not catalog & {c.scientific_name for c in comparators}
    assert all(c.sources and c.diagnostic_traits for c in comparators)
