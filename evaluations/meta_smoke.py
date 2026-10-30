"""Two authorized live requests using a generated drawing, never private photographs."""

import argparse
import asyncio
import hashlib
import json
import re
from datetime import UTC, datetime
from io import BytesIO
from pathlib import Path
from time import perf_counter

import httpx
from bosque_ai.meta import (
    MetaAPIError,
    MetaResponsesClient,
    MuseSparkAdapter,
    SAMAdapter,
)
from bosque_ai.segmentation import SegmentationRequest
from bosque_api.catalog import get_species
from PIL import Image, ImageDraw
from pydantic import SecretStr


def synthetic_image() -> bytes:
    image = Image.new("RGB", (128, 128), "white")
    draw = ImageDraw.Draw(image)
    draw.rectangle((59, 75, 69, 118), fill="brown")
    draw.polygon([(64, 8), (14, 90), (114, 90)], fill="green")
    output = BytesIO()
    image.save(output, "JPEG")
    return output.getvalue()


class EvidenceTransport(httpx.AsyncBaseTransport):
    def __init__(self, records):
        self.records = records
        self.inner = httpx.AsyncHTTPTransport(retries=0)

    async def handle_async_request(self, request):
        started = perf_counter()
        response = await self.inner.handle_async_request(request)
        await response.aread()
        record = {
            "http_status": response.status_code,
            "latency_ms": (perf_counter() - started) * 1000,
        }
        if "application/json" in response.headers.get("content-type", ""):
            try:
                body = response.json()
                record.update(
                    model=body.get("model"),
                    usage=body.get("usage"),
                    error_code=(body.get("error") or {}).get("code"),
                )
            except (ValueError, AttributeError):
                record["protocol_error"] = True
        self.records.append(record)
        return response

    async def aclose(self):
        await self.inner.aclose()


async def run(key: SecretStr):
    image = synthetic_image()
    records = []
    evidence = {
        "timestamp_utc": datetime.now(UTC).isoformat(),
        "synthetic_sha256": hashlib.sha256(image).hexdigest(),
        "calls": records,
    }
    try:
        result = await MuseSparkAdapter(
            MetaResponsesClient(
                key, timeout_seconds=60, transport=EvidenceTransport(records)
            )
        ).identify(
            image, "image/jpeg", {s.id: s.scientific_name for s in get_species()}
        )
        evidence["muse"] = result.model_dump()
    except MetaAPIError:
        evidence["muse"] = {"status": "provider_error"}
    if records and records[-1]["http_status"] == 200:
        result = await SAMAdapter(
            MetaResponsesClient(
                key, timeout_seconds=60, transport=EvidenceTransport(records)
            )
        ).segment_typed(image, "image/jpeg", SegmentationRequest(width=128, height=128))
        evidence["sam"] = {
            "status": result.status,
            "model": result.model,
            "mask_count": len(result.masks),
            "dimensions": [[m.width, m.height] for m in result.masks],
        }
    return evidence


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--key-file", type=Path, required=True)
    parser.add_argument("--authorize-meta", action="store_true", required=True)
    args = parser.parse_args()
    raw = args.key_file.read_text(encoding="utf-8-sig").strip()
    keys = re.findall(r"LLM_[A-Za-z0-9_\-]+", raw)
    key = keys[0] if len(keys) == 1 else raw
    if not key or "\n" in key or len(key) <= 20:
        raise SystemExit("Formato de clave no reconocido")
    print(json.dumps(asyncio.run(run(SecretStr(key))), ensure_ascii=False, indent=2))
