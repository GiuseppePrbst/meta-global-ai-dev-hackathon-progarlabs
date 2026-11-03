"""Canonical experiment identity; private locations are stored separately."""

from datetime import UTC, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class FinancialAuthorization(BaseModel):
    """A dated, evidenced owner/provider statement, never a live balance API."""

    model_config = ConfigDict(extra="forbid", frozen=True)
    campaign_id: str = Field(min_length=1, max_length=100)
    responsible: str = Field(min_length=3, max_length=100)
    checked_at: datetime
    expires_at: datetime
    source_kind: Literal["provider_verified", "owner_declared"]
    source: str = Field(min_length=5, max_length=300)
    evidence_sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    observed_usd: float = Field(gt=0, allow_inf_nan=False)
    limit_usd: float = Field(gt=0, allow_inf_nan=False)
    margin_usd: float = Field(ge=0, allow_inf_nan=False)
    ledger_phase: Literal["I"]

    def validate_current(self, campaign_id: str, now: datetime | None = None):
        now = now or datetime.now(UTC)
        if (
            self.checked_at.tzinfo is None
            or self.expires_at.tzinfo is None
            or not self.checked_at <= now < self.expires_at
            or (self.expires_at - self.checked_at).total_seconds() > 86400
            or self.campaign_id != campaign_id
            or self.limit_usd + self.margin_usd > self.observed_usd
        ):
            raise ValueError("Invalid or expired financial authorization")


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
