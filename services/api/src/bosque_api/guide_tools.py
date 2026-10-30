from typing import Literal
from uuid import UUID

from bosque_ai.guide import GuideToolError
from bosque_geo.context import ContextPointRequest
from pydantic import BaseModel, ConfigDict, Field

from bosque_api.catalog import get_species
from bosque_api.expeditions import Expedition

CATALOG = {item.id: item for item in get_species()}


class Arguments(BaseModel):
    model_config = ConfigDict(extra="forbid")


class SpeciesArgument(Arguments):
    species_id: str = Field(json_schema_extra={"enum": list(CATALOG)})


class CompareArguments(Arguments):
    species_a: str = Field(json_schema_extra={"enum": list(CATALOG)})
    species_b: str = Field(json_schema_extra={"enum": list(CATALOG)})


class ParkArgument(Arguments):
    park_id: Literal["puyehue"]


class ForestArgument(Arguments):
    area_id: Literal["current_capture"]


class TrailArgument(Arguments):
    trail_id: str = Field(min_length=1, max_length=80)


class PublicArguments(SpeciesArgument):
    region_id: str = Field(min_length=1, max_length=80)


TOOL_ARGUMENTS = {
    "get_species_profile": SpeciesArgument,
    "compare_species": CompareArguments,
    "get_species_identification_traits": SpeciesArgument,
    "get_park_context": ParkArgument,
    "get_forest_context": ForestArgument,
    "get_verified_trail_information": TrailArgument,
    "get_user_capture_progress": Arguments,
    "get_public_species_observations": PublicArguments,
}
TOOLS = [
    {
        "type": "function",
        "function": {
            "name": name,
            "description": {
                "get_species_profile": "Catálogo taxonómico; no presencia ni rasgos no validados",
                "compare_species": "Compara dos perfiles del catálogo; expresa campos pendientes",
                "get_species_identification_traits": "Rasgos verificados o evidencia ausente",
                "get_park_context": "Expedición de referencia; no garantiza acceso ni rutas",
                "get_forest_context": "Contexto de captura; coordenadas solo en backend",
                "get_verified_trail_information": "Estado de rutas, actualmente no verificadas",
                "get_user_capture_progress": "Conteos propios; identidad fijada por el servidor",
                "get_public_species_observations": "Estado de observaciones públicas revisadas",
            }[name],
            "parameters": model.model_json_schema(),
        },
    }
    for name, model in TOOL_ARGUMENTS.items()
]


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
    sources = []

    def profile(key):
        if key not in CATALOG:
            raise ValueError("Especie fuera del catálogo")
        item = CATALOG[key]
        sources.append(
            {
                "id": f"species:{key}",
                "url": item.taxonomy.source_url,
                "version": item.taxonomy.source_version,
                "scope": "taxonomy_only",
            }
        )
        sources.extend(
            {
                "id": f"traits:{key}:{index}",
                "url": url,
                "version": f"web accessed {item.trait_source_accessed_at}",
                "scope": "reference_traits_not_field_verification",
            }
            for index, url in enumerate(item.trait_sources)
        )
        return {
            "id": key,
            "scientific_name": item.scientific_name,
            "common_name": item.common_name,
            "family": item.family,
            "morphology": item.morphology if item.trait_validation_status != "pending" else [],
            "trait_validation_status": item.trait_validation_status,
            "conservation_status": item.conservation_status,
            "limitations": [
                "GBIF valida taxonomía; rasgos con referencias separadas. "
                "Revisión humana pendiente; no acredita presencia local"
            ],
        }

    if name in {"get_species_profile", "get_species_identification_traits"}:
        data = profile(args["species_id"])
    elif name == "compare_species":
        data = [profile(args["species_a"]), profile(args["species_b"])]
    elif name == "get_park_context":
        data = Expedition(species_of_interest=list(CATALOG)).model_dump()
        sources = [
            {
                "id": "park:puyehue",
                "url": data["sources"][0],
                "scope": "reference_only",
                "version": "BCN snapshot 2026-10-27",
            }
        ]
    elif name == "get_user_capture_progress":
        collection = store.collection(owner, 1, 0)
        data = {
            "total_captures": collection.total_captures,
            "suggested_species_count": collection.suggested_species_count,
            "verification_status": "unverified",
        }
        sources = [{"id": "own:progress", "scope": "private_aggregate", "url": None}]
    elif name == "get_forest_context":
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
    else:
        if name == "get_public_species_observations":
            if args["species_id"] not in CATALOG:
                raise ValueError("Especie fuera del catálogo")
        return {
            "status": "unavailable",
            "sources": [],
            "reason": "No existe fuente pública revisada para esta herramienta",
        }
    return {"status": "available", "data": data, "sources": sources}
