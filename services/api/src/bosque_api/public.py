"""Public demo: anonymous access to Bosque Vivo's own AI features, never to Meta models.

The allowlist below is the whole surface. Clients choose no model, prompt, tool or generation
parameter (Meta Model API terms 10.1(i) forbid gateways and proxies). Every anonymous request
still passes reserve(): same ledger, deadline and shared cap as sessions and operators.
"""

import hashlib
import hmac
import logging
from datetime import UTC, datetime
from typing import Literal

import psycopg
from fastapi import HTTPException, Request
from pydantic import BaseModel

from bosque_api.config import Settings
from bosque_api.sessions import Principal, connect

log = logging.getLogger("bosque_api.auth")
CAMPAIGN_ID = "hackathon-2026"
# POST routes open to anonymous clients and the feature each one needs. WS /guide/voice/stream
# is the fifth public route ("voice"); it goes through admit_anonymous in wilo.py.
PUBLIC_PATHS = {
    "/guide/query": "guide",
    "/guide/ask": "guide",
    "/guide/transcribe": "transcribe",
    "/identify": "identify",
}
# Restricted Territories, Geographic Use Policy section 3 (updated 12-10-2026). Cloudflare cannot
# tell Crimea, Donetsk or Luhansk from the rest of Ukraine, so UA fails safe as a whole.
# ponytail: a denylist, because the policy publishes no allowlist of enabled countries.
RESTRICTED = frozenset(
    "AF BY KH CN HK MO CU ER ET HT IR IQ LY MM NI KP PK RU SO SY UA VE EH".split()
)
UNKNOWN_COUNTRY = frozenset({"", "XX", "T1"})  # no data, or Tor: location unverifiable
ANONYMOUS_SCOPES = frozenset({"guide", "transcribe", "identify"})
EXPIRED_MESSAGE = (
    "La demostración terminó el 10-11-2026 a las 05:00 UTC y no se reabrirá; "
    "el Atlas sigue disponible."
)


def campaign_expired(config: Settings) -> bool:
    return datetime.now(UTC) >= config.campaign_expires_at


def is_eligible(country: str) -> bool:
    country = country.strip().upper()
    return country not in UNKNOWN_COUNTRY and country not in RESTRICTED


def admit_anonymous(config: Settings, headers, feature: str) -> Principal:
    """Server-side pseudonym from the verified client IP; the client supplies no identity.

    Only runs behind the origin guard: CF-Connecting-IP and CF-IPCountry are set by Cloudflare,
    which overwrites client values, and the Worker's secret proves the request came through it.
    Without any of that it refuses: an unverifiable caller never reaches Meta.
    """
    key = config.public_ip_hmac_key.get_secret_value()
    if not (config.public_demo_enabled and key and config.origin_auth_token.get_secret_value()):
        raise HTTPException(503, "Demostración pública no disponible")
    if feature not in config.public_demo_features:
        raise HTTPException(403, "Función no disponible en la demostración pública")
    address = headers.get("cf-connecting-ip", "").strip()
    if not address:
        raise HTTPException(403, "No se pudo verificar el origen de la solicitud")
    if not is_eligible(headers.get("cf-ipcountry", "")):
        raise HTTPException(403, "Servicio no disponible en este territorio")
    digest = hmac.new(key.encode(), address.encode(), hashlib.sha256).hexdigest()
    principal = Principal("anon-" + digest[:24])
    principal.anonymous = True
    principal.scopes = ANONYMOUS_SCOPES
    return principal


class DemoStatus(BaseModel):
    public_demo_enabled: bool
    status: Literal[
        "active", "expired", "budget_exhausted", "temporarily_disabled", "provider_unavailable"
    ]
    expires_at: datetime
    seconds_remaining: int
    features: list[str]
    budget_status: Literal["available", "exhausted", "unknown"]
    territory_eligible: bool | None
    notice: str = (
        "Solo para mayores de 18 años. Tu texto, audio o foto se envían a Meta Model API. "
        "Mientras la campaña use créditos promocionales, Meta indica que el contenido puede "
        "usarse para mejorar sus productos: no envíes datos personales ni confidenciales."
    )


def register_public_routes(app, config: Settings):
    @app.get("/demo/status", response_model=DemoStatus)
    def demo_status(request: Request):
        """Estado público de la demostración; no requiere token ni revela montos."""
        status, budget, expires, remaining = "temporarily_disabled", "unknown", None, 0
        costs = (
            config.guide_reservation_units,
            config.voice_reservation_units,
            config.meta_reservation_units,
        )
        try:
            with connect(config) as conn:
                row = conn.execute(
                    "SELECT expires_at, closed_at IS NOT NULL OR clock_timestamp() >= expires_at, "
                    "GREATEST(0, extract(epoch FROM expires_at - clock_timestamp()))::bigint, "
                    "reservation_cap_units FROM campaign_state WHERE id=%s",
                    (CAMPAIGN_ID,),
                ).fetchone()
                reserved = conn.execute(
                    "SELECT COALESCE(sum(reserved_units),0) FROM execution_reservations"
                ).fetchone()[0]
            expires, ended, remaining, cap = row
            cheapest = min(filter(None, costs), default=1)
            budget = "exhausted" if reserved + cheapest > cap else "available"
            if ended:
                status, remaining = "expired", 0
            elif budget == "exhausted":
                status = "budget_exhausted"
            elif config.public_demo_enabled and config.meta_enabled:
                status = "active"
        except (psycopg.Error, HTTPException, TypeError):
            log.warning("demo status unavailable")
        country = request.headers.get("cf-ipcountry")
        return DemoStatus(
            public_demo_enabled=status == "active",
            status=status,
            expires_at=expires or config.campaign_expires_at,
            seconds_remaining=remaining,
            features=list(config.public_demo_features) if status == "active" else [],
            budget_status=budget,
            territory_eligible=(
                is_eligible(country)
                if country is not None and config.origin_auth_token.get_secret_value()
                else None
            ),
        )
