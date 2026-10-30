"""Run A or B once per authorized local case, without retries or image persistence."""

import argparse
import asyncio
import hashlib
import json
import mimetypes
from io import BytesIO
from pathlib import Path
from time import perf_counter

from bosque_ai.contracts import MockIdentifier
from bosque_ai.evaluation import (
    EvaluationCase,
    EvaluationResult,
    summarize,
    validate_cases,
)
from bosque_ai.meta import (
    MetaAPIError,
    MetaResponsesClient,
    MuseSparkAdapter,
    SAMAdapter,
)
from bosque_ai.segmentation import SegmentationRequest
from bosque_api.catalog import get_species
from bosque_api.config import Settings
from bosque_api.execution import ExecutionStore
from bosque_api.images import MAX_IMAGE_BYTES, prepare_image, segment_image
from fastapi import HTTPException
from PIL import Image
from pydantic import TypeAdapter


async def run(
    manifest: Path, root: Path, provider: str, authorize_meta: bool, experiment="A"
):
    cases = TypeAdapter(list[EvaluationCase]).validate_json(manifest.read_bytes())
    catalog = {s.id: s.scientific_name for s in get_species()}
    validate_cases(cases, set(catalog))
    if len(cases) > 20:
        raise ValueError("Máximo 20 casos por ejecución controlada")
    if not cases:
        return {"summary": summarize([], []), "results": []}
    if provider == "meta" and any(not c.external_processing_authorized for c in cases):
        raise ValueError(
            "Falta autorización de envío externo por caso; permiso local no basta"
        )
    if provider == "meta" and any(
        not c.campaign_id
        or not c.spatial_block
        or not c.perceptual_group
        or not c.perceptual_duplicates_reviewed
        for c in cases
    ):
        raise ValueError(
            "Evaluación real requiere campaña/bloque y duplicados perceptuales revisados"
        )
    if provider == "meta" and len({c.photo_type for c in cases}) != 1:
        raise ValueError("Separar tipos de fotografía en ejecuciones independientes")
    config = Settings()
    adapter = None
    ledger = None
    owner = None
    if provider == "meta":
        if not authorize_meta or not config.model_api_key.get_secret_value():
            raise ValueError(
                "Meta requiere clave y --authorize-meta para esta ejecución"
            )
        if (
            config.service_mode != "demo"
            or not config.meta_enabled
            or not config.demo_tokens
        ):
            raise ValueError(
                "Evaluación Meta requiere modo demo, identidad y ledger global configurado"
            )
        ledger = ExecutionStore(config)
        owner = next(iter(config.demo_tokens))
        adapter = MuseSparkAdapter(
            MetaResponsesClient(config.model_api_key, config.meta_timeout_seconds),
            config.meta_model,
        )
    prepared = []
    for case in cases:
        path = (root / case.file).resolve(strict=True)
        if (
            not path.is_relative_to(root.resolve())
            or path.stat().st_size > MAX_IMAGE_BYTES
        ):
            raise ValueError("Archivo fuera de raíz autorizada o demasiado grande")
        content = path.read_bytes()
        if hashlib.sha256(content).hexdigest() != case.sha256:
            raise ValueError("Hash de caso no coincide")
        if case.validation_status == "pending":
            raise ValueError("Caso pendiente de derechos/etiqueta")
        prepared.append(
            (case, prepare_image(content, mimetypes.guess_type(path.name)[0]))
        )
    results = []
    admission_error = None
    for index, (case, image) in enumerate(prepared):
        started = perf_counter()
        try:
            reservation = (
                await asyncio.to_thread(ledger.reserve, owner, "identify")
                if ledger
                else None
            )
        except HTTPException as exc:
            admission_error = {"http_status": exc.status_code, "status": "not_executed"}
            break  # Return earlier results without retrying a rejected case.
        if adapter:
            adapter.client.usage.clear()
        execution_status = "validation_error"
        segmentation_status = "disabled"
        stages = {}
        try:
            if adapter and experiment == "B":
                with Image.open(BytesIO(image)) as decoded:
                    width, height = decoded.size
                segmented = await SAMAdapter(
                    adapter.client, config.sam_model
                ).segment_typed(
                    image, "image/jpeg", SegmentationRequest(width=width, height=height)
                )
                segmentation_status = segmented.status
                try:
                    image = segment_image(image, segmented)
                except (ValueError, OSError):
                    segmentation_status = "error"
                stages["segmentation"] = (perf_counter() - started) * 1000
            identification = (
                await adapter.identify(image, "image/jpeg", catalog)
                if adapter
                else await MockIdentifier().identify(image, "image/jpeg")
            )
            identification.segmentation_status = segmentation_status
            stages["identification"] = identification.latency_ms or 0
            result = EvaluationResult(
                case_id=case.case_id,
                experiment=experiment,
                provider=provider,
                identification=identification,
                stage_latency_ms=stages,
                total_latency_ms=(perf_counter() - started) * 1000,
            )
            execution_status = "completed"
        except MetaAPIError:
            execution_status = "provider_error"
            result = EvaluationResult(
                case_id=case.case_id,
                experiment=experiment,
                provider=provider,
                error="provider_error",
                total_latency_ms=(perf_counter() - started) * 1000,
            )
        finally:
            if reservation:
                await asyncio.to_thread(
                    ledger.finish,
                    reservation,
                    execution_status,
                    {
                        "model": config.meta_model,
                        "experiment": experiment,
                        "usage": adapter.client.usage.copy(),
                    },
                )
        results.append(result)
        if adapter and index < len(prepared) - 1:
            await asyncio.sleep(config.meta_min_interval_seconds)
    return {
        "summary": summarize(cases, results),
        "results": [r.model_dump() for r in results],
        "admission_error": admission_error,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("manifest", type=Path)
    parser.add_argument("--image-root", type=Path, required=True)
    parser.add_argument("--provider", choices=["mock", "meta"], default="mock")
    parser.add_argument("--authorize-meta", action="store_true")
    parser.add_argument("--experiment", choices=["A", "B"], default="A")
    args = parser.parse_args()
    print(
        json.dumps(
            asyncio.run(
                run(
                    args.manifest,
                    args.image_root,
                    args.provider,
                    args.authorize_meta,
                    args.experiment,
                )
            ),
            ensure_ascii=False,
            indent=2,
        )
    )
