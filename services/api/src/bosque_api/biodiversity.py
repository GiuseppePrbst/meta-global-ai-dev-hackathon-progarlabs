"""Multikingdom knowledge catalog, park evidence and regional RCE assessments.

Two logical catalogs share one store: the knowledge catalog (every taxon with a
sourced profile) and the recognition catalog (taxa whose identification status
is backed by an evaluation). The eight trees are not copied: their name,
taxonomy and traits come from species.json through `species_ref`.
"""

import json
import re
from functools import lru_cache
from importlib.resources import files
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, TypeAdapter, model_validator

from bosque_api.catalog import get_species

Kingdom = Literal["Plantae", "Animalia", "Fungi"]
Group = Literal["tree", "bird", "mammal", "fungus"]
EvidenceType = Literal[
    "official_park_presence",
    "scientific_georeferenced",
    "citizen_validated",
    "personal_pending_review",
    "potential_habitat",
    "documented_ecological_association",
    "ai_identification_hypothesis",
]
CapabilityStatus = Literal[
    "educational_catalog",
    "recognition_not_evaluated",
    "recognition_experimental",
    "recognition_candidate",
    "recognition_enabled",
    "recognition_restricted",
]
PuyehueStatus = Literal["documented_in_park", "regional_candidate", "not_assessed"]
# Old north-to-south order of the RCE book; ranges like "XV-XIV" follow it.
REGIONS = {
    "XV": "arica-parinacota",
    "I": "tarapaca",
    "II": "antofagasta",
    "III": "atacama",
    "IV": "coquimbo",
    "V": "valparaiso",
    "RM": "metropolitana",
    "VI": "ohiggins",
    "VII": "maule",
    "XVI": "nuble",
    "VIII": "biobio",
    "IX": "araucania",
    "XIV": "los-rios",
    "X": "los-lagos",
    "XI": "aysen",
    "XII": "magallanes",
}
Region = Literal[tuple(REGIONS.values())]  # type: ignore[valid-type]
PUYEHUE_REGIONS = ("los-rios", "los-lagos")  # the park spans both


class SourceRef(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: str = Field(min_length=3)
    url: str = Field(pattern=r"^https://")
    accessed_at: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    kind: Literal["official", "scientific", "secondary", "platform"]
    license: str | None = None
    notes: str | None = None


class Classification(BaseModel):
    model_config = ConfigDict(extra="forbid")
    kingdom: Kingdom
    phylum: str | None = None
    class_name: str | None = None
    order: str | None = None
    family: str | None = None
    genus: str | None = None


class TaxonTaxonomy(BaseModel):
    model_config = ConfigDict(extra="forbid")
    checklist: str
    col_xr_key: str | None = None
    gbif_backbone_id: int | None = None
    accepted_name: str
    authorship: str | None = None
    synonyms_reviewed: list[str] = Field(default_factory=list)
    status: Literal["source_checked", "name_discrepancy", "unresolved"]
    notes: str | None = None
    accessed_at: str


class TaxonProfile(BaseModel):
    """Unknown fields stay null; nothing is filled in by a model."""

    model_config = ConfigDict(extra="forbid")
    description: str | None = None
    habitat: str | None = None
    ecology: str | None = None
    distribution: str | None = None
    traits: list[str] = Field(default_factory=list, max_length=8)
    trait_validation_status: Literal["source_checked", "secondary_source", "pending"]
    sources: list[SourceRef] = Field(default_factory=list)
    limitations: list[str] = Field(default_factory=list)
    review_status: Literal["draft_sourced", "pending"]


class TaxonMedia(BaseModel):
    model_config = ConfigDict(extra="forbid")
    media_id: str
    media_url: str = Field(pattern=r"^https://")
    source_url: str = Field(pattern=r"^https://")
    author: str
    license: str
    attribution: str
    redistribution: Literal["yes", "with_attribution", "share_alike_with_attribution"]
    review_status: Literal["platform_label_only", "agent_visual_check"]


class ParkTaxonEvidence(BaseModel):
    model_config = ConfigDict(extra="forbid")
    park_id: Literal["puyehue"]
    evidence_type: EvidenceType
    scale: Literal["park", "sector"]
    source: SourceRef
    observed_date: str | None = None
    precision: Literal["park_scale_no_coordinates", "generalized"]
    review_status: Literal["source_checked", "pending_review"]
    restrictions: list[str] = Field(default_factory=list)


class IdentificationCapability(BaseModel):
    model_config = ConfigDict(extra="forbid")
    status: CapabilityStatus
    level: int = Field(ge=0, le=3)
    pipeline: str | None = None
    evaluation: str | None = None
    evaluated_at: str | None = None
    notes: str

    @model_validator(mode="after")
    def evidence_backed(self):
        expected = {
            "educational_catalog": 0,
            "recognition_not_evaluated": 0,
            "recognition_restricted": 0,
            "recognition_experimental": 1,
            "recognition_candidate": 2,
            "recognition_enabled": 3,
        }[self.status]
        if self.level != expected:
            raise ValueError("Nivel incoherente con el estado de capacidad")
        if self.level >= 1 and not (self.pipeline and self.evaluation):
            raise ValueError("Una capacidad evaluada requiere pipeline y evaluación")
        return self


class Taxon(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str = Field(pattern=r"^[a-z]+(?:-[a-z]+)+$")
    species_ref: str | None = None
    scientific_name: str
    common_names: list[str] = Field(min_length=1)
    group: Group
    classification: Classification
    taxonomy: TaxonTaxonomy
    profile: TaxonProfile
    media: list[TaxonMedia] = Field(default_factory=list, max_length=6)
    park_evidence: list[ParkTaxonEvidence] = Field(default_factory=list)
    puyehue_status: PuyehueStatus
    sensitivity: Literal["none", "location_sensitive"]
    identification: IdentificationCapability

    @model_validator(mode="after")
    def presence_needs_evidence(self):
        documented = any(
            e.evidence_type
            in {"official_park_presence", "scientific_georeferenced", "citizen_validated"}
            for e in self.park_evidence
        )
        if (self.puyehue_status == "documented_in_park") != documented:
            raise ValueError("Presencia en el parque sin evidencia o evidencia ignorada")
        return self


class ConservationScope(BaseModel):
    model_config = ConfigDict(extra="forbid")
    category: str
    regions: list[str]
    scope_text: str


class ConservationAssessment(BaseModel):
    model_config = ConfigDict(extra="forbid")
    taxon_id: str
    system: Literal["RCE"]
    jurisdiction: Literal["Chile"]
    rce_name: str
    category_text: str
    scopes: list[ConservationScope]
    criteria: str | None
    process: int | None
    decree: str | None
    source_of_category: str
    distribution_regions: list[str]


class ConservationSource(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: str
    url: str
    file_name: str
    sha256: str = Field(pattern=r"^[0-9a-f]{64}$")
    version_text: str
    accessed_at: str
    redistribution: str
    review_status: Literal["imported_unreviewed"]


class ConservationData(BaseModel):
    model_config = ConfigDict(extra="forbid")
    source: ConservationSource
    assessments: list[ConservationAssessment]
    not_found: dict[str, list[str]]  # taxon id -> names searched (incl. synonyms)


def parse_scopes(text: str) -> list[ConservationScope]:
    """'VU (XV-V-RM ); LC (VI-XII)' -> one scope per category with explicit regions.

    Consecutive tokens are chained as ranges in the book's north-to-south order,
    so 'XV-V-RM' covers XV..V and V..RM. A plain category applies nationwide.
    """
    order = list(REGIONS)
    scopes = []
    for part in [p.strip() for p in text.strip().split(";") if p.strip()]:
        match = re.fullmatch(r"([A-Z]{2})\s*(?:\(([^)]*)\))?", part)
        if not match:
            raise ValueError(f"Categoría RCE no reconocida: {part!r}")
        category, scope = match.group(1), (match.group(2) or "").strip()
        if not scope:
            scopes.append(
                ConservationScope(
                    category=category, regions=list(REGIONS.values()), scope_text="nacional"
                )
            )
            continue
        tokens = [t.strip() for t in scope.split("-") if t.strip()]
        unknown = [t for t in tokens if t not in REGIONS]
        if unknown:
            raise ValueError(f"Región RCE no reconocida: {unknown}")
        covered = {tokens[0]}
        for start, end in zip(tokens, tokens[1:], strict=False):
            a, b = sorted((order.index(start), order.index(end)))
            covered |= set(order[a : b + 1])
        scopes.append(
            ConservationScope(
                category=category,
                regions=[REGIONS[r] for r in order if r in covered],
                scope_text=scope,
            )
        )
    regions = [r for s in scopes for r in s.regions]
    if len(regions) != len(set(regions)):
        raise ValueError("Ámbitos RCE superpuestos")
    return scopes


@lru_cache
def get_conservation() -> ConservationData:
    content = (
        files("bosque_api").joinpath("resources/conservation.json").read_text(encoding="utf-8")
    )
    return ConservationData.model_validate_json(content)


def _from_species(raw: dict) -> dict:
    """Tree entries keep only what species.json lacks; the rest is derived."""
    species = {s.id: s for s in get_species()}[raw["species_ref"]]
    taxonomy = species.taxonomy
    profile = raw["profile"]
    return {
        **raw,
        "scientific_name": species.accepted_name or species.scientific_name,
        "common_names": [species.common_name],
        "classification": {
            **raw["classification"],
            "kingdom": "Plantae",
            "family": species.family,
            "genus": species.genus,
        },
        "taxonomy": {
            **raw["taxonomy"],
            "accepted_name": species.accepted_name or species.scientific_name,
            "gbif_backbone_id": taxonomy.gbif_id if taxonomy else None,
            "synonyms_reviewed": species.synonyms,
        },
        "profile": {
            **profile,
            "traits": species.morphology,
            "trait_validation_status": species.trait_validation_status,
        },
    }


@lru_cache
def get_taxa() -> tuple[Taxon, ...]:
    content = files("bosque_api").joinpath("resources/taxa.json").read_text(encoding="utf-8")
    raw = json.loads(content)
    taxa = TypeAdapter(list[Taxon]).validate_python(
        [_from_species(r) if r.get("species_ref") else r for r in raw]
    )
    ids = [t.id for t in taxa]
    names = [t.scientific_name for t in taxa]
    if len(set(ids)) != len(ids) or len(set(names)) != len(names):
        raise ValueError("Catálogo multirreino con IDs o taxones duplicados")
    trees = {s.id for s in get_species()}
    refs = {t.species_ref for t in taxa if t.species_ref}
    if refs != trees or any(t.species_ref and t.id != t.species_ref for t in taxa):
        raise ValueError("Los ocho árboles deben aparecer una vez con su ID estable")
    known = {a.taxon_id for a in get_conservation().assessments} | set(get_conservation().not_found)
    if known != set(ids):
        raise ValueError("Cada taxón necesita una evaluación RCE o un no-encontrado explícito")
    return tuple(taxa)


class RegionalConservation(BaseModel):
    """Category applicable to a region; without region it stays indeterminate."""

    taxon_id: str
    system: Literal["RCE"] = "RCE"
    record_status: Literal["found", "no_rce_record_found"]
    region: str | None
    regional_status: Literal["determined", "indeterminate", "region_not_covered", "not_applicable"]
    applicable_category: str | None
    applicable_scope: str | None
    scopes: list[ConservationScope]
    park_regions: dict[str, str | None]
    criteria: str | None = None
    process: int | None = None
    decree: str | None = None
    source: ConservationSource
    notes: list[str]


def regional_conservation(taxon_id: str, region: str | None) -> RegionalConservation:
    data = get_conservation()
    found = next((a for a in data.assessments if a.taxon_id == taxon_id), None)
    if found is None:
        return RegionalConservation(
            taxon_id=taxon_id,
            record_status="no_rce_record_found",
            region=region,
            regional_status="not_applicable",
            applicable_category=None,
            applicable_scope=None,
            scopes=[],
            park_regions={r: None for r in PUYEHUE_REGIONS},
            source=data.source,
            notes=[
                "Sin coincidencia en la nómina RCE (nombre aceptado y sinónimos buscados). "
                "La ausencia no equivale a Preocupación Menor (LC) ni a ninguna categoría."
            ],
        )

    def category(slug):
        return next((s for s in found.scopes if slug in s.regions), None)

    scope = category(region) if region else None
    notes = []
    if region is None:
        status = "indeterminate"
        if len({s.category for s in found.scopes}) > 1:
            notes.append(
                "La categoría depende de la región del registro; sin región informada no se "
                "elige una. Puyehue abarca Los Ríos y Los Lagos."
            )
    else:
        status = "determined" if scope else "region_not_covered"
    if region and region not in found.distribution_regions:
        notes.append("La nómina no marca presencia del taxón en esa región.")
    notes.append("Categoría oficial RCE (Chile); no es una categoría UICN global.")
    return RegionalConservation(
        taxon_id=taxon_id,
        record_status="found",
        region=region,
        regional_status=status,
        applicable_category=scope.category if scope else None,
        applicable_scope=scope.scope_text if scope else None,
        scopes=found.scopes,
        park_regions={r: (category(r).category if category(r) else None) for r in PUYEHUE_REGIONS},
        criteria=found.criteria,
        process=found.process,
        decree=found.decree,
        source=data.source,
        notes=notes,
    )


class TaxonSummary(BaseModel):
    id: str
    scientific_name: str
    common_names: list[str]
    kingdom: Kingdom
    group: Group
    puyehue_status: PuyehueStatus
    evidence_types: list[EvidenceType]
    identification_status: CapabilityStatus
    sensitivity: Literal["none", "location_sensitive"]
    rce_park_regions: dict[str, str | None]


class TaxonPage(BaseModel):
    items: list[TaxonSummary]
    total: int
    limit: int
    offset: int


class ParkBiodiversity(BaseModel):
    park_id: Literal["puyehue"] = "puyehue"
    name: str = "Parque Nacional Puyehue"
    regions: list[str] = list(PUYEHUE_REGIONS)
    boundary: str = (
        "Sin geometría oficial integrada; la referencia BCN 2826 se usa solo para el "
        "estado espacial de capturas. No hay senderos ni sectores verificados."
    )
    counts: dict[str, dict[str, int]]
    taxa: list[TaxonSummary]
    notes: list[str]


def summary(taxon: Taxon) -> TaxonSummary:
    return TaxonSummary(
        id=taxon.id,
        scientific_name=taxon.scientific_name,
        common_names=taxon.common_names,
        kingdom=taxon.classification.kingdom,
        group=taxon.group,
        puyehue_status=taxon.puyehue_status,
        evidence_types=sorted({e.evidence_type for e in taxon.park_evidence}),
        identification_status=taxon.identification.status,
        sensitivity=taxon.sensitivity,
        rce_park_regions=regional_conservation(taxon.id, None).park_regions,
    )


def register_biodiversity_routes(app):
    from typing import Annotated

    from fastapi import HTTPException, Query

    def find(taxon_id: str) -> Taxon:
        taxon = next((t for t in get_taxa() if t.id == taxon_id), None)
        if taxon is None:
            raise HTTPException(404, "Taxón no encontrado")
        return taxon

    @app.get("/taxa", response_model=TaxonPage)
    def taxa(
        kingdom: Kingdom | None = None,
        group: Group | None = None,
        puyehue_status: PuyehueStatus | None = None,
        evidence_type: EvidenceType | None = None,
        identification_status: CapabilityStatus | None = None,
        rce_category: Annotated[str | None, Query(pattern=r"^[A-Z]{2}$")] = None,
        limit: Annotated[int, Query(ge=1, le=100)] = 50,
        offset: Annotated[int, Query(ge=0, le=10000)] = 0,
    ):
        """Knowledge catalog. `puyehue_status` is park evidence, never regional range;
        `rce_category` matches the category of either park region (Los Ríos/Los Lagos)."""
        items = [summary(t) for t in get_taxa()]
        items = [
            s
            for s in items
            if (kingdom is None or s.kingdom == kingdom)
            and (group is None or s.group == group)
            and (puyehue_status is None or s.puyehue_status == puyehue_status)
            and (evidence_type is None or evidence_type in s.evidence_types)
            and (identification_status is None or s.identification_status == identification_status)
            and (rce_category is None or rce_category in s.rce_park_regions.values())
        ]
        return TaxonPage(
            items=items[offset : offset + limit], total=len(items), limit=limit, offset=offset
        )

    @app.get("/taxa/{taxon_id}", response_model=Taxon)
    def taxon_detail(taxon_id: str):
        return find(taxon_id)

    @app.get("/taxa/{taxon_id}/conservation", response_model=RegionalConservation)
    def taxon_conservation(taxon_id: str, region: Region | None = None):
        """RCE category for a declared region. Coordinates are not resolved here."""
        return regional_conservation(find(taxon_id).id, region)

    @app.get("/parks/{park_id}/biodiversity", response_model=ParkBiodiversity)
    def park_biodiversity(park_id: str, kingdom: Kingdom | None = None):
        if park_id != "puyehue":
            raise HTTPException(404, "Parque no disponible en el piloto")
        items = [summary(t) for t in get_taxa() if kingdom in (None, t.classification.kingdom)]
        counts: dict[str, dict[str, int]] = {}
        for item in items:
            row = counts.setdefault(item.kingdom, {})
            row[item.puyehue_status] = row.get(item.puyehue_status, 0) + 1
        return ParkBiodiversity(
            counts=counts,
            taxa=items,
            notes=[
                "documented_in_park = mención oficial a escala de parque; no implica Anticura.",
                "regional_candidate = distribución regional sin ocurrencia verificada aquí.",
                "Ninguna respuesta incluye coordenadas de individuos.",
            ],
        )
