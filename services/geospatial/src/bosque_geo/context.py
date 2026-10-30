"""Local landscape context. Polygon composition never labels a photographed individual."""

from collections import defaultdict
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator
from shapely.geometry import Point as ShapePoint
from shapely.geometry import shape
from shapely.ops import unary_union

from bosque_geo.contracts import Point, Polygon, Position


class MultiPolygon(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: Literal["MultiPolygon"] = "MultiPolygon"
    coordinates: list[list[list[Position]]] = Field(min_length=1, max_length=20)

    @model_validator(mode="after")
    def valid_parts(self):
        for part in self.coordinates:
            Polygon(coordinates=part)
        if sum(len(r) for p in self.coordinates for r in p) > 20000:
            raise ValueError("Máximo 20000 posiciones")
        if not shape(self.model_dump()).is_valid:
            raise ValueError("MultiPolygon inválido; no se repara automáticamente")
        return self


class ContextPointRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    location: Point
    accuracy_m: float | None = Field(
        default=None, ge=0, le=200, allow_inf_nan=False, strict=True
    )


class ContextAreaRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    area: Polygon | MultiPolygon


class WeightedForestRequest(ContextAreaRequest):
    source_id: Literal["chmv2"]


class ContextLayer(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str = Field(pattern=r"^[a-z0-9_-]+$")
    kind: Literal["forest", "protected"]
    producer: str
    distributor: str
    source_url: str
    version: str
    accessed_at: str
    source_crs: str
    storage_crs: Literal["EPSG:4326"] = "EPSG:4326"
    license: str
    attribution: str
    rights_status: Literal["source_terms_checked", "redistribution_pending"]
    geometry_status: Literal["pilot_checked"]
    taxonomy_status: Literal["partial", "not_applicable"]
    content_sha256: str = Field(pattern=r"^[0-9a-f]{64}$")
    status: Literal["ready"] = "ready"
    limitations: list[str]


class PredominantSpecies(BaseModel):
    scientific_name_raw: str
    accepted_taxon_id: str | None
    resolution: Literal["catalog_match", "unresolved"]


class ContextMatch(BaseModel):
    source_id: str
    feature_id: str
    attributes_raw: dict
    attributes: dict
    predominant_species: list[PredominantSpecies]
    point_on_boundary: bool = False
    intersection_area_m2: float | None = None
    fraction_of_aoi: float | None = None


class Coverage(BaseModel):
    source_id: str
    union_area_m2: float
    fraction: float
    overlap_excess_m2: float


class ContextResponse(BaseModel):
    status: Literal["matched", "no_coverage"]
    forest_context: list[ContextMatch]
    protected_context: list[ContextMatch]
    source_refs: list[ContextLayer]
    coverage: list[Coverage]
    query_area_m2: float | None = None
    accuracy_m: float | None = None
    analysis_crs: Literal["EPSG:32718"] = "EPSG:32718"
    quality_flags: list[str]
    limitations: list[str]
    taxonomy_version: str


FIELD_MAPPING = {
    "uso": "land_use_label",
    "subuso": "land_subuse_label",
    "estructura": "structure_label",
    "cobertura": "canopy_cover_class",
    "altura": "height_class_raw",
    "tipo_fores": "forest_type_label",
    "subtipofor": "forest_subtype_label",
    "Nombre": "protected_name_raw",
    "Tipo_Snasp": "protected_category_raw",
}


def projected(geometry, inverse=False):
    from pyproj import Transformer
    from shapely import transform

    source, target = (32718, 4326) if inverse else (4326, 32718)
    return transform(
        geometry,
        Transformer.from_crs(source, target, always_xy=True).transform,
        interleaved=False,
    )


def query_geometry(request: ContextPointRequest | ContextAreaRequest):
    if isinstance(request, ContextPointRequest):
        location = ShapePoint(request.location.coordinates)
        query = (
            projected(location).buffer(request.accuracy_m)
            if request.accuracy_m
            else location
        )
        return projected(query, inverse=True) if request.accuracy_m else query
    return shape(request.area.model_dump())


def check_query(request: ContextPointRequest | ContextAreaRequest):
    query = query_geometry(request)
    if isinstance(request, ContextAreaRequest) or request.accuracy_m:
        # This increment serves Los Lagos, not a national area calculation service.
        west, south, east, north = query.bounds
        if not (-74 <= west <= east <= -71 and -42 <= south <= north <= -39):
            raise ValueError("Superficies limitadas al piloto Los Lagos")
        if not 0 < projected(query).area <= 1_000_000:
            raise ValueError("Área máxima de contexto: 1 km²")
    return query


def taxon_aliases(catalog: list[dict]) -> dict[str, set[str]]:
    aliases = defaultdict(set)
    for item in catalog:
        for name in [item["scientific_name"], *item.get("synonyms", [])]:
            # GBIF synonym authorship is retained in the catalogue; match its binomial only.
            binomial = " ".join(name.split()[:2]).casefold()
            aliases[binomial].add(item["id"])
    return aliases


def context_result(
    request,
    layers: list[ContextLayer],
    features: list[dict],
    aliases,
    taxonomy_version="not_supplied",
) -> ContextResponse:
    query = check_query(request)
    is_area = isinstance(request, ContextAreaRequest)
    metric_query = projected(query) if is_area or request.accuracy_m else None
    area = metric_query.area if is_area else None
    by_id = {layer.id: layer for layer in layers}
    forest, protected, coverage = [], [], []
    pieces = defaultdict(list)
    for feature in features:
        geometry = shape(feature["geometry"])
        if geometry.is_empty or not geometry.is_valid:
            raise ValueError("Geometría fuente inválida; requiere cuarentena")
        boundary = False
        intersection = None
        if is_area:
            intersection = projected(geometry).intersection(metric_query)
            if intersection.area <= 0:
                continue
            pieces[feature["source_id"]].append(intersection)
        elif request.accuracy_m:
            if not projected(geometry).intersects(metric_query):
                continue
        else:
            if not geometry.covers(query):
                continue
            boundary = geometry.boundary.distance(query) <= 1e-12
        raw = feature["properties"]
        species = []
        for index in range(1, 7):
            name = raw.get(f"especi{index}_ci")
            if not isinstance(name, str) or not name.strip():
                continue
            ids = aliases.get(" ".join(name.split()).casefold(), set())
            species.append(
                PredominantSpecies(
                    scientific_name_raw=name,
                    accepted_taxon_id=next(iter(ids)) if len(ids) == 1 else None,
                    resolution="catalog_match" if len(ids) == 1 else "unresolved",
                )
            )
        match = ContextMatch(
            source_id=feature["source_id"],
            feature_id=feature["id"],
            attributes_raw=raw,
            attributes={
                label: raw.get(field) for field, label in FIELD_MAPPING.items()
            },
            predominant_species=species,
            point_on_boundary=boundary,
            intersection_area_m2=intersection.area
            if intersection is not None
            else None,
            fraction_of_aoi=min(1.0, intersection.area / area)
            if intersection is not None
            else None,
        )
        (forest if by_id[match.source_id].kind == "forest" else protected).append(match)
    if is_area:
        for layer in layers:
            hits = pieces[layer.id]
            union = min(area, unary_union(hits).area) if hits else 0
            coverage.append(
                Coverage(
                    source_id=layer.id,
                    union_area_m2=union,
                    fraction=union / area,
                    overlap_excess_m2=max(0, sum(g.area for g in hits) - union),
                )
            )
    flags = []
    if any(m.point_on_boundary for m in forest + protected):
        flags.append("point_on_boundary")
    if len(forest) > 1 or len(protected) > 1:
        flags.append("multiple_matches")
    if any(c.overlap_excess_m2 > 0.001 for c in coverage):
        flags.append("source_overlap")
    return ContextResponse(
        status="matched" if forest or protected else "no_coverage",
        forest_context=forest,
        protected_context=protected,
        source_refs=layers,
        coverage=coverage,
        query_area_m2=area,
        accuracy_m=request.accuracy_m if not is_area else None,
        quality_flags=flags,
        taxonomy_version=taxonomy_version,
        limitations=[
            "Contexto de polígonos; no identificación ni etiqueta de un individuo.",
            "Sin match significa no_coverage, no ausencia de bosque, especie o protección.",
            "Protección referencial; no autoriza acceso ni determina situación legal actual.",
        ],
    )
