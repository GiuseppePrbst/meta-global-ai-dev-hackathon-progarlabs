"""One authorized HTTP pipeline, at most one SAM + one Muse call on a generated drawing."""

import argparse
import hashlib
import json
from datetime import UTC, datetime
from pathlib import Path
from time import perf_counter

import httpx
from bosque_api.config import Settings

from evaluations.meta_smoke import synthetic_image


def run(authorize: bool, budget_usd: float):
    config = Settings()
    if not authorize or budget_usd != 1 or not config.demo_tokens:
        raise ValueError(
            "Requiere autorización de dos llamadas sintéticas, máximo USD 1"
        )
    image = synthetic_image()
    started = perf_counter()
    with httpx.Client(timeout=150) as client:
        response = client.post(
            "http://127.0.0.1:8059/identify",
            headers={
                "Authorization": "Bearer "
                + next(iter(config.demo_tokens.values())).get_secret_value()
            },
            files={"file": ("synthetic.jpg", image, "image/jpeg")},
            data={"adult_confirmed": True, "rights_confirmed": True},
        )
    evidence = {
        "timestamp_utc": datetime.now(UTC).isoformat(),
        "http_status": response.status_code,
        "synthetic_sha256": hashlib.sha256(image).hexdigest(),
        "authorized_budget_usd": budget_usd,
        "total_latency_ms": (perf_counter() - started) * 1000,
        "model": config.meta_model,
        "segmentation_model": config.sam_model,
        "billing_balance": "not_checked; request acceptance is not a balance receipt",
        "limitations": [
            "Technical synthetic integration only; n=0 botanical evaluation.",
            "Price estimate uses reported tokens; not a billing receipt. No retries.",
        ],
    }
    if response.status_code == 200:
        result = response.json()
        evidence.update(
            {
                key: result[key]
                for key in (
                    "status",
                    "execution_status",
                    "segmentation_status",
                    "stage_latency_ms",
                    "stage_usage",
                    "prompt_version",
                    "correlation_id",
                )
            }
        )
        usage = result["stage_usage"].get("identification", {})
        if "prompt_tokens" in usage and "completion_tokens" in usage:
            evidence["estimated_cost_usd"] = (
                usage["prompt_tokens"] * 1.25 + usage["completion_tokens"] * 4.25
            ) / 1_000_000 + 0.0025
        evidence["candidate_count"] = len(result["candidates"])
    else:
        evidence["execution_status"] = (
            "provider_error" if response.status_code == 502 else "blocked"
        )
    return evidence


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--authorize-meta", action="store_true")
    parser.add_argument("--budget-usd", type=float, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    if args.output.exists():
        raise SystemExit("Existing evidence: refusing accidental paid rerun")
    result = run(args.authorize_meta, args.budget_usd)
    args.output.write_bytes((json.dumps(result, indent=2) + "\n").encode())
    print("Sanitized synthetic evidence saved; no provider text or image retained")
