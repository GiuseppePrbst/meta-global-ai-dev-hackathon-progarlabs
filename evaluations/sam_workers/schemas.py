"""Canonical experiment identity; private locations are stored separately."""

from datetime import UTC, datetime
from decimal import ROUND_FLOOR, Decimal
from pathlib import Path
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
            or self.margin_usd >= self.observed_usd
        ):
            raise ValueError("Invalid or expired financial authorization")


def financial_snapshot(authorization_path, evidence_path, campaign_id, phase_cap_usd):
    from tools.meta_sam_api_lab.media import digest, private_path

    auth = FinancialAuthorization.model_validate_json(
        private_path(Path(authorization_path)).read_text(encoding="utf-8")
    )
    auth.validate_current(campaign_id)
    if (
        auth.source_kind != "provider_verified"
        or auth.limit_usd < phase_cap_usd
        or digest(private_path(Path(evidence_path))) != auth.evidence_sha256
    ):
        raise ValueError("Current provider billing evidence is required")
    units = (
        Decimal(str(auth.observed_usd)) - Decimal(str(auth.margin_usd))
    ) * 1_000_000
    return auth.checked_at, int(units.to_integral_value(rounding=ROUND_FLOOR))


def register_financial_authorization(
    queue, authorization_path, evidence_path, campaign_id, phase_cap_usd
):
    """Record a reviewed evidence reference; it does not authenticate Meta Billing."""
    from uuid import uuid4

    from tools.meta_sam_api_lab.media import digest, private_path

    path = private_path(Path(authorization_path))
    auth = FinancialAuthorization.model_validate_json(path.read_text(encoding="utf-8"))
    financial_snapshot(path, evidence_path, campaign_id, phase_cap_usd)
    authorization_id = uuid4()
    with queue.connect() as conn:
        row = conn.execute(
            """INSERT INTO sam_financial_authorizations
            (authorization_id,campaign_id,authorization_sha256,evidence_sha256,responsible,checked_at,expires_at,phase_cap_units)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s) ON CONFLICT(authorization_sha256) DO NOTHING
            RETURNING authorization_id""",
            (
                authorization_id,
                campaign_id,
                digest(path),
                auth.evidence_sha256,
                auth.responsible,
                auth.checked_at,
                auth.expires_at,
                int(
                    (Decimal(str(phase_cap_usd)) * 1_000_000).to_integral_value(
                        rounding=ROUND_FLOOR
                    )
                ),
            ),
        ).fetchone()
    return row["authorization_id"] if row else None


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
