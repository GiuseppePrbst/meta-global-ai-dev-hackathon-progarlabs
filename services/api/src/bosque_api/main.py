import warnings
from io import BytesIO
from typing import Annotated

import psycopg
from bosque_ai.contracts import Identification, MockIdentifier
from bosque_geo.contracts import CHMV2_SOURCE, ForestSource, UnconfiguredCanopyProvider
from fastapi import FastAPI, File, Form, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, UnidentifiedImageError

from bosque_api.catalog import get_species
from bosque_api.config import Settings
from bosque_api.database import ObservationStore
from bosque_api.models import ForestRequest, Observation, ObservationCreate, Species

MAX_IMAGE_BYTES = 10 * 1024 * 1024
IMAGE_TYPES = {"JPEG": "image/jpeg", "PNG": "image/png", "WEBP": "image/webp"}


def create_app(settings: Settings | None = None) -> FastAPI:
    config = settings or Settings()
    app = FastAPI(
        title="Bosque Vivo Chile API",
        version="0.1.0",
        description="Bootstrap local. Catálogo provisional; identificación mock explícita.",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=config.cors_origins,
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type"],
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
    ):
        if not adult_confirmed or not rights_confirmed:
            raise HTTPException(422, "Se requiere mayoría de edad y derechos de uso de la imagen")
        if file.content_type not in IMAGE_TYPES.values():
            raise HTTPException(415, "Formato no admitido: utiliza JPEG, PNG o WebP")
        image = await file.read(MAX_IMAGE_BYTES + 1)
        await file.close()
        if len(image) > MAX_IMAGE_BYTES:
            raise HTTPException(413, "La imagen supera el límite de 10 MiB")
        try:
            with warnings.catch_warnings():
                warnings.simplefilter("error", Image.DecompressionBombWarning)
                with Image.open(BytesIO(image)) as decoded:
                    if IMAGE_TYPES.get(decoded.format) != file.content_type:
                        raise HTTPException(415, "El contenido no coincide con el tipo de imagen")
                    decoded.verify()
        except (UnidentifiedImageError, OSError, Image.DecompressionBombError, Warning):
            raise HTTPException(
                422, "Imagen inválida o demasiado grande para decodificar"
            ) from None
        if config.ai_provider == "meta":
            if not config.model_api_key.get_secret_value():
                raise HTTPException(503, "Meta no configurado: falta MODEL_API_KEY")
            raise HTTPException(
                501,
                "Pipeline Meta pendiente de validación; este endpoint todavía no envía imágenes",
            )
        return await MockIdentifier().identify(image, file.content_type)

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
        return [CHMV2_SOURCE]

    @app.post("/forest/analyze")
    def forest_analyze(request: ForestRequest):
        try:
            return UnconfiguredCanopyProvider().analyze(request.area)
        except NotImplementedError as exc:
            raise HTTPException(501, str(exc)) from None

    return app


app = create_app()
