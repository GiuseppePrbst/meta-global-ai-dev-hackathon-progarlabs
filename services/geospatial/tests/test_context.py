import importlib.util

import pytest
from bosque_geo.context import (
    ContextAreaRequest,
    ContextLayer,
    ContextPointRequest,
    context_result,
    taxon_aliases,
)
from pydantic import ValidationError
from shapely.geometry import Polygon, box, mapping

pytestmark = pytest.mark.skipif(
    importlib.util.find_spec("pyproj") is None,
    reason="Contexto métrico requiere extra raster/pyproj",
)


def layer(kind="forest", source_id="synthetic"):
    return ContextLayer(
        id=source_id,
        kind=kind,
        producer="synthetic",
        distributor="synthetic",
        source_url="synthetic",
        version="test",
        accessed_at="2026-10-27",
        source_crs="EPSG:4326",
        license="test",
        attribution="test",
        rights_status="redistribution_pending",
        geometry_status="pilot_checked",
        taxonomy_status="partial",
        content_sha256="0" * 64,
        limitations=[],
    )


def feature(identifier, geometry, source_id="synthetic", **properties):
    return {
        "source_id": source_id,
        "id": identifier,
        "geometry": mapping(geometry),
        "properties": properties,
    }


def test_point_boundary_returns_both_matches_and_no_individual_label():
    left = box(-72.085, -40.685, -72.083, -40.681)
    right = box(-72.083, -40.685, -72.081, -40.681)
    request = ContextPointRequest(location={"coordinates": [-72.083, -40.683]})
    result = context_result(
        request, [layer()], [feature("one", left), feature("two", right)], {}
    )
    assert len(result.forest_context) == 2
    assert "point_on_boundary" in result.quality_flags
    assert "multiple_matches" in result.quality_flags


def test_no_coverage_does_not_claim_absence():
    result = context_result(
        ContextPointRequest(location={"coordinates": [0, 0]}), [layer()], [], {}
    )
    assert result.status == "no_coverage"
    assert "ausencia" in result.limitations[1]


def test_aoi_union_does_not_double_count_and_preserves_hole():
    outer = box(-72.085, -40.685, -72.081, -40.681)
    hole = box(-72.084, -40.684, -72.082, -40.682)
    polygon = Polygon(outer.exterior.coords, [hole.exterior.coords])
    request = ContextAreaRequest(area=mapping(outer))
    result = context_result(
        request, [layer()], [feature("one", polygon), feature("two", polygon)], {}
    )
    cover = result.coverage[0]
    assert 0.74 < cover.fraction < 0.76
    assert cover.overlap_excess_m2 > 0
    assert "source_overlap" in result.quality_flags
    assert all(m.fraction_of_aoi < 1 for m in result.forest_context)


def test_accuracy_buffer_can_match_without_claiming_exact_location():
    query = ContextPointRequest(
        location={"coordinates": [-72.083, -40.683]}, accuracy_m=100
    )
    nearby = box(-72.0825, -40.6835, -72.082, -40.6825)
    result = context_result(query, [layer()], [feature("one", nearby)], {})
    assert result.status == "matched" and result.accuracy_m == 100


def test_source_names_preserved_and_ambiguous_taxa_remain_unresolved():
    aliases = taxon_aliases(
        [
            {
                "id": "tepa",
                "scientific_name": "Laureliopsis philippiana",
                "synonyms": ["Laurelia philippiana Looser"],
            },
        ]
    )
    request = ContextPointRequest(location={"coordinates": [-72.083, -40.683]})
    result = context_result(
        request,
        [layer()],
        [
            feature(
                "one",
                box(-72.084, -40.684, -72.082, -40.682),
                especi1_ci=" Laurelia philippiana ",
                especi2_ci="Gevuina avellana",
            )
        ],
        aliases,
    )
    species = result.forest_context[0].predominant_species
    assert species[0].scientific_name_raw == " Laurelia philippiana "
    assert species[0].accepted_taxon_id == "tepa"
    assert species[1].resolution == "unresolved"
    aliases["laurelia philippiana"].add("other")
    result = context_result(
        request,
        [layer()],
        [
            feature(
                "one",
                box(-72.084, -40.684, -72.082, -40.682),
                especi1_ci="Laurelia philippiana",
            )
        ],
        aliases,
    )
    assert result.forest_context[0].predominant_species[0].accepted_taxon_id is None


def test_multipolygon_and_limits():
    one = mapping(box(-72.084, -40.684, -72.083, -40.683))["coordinates"]
    two = mapping(box(-72.082, -40.682, -72.081, -40.681))["coordinates"]
    request = ContextAreaRequest(
        area={"type": "MultiPolygon", "coordinates": [one, two]}
    )
    assert context_result(request, [layer()], [], {}).status == "no_coverage"
    with pytest.raises(ValidationError):
        ContextAreaRequest(area={"type": "MultiPolygon", "coordinates": [one, one]})
    with pytest.raises(ValidationError):
        ContextPointRequest(location={"coordinates": [0, 91]})
    with pytest.raises(ValidationError):
        ContextPointRequest(location={"coordinates": [0, 0]}, accuracy_m=201)
    with pytest.raises(ValueError, match="máxima"):
        context_result(
            ContextAreaRequest(area=mapping(box(-72.1, -40.7, -72.0, -40.6))),
            [layer()],
            [],
            {},
        )
