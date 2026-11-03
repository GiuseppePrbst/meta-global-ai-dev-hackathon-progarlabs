"""Canonical experiment identity; private locations are stored separately."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class Experiment(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    media_sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    model: Literal["sam-3.1"] = "sam-3.1"
    model_version: str = Field(min_length=1, max_length=100)
    protocol_version: str = Field(min_length=1, max_length=100)
    protocol_approved_by: str = Field(min_length=1, max_length=100)
    preprocessing_version: str = Field(min_length=1, max_length=100)
    prompt: str = Field(min_length=1, max_length=1000)
    mode: Literal["concept"] = "concept"
    parameters: dict = Field(default_factory=dict)
    replica: int = Field(default=0, ge=0)

    @field_validator("parameters")
    @classmethod
    def supported_parameters(cls, value):
        if value:
            raise ValueError(
                "Only concept prompts without extra parameters are supported"
            )
        return value
