"""Offline scoring with explicit denominators; mocks never produce accuracy."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from bosque_ai.contracts import Identification


class EvaluationCase(BaseModel):
    model_config = ConfigDict(extra="forbid")
    case_id: str = Field(min_length=1)
    species_id: str | None
    file: str = Field(min_length=1)
    sha256: str = Field(pattern=r"^[0-9a-f]{64}$")
    license: str = Field(min_length=1)
    source: str = Field(min_length=1)
    authorized: Literal[True]
    external_processing_authorized: bool = False
    photo_type: str = Field(min_length=1)
    reviewer: str = Field(min_length=1)
    individual_id: str = Field(min_length=1)
    campaign_id: str | None = None
    spatial_block: str | None = None
    perceptual_group: str | None = None
    perceptual_duplicates_reviewed: bool = False
    partition: Literal["development", "test"]
    validation_status: Literal["validated", "synthetic", "pending"]


class EvaluationResult(BaseModel):
    case_id: str
    provider: Literal["mock", "meta"]
    experiment: Literal["A", "B"] = "A"
    identification: Identification | None = None
    error: Literal["provider_error"] | None = None
    total_latency_ms: float = Field(ge=0, allow_inf_nan=False)
    stage_latency_ms: dict[str, float] = Field(default_factory=dict)


def validate_cases(cases: list[EvaluationCase], species_ids: set[str]) -> None:
    if len({c.case_id for c in cases}) != len(cases):
        raise ValueError("case_id duplicado")
    partitions: dict[str, str] = {}
    hashes: set[str] = set()
    for case in cases:
        if case.species_id is not None and case.species_id not in species_ids:
            raise ValueError("Etiqueta fuera del catálogo")
        for kind, value in (
            ("individual", case.individual_id),
            ("campaign", case.campaign_id),
            ("block", case.spatial_block),
            ("perceptual", case.perceptual_group),
        ):
            if value is not None:
                previous = partitions.setdefault(kind + ":" + value, case.partition)
                if previous != case.partition:
                    raise ValueError("Fuga entre particiones o contenido duplicado")
        if case.sha256 in hashes:
            raise ValueError("Fuga entre particiones o contenido duplicado")
        hashes.add(case.sha256)


def summarize(
    cases: list[EvaluationCase], results: list[EvaluationResult], by_type: bool = True
) -> dict:
    if len({r.case_id for r in results}) != len(results):
        raise ValueError("Resultados duplicados; separar experimento/proveedor")
    by_id = {c.case_id: c for c in cases}
    if any(r.case_id not in by_id for r in results):
        raise ValueError("Resultado sin caso")
    modes = {(r.provider, r.experiment) for r in results}
    if len(modes) > 1:
        raise ValueError("No mezclar experimentos/proveedores")
    real = bool(results) and results[0].provider == "meta"
    eligible = [
        r
        for r in results
        if by_id[r.case_id].validation_status == "validated"
        and by_id[r.case_id].species_id is not None
    ]
    top1 = top3 = wrong = abstain = errors = 0
    for result in results:
        if result.error:
            errors += 1
        elif result.identification:
            if result.identification.provider != result.provider:
                raise ValueError("Proveedor inconsistente")
            candidates = [c.species_id for c in result.identification.candidates]
            abstain += not candidates
            if result in eligible:
                label = by_id[result.case_id].species_id
                top1 += bool(candidates) and candidates[0] == label
                top3 += label in candidates
                wrong += bool(candidates) and candidates[0] != label
        else:
            raise ValueError("Resultado sin identificación ni error")
    count = len(eligible)
    summary = {
        "status": "evaluated" if real and eligible else "not_evaluated",
        "provider": results[0].provider if results else None,
        "experiment": results[0].experiment if results else None,
        "cases": len(cases),
        "executed": len(results),
        "evaluable": count if real else 0,
        "provider_errors": errors,
        "abstentions": abstain,
        "abstention_rate": abstain / len(results) if real and results else None,
        "provider_error_rate": errors / len(results) if real and results else None,
        "top1": top1 / count if real and count else None,
        "top3": top3 / count if real and count else None,
        "classification_error": wrong / count if real and count else None,
        "n_by_species": {
            key: sum(c.species_id == key for c in cases)
            for key in sorted({c.species_id for c in cases if c.species_id is not None})
        },
        "false_positives": sum(
            bool(r.identification and r.identification.candidates)
            for r in results
            if by_id[r.case_id].species_id is None
            and by_id[r.case_id].validation_status == "validated"
        )
        if real
        else None,
        "latency_total_ms": [r.total_latency_ms for r in results],
        "limitations": [
            "Muestra pequeña/no representativa; mock no mide precisión.",
            "Top-k usa todos los casos etiquetados ejecutados, incluidos errores y abstenciones.",
        ],
    }
    if by_type:  # per photographed organ; each subset keeps its own denominators
        summary["by_photo_type"] = {
            kind: {
                key: sub[key]
                for key in ("executed", "evaluable", "top1", "top3", "abstentions")
            }
            for kind in sorted({by_id[r.case_id].photo_type for r in results})
            for sub in [
                summarize(
                    [c for c in cases if c.photo_type == kind],
                    [r for r in results if by_id[r.case_id].photo_type == kind],
                    by_type=False,
                )
            ]
        }
    return summary
