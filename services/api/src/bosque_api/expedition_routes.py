from typing import Annotated
from uuid import UUID

import psycopg
from bosque_ai.meta import MetaResponsesClient
from fastapi import HTTPException, Query, Request, Response
from pydantic import ValidationError

from bosque_api.capture_store import CaptureStore
from bosque_api.catalog import get_species
from bosque_api.expeditions import Capture, CaptureAttempt, Collection, Expedition
from bosque_api.wilo import GuideQuery, register_wilo_routes

__all__ = ["GuideQuery", "register_routes"]


def register_routes(app, config, landscape_context):
    def repository():
        if not config.database_url.get_secret_value():
            raise HTTPException(503, "Capturas requieren PostGIS y migraciones 001–004")
        return CaptureStore(
            config.database_url.get_secret_value(), config.observation_retention_days
        )

    def meta_client():
        if not config.meta_enabled or not config.model_api_key.get_secret_value():
            raise HTTPException(503, "Meta no habilitado/configurado")
        return MetaResponsesClient(config.model_api_key, config.meta_timeout_seconds)

    @app.get("/expeditions", response_model=list[Expedition])
    def expeditions():
        return [Expedition(species_of_interest=[s.id for s in get_species()])]

    @app.get("/expeditions/{expedition_id}", response_model=Expedition)
    def expedition(expedition_id: str):
        if expedition_id != "puyehue":
            raise HTTPException(404, "Expedición no encontrada")
        return expeditions()[0]

    @app.post(
        "/captures/attempts",
        response_model=Capture,
        status_code=201,
        responses={
            200: {"model": Capture, "description": "Reintento idempotente"},
            409: {"description": "Duplicado con datos diferentes"},
        },
    )
    def attempt(item: CaptureAttempt, request: Request, response: Response):
        try:
            result, created = repository().create(request.state.identity, item)
            response.status_code = 201 if created else 200
            return result
        except (psycopg.Error, ValidationError):
            raise HTTPException(503, "Persistencia de capturas no disponible") from None

    @app.get("/captures/me", response_model=Collection)
    def collection(
        request: Request,
        limit: Annotated[int, Query(ge=1, le=100)] = 100,
        offset: Annotated[int, Query(ge=0, le=100000)] = 0,
    ):
        try:
            return repository().collection(request.state.identity, limit, offset)
        except (psycopg.Error, ValidationError):
            raise HTTPException(503, "Colección no disponible") from None

    @app.get("/captures/{capture_id}", response_model=Capture)
    def capture(capture_id: UUID, request: Request):
        try:
            return repository().get(request.state.identity, capture_id)
        except (psycopg.Error, ValidationError):
            raise HTTPException(503, "Captura no disponible") from None

    @app.delete("/captures/{capture_id}", status_code=204)
    def delete_capture(capture_id: UUID, request: Request):
        try:
            repository().delete(request.state.identity, capture_id)
        except psycopg.Error:
            raise HTTPException(503, "No se pudo eliminar captura") from None
        return Response(status_code=204)

    @app.delete("/identifications/{identification_id}", status_code=204)
    def delete_identification(identification_id: UUID, request: Request):
        try:
            repository().delete_identification(request.state.identity, identification_id)
        except psycopg.Error:
            raise HTTPException(503, "No se pudo eliminar evidencia") from None
        return Response(status_code=204)

    register_wilo_routes(app, config, landscape_context, repository, meta_client)
