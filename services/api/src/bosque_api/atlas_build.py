"""Build the versioned Knowledge Atlas snapshot from repository sources (offline).

    uv run --project services/api python -m bosque_api.atlas_build

Reads data/public/conaf, the multikingdom catalog and approved docs; writes
resources/knowledge-atlas.json. No network, no private paths, no RESTRICTED data.
The snapshot version is the SHA-256 of its entities, so a rebuild over the same
inputs yields the same version.
"""

import hashlib
import json
import re
import unicodedata
from pathlib import Path

from bosque_api.biodiversity import REGIONS, get_conservation, get_taxa
from bosque_api.demo import eligibility

ROOT = Path(__file__).resolve().parents[4]
CONAF = ROOT / "data/public/conaf"
OUTPUT = Path(__file__).with_name("resources") / "knowledge-atlas.json"
SCHEMA = "1.0.0"
DOCS = (
    "PILOT_PUYEHUE.md",
    "ECOSYSTEM_DATA_MODEL.md",
    "RCE_CONSERVATION_2026.md",
    "BIODIVERSITY_CATALOG_SELECTION.md",
    "SAM31_EXTENDED_RESEARCH_REPORT.md",
    "DATA_GOVERNANCE.md",
    "DATASET_LICENSES.md",
    "SOURCES.md",
)
REGION_NAMES = {
    "Arica y Parinacota": "arica-parinacota",
    "Tarapacá": "tarapaca",
    "Antofagasta": "antofagasta",
    "Atacama": "atacama",
    "Coquimbo": "coquimbo",
    "Valparaíso": "valparaiso",
    "Metropolitana de Santiago": "metropolitana",
    "Libertador General Bernardo O’Higgins": "ohiggins",
    "Maule": "maule",
    "Ñuble": "nuble",
    "Biobío": "biobio",
    "La Araucanía": "araucania",
    "Los Ríos": "los-rios",
    "Los Lagos": "los-lagos",
    "Aysén": "aysen",
    "Magallanes y de la Antártica Chilena": "magallanes",
}
PRIVATE = re.compile(r"[A-Za-z]:[\\/][^\s)`]+|[\w.+-]+@[\w.-]+|/(?:home|Users)/\S+")
CONAF_LICENSE = "CONAF, sitio público: hechos breves con atribución; texto completo en la ficha"


def fold(text: str) -> str:
    return unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode().lower()


def digest(value) -> str:
    raw = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return "sha256:" + hashlib.sha256(raw.encode("utf-8")).hexdigest()


def entity(
    kind,
    id_,
    name,
    source,
    *,
    accessed_at,
    data,
    confidence,
    review_status,
    license_=CONAF_LICENSE,
    version=None,
    updated_at=None,
    coverage=None,
    limitations=(),
    terms=(),
):
    body = {
        "id": id_,
        "type": kind,
        "name": name,
        "source": source,
        "accessed_at": accessed_at,
        "updated_at": updated_at,
        "version": version,
        "license": license_,
        "review_status": review_status,
        "confidence": confidence,
        "coverage": coverage or {},
        "limitations": list(limitations),
        "search_terms": sorted({t for t in terms if t}),
        "data": data,
    }
    body["content_sha256"] = digest({k: v for k, v in body.items() if k != "search_terms"})
    return body


def load(name):
    return json.loads((CONAF / name).read_text(encoding="utf-8"))


def parks_and_trails(taxa_by_name):
    index = {p["id"]: p for p in load("parks.json")["parks"]}
    profiles = {p["park_id"]: p for p in load("park_profiles_synced.json")["parks"]}
    synced = load("trails_synced.json")["trails"]
    curated = load("trails.json")["trails"]
    bboxes = load("park_bbox_bcn.json")
    secondary = load("secondary_sources.json")
    conflicts = {}
    for c in secondary["conflicts"]:
        conflicts.setdefault(c["park_id"], []).append(c)
    out, evidence = [], []
    trails_by_park = {}
    for t in synced + curated:
        trails_by_park.setdefault(t["park_id"], []).append(t)
    for park_id, park in index.items():
        prof = profiles[park_id]
        url = park["official_profile_url"]
        src = {
            "title": f"CONAF, ficha Parque Nacional {park['name']}",
            "url": url,
            "kind": "official",
        }
        accessed = prof["fetched_at"][:10]
        regions = [REGION_NAMES[r] for r in park["regions"]]
        bbox = bboxes["parks"].get(park_id, {}).get("bbox")
        own_trails = trails_by_park.get(park_id, [])
        sectors = list(
            dict.fromkeys(
                [*prof.get("sectors", []), *(t["sector"] for t in own_trails if t.get("sector"))]
            )
        )
        linked = sorted(
            {
                taxa_by_name[n]
                for n in prof.get("scientific_names_mentioned", [])
                if n in taxa_by_name
            }
        )
        out.append(
            entity(
                "Park",
                park_id,
                f"Parque Nacional {park['name']}",
                src,
                accessed_at=accessed,
                version=prof.get("source_sha256_html"),
                confidence="official",
                review_status="extracted_from_official_profile",
                coverage={
                    "regions": regions,
                    "provinces": prof.get("provinces_text"),
                    "communes": prof.get("communes_text"),
                },
                limitations=[
                    "Datos de la ficha a la fecha de consulta; horarios y accesos pueden cambiar.",
                    "Sin estado de apertura en vivo.",
                    *(
                        ["Región del índice curado; la ficha cita provincias de dos regiones."]
                        if park_id == "puyehue"
                        else []
                    ),
                ],
                terms=[park["name"], f"parque nacional {park['name']}", *sectors],
                data={
                    "short_name": park["name"],
                    "regions": regions,
                    "area_ha": prof.get("area_ha"),
                    "area_source_text": prof.get("area_ha_text"),
                    "provinces": prof.get("provinces_text"),
                    "communes": prof.get("communes_text"),
                    "sectors": sectors,
                    "visit_notice": prof.get("visit_notice"),
                    "access_text": prof.get("access_text"),
                    "trail_count": len(own_trails),
                    "trail_section_status": prof.get("trails_section_status"),
                    "official_url": url,
                    "bbox": bbox,
                    "linked_taxa": linked,
                    "scientific_names_mentioned": prof.get("scientific_names_mentioned", []),
                    "conflicts": conflicts.get(park_id, []),
                },
            )
        )
        for sector in sectors:
            out.append(
                entity(
                    "ParkSector",
                    f"{park_id}--{fold(sector).replace(' ', '-')}",
                    sector,
                    src,
                    accessed_at=accessed,
                    confidence="official",
                    review_status="extracted_from_official_profile",
                    limitations=["Sector nombrado en la ficha; sin límite geográfico publicado."],
                    terms=[sector, f"sector {sector}"],
                    data={
                        "park_id": park_id,
                        "trail_ids": [t["id"] for t in own_trails if t.get("sector") == sector],
                    },
                )
            )
        out.append(
            entity(
                "MapResource",
                f"{park_id}--official-profile",
                f"Ficha oficial de {park['name']}",
                src,
                accessed_at=accessed,
                confidence="official",
                review_status="link_checked",
                limitations=["Página web, no datos vectoriales."],
                data={
                    "park_id": park_id,
                    "kind": "official_profile_page",
                    "url": url,
                    "redistribution": "link_only",
                    "geometry": None,
                },
            )
        )
        if bbox:
            out.append(
                entity(
                    "MapResource",
                    f"{park_id}--bbox-bcn",
                    f"Encuadre referencial de {park['name']}",
                    {"title": bboxes["source"], "url": bboxes["source_url"], "kind": "official"},
                    accessed_at=bboxes["computed_at"],
                    version=bboxes["source_sha256"],
                    license_=bboxes["license"],
                    confidence="government_reference",
                    review_status="computed_from_valid_geometry",
                    limitations=bboxes["limitations"],
                    data={
                        "park_id": park_id,
                        "kind": "bbox_reference",
                        "bbox": bbox,
                        "crs": bboxes["crs"],
                        "redistribution": "bbox_only",
                        "geometry": None,
                    },
                )
            )
        for taxon_id in linked:
            evidence.append(
                entity(
                    "ParkTaxonEvidence",
                    f"{park_id}--{taxon_id}--conaf",
                    f"{taxon_id} en {park['name']}",
                    src,
                    accessed_at=accessed,
                    confidence="official",
                    review_status="name_match_in_official_profile",
                    limitations=[
                        "Mención en la ficha a escala de parque; sin coordenadas ni sendero."
                    ],
                    data={
                        "park_id": park_id,
                        "taxon_id": taxon_id,
                        "evidence_type": "official_park_presence",
                        "scale": "park",
                        "precision": "park_scale_no_coordinates",
                    },
                )
            )
    for t in synced + curated:
        secondary_status = "official_reviewed" if t in synced else "official_named_only"
        out.append(trail_entity(t, secondary_status))
    for c in secondary["trail_candidates"]:
        out.append(
            entity(
                "Trail",
                c["id"],
                c["name"],
                {
                    "title": "parquenacionalpuyehue.cl (guía turística independiente)",
                    "url": c["source_url"],
                    "kind": "secondary",
                },
                accessed_at=c["accessed_at"],
                license_="Sin términos publicados; solo hechos breves y enlace",
                confidence="secondary",
                review_status="candidate_not_official",
                limitations=[
                    "Fuente turística independiente; no es un sendero oficial habilitado."
                ],
                terms=[c["name"]],
                data={
                    "park_id": c["park_id"],
                    "sector": c["sector_text"],
                    "kind": c["kind"],
                    "distance_m": c["distance_m"],
                    "distance_basis": c["distance_basis"],
                    "duration_minutes": None,
                    "difficulty": c["difficulty_text"],
                    "opening_status": "not_verified",
                    "source_status": "secondary_reference",
                    "geometry_available": False,
                    "geometry": None,
                    "conditions": [c["notes"]],
                },
            )
        )
    return out, evidence


def trail_entity(t, source_status):
    data = {
        k: t.get(k)
        for k in (
            "park_id",
            "sector",
            "region_label",
            "kind",
            "distance_m",
            "distance_basis",
            "duration_minutes",
            "duration_min_minutes",
            "duration_max_minutes",
            "duration_basis",
            "duration_source_text",
            "difficulty",
            "winter_difficulty",
            "risks",
            "conditions",
            "published_closure",
            "opening_status",
            "access_notes",
        )
    }
    data.update(
        source_status=source_status,
        geometry_available=False,
        geometry=None,
        conditions=data["conditions"] or [],
    )
    return entity(
        "Trail",
        t["id"],
        t["name"],
        {"title": "CONAF, ficha del parque", "url": t["source_url"], "kind": "official"},
        accessed_at=t.get("reviewed_at") or "2026-11-03",
        confidence="official",
        review_status=t.get("review_status", "agent_reviewed_against_source"),
        limitations=[
            "Sin geometría autorizada: no hay trazado ni navegación.",
            "opening_status not_verified no significa abierto; consultar aviso CONAF vigente.",
        ],
        terms=[t["name"], re.sub(r"^Senderos?\s+", "", t["name"]), t.get("sector") or ""],
        data=data,
    )


def taxa_entities():
    out = []
    english = json.loads(
        (Path(__file__).with_name("resources") / "vernacular-en.json").read_text(encoding="utf-8")
    )["taxa"]
    conservation = {a.taxon_id: a for a in get_conservation().assessments}
    rce = get_conservation().source
    for taxon in get_taxa():
        demo = eligibility(taxon)
        src = taxon.profile.sources[0] if taxon.profile.sources else None
        out.append(
            entity(
                "Taxon",
                taxon.id,
                taxon.common_names[0],
                {"title": src.title, "url": src.url, "kind": src.kind} if src else None,
                accessed_at=taxon.taxonomy.accessed_at,
                version=taxon.taxonomy.checklist,
                license_="Perfil curado en el repositorio; cada fuente conserva sus derechos",
                confidence="repository_curated",
                review_status=taxon.profile.review_status,
                limitations=taxon.profile.limitations,
                terms=[
                    *taxon.common_names,
                    *english.get(taxon.id, {}).get("names", []),
                    taxon.scientific_name,
                    *taxon.taxonomy.synonyms_reviewed,
                    taxon.classification.family or "",
                    taxon.classification.genus or "",
                ],
                data={
                    "scientific_name": taxon.scientific_name,
                    "common_names": taxon.common_names,
                    "group": taxon.group,
                    "kingdom": taxon.classification.kingdom,
                    "family": taxon.classification.family,
                    "demo_status": demo.status,
                    "sensitivity": taxon.sensitivity,
                    "identification_status": taxon.identification.status,
                    "puyehue_status": taxon.puyehue_status,
                    # GBIF vernacular names: search/ASR vocabulary only, not validated facts.
                    "english_names": english.get(taxon.id, {}).get("names", []),
                },
            )
        )
        if taxon.id in conservation:
            a = conservation[taxon.id]
            out.append(
                entity(
                    "ConservationAssessment",
                    f"rce--{taxon.id}",
                    f"RCE {a.rce_name}",
                    {"title": rce.title, "url": rce.url, "kind": "official"},
                    accessed_at=rce.accessed_at,
                    version=rce.version_text,
                    license_=rce.redistribution,
                    confidence="official",
                    review_status=rce.review_status,
                    limitations=["Categoría por región; sin región no hay una categoría única."],
                    terms=[a.rce_name, taxon.common_names[0]],
                    data={
                        "taxon_id": taxon.id,
                        "category_text": a.category_text,
                        "scopes": [s.model_dump() for s in a.scopes],
                        "decree": a.decree,
                    },
                )
            )
        for i, e in enumerate(taxon.park_evidence):
            out.append(
                entity(
                    "ParkTaxonEvidence",
                    f"{e.park_id}--{taxon.id}--catalog-{i}",
                    f"{taxon.id} en {e.park_id}",
                    {"title": e.source.title, "url": e.source.url, "kind": e.source.kind},
                    accessed_at=e.source.accessed_at,
                    confidence=e.source.kind,
                    review_status=e.review_status,
                    limitations=e.restrictions,
                    data={
                        "park_id": e.park_id,
                        "taxon_id": taxon.id,
                        "evidence_type": e.evidence_type,
                        "scale": e.scale,
                        "precision": e.precision,
                    },
                )
            )
    return out


def passages():
    out = []
    for name in DOCS:
        text = (ROOT / "docs" / name).read_text(encoding="utf-8")
        title = text.splitlines()[0].lstrip("# ").strip()
        for i, block in enumerate(re.split(r"\n(?=## )", text)):
            heading = block.splitlines()[0].lstrip("# ").strip()
            body = PRIVATE.sub("[omitido]", " ".join(block.splitlines()[1:]).strip())[:700]
            if len(body) < 80:
                continue
            out.append(
                entity(
                    "DocumentPassage",
                    f"doc--{name.removesuffix('.md').lower()}--{i}",
                    f"{title}: {heading}",
                    {"title": title, "url": f"docs/{name}", "kind": "repository"},
                    accessed_at="2026-11-03",
                    license_="Documentación del repositorio",
                    confidence="repository_curated",
                    review_status="repository_document",
                    limitations=["Extracto de documentación técnica; ver el documento completo."],
                    terms=[heading],
                    data={"document": f"docs/{name}", "heading": heading, "text": body},
                )
            )
    return out


def sources():
    return [
        entity(
            "KnowledgeSource",
            "conaf-parks",
            "CONAF, archivo de parques nacionales",
            {
                "title": "CONAF",
                "url": "https://www.conaf.cl/tipo_parque/parque-nacional/",
                "kind": "official",
            },
            accessed_at="2026-11-03",
            confidence="official",
            review_status="extracted",
            data={"authority_rank": 1, "covers": ["Park", "Trail", "ParkSector"]},
        ),
        entity(
            "KnowledgeSource",
            "bcn-snaspe",
            "BCN SNASPE",
            {
                "title": "BCN Mapoteca",
                "url": "https://www.bcn.cl/siit/mapas_vectoriales/index_html",
                "kind": "official",
            },
            accessed_at="2026-11-03",
            license_="Libre uso con atribución BCN",
            confidence="government_reference",
            review_status="computed",
            data={"authority_rank": 2, "covers": ["MapResource"]},
        ),
        entity(
            "KnowledgeSource",
            "rce-mma",
            "Reglamento de Clasificación de Especies (MMA)",
            {
                "title": get_conservation().source.title,
                "url": get_conservation().source.url,
                "kind": "official",
            },
            accessed_at=get_conservation().source.accessed_at,
            license_=get_conservation().source.redistribution,
            confidence="official",
            review_status="imported_unreviewed",
            data={"authority_rank": 1, "covers": ["ConservationAssessment"]},
        ),
        entity(
            "KnowledgeSource",
            "secondary-tourism",
            "Guías turísticas independientes",
            {
                "title": "parquenacionalpuyehue.cl",
                "url": "https://parquenacionalpuyehue.cl/",
                "kind": "secondary",
            },
            accessed_at="2026-11-03",
            license_="Sin términos publicados",
            confidence="secondary",
            review_status="contrasted",
            data={"authority_rank": 5, "covers": ["Trail"]},
        ),
    ]


def build() -> dict:
    taxa_by_name = {}
    for t in get_taxa():
        for name in (t.scientific_name, *t.taxonomy.synonyms_reviewed):
            taxa_by_name[re.sub(r"\s+\(?[A-Z].*$", "", name).strip()] = t.id
    parks, evidence = parks_and_trails(taxa_by_name)
    entities = sorted(
        parks + evidence + taxa_entities() + passages() + sources(),
        key=lambda e: (e["type"], e["id"]),
    )
    counts = {}
    for e in entities:
        counts[e["type"]] = counts.get(e["type"], 0) + 1
    counts["TrailGeometry"] = 0  # no authorized trail geometry exists in any reviewed source
    version = digest(entities)
    snapshot = entity(
        "KnowledgeSnapshot",
        "knowledge-atlas",
        "Bosque Vivo Knowledge Atlas",
        {
            "title": "Repositorio Bosque Vivo",
            "url": "https://github.com/GiuseppePrbst/meta-global-ai-dev-hackathon-progarlabs",
            "kind": "repository",
        },
        accessed_at=max(e["accessed_at"] for e in entities),
        version=version,
        license_="Ver cada entidad",
        confidence="mixed",
        review_status="built_offline",
        limitations=[
            "Snapshot offline: no consulta páginas web al responder.",
            "No es un catálogo exhaustivo de senderos ni de biodiversidad de Chile.",
        ],
        data={"counts": counts, "schema_version": SCHEMA, "regions": sorted(REGIONS.values())},
    )
    return {
        "schema_version": SCHEMA,
        "knowledge_version": version,
        "snapshot": snapshot,
        "entities": entities,
    }


if __name__ == "__main__":
    atlas = build()
    OUTPUT.write_text(
        json.dumps(atlas, ensure_ascii=False, indent=1) + "\n", encoding="utf-8", newline="\n"
    )
    print(atlas["knowledge_version"], atlas["snapshot"]["data"]["counts"])
