"""Read-only Knowledge Atlas: cached snapshot, in-memory indexes and park/trail routes.

The snapshot (resources/knowledge-atlas.json) is built offline by atlas_build.py.
Queries never fetch web pages; they filter the snapshot by id, park, region, type
and accent-folded name tokens. ponytail: token overlap scoring, no vector store;
switch to PostgreSQL full-text only if the snapshot outgrows memory.
"""

import json
import re
import unicodedata
from datetime import date
from functools import lru_cache
from importlib.resources import files
from typing import Annotated, Any, Literal

from pydantic import BaseModel, Field

EntityType = Literal[
    "Park",
    "ParkSector",
    "Trail",
    "MapResource",
    "Taxon",
    "ParkTaxonEvidence",
    "ConservationAssessment",
    "KnowledgeSource",
    "DocumentPassage",
]
STALE_AFTER_DAYS = 30
STOP = {
    # Category words ("hongo", "árbol") would otherwise match any taxon named after them.
    "hongo",
    "hongos",
    "arbol",
    "arboles",
    "ave",
    "aves",
    "especie",
    "especies",
    "animal",
    "animales",
    "planta",
    "plantas",
    "tree",
    "trees",
    "bird",
    "birds",
    "de",
    "del",
    "la",
    "las",
    "el",
    "los",
    "y",
    "en",
    "a",
    "que",
    "un",
    "una",
    "por",
    "para",
    "con",
    "me",
    "mi",
    "hay",
    "puedo",
    "parque",
    "nacional",
    "sendero",
    "senderos",
    "wilo",
    "hola",
}


def fold(text: str) -> str:
    return unicodedata.normalize("NFKD", text or "").encode("ascii", "ignore").decode().lower()


def tokens(text: str) -> set[str]:
    folded = fold(text)
    # "llao-llao" and "hued-hued" also match their run-together ASR spellings.
    joined = re.findall(r"[a-z0-9]+(?:-[a-z0-9]+)+", folded)
    words = re.findall(r"[a-z0-9]+", folded) + [j.replace("-", "") for j in joined]
    return {t for t in words if len(t) > 1 and t not in STOP}


class Atlas:
    def __init__(self, raw: dict, today: date | None = None):
        self.version = raw["knowledge_version"]
        self.snapshot = raw["snapshot"]
        self.entities = {e["id"]: e for e in raw["entities"]}
        self.by_type: dict[str, list[dict]] = {}
        self.by_park: dict[str, list[dict]] = {}
        self.index: dict[str, set[str]] = {}
        for e in raw["entities"]:
            self.by_type.setdefault(e["type"], []).append(e)
            park = e["id"] if e["type"] == "Park" else e["data"].get("park_id")
            if park:
                self.by_park.setdefault(park, []).append(e)
            for tok in tokens(" ".join([e["name"], *e["search_terms"]])):
                self.index.setdefault(tok, set()).add(e["id"])
        self.today = today

    def get(self, entity_id: str, kind: str | None = None) -> dict | None:
        e = self.entities.get(entity_id)
        return e if e and (kind is None or e["type"] == kind) else None

    def park_items(self, park_id: str, kind: str) -> list[dict]:
        return [e for e in self.by_park.get(park_id, []) if e["type"] == kind]

    def search(self, query: str, kinds=None, park_id=None, limit=8) -> list[dict]:
        wanted = tokens(query)
        scores: dict[str, float] = {}
        for tok in wanted:
            matches = self.index.get(tok, set())
            if not matches and len(tok) >= 5:
                # Prefix fallback: "magellanic" → "magellanicus", "puyehues" stays unmatched.
                matches = {i for key, ids in self.index.items() if key.startswith(tok) for i in ids}
            for entity_id in matches:
                scores[entity_id] = scores.get(entity_id, 0) + 1
        hits = []
        for entity_id, score in scores.items():
            e = self.entities[entity_id]
            if kinds and e["type"] not in kinds:
                continue
            if park_id and park_id not in (e["id"], e["data"].get("park_id")):
                continue
            # Prefer official facts over repository prose on ties.
            weight = score / len(wanted) + (0.2 if e["confidence"] == "official" else 0)
            # Taxa excluded from the demo stay findable but never outrank a ready profile.
            weight -= 0.5 if e["data"].get("demo_status") == "excluded_from_demo" else 0
            hits.append((weight - (0.3 if e["type"] == "DocumentPassage" else 0), e))
        hits.sort(key=lambda h: (-h[0], h[1]["type"], h[1]["id"]))
        return [e for _, e in hits[:limit]]

    def status(self) -> dict:
        built = date.fromisoformat(self.snapshot["accessed_at"])
        age = ((self.today or date.today()) - built).days
        return {
            "knowledge_version": self.version,
            "schema_version": self.snapshot["data"]["schema_version"],
            "built_from_data_of": self.snapshot["accessed_at"],
            "age_days": age,
            "stale": age > STALE_AFTER_DAYS,
            "stale_after_days": STALE_AFTER_DAYS,
            "counts": self.snapshot["data"]["counts"],
            "limitations": self.snapshot["limitations"],
            "rebuild": "uv run --project services/api python -m bosque_api.atlas_build",
        }


@lru_cache
def get_atlas() -> Atlas:
    raw = files("bosque_api").joinpath("resources/knowledge-atlas.json").read_text(encoding="utf-8")
    return Atlas(json.loads(raw))


@lru_cache
def voice_keywords() -> list[str]:
    """ASR vocabulary generated from the snapshot, never a hand-kept list.

    Priority: product names, Puyehue sectors and trails, catalog names (Spanish,
    first GBIF English name, scientific), then park names (parks with trails first).
    Truncated to the local keyword cap.
    """
    from bosque_ai.voice import keyword_list

    atlas = get_atlas()
    puyehue = atlas.get("puyehue", "Park")
    taxa = atlas.by_type["Taxon"]
    return keyword_list(
        [
            "Wilo",
            "Bosque Vivo",
            "ProGarLabs",
            "Puyehue",
            *puyehue["data"]["sectors"],
            *(t["name"] for t in atlas.park_items("puyehue", "Trail")),
            *(n for t in taxa for n in t["data"]["common_names"]),
            *(t["data"]["english_names"][0] for t in taxa if t["data"]["english_names"]),
            *(t["data"]["scientific_name"] for t in taxa),
            # Genera spoken alone (Nothofagus, Cyttaria): those shared by two or more taxa.
            *sorted(
                {
                    g
                    for t in taxa
                    if [x["data"]["scientific_name"].split()[0] for x in taxa].count(
                        g := t["data"]["scientific_name"].split()[0]
                    )
                    > 1
                }
            ),
            # Parks with published trails first: they are the ones Wilo can answer about.
            *(
                p["data"]["short_name"]
                for p in sorted(
                    atlas.by_type["Park"], key=lambda p: (p["data"]["trail_count"] == 0, p["id"])
                )
            ),
        ]
    )


def source_ref(e: dict) -> dict:
    """Citation for one entity; id is stable across requests of the same snapshot."""
    s = e.get("source") or {}
    return {
        "id": f"atlas:{e['id']}",
        "title": s.get("title"),
        "url": s.get("url"),
        "type": s.get("kind"),
        "accessed_at": e["accessed_at"],
        "version": e.get("version"),
        "confidence": e["confidence"],
        "review_status": e["review_status"],
    }


# ---- Public read-only contract ------------------------------------------------------------


class SourceOut(BaseModel):
    id: str
    title: str | None
    url: str | None
    type: str | None
    accessed_at: str
    version: str | None = None
    confidence: str
    review_status: str


class ParkSummary(BaseModel):
    id: str
    name: str
    regions: list[str]
    area_ha: float | None
    trail_count: int
    trail_section_status: str | None
    has_bbox: bool


class ParkPage(BaseModel):
    items: list[ParkSummary]
    total: int
    limit: int
    offset: int
    knowledge_version: str


class TrailOut(BaseModel):
    id: str
    park_id: str
    name: str
    sector: str | None
    kind: str | None
    distance_m: float | None
    distance_basis: str | None = None
    duration_minutes: int | None
    duration_min_minutes: int | None = None
    duration_max_minutes: int | None = None
    duration_basis: str | None = None
    difficulty: str | None
    winter_difficulty: str | None = None
    risks: str | None = None
    conditions: list[str] = Field(default_factory=list)
    published_closure: str | None = None
    source_status: Literal["official_reviewed", "official_named_only", "secondary_reference"]
    opening_status: Literal["not_verified", "published_closure"]
    geometry_available: Literal[False] = False
    geometry: None = None
    sources: list[SourceOut]
    limitations: list[str]


class ParkOut(BaseModel):
    id: str
    name: str
    regions: list[str]
    provinces: str | None
    communes: str | None
    area_ha: float | None
    area_source_text: str | None
    sectors: list[str]
    visit_notice: str | None
    access_text: str | None
    trail_count: int
    trail_section_status: str | None
    official_url: str
    linked_taxa: list[str]
    conflicts: list[dict[str, Any]]
    live_status: Literal["not_verified"] = "not_verified"
    sources: list[SourceOut]
    limitations: list[str]
    knowledge_version: str


class MapResourceOut(BaseModel):
    id: str
    kind: str
    url: str | None = None
    bbox: list[float] | None = None
    crs: str | None = None
    redistribution: str
    source: SourceOut


class ParkMap(BaseModel):
    park_id: str
    boundary_geometry: None = None
    boundary_source: str | None
    boundary_unavailable_reason: str
    crs: str
    bbox: list[float] | None
    bbox_source: SourceOut | None
    trails: list[TrailOut]
    map_resources: list[MapResourceOut]
    geometry_status: Literal["bbox_only", "unavailable"]
    source_status: str
    limitations: list[str]
    knowledge_version: str


class SearchHit(BaseModel):
    id: str
    type: str
    name: str
    park_id: str | None
    confidence: str
    source: SourceOut


class KnowledgeStatus(BaseModel):
    knowledge_version: str
    schema_version: str
    built_from_data_of: str
    age_days: int
    stale: bool
    stale_after_days: int
    counts: dict[str, int]
    limitations: list[str]
    rebuild: str


def trail_out(e: dict) -> TrailOut:
    d = e["data"]
    return TrailOut(
        id=e["id"],
        park_id=d["park_id"],
        name=e["name"],
        sector=d.get("sector"),
        kind=d.get("kind"),
        distance_m=d.get("distance_m"),
        distance_basis=d.get("distance_basis"),
        duration_minutes=d.get("duration_minutes"),
        duration_min_minutes=d.get("duration_min_minutes"),
        duration_max_minutes=d.get("duration_max_minutes"),
        duration_basis=d.get("duration_basis"),
        difficulty=d.get("difficulty"),
        winter_difficulty=d.get("winter_difficulty"),
        risks=d.get("risks"),
        conditions=d.get("conditions") or [],
        published_closure=d.get("published_closure"),
        source_status=d["source_status"],
        opening_status=d["opening_status"],
        sources=[SourceOut(**source_ref(e))],
        limitations=e["limitations"],
    )


def park_out(atlas: Atlas, e: dict) -> ParkOut:
    d = e["data"]
    return ParkOut(
        id=e["id"],
        name=e["name"],
        regions=d["regions"],
        provinces=d["provinces"],
        communes=d["communes"],
        area_ha=d["area_ha"],
        area_source_text=d["area_source_text"],
        sectors=d["sectors"],
        visit_notice=d["visit_notice"],
        access_text=d["access_text"],
        trail_count=d["trail_count"],
        trail_section_status=d["trail_section_status"],
        official_url=d["official_url"],
        linked_taxa=d["linked_taxa"],
        conflicts=d["conflicts"],
        sources=[SourceOut(**source_ref(e))],
        limitations=e["limitations"],
        knowledge_version=atlas.version,
    )


def park_trails(
    atlas: Atlas, park_id: str, sector: str | None = None, secondary=False
) -> list[TrailOut]:
    items = [trail_out(t) for t in atlas.park_items(park_id, "Trail")]
    if not secondary:
        items = [t for t in items if t.source_status != "secondary_reference"]
    if sector:
        items = [t for t in items if t.sector and fold(t.sector) == fold(sector)]
    return sorted(items, key=lambda t: (t.source_status != "official_reviewed", t.name))


def park_map(atlas: Atlas, park_id: str) -> ParkMap:
    resources = atlas.park_items(park_id, "MapResource")
    bbox = next((r for r in resources if r["data"]["kind"] == "bbox_reference"), None)
    return ParkMap(
        park_id=park_id,
        boundary_source=None,
        boundary_unavailable_reason=(
            "No hay límite oficial con licencia de redistribución: la capa BCN SNASPE se usa "
            "solo como encuadre y sus polígonos no se publican."
        ),
        crs="EPSG:4326",
        bbox=bbox["data"]["bbox"] if bbox else None,
        bbox_source=SourceOut(**source_ref(bbox)) if bbox else None,
        trails=park_trails(atlas, park_id, secondary=True),
        map_resources=[
            MapResourceOut(
                id=r["id"],
                kind=r["data"]["kind"],
                url=r["data"].get("url"),
                bbox=r["data"].get("bbox"),
                crs=r["data"].get("crs"),
                redistribution=r["data"]["redistribution"],
                source=SourceOut(**source_ref(r)),
            )
            for r in resources
        ],
        geometry_status="bbox_only" if bbox else "unavailable",
        source_status="official_profile_and_reference_bbox" if bbox else "official_profile_only",
        limitations=[
            "Sin geometría de senderos autorizada: no dibujar trazados ni ofrecer navegación.",
            "El encuadre BCN es referencial; no decide si un punto está dentro del parque.",
        ],
        knowledge_version=atlas.version,
    )


def register_atlas_routes(app):
    from fastapi import HTTPException, Query

    def park_or_404(park_id: str) -> dict:
        e = get_atlas().get(park_id, "Park")
        if e is None:
            raise HTTPException(404, "Parque no encontrado en el índice CONAF")
        return e

    @app.get("/parks", response_model=ParkPage)
    def parks(
        region: Annotated[str | None, Query(pattern=r"^[a-z-]{3,30}$")] = None,
        q: Annotated[str | None, Query(min_length=2, max_length=80)] = None,
        has_trails: bool | None = None,
        limit: Annotated[int, Query(ge=1, le=100)] = 50,
        offset: Annotated[int, Query(ge=0, le=1000)] = 0,
    ):
        """46 parques nacionales del índice CONAF; `region` usa slugs (`los-lagos`)."""
        atlas = get_atlas()
        items = atlas.search(q, kinds={"Park"}, limit=100) if q else atlas.by_type["Park"]
        out = [
            ParkSummary(
                id=e["id"],
                name=e["name"],
                regions=e["data"]["regions"],
                area_ha=e["data"]["area_ha"],
                trail_count=e["data"]["trail_count"],
                trail_section_status=e["data"]["trail_section_status"],
                has_bbox=e["data"]["bbox"] is not None,
            )
            for e in items
            if (region is None or region in e["data"]["regions"])
            and (has_trails is None or (e["data"]["trail_count"] > 0) == has_trails)
        ]
        return ParkPage(
            items=out[offset : offset + limit],
            total=len(out),
            limit=limit,
            offset=offset,
            knowledge_version=atlas.version,
        )

    @app.get(
        "/parks/{park_id}",
        response_model=ParkOut,
        responses={404: {"description": "Parque no encontrado"}},
    )
    def park(park_id: str):
        return park_out(get_atlas(), park_or_404(park_id))

    @app.get("/parks/{park_id}/trails", response_model=list[TrailOut])
    def trails(
        park_id: str,
        sector: Annotated[str | None, Query(max_length=60)] = None,
        include_secondary: bool = False,
    ):
        """Senderos documentados. `opening_status=not_verified` no significa abierto."""
        park_or_404(park_id)
        return park_trails(get_atlas(), park_id, sector, include_secondary)

    @app.get("/parks/{park_id}/map", response_model=ParkMap)
    def map_(park_id: str):
        """Encuadre y recursos cartográficos; `boundary_geometry` es null con motivo explícito."""
        park_or_404(park_id)
        return park_map(get_atlas(), park_id)

    @app.get(
        "/trails/{trail_id}",
        response_model=TrailOut,
        responses={404: {"description": "Sendero no encontrado"}},
    )
    def trail(trail_id: str):
        e = get_atlas().get(trail_id, "Trail")
        if e is None:
            raise HTTPException(404, "Sendero no encontrado")
        return trail_out(e)

    @app.get("/knowledge/status", response_model=KnowledgeStatus)
    def knowledge_status():
        return get_atlas().status()

    @app.get("/knowledge/search", response_model=list[SearchHit])
    def knowledge_search(
        q: Annotated[str, Query(min_length=2, max_length=200)],
        type: EntityType | None = None,  # noqa: A002 - public query name
        park_id: Annotated[str | None, Query(pattern=r"^[a-z-]{3,60}$")] = None,
        limit: Annotated[int, Query(ge=1, le=20)] = 8,
    ):
        hits = get_atlas().search(q, {type} if type else None, park_id, limit)
        return [
            SearchHit(
                id=e["id"],
                type=e["type"],
                name=e["name"],
                park_id=e["id"] if e["type"] == "Park" else e["data"].get("park_id"),
                confidence=e["confidence"],
                source=SourceOut(**source_ref(e)),
            )
            for e in hits
        ]
