"""Cost control view: authorization, reservations, reported usage, estimate, billing.

Five numbers that must never be merged: an authorization is not a reservation, a
reservation is not a charge, reported usage is not an invoice. No Meta balance or
billing endpoint is called because none is documented.
"""

import json
from pathlib import Path

# Standard tariffs consulted 2026-10-30 at dev.meta.ai/docs/pricing-rate-limits.
TARIFFS = {
    "sam-3.1": {"image": 2.50 / 1000, "frame": 0.20 / 1000, "min_frames": 50},
    "muse-spark-1.3": {"input": 1.25 / 1_000_000, "output": 4.25 / 1_000_000},
}


def estimate(model: str | None, usage: dict) -> float | None:
    """Tariff estimate from reported usage keys; a combined SAM+Muse call adds both.

    None only when usage is present but no priced key or model is recognized.
    """
    sam, muse = TARIFFS["sam-3.1"], TARIFFS["muse-spark-1.3"]
    frames = usage.get("video_frames_processed", 0)
    images = usage.get("images_processed", 0)
    tokens_in = usage.get("prompt_tokens", usage.get("input_tokens", 0))
    tokens_out = usage.get("completion_tokens", usage.get("output_tokens", 0))
    known = model in TARIFFS or (model or "").startswith("sam-3.1+")
    if not known and not (frames or images):
        return None
    return (
        images * sam["image"]
        + (max(sam["min_frames"], frames) * sam["frame"] if frames else 0)
        + tokens_in * muse["input"]
        + tokens_out * muse["output"]
    )


def summarize_rows(rows: list[dict], authorized_usd: float, historical_owner: str):
    """rows: identity_id, reserved_units, status, reported_usage (ledger columns)."""
    reserved = {}
    estimated = {}
    unknown = 0
    usage_totals = {}
    for row in rows:
        owner = row["identity_id"]
        reserved[owner] = reserved.get(owner, 0) + row["reserved_units"]
        report = row.get("reported_usage") or {}
        usage = report.get("usage") or {}
        for key, value in usage.items():
            usage_totals[key] = usage_totals.get(key, 0) + value
        cost = estimate(report.get("model"), usage)
        if cost is None and usage:
            unknown += 1
        estimated[owner] = estimated.get(owner, 0) + (cost or 0)
    total_units = sum(reserved.values())
    historical = reserved.get(historical_owner, 0)
    return {
        "authorized_usd": authorized_usd,
        "reserved_usd": {
            "historical": historical / 1e6,
            "new": (total_units - historical) / 1e6,
            "total": total_units / 1e6,
            "by_identity": {k: v / 1e6 for k, v in sorted(reserved.items())},
        },
        "remaining_reservation_capacity_usd": authorized_usd - total_units / 1e6,
        "reported_usage": usage_totals,
        "estimated_usd": {
            "total": round(sum(estimated.values()), 8),
            "by_identity": {k: round(v, 8) for k, v in sorted(estimated.items())},
            "rows_without_tariff": unknown,
        },
        "requests": {
            "total": len(rows),
            "by_status": {
                s: sum(r["status"] == s for r in rows)
                for s in sorted({r["status"] for r in rows})
            },
        },
        "billing_verified_usd": None,
        "billing_note": "No invoice or balance evidence; Meta documents no balance API.",
    }


def remote_files(root: Path) -> dict:
    """Files API uploads and their recorded DELETE outcome from private manifests."""
    counts = {"uploaded": 0, "deleted": 0, "pending": 0}
    for path in (root / "outputs").glob("*/result.json"):
        data = json.loads(path.read_text(encoding="utf-8"))
        if data.get("file_id"):
            counts["uploaded"] += 1
            counts["deleted" if data.get("cleanup") == "deleted" else "pending"] += 1
    return counts


def cost_report(config, authorized_usd: float, root: Path) -> dict:
    import psycopg

    with psycopg.connect(
        config.database_url.get_secret_value(), connect_timeout=3
    ) as conn:
        cursor = conn.execute(
            "SELECT identity_id, reserved_units, status, reported_usage "
            "FROM execution_reservations ORDER BY created_at"
        )
        names = [c.name for c in cursor.description]
        rows = [dict(zip(names, r, strict=True)) for r in cursor.fetchall()]
    return {
        **summarize_rows(rows, authorized_usd, "sam-api-lab"),
        "remote_files": remote_files(root),
    }
