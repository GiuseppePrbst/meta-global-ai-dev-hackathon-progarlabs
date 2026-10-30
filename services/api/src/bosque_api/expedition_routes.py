import asyncio
from functools import partial
from time import perf_counter
from typing import Annotated
from uuid import UUID

import psycopg
from bosque_ai.guide import GuideAnswer, GuideToolError, query_guide
from bosque_ai.meta import MetaAPIError, MetaResponsesClient
from bosque_ai.voice import MAX_AUDIO_BYTES, MetaVoiceAdapter, Transcription, prepare_audio
from fastapi import File, Form, HTTPException, Query, Request, Response, UploadFile
from pydantic import BaseModel, ConfigDict, Field, ValidationError

from bosque_api.capture_store import CaptureStore
from bosque_api.catalog import get_species
from bosque_api.execution import ExecutionStore
from bosque_api.expeditions import Capture, CaptureAttempt, Collection, Expedition
from bosque_api.guide_tools import TOOLS, execute_tool


class GuideQuery(BaseModel):
    model_config = ConfigDict(extra="forbid")
    question: str = Field(min_length=1, max_length=2000)
    adult_confirmed: bool
    external_processing_confirmed: bool = False
    capture_id: UUID | None = None


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

    @app.post(
        "/guide/transcribe",
        response_model=Transcription,
        responses={
            413: {"description": "Audio supera 3 MiB"},
            415: {"description": "Formato no admitido; requiere WAV"},
            502: {"description": "stt_error; respuesta sanitizada"},
        },
    )
    async def transcribe(
        request: Request,
        file: Annotated[UploadFile, File()],
        adult_confirmed: Annotated[bool, Form()],
        rights_confirmed: Annotated[bool, Form()],
        external_processing_confirmed: Annotated[bool, Form()] = False,
    ):
        if not adult_confirmed or not rights_confirmed:
            raise HTTPException(422, "Audio requiere mayoría de edad y derechos de uso")
        if file.content_type not in {"audio/wav", "audio/x-wav", "audio/wave"}:
            raise HTTPException(415, "Requiere audio WAV")
        content = await file.read(MAX_AUDIO_BYTES + 1)
        await file.close()
        if len(content) > MAX_AUDIO_BYTES:
            raise HTTPException(413, "Audio supera 3 MiB")
        ledger = ExecutionStore(config)
        reservation = None
        client = None
        if config.ai_provider == "meta":
            if not external_processing_confirmed:
                raise HTTPException(422, "Falta permiso de procesamiento externo del audio")
            client = meta_client()
            reservation = await asyncio.to_thread(
                ledger.reserve, request.state.identity, "transcribe"
            )
        status = "validation_error"
        usage = {}
        try:
            try:
                audio, duration = await asyncio.to_thread(prepare_audio, content)
            except ValueError as exc:
                raise HTTPException(422, str(exc)) from None
            if client is None:
                result = Transcription(
                    transcript="",
                    provider="mock",
                    execution_status="mock",
                    audio_duration_ms=duration,
                    latency_ms=0,
                    limitations=["Mock no transcribe ni reconoce vocabulario"],
                )
            else:
                result = await MetaVoiceAdapter(client).transcribe(audio, duration)
            status = "completed"
            result.correlation_id = request.state.correlation_id
            usage = {
                "usage": result.usage,
                "model": result.model,
                "latency_ms": result.latency_ms,
                "correlation_id": result.correlation_id,
            }
            return result
        except MetaAPIError:
            status = "provider_error"
            raise HTTPException(
                502, {"code": "stt_error", "message": "Transcripción no disponible"}
            ) from None
        finally:
            if reservation:
                await asyncio.to_thread(ledger.finish, reservation, status, usage)

    @app.post(
        "/guide/query",
        response_model=GuideAnswer,
        responses={
            502: {"description": "tool_error o llm_error; respuesta sanitizada"},
        },
    )
    async def guide(item: GuideQuery, request: Request):
        if not item.adult_confirmed:
            raise HTTPException(422, "Guía exclusivo para adultos")
        if config.ai_provider == "mock":
            return GuideAnswer(
                answer="Modo mock: no se consultó Muse ni se generó respuesta botánica.",
                provider="mock",
                execution_status="mock",
                correlation_id=request.state.correlation_id,
            )
        if not item.external_processing_confirmed:
            raise HTTPException(
                422, "Falta permiso para enviar consulta y contexto permitido a Meta"
            )
        client = meta_client()
        if item.capture_id is not None:
            try:
                await asyncio.to_thread(repository().get, request.state.identity, item.capture_id)
            except (psycopg.Error, ValidationError):
                raise HTTPException(503, "Evidencia de captura no disponible") from None
        ledger = ExecutionStore(config)
        reservation = await asyncio.to_thread(ledger.reserve, request.state.identity, "guide")
        started = perf_counter()
        status = "provider_error"
        try:
            result = await query_guide(
                client,
                config.meta_model,
                item.question,
                TOOLS,
                partial(
                    execute_tool,
                    owner=request.state.identity,
                    store=repository(),
                    landscape_context=landscape_context,
                    capture_id=item.capture_id,
                ),
            )
            result.correlation_id = request.state.correlation_id
            status = "completed"
            return result
        except (GuideToolError, psycopg.Error, HTTPException, ValidationError):
            raise HTTPException(
                502, {"code": "tool_error", "message": "Herramienta no disponible o no autorizada"}
            ) from None
        except MetaAPIError:
            raise HTTPException(
                502, {"code": "llm_error", "message": "Respuesta del guía no disponible"}
            ) from None
        finally:
            await asyncio.to_thread(
                ledger.finish,
                reservation,
                status,
                {
                    "usage": client.usage,
                    "model": config.meta_model,
                    "prompt_version": "botanical-guide-v1",
                    "correlation_id": request.state.correlation_id,
                    "latency_ms": (perf_counter() - started) * 1000,
                },
            )
