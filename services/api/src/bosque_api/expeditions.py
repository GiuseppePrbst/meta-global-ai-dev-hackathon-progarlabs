"""Private captures extend observations; there is no public biodiversity feed."""

from datetime import UTC, datetime
from typing import Literal
from uuid import UUID

from bosque_geo.contracts import Point
from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, model_validator


class Expedition(BaseModel):
    id: str = "puyehue"
    name: str = "Puyehue: exploración botánica de referencia"
    territory: str = "Parque Nacional Puyehue y entorno; referencia, no ruta habilitada"
    validation_status: Literal["reference_only"] = "reference_only"
    reference_area: str = "BCN Snaspe, registro 2826; límites referenciales, no legales"
    objectives: list[str] = [
        "Aprender a observar rasgos sin dañar plantas",
        "Registrar hallazgos personales sin confirmar especies por IA",
    ]
    species_of_interest: list[str] = Field(default_factory=list)
    sources: list[str] = [
        "https://www.bcn.cl/obtienearchivo?id=repositorio%2F10221%2F10404%2F2%2FSnaspe.zip"
    ]
    access_conditions: str = (
        "Consultar al administrador antes de visitar; acceso actual no verificado"
    )
    valid_from: str | None = None
    valid_until: str | None = None
    verified_trails: list[str] = []
    safety_rules: list[str] = [
        "Respetar cierres y senderos habilitados por el administrador",
        "No recolectar, manipular ni dañar organismos",
    ]
    completion_criteria: str = "Un registro personal; no requiere especie ni ubicación"


class CaptureAttempt(BaseModel):
    model_config = ConfigDict(extra="forbid")
    identification_id: UUID
    idempotency_key: str = Field(min_length=8, max_length=100, pattern=r"^[A-Za-z0-9_-]+$")
    expedition_id: Literal["puyehue"] = "puyehue"
    species_id: str | None = Field(default=None, max_length=80)
    observed_at: AwareDatetime
    location: Point | None = None
    location_consent: bool = False
    accuracy_m: float | None = Field(default=None, ge=0, le=200, allow_inf_nan=False, strict=True)

    @model_validator(mode="after")
    def consent_and_time(self):
        if self.observed_at > datetime.now(UTC):
            raise ValueError("observed_at no puede estar en el futuro")
        if self.location is not None and not self.location_consent:
            raise ValueError("Ubicación requiere consentimiento")
        if self.accuracy_m is not None and self.location is None:
            raise ValueError("Precisión requiere ubicación")
        return self


class Capture(BaseModel):
    capture_id: UUID
    observation_id: UUID
    owner_id: str
    expedition_id: str
    identification_id: UUID
    species_id: str | None
    capture_status: Literal["registered", "identification_suggested"]
    taxonomic_verification_status: Literal["unverified"] = "unverified"
    observed_at: datetime
    location: Point | None
    accuracy_m: float | None
    location_visibility: Literal["private"] = "private"
    image_reference: None = None
    evidence: dict
    spatial_status: Literal["not_provided", "not_checked", "inside_reference", "outside_reference"]
    quality_flags: list[str] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class Collection(BaseModel):
    captures: list[Capture]
    total_captures: int
    species_recorded: list[str]
    suggested_species_count: int
    educational_progress: str
    limit: int
    offset: int
