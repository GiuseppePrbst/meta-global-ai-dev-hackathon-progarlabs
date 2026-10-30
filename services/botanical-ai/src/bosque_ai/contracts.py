from typing import Literal, Protocol

from pydantic import BaseModel, ConfigDict, Field, model_validator


class Candidate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    species_id: str = Field(min_length=1, max_length=80)
    evidence: str = Field(min_length=1, max_length=1000)


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

    @model_validator(mode="after")
    def consistent_result(self):
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
