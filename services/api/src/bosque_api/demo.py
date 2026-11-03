"""Demo eligibility layer over the scientific catalog; it never edits or drops records.

A reviewed decision lives in resources/demo-eligibility.json. The minimum
requirements are checked here on every load: a taxon declared `demo_ready`
that misses one falls back to `needs_review`, so an incomplete profile can
never be shown as finished.
"""

import json
from functools import lru_cache
from importlib.resources import files
from typing import Literal

from pydantic import BaseModel, ConfigDict

DemoStatus = Literal["demo_ready", "educational_only", "needs_review", "excluded_from_demo"]


class Decision(BaseModel):
    model_config = ConfigDict(extra="forbid")
    decision: DemoStatus
    reason: str
    reviewed_by: str
    reviewed_at: str


class DemoEligibility(BaseModel):
    taxon_id: str
    status: DemoStatus
    declared: DemoStatus
    collectible: bool
    recognition: str
    missing: list[str]
    reason: str
    reviewed_by: str
    reviewed_at: str
    restrictions: list[str]


@lru_cache
def decisions() -> dict[str, Decision]:
    raw = (
        files("bosque_api").joinpath("resources/demo-eligibility.json").read_text(encoding="utf-8")
    )
    return {k: Decision.model_validate(v) for k, v in json.loads(raw)["taxa"].items()}


def missing_requirements(taxon) -> list[str]:
    p = taxon.profile
    checks = {
        # A documented name discrepancy is still traceable; an unresolved name is not.
        "taxonomía trazable": taxon.taxonomy.status == "source_checked"
        or (taxon.taxonomy.status == "name_discrepancy" and bool(taxon.taxonomy.notes)),
        "descripción": bool(p.description),
        "hábitat": bool(p.habitat),
        "dos rasgos respaldados": len(p.traits) >= 2 and p.trait_validation_status != "pending",
        "fuente revisable": bool(p.sources),
        "fotografía con autor y licencia": any(m.author and m.license for m in taxon.media),
        "limitaciones explícitas": bool(p.limitations),
    }
    return [name for name, ok in checks.items() if not ok]


def eligibility(taxon) -> DemoEligibility:
    decision = decisions()[taxon.id]
    missing = missing_requirements(taxon)
    status = decision.decision
    if status == "demo_ready" and missing:
        status = "needs_review"
    if status == "educational_only" and ({"descripción", "fuente revisable"} & set(missing)):
        status = "needs_review"
    restrictions = []
    if taxon.sensitivity == "location_sensitive":
        restrictions.append(
            "Especie sensible: sin ubicaciones ni incentivo a buscarla; no es coleccionable."
        )
    if taxon.classification.kingdom == "Fungi":
        restrictions.append("Sin consejos de comestibilidad ni recolección.")
    if taxon.identification.status in {
        "recognition_experimental",
        "recognition_restricted",
        "educational_catalog",
        "recognition_not_evaluated",
    }:
        restrictions.append("La identificación por foto no es confiable para este taxón.")
    return DemoEligibility(
        taxon_id=taxon.id,
        status=status,
        declared=decision.decision,
        collectible=status == "demo_ready" and taxon.sensitivity == "none",
        recognition=taxon.identification.status,
        missing=missing,
        reason=decision.reason,
        reviewed_by=decision.reviewed_by,
        reviewed_at=decision.reviewed_at,
        restrictions=restrictions,
    )
