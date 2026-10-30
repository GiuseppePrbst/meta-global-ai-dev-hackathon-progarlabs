from typing import Literal, Protocol

from pydantic import BaseModel, ConfigDict, Field, model_validator

PhotoRecommendation = Literal[
    "leaf_underside",
    "bark",
    "complete_leaf",
    "flowers_or_fruit_if_present",
    "closer_view",
]


CatalogAssessment = Literal[
    "supported_candidate",
    "insufficient_evidence",
    "out_of_catalog_suspected",
    "non_diagnostic_photo",
    "not_assessed",
]


class Candidate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    species_id: str = Field(min_length=1, max_length=80)
    evidence: str = Field(min_length=1, max_length=1000)
    contradictory_evidence: list[str] = Field(default_factory=list, max_length=10)


class Identification(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: Literal["candidates", "insufficient_evidence"]
    provider: Literal["mock", "meta"]
    model: str | None = None
    candidates: list[Candidate] = Field(default_factory=list, max_length=3)
    message: str
    limitations: list[str] = Field(default_factory=list, max_length=10)
    latency_ms: float | None = Field(default=None, ge=0, allow_inf_nan=False)
    execution_status: Literal["mock", "completed"] = "mock"
    segmentation_status: Literal["disabled", "completed", "no_matches", "error"] = (
        "disabled"
    )
    stage_latency_ms: dict[str, float] = Field(default_factory=dict)
    correlation_id: str | None = None
    prompt_version: str | None = None
    usage: dict[str, int] = Field(default_factory=dict)
    stage_usage: dict[str, dict[str, int]] = Field(default_factory=dict)
    identification_id: str | None = None
    observed_traits: list[str] = Field(default_factory=list, max_length=10)
    missing_traits: list[str] = Field(default_factory=list, max_length=10)
    recommended_next_photo: PhotoRecommendation | None = None
    evidence_status: Literal[
        "candidates", "insufficient_evidence", "additional_photo_requested"
    ] = "insufficient_evidence"
    sources: list[str] = Field(default_factory=list)
    # Open-set fields (2026-10-30). Defaults keep earlier responses valid.
    catalog_assessment: CatalogAssessment = "not_assessed"
    acceptance: Literal["accepted", "not_accepted", "not_applicable"] = "not_applicable"
    accepted_species_id: str | None = None
    exploratory_candidates: list[Candidate] = Field(default_factory=list, max_length=3)
    similar_out_of_catalog: list[str] = Field(default_factory=list, max_length=3)
    strategy: str | None = None

    @model_validator(mode="after")
    def consistent_result(self):
        self.evidence_status = (
            "additional_photo_requested"
            if self.recommended_next_photo
            else "candidates"
            if self.candidates
            else "insufficient_evidence"
        )
        if (self.status == "candidates") != bool(self.candidates):
            raise ValueError("El estado debe coincidir con la presencia de candidatos")
        if self.provider == "mock" and (self.candidates or self.model is not None):
            raise ValueError("El mock no produce candidatos ni atribuye un modelo real")
        if self.provider == "meta" and (
            not self.model or self.execution_status != "completed"
        ):
            raise ValueError("Meta requiere modelo y ejecución completa")
        if len({c.species_id for c in self.candidates}) != len(self.candidates):
            raise ValueError("Candidatos duplicados")
        # Accepted means presentable, never verified; it must be the first candidate.
        if (self.acceptance == "accepted") != (
            self.accepted_species_id is not None
        ) or (
            self.acceptance == "accepted"
            and (
                not self.candidates
                or self.candidates[0].species_id != self.accepted_species_id
                or self.catalog_assessment != "supported_candidate"
            )
        ):
            raise ValueError("Aceptación incoherente con candidatos y evaluación")
        if self.acceptance == "not_accepted" and self.candidates:
            raise ValueError("Candidatos no aceptados van en exploratory_candidates")
        return self


class Identifier(Protocol):
    async def identify(self, image: bytes, content_type: str) -> Identification: ...


class MockIdentifier:
    async def identify(self, image: bytes, content_type: str) -> Identification:
        return Identification(
            status="insufficient_evidence",
            provider="mock",
            message=(
                "Modo demostración: imagen recibida sin inferencia. "
                "No hay evidencia de IA para proponer una especie."
            ),
        )
