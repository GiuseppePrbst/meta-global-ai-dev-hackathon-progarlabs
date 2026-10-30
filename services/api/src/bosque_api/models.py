from datetime import datetime
from typing import Literal
from uuid import UUID

from bosque_geo.contracts import Point, Polygon
from pydantic import BaseModel, ConfigDict, Field


class Provenance(BaseModel):
    source_name: str
    source_url: str
    accessed_at: str
    version: str
    license: str
    attribution: str
    redistribution: str
    processing: str
    validation_owner: str
    status: Literal["pending_validation"]


class Taxonomy(BaseModel):
    model_config = ConfigDict(extra="forbid")

    source_url: str
    source_version: str
    accessed_at: str
    gbif_id: int = Field(gt=0)
    status: Literal["ACCEPTED", "SYNONYM"]
    verification_status: Literal["source_checked"]
    license: Literal["CC-BY-4.0"]
    attribution: str


class Species(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str = Field(pattern=r"^[a-z]+(?:-[a-z]+)+$")
    scientific_name: str = Field(pattern=r"^[A-Z][a-z]+ [a-z]+$")
    common_name: str = Field(min_length=1)
    taxonomic_status: Literal["provisional"]
    provenance: Provenance
    accepted_name: str | None = None
    synonyms: list[str] = Field(default_factory=list)
    family: str | None = None
    genus: str | None = None
    taxonomy: Taxonomy | None = None
    native_status: Literal["pending"] = "pending"
    morphology: list[str] = Field(default_factory=list)
    trait_validation_status: Literal["pending"] = "pending"
    conservation_status: str | None = None


class ObservationCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    species_id: str | None = Field(default=None, max_length=80)
    notes: str = Field(default="", max_length=2000)
    location: Point | None = None


class Observation(ObservationCreate):
    id: UUID
    created_at: datetime
    verification_status: Literal["unverified"] = "unverified"


class ForestRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    source_id: Literal["chmv2"]
    area: Polygon
