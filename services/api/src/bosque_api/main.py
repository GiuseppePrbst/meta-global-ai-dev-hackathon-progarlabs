import asyncio
import logging
import secrets
from pathlib import Path
from time import monotonic, perf_counter
from typing import Annotated
from uuid import UUID, uuid4

import psycopg
from bosque_ai.contracts import Identification, MockIdentifier
from bosque_ai.meta import MetaAPIError, MetaResponsesClient, MuseSparkAdapter, SAMAdapter
from bosque_ai.segmentation import SegmentationRequest
from bosque_geo.context import (
    ContextAreaRequest,
    ContextLayer,
    ContextPointRequest,
    ContextResponse,
    WeightedForestRequest,
    check_query,
    context_result,
    taxon_aliases,
)
from bosque_geo.contracts import (
    CHMV2_SOURCE,
    CanopyStatistics,
    ForestSource,
    UnconfiguredCanopyProvider,
    WeightedStatistics,
)
from fastapi import FastAPI, File, Form, Header, HTTPException, Query, Request, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from bosque_api.catalog import get_species
from bosque_api.config import Settings
from bosque_api.context_store import ContextStore
from bosque_api.database import ObservationStore
from bosque_api.execution import ExecutionStore, identity
from bosque_api.images import IMAGE_TYPES, MAX_IMAGE_BYTES, prepare_image, segment_image
from bosque_api.models import ForestRequest, Observation, ObservationCreate, Species


def create_app(settings: Settings | None = None) -> FastAPI:
    config = settings or Settings()
    next_meta_request = 0.0
    canopy = UnconfiguredCanopyProvider()
    forest_error = False
    if config.forest_manifest:
        try:
            from bosque_geo.raster import LocalCanopyProvider, RasterSpec

            spec = RasterSpec.model_validate_json(Path(config.forest_manifest).read_text("utf-8"))
            if spec.source_id != "chmv2":
                raise ValueError("La API CHMv2 requiere una fuente real")
            canopy = LocalCanopyProvider(spec)
        except (ImportError, OSError, ValueError):
            forest_error = True
    app = FastAPI(
        title="Bosque Vivo Chile API",
        version="0.1.0",
        description="API botánica y forestal con procedencia, incertidumbre y modos local/demo.",
    )

    @app.middleware("http")
    async def demo_access(request: Request, call_next):
        correlation = str(uuid4())
        request.state.identity = None
        public = {"/health", "/species", "/forest/sources", "/openapi.json", "/docs", "/redoc"}
        if (
            config.service_mode == "demo"
            and request.method != "OPTIONS"
            and (request.url.path not in public and not request.url.path.startswith("/species/"))
        ):
            try:
                request.state.identity = identity(config, request.headers.get("authorization"))
            except HTTPException as exc:
                return JSONResponse(
                    status_code=exc.status_code,
                    content={"detail": exc.detail},
                    headers={"X-Correlation-ID": correlation},
                )
        request.state.correlation_id = correlation
        response = await call_next(request)
        response.headers["X-Correlation-ID"] = correlation
        return response

    app.add_middleware(
        CORSMiddleware,
        allow_origins=config.cors_origins,
        allow_methods=["GET", "POST", "DELETE"],
        allow_headers=["Content-Type", "Authorization"],
        expose_headers=["X-Correlation-ID"],
    )

    def store() -> ObservationStore:
        if not config.database_url.get_secret_value():
            raise HTTPException(503, "Persistencia no configurada: requiere PostgreSQL/PostGIS")
        return ObservationStore(config.database_url.get_secret_value())

    @app.get("/health")
    def health():
        return {
            "status": "ok",
            "service": "bosque-api",
            "database": (
                "not_checked" if config.database_url.get_secret_value() else "not_configured"
            ),
            "ai_provider": config.ai_provider,
        }

    @app.get("/species", response_model=list[Species])
    def species():
        return get_species()

    @app.get("/species/{species_id}", response_model=Species)
    def species_detail(species_id: str):
        item = next((item for item in get_species() if item.id == species_id), None)
        if item is None:
            raise HTTPException(404, "Especie no encontrada")
        return item

    @app.post("/identify", response_model=Identification)
    async def identify(
        request: Request,
        file: Annotated[UploadFile, File(description="JPEG, PNG o WebP, máximo 10 MiB")],
        adult_confirmed: Annotated[bool, Form()],
        rights_confirmed: Annotated[bool, Form()],
        authorization: Annotated[str | None, Header()] = None,
    ):
        if config.ai_provider == "meta":
            if not config.model_api_key.get_secret_value():
                raise HTTPException(503, "Meta no configurado: falta MODEL_API_KEY")
            if not config.meta_enabled:
                raise HTTPException(
                    501, "Meta deshabilitado: requiere habilitación y controles de acceso"
                )
            if config.service_mode == "local":
                token = config.meta_access_token.get_secret_value()
                if not token:
                    raise HTTPException(
                        503, "Meta requiere META_ACCESS_TOKEN para controlar consumo"
                    )
                if not secrets.compare_digest(
                    (authorization or "").encode(), ("Bearer " + token).encode()
                ):
                    raise HTTPException(401, "Se requiere autorización para usar Meta")
        if not adult_confirmed or not rights_confirmed:
            raise HTTPException(422, "Se requiere mayoría de edad y derechos de uso de la imagen")
        if file.content_type not in IMAGE_TYPES.values():
            raise HTTPException(415, "Formato no admitido: utiliza JPEG, PNG o WebP")
        image = await file.read(MAX_IMAGE_BYTES + 1)
        await file.close()
        if len(image) > MAX_IMAGE_BYTES:
            raise HTTPException(413, "La imagen supera el límite de 10 MiB")
        if config.ai_provider == "meta":
            nonlocal next_meta_request
            now = monotonic()
            if config.service_mode == "local" and now < next_meta_request:
                raise HTTPException(429, "Límite de consumo Meta; intenta más tarde")
            if config.service_mode == "local":
                next_meta_request = now + config.meta_min_interval_seconds
            ledger = ExecutionStore(config)
            reservation = (
                await asyncio.to_thread(ledger.reserve, request.state.identity, "identify")
                if config.service_mode == "demo"
                else None
            )
            try:
                image = await asyncio.to_thread(prepare_image, image, file.content_type)
            except HTTPException:
                if reservation:
                    await asyncio.to_thread(ledger.finish, reservation, "validation_error", {})
                raise
            adapter = MuseSparkAdapter(
                MetaResponsesClient(config.model_api_key, config.meta_timeout_seconds),
                model=config.meta_model,
            )
            segment_status = "disabled"
            stage_latency = {}
            stage_usage = {}
            if config.sam_enabled:
                from io import BytesIO

                from PIL import Image

                with Image.open(BytesIO(image)) as decoded:
                    width, height = decoded.size
                started = perf_counter()
                segmented = await SAMAdapter(adapter.client, config.sam_model).segment_typed(
                    image, "image/jpeg", SegmentationRequest(width=width, height=height)
                )
                segment_status = segmented.status
                try:
                    image = await asyncio.to_thread(segment_image, image, segmented)
                except (ValueError, OSError):
                    segment_status = "error"
                stage_latency["segmentation"] = (perf_counter() - started) * 1000
                stage_usage["segmentation"] = adapter.client.usage.copy()
                adapter.client.usage.clear()
            try:
                result = await adapter.identify(
                    image,
                    "image/jpeg",
                    {s.id: s.scientific_name for s in get_species()},
                    knowledge={
                        s.id: {
                            "accepted_name": s.accepted_name,
                            "synonyms": s.synonyms,
                            "taxonomy_source": s.taxonomy.model_dump() if s.taxonomy else None,
                            "verified_morphology": s.morphology
                            if s.trait_validation_status != "pending"
                            else [],
                            "trait_validation_status": s.trait_validation_status,
                        }
                        for s in get_species()
                    },
                )
                result.segmentation_status = segment_status
                stage_latency["identification"] = result.latency_ms
                result.stage_latency_ms = stage_latency
                stage_usage["identification"] = result.usage
                result.stage_usage = stage_usage
                result.correlation_id = request.state.correlation_id
                logging.getLogger(__name__).info(
                    "identify status=completed correlation_id=%s model=%s "
                    "prompt=%s latency_ms=%.1f",
                    request.state.correlation_id,
                    config.meta_model,
                    result.prompt_version,
                    sum(stage_latency.values()),
                )
                if reservation:
                    await asyncio.to_thread(
                        ledger.finish,
                        reservation,
                        "completed",
                        {
                            "stages": stage_usage,
                            "model": config.meta_model,
                            "segmentation_model": config.sam_model if config.sam_enabled else None,
                            "prompt_version": result.prompt_version,
                            "correlation_id": request.state.correlation_id,
                            "stage_latency_ms": stage_latency,
                        },
                    )
                return result
            except MetaAPIError:
                if reservation:
                    await asyncio.to_thread(
                        ledger.finish, reservation, "provider_error", adapter.client.usage
                    )
                logging.getLogger(__name__).warning(
                    "identify status=provider_error correlation_id=%s model=%s",
                    request.state.correlation_id,
                    config.meta_model,
                )
                raise HTTPException(
                    502, "Proveedor Meta no disponible o respuesta inválida"
                ) from None
        image = await asyncio.to_thread(prepare_image, image, file.content_type)
        return await MockIdentifier().identify(image, "image/jpeg")

    @app.get("/observations", response_model=list[Observation])
    def observations(request: Request, limit: Annotated[int, Query(ge=1, le=100)] = 100):
        try:
            if config.service_mode == "demo":
                return store().list(
                    limit, request.state.identity, config.observation_retention_days
                )
            return store().list(limit)
        except psycopg.Error:
            raise HTTPException(503, "PostgreSQL/PostGIS no disponible") from None

    @app.post("/observations", response_model=Observation, status_code=201)
    def save_observation(item: ObservationCreate, request: Request):
        if item.species_id and item.species_id not in {item.id for item in get_species()}:
            raise HTTPException(422, "species_id no pertenece al catálogo")
        try:
            if config.service_mode == "demo":
                return store().create(item, request.state.identity)
            return store().create(item)
        except psycopg.Error:
            raise HTTPException(503, "PostgreSQL/PostGIS no disponible") from None

    @app.delete("/observations/{observation_id}", status_code=204)
    def delete_observation(observation_id: UUID, request: Request):
        owner = request.state.identity
        if owner is None:
            raise HTTPException(401, "Eliminación requiere identidad demo")
        try:
            if not store().delete(observation_id, owner):
                raise HTTPException(404, "Observación no encontrada")
        except psycopg.Error:
            raise HTTPException(503, "PostgreSQL/PostGIS no disponible") from None
        return Response(status_code=204)

    @app.get("/forest/sources", response_model=list[ForestSource])
    def forest_sources():
        if config.forest_manifest and not forest_error:
            return [
                CHMV2_SOURCE.model_copy(
                    update={
                        "status": "ready",
                        "version": canopy.spec.version,
                        "source_url": canopy.spec.source_url,
                        "license": canopy.spec.license,
                        "attribution": canopy.spec.attribution,
                        "processing": "Ventana local validada por SHA-256; centros de píxel.",
                    }
                )
            ]
        return [CHMV2_SOURCE]

    def context_store():
        if not config.database_url.get_secret_value():
            raise HTTPException(503, "Contexto no configurado: requiere PostGIS y migración 002")
        return ContextStore(config.database_url.get_secret_value())

    @app.get(
        "/layers",
        response_model=list[ContextLayer],
        responses={503: {"description": "PostGIS, migración o metadatos no disponibles"}},
    )
    def context_layers():
        try:
            return context_store().layers()
        except (psycopg.Error, ValidationError):
            raise HTTPException(503, "Capas de contexto no disponibles") from None

    def landscape_context(request):
        try:
            from shapely.geometry import mapping

            query = check_query(request)
            repository = context_store()
            layers = repository.layers()
            return context_result(
                request,
                layers,
                repository.features(mapping(query)),
                taxon_aliases([s.model_dump() for s in get_species()]),
                taxonomy_version="; ".join(
                    sorted(
                        {s.taxonomy.source_version for s in get_species() if s.taxonomy is not None}
                    )
                ),
            )
        except ValidationError:
            raise HTTPException(
                503, "Metadatos de contexto inválidos; requieren revisión"
            ) from None
        except (ValueError, ImportError) as exc:
            if isinstance(exc, ImportError):
                raise HTTPException(503, "Contexto requiere extra raster/pyproj") from None
            raise HTTPException(422, str(exc)) from None
        except psycopg.Error:
            raise HTTPException(503, "Capas de contexto no disponibles") from None

    @app.post(
        "/context/point",
        response_model=ContextResponse,
        responses={503: {"description": "Capas no configuradas o fuente inválida"}},
    )
    def point_context(request: ContextPointRequest):
        return landscape_context(request)

    @app.post(
        "/context/area",
        response_model=ContextResponse,
        responses={503: {"description": "Capas no configuradas o fuente inválida"}},
    )
    def area_context(request: ContextAreaRequest):
        return landscape_context(request)

    def raster_analysis(request, http_request: Request, weighted: bool):
        from bosque_geo.worker import analyze_isolated

        ledger = ExecutionStore(config)
        reservation = (
            ledger.reserve(http_request.state.identity, "raster")
            if config.service_mode == "demo"
            else None
        )
        status = "validation_error"
        try:
            result = analyze_isolated(
                canopy.spec,
                request if weighted else request.area,
                weighted=weighted,
                timeout=config.raster_timeout_seconds,
            )
            status = "completed"
            return result
        finally:
            if reservation:
                ledger.finish(reservation, status, {})

    @app.post("/forest/analyze", response_model=CanopyStatistics)
    def forest_analyze(request: ForestRequest, http_request: Request):
        try:
            if forest_error:
                raise HTTPException(503, "Raster o manifiesto no disponible o no validado")
            if not config.forest_manifest:
                return canopy.analyze(request.area)
            return raster_analysis(request, http_request, False)
        except NotImplementedError as exc:
            raise HTTPException(501, str(exc)) from None
        except ValueError as exc:
            raise HTTPException(422, str(exc)) from None
        except (RuntimeError, OSError):
            raise HTTPException(503, "Análisis raster ocupado o no disponible") from None

    @app.post(
        "/forest/analyze/weighted",
        response_model=WeightedStatistics,
        responses={
            501: {"description": "Raster no configurado"},
            503: {"description": "Raster no disponible o análisis ocupado"},
        },
    )
    def forest_weighted(request: WeightedForestRequest, http_request: Request):
        if not config.forest_manifest:
            raise HTTPException(501, "Raster no configurado para estadísticas ponderadas")
        if forest_error:
            raise HTTPException(503, "Raster o manifiesto no disponible o no validado")
        try:
            return raster_analysis(request, http_request, True)
        except ValueError as exc:
            raise HTTPException(422, str(exc)) from None
        except (ImportError, OSError, RuntimeError):
            raise HTTPException(503, "Análisis raster ponderado no disponible") from None

    original_openapi = app.openapi

    def openapi():
        schema = original_openapi()
        schema["components"].setdefault("securitySchemes", {})["DemoBearer"] = {
            "type": "http",
            "scheme": "bearer",
            "description": "Credencial individual revocable de demo; no es login productivo. "
            "SERVICE_MODE=local permite desarrollo aislado sin esta credencial.",
        }
        for path, methods in schema["paths"].items():
            if path in {
                "/identify",
                "/observations",
                "/observations/{observation_id}",
                "/layers",
                "/context/point",
                "/context/area",
                "/forest/analyze",
                "/forest/analyze/weighted",
            }:
                for operation in methods.values():
                    operation["security"] = (
                        [{"DemoBearer": []}] if config.service_mode == "demo" else []
                    )
                    for code, detail in {
                        401: "Identidad requerida",
                        429: "Límite de consumo",
                        503: "Infraestructura no disponible",
                    }.items():
                        operation["responses"].setdefault(str(code), {"description": detail})
        return schema

    app.openapi = openapi
    return app


app = create_app()
