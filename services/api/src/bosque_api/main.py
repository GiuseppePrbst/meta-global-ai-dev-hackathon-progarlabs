import asyncio
import secrets
from pathlib import Path
from time import monotonic, perf_counter
from typing import Annotated

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
from fastapi import FastAPI, File, Form, Header, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import ValidationError

from bosque_api.catalog import get_species
from bosque_api.config import Settings
from bosque_api.context_store import ContextStore
from bosque_api.database import ObservationStore
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
        description="Bootstrap local. Catálogo provisional; identificación mock explícita.",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=config.cors_origins,
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type", "Authorization"],
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
        file: Annotated[UploadFile, File(description="JPEG, PNG o WebP, máximo 10 MiB")],
        adult_confirmed: Annotated[bool, Form()],
        rights_confirmed: Annotated[bool, Form()],
        authorization: Annotated[str | None, Header()] = None,
    ):
        if not adult_confirmed or not rights_confirmed:
            raise HTTPException(422, "Se requiere mayoría de edad y derechos de uso de la imagen")
        if file.content_type not in IMAGE_TYPES.values():
            raise HTTPException(415, "Formato no admitido: utiliza JPEG, PNG o WebP")
        image = await file.read(MAX_IMAGE_BYTES + 1)
        await file.close()
        if len(image) > MAX_IMAGE_BYTES:
            raise HTTPException(413, "La imagen supera el límite de 10 MiB")
        image = await asyncio.to_thread(prepare_image, image, file.content_type)
        if config.ai_provider == "meta":
            if not config.model_api_key.get_secret_value():
                raise HTTPException(503, "Meta no configurado: falta MODEL_API_KEY")
            if not config.meta_enabled:
                raise HTTPException(
                    501, "Meta deshabilitado: requiere habilitación y controles de acceso"
                )
            token = config.meta_access_token.get_secret_value()
            if not token:
                raise HTTPException(503, "Meta requiere META_ACCESS_TOKEN para controlar consumo")
            if not secrets.compare_digest(
                (authorization or "").encode("utf-8"), ("Bearer " + token).encode("utf-8")
            ):
                raise HTTPException(401, "Se requiere autorización para usar Meta")
            nonlocal next_meta_request
            now = monotonic()
            if now < next_meta_request:
                raise HTTPException(429, "Límite de consumo Meta; intenta más tarde")
            next_meta_request = now + config.meta_min_interval_seconds
            adapter = MuseSparkAdapter(
                MetaResponsesClient(config.model_api_key, config.meta_timeout_seconds),
                model=config.meta_model,
            )
            segment_status = "disabled"
            stage_latency = {}
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
            try:
                result = await adapter.identify(
                    image, "image/jpeg", {s.id: s.scientific_name for s in get_species()}
                )
                result.segmentation_status = segment_status
                stage_latency["identification"] = result.latency_ms
                result.stage_latency_ms = stage_latency
                return result
            except MetaAPIError:
                raise HTTPException(
                    502, "Proveedor Meta no disponible o respuesta inválida"
                ) from None
        return await MockIdentifier().identify(image, "image/jpeg")

    @app.get("/observations", response_model=list[Observation])
    def observations(limit: Annotated[int, Query(ge=1, le=100)] = 100):
        try:
            return store().list(limit)
        except psycopg.Error:
            raise HTTPException(503, "PostgreSQL/PostGIS no disponible") from None

    @app.post("/observations", response_model=Observation, status_code=201)
    def save_observation(item: ObservationCreate):
        if item.species_id and item.species_id not in {item.id for item in get_species()}:
            raise HTTPException(422, "species_id no pertenece al catálogo")
        try:
            return store().create(item)
        except psycopg.Error:
            raise HTTPException(503, "PostgreSQL/PostGIS no disponible") from None

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

    @app.get("/layers", response_model=list[ContextLayer])
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

    @app.post("/context/point", response_model=ContextResponse)
    def point_context(request: ContextPointRequest):
        return landscape_context(request)

    @app.post("/context/area", response_model=ContextResponse)
    def area_context(request: ContextAreaRequest):
        return landscape_context(request)

    @app.post("/forest/analyze", response_model=CanopyStatistics)
    def forest_analyze(request: ForestRequest):
        try:
            if forest_error:
                raise HTTPException(503, "Raster o manifiesto no disponible o no validado")
            return canopy.analyze(request.area)
        except NotImplementedError as exc:
            raise HTTPException(501, str(exc)) from None
        except ValueError as exc:
            raise HTTPException(422, str(exc)) from None
        except (RuntimeError, OSError):
            raise HTTPException(503, "Análisis raster ocupado o no disponible") from None

    @app.post("/forest/analyze/weighted", response_model=WeightedStatistics)
    def forest_weighted(request: WeightedForestRequest):
        if not config.forest_manifest:
            raise HTTPException(501, "Raster no configurado para estadísticas ponderadas")
        if forest_error:
            raise HTTPException(503, "Raster o manifiesto no disponible o no validado")
        try:
            from bosque_geo.weighted import weighted_statistics

            return weighted_statistics(canopy, request)
        except ValueError as exc:
            raise HTTPException(422, str(exc)) from None
        except (ImportError, OSError, RuntimeError):
            raise HTTPException(503, "Análisis raster ponderado no disponible") from None

    return app


app = create_app()
