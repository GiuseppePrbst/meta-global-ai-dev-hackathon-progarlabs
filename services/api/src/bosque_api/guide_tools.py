"""Wilo read-only tools. Arguments are validated Pydantic models with enum ids; no SQL,
code, file paths or free-form filters ever reach storage. Results are bounded."""

from typing import Literal
from uuid import UUID

from bosque_ai.guide import GuideToolError
from bosque_geo.context import ContextPointRequest
from pydantic import BaseModel, ConfigDict, Field

from bosque_api.atlas import get_atlas, park_map, park_out, park_trails, source_ref, trail_out
from bosque_api.biodiversity import REGIONS, get_taxa, regional_conservation
from bosque_api.demo import eligibility

TAXA = {item.id: item for item in get_taxa()}
PARKS = sorted(e["id"] for e in get_atlas().by_type["Park"])
MAX_TRAILS = 30


class Arguments(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ParkArgument(Arguments):
    park_id: str = Field(json_schema_extra={"enum": PARKS})


class TrailsArguments(ParkArgument):
    sector: str | None = Field(default=None, max_length=60)


class TrailArgument(Arguments):
    trail_id: str = Field(pattern=r"^[a-z0-9-]{3,120}$")


class RegionArgument(Arguments):
    region_id: str | None = Field(
        default=None, json_schema_extra={"enum": [*REGIONS.values(), None]}
    )


class SearchArguments(Arguments):
    query: str = Field(min_length=2, max_length=200)
    type: (
        Literal["Park", "ParkSector", "Trail", "Taxon", "ConservationAssessment", "DocumentPassage"]
        | None
    ) = None
    park_id: str | None = Field(default=None, json_schema_extra={"enum": [*PARKS, None]})


class SourceArgument(Arguments):
    source_id: str = Field(pattern=r"^atlas:[a-z0-9-]{3,140}$")


class ForestArgument(Arguments):
    area_id: Literal["current_capture"]


class TaxonArgument(Arguments):
    taxon_id: str = Field(json_schema_extra={"enum": list(TAXA)})


class CompareArguments(Arguments):
    taxon_a: str = Field(json_schema_extra={"enum": list(TAXA)})
    taxon_b: str = Field(json_schema_extra={"enum": list(TAXA)})


class ConservationArguments(TaxonArgument):
    region_id: str | None = Field(
        default=None, json_schema_extra={"enum": [*REGIONS.values(), None]}
    )


class BiodiversityArguments(ParkArgument):
    group: Literal["tree", "bird", "mammal", "fungus"] | None = None


DESCRIPTIONS = {
    "search_knowledge": "Busca en el Knowledge Atlas (parques, sectores, senderos, taxones, "
    "conservación, documentación) por nombre; devuelve IDs para otras herramientas",
    "list_parks": "Lista los 46 parques nacionales CONAF, opcionalmente por región",
    "get_park_profile": "Ficha CONAF de un parque: superficie, provincias, sectores, horario "
    "publicado, acceso y conflictos de fuentes; sin estado de apertura en vivo",
    "get_park_trails": "Senderos documentados de un parque (filtro de sector opcional); "
    "not_verified no significa abierto; sin geometría",
    "get_trail_profile": "Detalle de un sendero: distancia, duración, dificultad, riesgos y "
    "cierres publicados; nunca confirma apertura actual",
    "get_park_map": "Encuadre referencial y recursos de mapa de un parque; sin trazados",
    "get_park_biodiversity": "Taxones del catálogo con evidencia en un parque (mención oficial "
    "a escala de parque, sin coordenadas)",
    "get_taxon_profile": "Ficha multirreino con fuentes, rasgos, hábitat, elegibilidad demo y "
    "estado de identificación; sin coordenadas",
    "compare_taxa": "Compara rasgos respaldados de dos taxones del catálogo",
    "get_taxon_conservation": "Categoría RCE según región; sin región queda indeterminada; "
    "sin registro nunca es LC",
    "get_source_details": "Metadatos de una fuente atlas: URL, fecha, versión y confianza",
    "get_forest_context": "Contexto de captura; coordenadas solo en backend",
    "get_user_capture_progress": "Conteos propios; identidad fijada por el servidor",
}
TOOL_ARGUMENTS = {
    "search_knowledge": SearchArguments,
    "list_parks": RegionArgument,
    "get_park_profile": ParkArgument,
    "get_park_trails": TrailsArguments,
    "get_trail_profile": TrailArgument,
    "get_park_map": ParkArgument,
    "get_park_biodiversity": BiodiversityArguments,
    "get_taxon_profile": TaxonArgument,
    "compare_taxa": CompareArguments,
    "get_taxon_conservation": ConservationArguments,
    "get_source_details": SourceArgument,
    "get_forest_context": ForestArgument,
    "get_user_capture_progress": Arguments,
}
TOOLS = [
    {
        "type": "function",
        "function": {
            "name": name,
            "description": DESCRIPTIONS[name],
            "parameters": model.model_json_schema(),
        },
    }
    for name, model in TOOL_ARGUMENTS.items()
]


def cite(e: dict) -> dict:
    return {**source_ref(e), "scope": e["type"]}


def taxon_view(key: str) -> tuple[dict, list[dict]]:
    taxon = TAXA[key]
    data = taxon.model_dump(exclude={"media"})
    data["demo"] = eligibility(taxon).model_dump()
    data["photos"] = [
        {"url": m.media_url, "attribution": m.attribution, "license": m.license}
        for m in taxon.media[:2]
    ]
    if taxon.sensitivity == "location_sensitive":
        data["safety"] = "Especie sensible: entregar solo información educativa general."
    sources = [
        {
            "id": f"taxon:{taxon.id}:{i}",
            "url": s.url,
            "version": s.accessed_at,
            "scope": s.kind,
            "title": s.title,
        }
        for i, s in enumerate(taxon.profile.sources)
    ]
    return data, sources


def atlas_tool(name: str, args: dict) -> tuple[object, list[dict], list[dict], dict]:
    """(data, sources, entities, extra) for the knowledge tools."""
    atlas = get_atlas()
    park_id = args.get("park_id")
    entities = [{"type": "park", "id": park_id}] if park_id else []
    extra: dict = {}
    if name == "search_knowledge":
        hits = atlas.search(args["query"], {args["type"]} if args["type"] else None, park_id, 6)
        data = [
            {
                "id": e["id"],
                "type": e["type"],
                "name": e["name"],
                "park_id": e["data"].get("park_id"),
                "confidence": e["confidence"],
                "summary": {k: e["data"].get(k) for k in SUMMARY.get(e["type"], ())},
            }
            for e in hits
        ]
        kinds = {"Park": "park", "Trail": "trail", "Taxon": "taxon"}
        entities += [
            {"type": kinds[e["type"]], "id": e["id"], "source_id": f"atlas:{e['id']}"}
            for e in hits
            if e["type"] in kinds
        ]
        entities += [  # a cited trail also opens its park
            {"type": "park", "id": e["data"]["park_id"], "source_id": f"atlas:{e['id']}"}
            for e in hits
            if e["type"] == "Trail"
        ]
        return data, [cite(e) for e in hits], entities, extra
    if name == "list_parks":
        region = args["region_id"]
        data = [
            {
                "id": e["id"],
                "name": e["name"],
                "regions": e["data"]["regions"],
                "trail_count": e["data"]["trail_count"],
            }
            for e in atlas.by_type["Park"]
            if region is None or region in e["data"]["regions"]
        ]
        sources = [
            {
                "id": "atlas:conaf-parks",
                "scope": "KnowledgeSource",
                "version": atlas.version,
                "url": "https://www.conaf.cl/tipo_parque/parque-nacional/",
            }
        ]
        return data, sources, entities, extra
    if name == "get_park_profile":
        e = atlas.get(park_id, "Park")
        return park_out(atlas, e).model_dump(exclude={"sources"}), [cite(e)], entities, extra
    if name == "get_park_trails":
        trails = park_trails(atlas, park_id, args["sector"])[:MAX_TRAILS]
        data = {
            "park_id": park_id,
            "total": len(park_trails(atlas, park_id, args["sector"])),
            "trails": [t.model_dump(exclude={"sources", "limitations"}) for t in trails],
            "note": "opening_status not_verified no significa abierto; sin geometría autorizada.",
        }
        sources = [cite(atlas.get(t.id)) for t in trails] or [cite(atlas.get(park_id))]
        entities += [{"type": "trail", "id": t.id} for t in trails]
        extra["map"] = {"park_id": park_id, "geometry_available": False}
        return data, sources, entities, extra
    if name == "get_trail_profile":
        e = atlas.get(args["trail_id"], "Trail")
        if e is None:
            raise ValueError("Sendero fuera del índice")
        entities = [{"type": "trail", "id": e["id"]}, {"type": "park", "id": e["data"]["park_id"]}]
        return trail_out(e).model_dump(exclude={"sources"}), [cite(e)], entities, extra
    if name == "get_park_map":
        m = park_map(atlas, park_id)
        data = {**m.model_dump(exclude={"trails"}), "trail_count": len(m.trails)}
        extra["map"] = {
            "park_id": park_id,
            "geometry_available": False,
            "bbox": m.bbox,
            "map_resource_url": next((r.url for r in m.map_resources if r.url), None),
        }
        return data, [cite(atlas.get(r.id)) for r in m.map_resources], entities, extra
    if name == "get_park_biodiversity":
        rows = {}
        for e in atlas.park_items(park_id, "ParkTaxonEvidence"):
            taxon = TAXA[e["data"]["taxon_id"]]
            if args["group"] in (None, taxon.group):
                rows.setdefault(taxon.id, (taxon, e))
        data = {
            "park_id": park_id,
            "note": "Solo taxones del catálogo Bosque Vivo; no es un inventario completo.",
            "taxa": [
                {
                    "taxon_id": t.id,
                    "common_name": t.common_names[0],
                    "scientific_name": t.scientific_name,
                    "group": t.group,
                    "evidence_type": e["data"]["evidence_type"],
                    "scale": "park",
                    "demo_status": eligibility(t).status,
                    "sensitivity": t.sensitivity,
                }
                for t, e in rows.values()
            ],
        }
        sources = [cite(e) for _, e in rows.values()][:8] or [cite(atlas.get(park_id))]
        entities += [{"type": "taxon", "id": key} for key in rows]
        return data, sources, entities, extra
    # get_source_details
    e = atlas.get(args["source_id"].removeprefix("atlas:"))
    if e is None:
        raise ValueError("Fuente fuera del atlas")
    data = {**source_ref(e), "license": e["license"], "limitations": e["limitations"]}
    return data, [cite(e)], entities, extra


SUMMARY = {
    "Trail": (
        "source_status",
        "sector",
        "distance_m",
        "duration_minutes",
        "difficulty",
        "opening_status",
        "published_closure",
        "source_status",
    ),
    "Park": ("regions", "area_ha", "sectors", "trail_count"),
    "ParkSector": ("trail_ids",),
    "Taxon": ("scientific_name", "common_names", "group", "demo_status", "sensitivity"),
    "ConservationAssessment": ("taxon_id", "category_text"),
    "DocumentPassage": ("document", "text"),
}
ATLAS_TOOLS = {
    "search_knowledge",
    "list_parks",
    "get_park_profile",
    "get_park_trails",
    "get_trail_profile",
    "get_park_map",
    "get_park_biodiversity",
    "get_source_details",
}


def execute_tool(
    name: str,
    arguments: dict,
    *,
    owner: str,
    store,
    landscape_context,
    capture_id: UUID | None = None,
) -> dict:
    if name not in TOOL_ARGUMENTS:
        raise GuideToolError("Herramienta no autorizada")
    args = TOOL_ARGUMENTS[name].model_validate(arguments).model_dump()
    if args.get("park_id") and get_atlas().get(args["park_id"], "Park") is None:
        raise ValueError("Parque fuera del índice")
    if any(args.get(k) not in TAXA for k in ("taxon_id", "taxon_a", "taxon_b") if k in args):
        raise ValueError("Taxón fuera del catálogo")
    entities: list[dict] = []
    extra: dict = {}
    if store is None and name in {"get_user_capture_progress", "get_forest_context"}:
        return {"status": "unavailable", "reason": "Persistencia no configurada", "sources": []}
    if name in ATLAS_TOOLS:
        data, sources, entities, extra = atlas_tool(name, args)
    elif name == "get_taxon_profile":
        data, sources = taxon_view(args["taxon_id"])
        entities = [{"type": "taxon", "id": args["taxon_id"]}]
    elif name == "compare_taxa":
        a, sa = taxon_view(args["taxon_a"])
        b, sb = taxon_view(args["taxon_b"])
        keep = ("id", "scientific_name", "common_names", "group", "profile", "demo")
        data = [{k: a[k] for k in keep}, {k: b[k] for k in keep}]
        sources = sa + sb
        entities = [
            {"type": "taxon", "id": args["taxon_a"]},
            {"type": "taxon", "id": args["taxon_b"]},
        ]
    elif name == "get_taxon_conservation":
        r = regional_conservation(args["taxon_id"], args["region_id"])
        data = r.model_dump()
        sources = [
            {
                "id": "rce:" + r.source.sha256[:12],
                "url": r.source.url,
                "version": r.source.version_text,
                "scope": "official_rce_regional",
            }
        ]
        entities = [{"type": "taxon", "id": args["taxon_id"]}]
    elif name == "get_user_capture_progress":
        collection = store.collection(owner, 1, 0)
        data = {
            "total_captures": collection.total_captures,
            "suggested_species_count": collection.suggested_species_count,
            "verification_status": "unverified",
        }
        sources = [{"id": "own:progress", "scope": "private_aggregate", "url": None}]
    else:  # get_forest_context
        if capture_id is None:
            return {"status": "unavailable", "reason": "No se seleccionó captura", "sources": []}
        capture = store.get(owner, capture_id)
        if capture.location is None:
            return {"status": "unavailable", "reason": "Captura sin ubicación", "sources": []}
        context = landscape_context(
            ContextPointRequest(location=capture.location, accuracy_m=capture.accuracy_m)
        )
        data = {
            "status": context.status,
            "predominant_species": [
                s.model_dump() for m in context.forest_context for s in m.predominant_species
            ],
            "quality_flags": context.quality_flags,
            "limitations": context.limitations,
            "interpretation": "Composición del polígono; nunca especie del individuo",
            "canopy_height": None,
            "canopy_limitation": "Sin análisis raster; CHMv2 no mide crecimiento",
        }
        sources = [
            {
                "id": f"layer:{s.id}",
                "url": s.source_url,
                "version": s.version,
                "accessed_at": s.accessed_at,
                "content_sha256": s.content_sha256,
                "license": s.license,
                "limitations": s.limitations,
            }
            for s in context.source_refs
        ]
    return {
        "status": "available",
        "data": data,
        "sources": sources,
        "entities": entities,
        "knowledge_version": get_atlas().version,
        **extra,
    }
