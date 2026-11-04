"""Wilo voice guide routes: transcribe, query, integrated ask and a realtime ASR proxy.

Each Meta call keeps its own ledger reservation (`transcribe`, `guide`) so every stage
can be tested and billed separately. The Meta key never leaves the backend: the
realtime proxy authenticates upstream with `authorization.accessToken` in the first
handshake frame, as the Meta realtime contract requires.
"""

import asyncio
import json
import secrets
from functools import partial
from time import perf_counter
from typing import Annotated, Literal
from uuid import UUID, uuid4

import psycopg
from bosque_ai.guide import PROMPT_VERSION, GuideAnswer, GuideToolError, query_guide
from bosque_ai.meta import MetaAPIError, MetaRetryableError
from bosque_ai.voice import (
    LANGUAGE_HINTS,
    MAX_AUDIO_BYTES,
    MetaVoiceAdapter,
    Transcription,
    prepare_audio,
)
from fastapi import File, Form, HTTPException, Request, UploadFile, WebSocket
from pydantic import BaseModel, ConfigDict, Field, ValidationError

from bosque_api.atlas import get_atlas, voice_keywords
from bosque_api.execution import ExecutionStore, identity
from bosque_api.guide_tools import TOOLS, execute_tool
from bosque_api.sessions import authorize

REALTIME_URL = "wss://api.meta.ai/v1/asr/realtime"
MAX_STREAM_SECONDS = 60
MAX_FRAME_BYTES = 64 * 1024


class GuideQuery(BaseModel):
    model_config = ConfigDict(extra="forbid")
    question: str = Field(min_length=1, max_length=2000)
    adult_confirmed: bool
    external_processing_confirmed: bool = False
    capture_id: UUID | None = None


class WiloAnswer(BaseModel):
    session_id: UUID
    transcript: str | None
    answer: str
    speech_text: str | None
    provider: Literal["mock", "meta"]
    transcription_model: str | None
    answer_model: str | None
    status: Literal["completed", "insufficient_evidence", "mock"]
    insufficient_evidence: bool
    knowledge_version: str
    sources: list[dict]
    claims: list[dict]
    entities: list[dict]
    map: dict | None
    tools_used: list[str]
    latency_ms: dict[str, float | None]
    limitations: list[str]
    language_hint: str = "auto"
    prompt_version: str = PROMPT_VERSION
    correlation_id: str | None = None


LanguageHint = Literal["auto", "es", "en", "mixed"]


class StreamStart(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: Literal["start"]
    token: str = Field(min_length=1, max_length=400)
    adult_confirmed: bool
    rights_confirmed: bool
    external_processing_confirmed: bool = False
    audio_encoding: Literal["PCM_16KHZ", "PCM_24KHZ"] = "PCM_16KHZ"
    language_hint: LanguageHint = "auto"
    answer: bool = True
    session_id: UUID | None = None


def provider_error(exc: MetaAPIError, code: str, message: str) -> HTTPException:
    if isinstance(exc, MetaRetryableError) and exc.status == 429:
        return HTTPException(
            429,
            {"code": f"{code}_rate_limited", "message": "Límite del proveedor; reintentar luego"},
            headers={"Retry-After": str(int(exc.retry_after or 5))},
        )
    return HTTPException(502, {"code": code, "message": message})


async def connect_upstream(handshake: dict):
    """Open the Meta realtime socket; tests replace this function with a fake."""
    import websockets

    upstream = await websockets.connect(REALTIME_URL, max_size=2**20, open_timeout=10)
    await upstream.send(json.dumps(handshake))
    ack = json.loads(await asyncio.wait_for(upstream.recv(), 10))
    if not isinstance(ack, dict) or not isinstance(ack.get("sessionId"), str):
        await upstream.close()
        raise MetaAPIError("Handshake realtime inválido")
    return upstream


def register_wilo_routes(app, config, landscape_context, repository, meta_client):
    async def transcribe_audio(
        owner: str, correlation: str, content: bytes, external: bool, hint: str = "auto"
    ) -> Transcription:
        ledger = ExecutionStore(config)
        reservation = None
        client = None
        if config.ai_provider == "meta":
            if not external:
                raise HTTPException(422, "Falta permiso de procesamiento externo del audio")
            client = meta_client()
            reservation = await asyncio.to_thread(ledger.reserve, owner, "transcribe")
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
                adapter = MetaVoiceAdapter(client, voice_keywords(), LANGUAGE_HINTS[hint])
                result = await adapter.transcribe(audio, duration)
            status = "completed"
            result.correlation_id = correlation
            usage = {
                "usage": result.usage,
                "model": result.model,
                "latency_ms": result.latency_ms,
                "correlation_id": correlation,
            }
            return result
        except MetaAPIError as exc:
            status = "provider_error"
            raise provider_error(exc, "stt_error", "Transcripción no disponible") from None
        finally:
            if reservation:
                await asyncio.to_thread(ledger.finish, reservation, status, usage)

    async def answer_question(
        owner: str,
        correlation: str,
        question: str,
        external: bool,
        capture_id: UUID | None,
        timing: dict,
    ) -> GuideAnswer:
        if config.ai_provider == "mock":
            return GuideAnswer(
                answer="Modo mock: no se consultó Muse ni se generó respuesta botánica.",
                provider="mock",
                execution_status="mock",
                knowledge_version=get_atlas().version,
                correlation_id=correlation,
            )
        if not external:
            raise HTTPException(
                422, "Falta permiso para enviar consulta y contexto permitido a Meta"
            )
        client = meta_client()
        if capture_id is not None:
            try:
                await asyncio.to_thread(repository().get, owner, capture_id)
            except (psycopg.Error, ValidationError):
                raise HTTPException(503, "Evidencia de captura no disponible") from None
        ledger = ExecutionStore(config)
        reservation = await asyncio.to_thread(ledger.reserve, owner, "guide")
        started = perf_counter()
        status = "provider_error"
        failure = None
        store = repository() if config.database_url.get_secret_value() else None
        executor = partial(
            execute_tool,
            owner=owner,
            store=store,
            landscape_context=landscape_context,
            capture_id=capture_id,
        )

        def timed(name, arguments):
            begin = perf_counter()
            try:
                return executor(name, arguments)
            finally:
                timing["retrieval"] = timing.get("retrieval", 0) + (perf_counter() - begin) * 1000

        try:
            result = await query_guide(client, config.meta_model, question, TOOLS, timed)
            result.correlation_id = correlation
            status = "completed"
            return result
        except (GuideToolError, psycopg.Error, HTTPException, ValidationError):
            raise HTTPException(
                502, {"code": "tool_error", "message": "Herramienta no disponible o no autorizada"}
            ) from None
        except MetaAPIError as exc:
            # Our own sanitized reason (never provider text) so ledger rows explain failures.
            failure = str(exc)[:120]
            raise provider_error(exc, "llm_error", "Respuesta del guía no disponible") from None
        finally:
            timing["generation"] = (perf_counter() - started) * 1000 - timing.get("retrieval", 0)
            await asyncio.to_thread(
                ledger.finish,
                reservation,
                status,
                {
                    "usage": client.usage,
                    "model": config.meta_model,
                    "prompt_version": PROMPT_VERSION,
                    "correlation_id": correlation,
                    "latency_ms": (perf_counter() - started) * 1000,
                    **({"failure": failure} if failure else {}),
                },
            )

    def wilo_answer(
        session: UUID,
        transcript: Transcription | None,
        guide: GuideAnswer,
        timing: dict,
        hint: str = "auto",
    ) -> WiloAnswer:
        mock = guide.provider == "mock"
        return WiloAnswer(
            session_id=session,
            transcript=transcript.transcript if transcript else None,
            answer=guide.answer,
            speech_text=guide.speech_text,
            provider=guide.provider,
            transcription_model=transcript.model if transcript else None,
            answer_model=guide.model,
            status="mock"
            if mock
            else "insufficient_evidence"
            if guide.insufficient_evidence
            else "completed",
            insufficient_evidence=guide.insufficient_evidence,
            knowledge_version=guide.knowledge_version or get_atlas().version,
            sources=guide.sources,
            claims=guide.claims,
            entities=guide.entities,
            map=guide.map,
            tools_used=guide.tools_used,
            latency_ms={
                "transcription": transcript.latency_ms if transcript else None,
                "retrieval": timing.get("retrieval"),
                "generation": timing.get("generation"),
            },
            limitations=[*(transcript.limitations if transcript else []), *guide.limitations],
            language_hint=hint,
            correlation_id=guide.correlation_id,
        )

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
        language_hint: Annotated[LanguageHint, Form()] = "auto",
    ):
        """WAV → texto. `language_hint`: auto (sin sesgo), es, en o mixed (español+inglés)."""
        content = await read_audio(file, adult_confirmed, rights_confirmed)
        return await transcribe_audio(
            request.state.identity,
            request.state.correlation_id,
            content,
            external_processing_confirmed,
            language_hint,
        )

    async def read_audio(file: UploadFile, adult: bool, rights: bool) -> bytes:
        if not adult or not rights:
            raise HTTPException(422, "Audio requiere mayoría de edad y derechos de uso")
        if file.content_type not in {"audio/wav", "audio/x-wav", "audio/wave"}:
            raise HTTPException(415, "Requiere audio WAV")
        content = await file.read(MAX_AUDIO_BYTES + 1)
        await file.close()
        if len(content) > MAX_AUDIO_BYTES:
            raise HTTPException(413, "Audio supera 3 MiB")
        return content

    @app.post(
        "/guide/query",
        response_model=GuideAnswer,
        responses={502: {"description": "tool_error o llm_error; respuesta sanitizada"}},
    )
    async def guide(item: GuideQuery, request: Request):
        if not item.adult_confirmed:
            raise HTTPException(422, "Guía exclusivo para adultos")
        return await answer_question(
            request.state.identity,
            request.state.correlation_id,
            item.question,
            item.external_processing_confirmed,
            item.capture_id,
            {},
        )

    @app.post(
        "/guide/ask",
        response_model=WiloAnswer,
        responses={
            413: {"description": "Audio supera 3 MiB"},
            415: {"description": "Formato no admitido; requiere WAV"},
            422: {"description": "Falta audio o pregunta, o permisos"},
            502: {"description": "stt_error, tool_error o llm_error; sanitizados"},
        },
    )
    async def ask(
        request: Request,
        adult_confirmed: Annotated[bool, Form()],
        file: Annotated[UploadFile | None, File()] = None,
        question: Annotated[str | None, Form(min_length=1, max_length=2000)] = None,
        rights_confirmed: Annotated[bool, Form()] = False,
        external_processing_confirmed: Annotated[bool, Form()] = False,
        session_id: Annotated[UUID | None, Form()] = None,
        capture_id: Annotated[UUID | None, Form()] = None,
        language_hint: Annotated[LanguageHint, Form()] = "auto",
    ):
        """Audio WAV **o** texto → respuesta de Wilo con fuentes, entidades y mapa.

        Ejecuta las mismas etapas que `/guide/transcribe` + `/guide/query`, con sus propias
        reservas. Sin memoria de sesión en el servidor: `session_id` solo se devuelve.
        """
        if not adult_confirmed:
            raise HTTPException(422, "Guía exclusivo para adultos")
        if (file is None) == (question is None):
            raise HTTPException(422, "Enviar exactamente uno: audio WAV o pregunta de texto")
        transcript = None
        if file is not None:
            content = await read_audio(file, adult_confirmed, rights_confirmed)
            transcript = await transcribe_audio(
                request.state.identity,
                request.state.correlation_id,
                content,
                external_processing_confirmed,
                language_hint,
            )
            question = transcript.transcript.strip()
            if not question:
                guide_result = GuideAnswer(
                    answer="No escuché una pregunta. ¿Puedes repetirla o escribirla?",
                    provider=transcript.provider,
                    execution_status="mock" if transcript.provider == "mock" else "completed",
                    knowledge_version=get_atlas().version,
                    correlation_id=request.state.correlation_id,
                    limitations=["Transcripción vacía; no se consultó el guía."],
                )
                return wilo_answer(
                    session_id or uuid4(), transcript, guide_result, {}, language_hint
                )
        timing: dict = {}
        result = await answer_question(
            request.state.identity,
            request.state.correlation_id,
            question,
            external_processing_confirmed,
            capture_id,
            timing,
        )
        return wilo_answer(session_id or uuid4(), transcript, result, timing, language_hint)

    @app.websocket("/guide/voice/stream")
    async def voice_stream(ws: WebSocket):
        """Realtime push-to-talk proxy. Protocol in docs/WILO_API_CONTRACT.md."""
        origin_token = config.origin_auth_token.get_secret_value()
        if origin_token and not secrets.compare_digest(
            ws.headers.get("x-bosque-origin", "").encode(), origin_token.encode()
        ):
            await ws.close(1008)
            return
        await ws.accept()
        session = uuid4()
        correlation = str(uuid4())

        async def send(kind: str, **fields):
            await ws.send_json({"type": kind, "session_id": str(session), **fields})

        async def fail(code: str, message: str, close_code: int = 1008):
            await send("error", code=code, message=message)
            await ws.close(close_code)

        try:
            start = StreamStart.model_validate_json(await asyncio.wait_for(ws.receive_text(), 10))
        except (TimeoutError, ValidationError, ValueError, KeyError):
            return await fail("bad_start", "Primer mensaje: {type:start, token, permisos}")
        try:
            owner = await asyncio.to_thread(identity, config, "Bearer " + start.token)
            authorize(owner, "transcribe")
        except HTTPException as exc:
            if exc.status_code == 403:
                return await fail("forbidden", "La sesión no tiene permiso de voz")
            if exc.status_code == 503:
                return await fail("unavailable", "Servicio de sesiones no disponible", 1011)
            return await fail("unauthorized", "Sesión inválida, expirada o revocada")
        if not (start.adult_confirmed and start.rights_confirmed):
            return await fail("permissions", "Audio requiere mayoría de edad y derechos de uso")
        session = start.session_id or session
        rate = 16000 if start.audio_encoding == "PCM_16KHZ" else 24000
        limit = rate * 2 * MAX_STREAM_SECONDS
        mock = config.ai_provider != "meta"
        if not mock and not start.external_processing_confirmed:
            return await fail("permissions", "Falta permiso de procesamiento externo del audio")
        ledger = ExecutionStore(config)
        reservation = upstream = None
        received = 0
        status = "cancelled"
        try:
            if not mock:
                meta = meta_client()
                reservation = await asyncio.to_thread(ledger.reserve, owner, "transcribe")
                upstream = await connect_upstream(
                    {
                        "authorization": {
                            "accessToken": "Bearer " + meta.api_key.get_secret_value()
                        },
                        "audioEncoding": start.audio_encoding,
                        "model": MetaVoiceAdapter.model,
                        "mode": "PUSH_TO_TALK",
                        "partialMode": "CUMULATIVE",
                        "emitAudioProgress": False,
                        "keywords": voice_keywords(),
                        **(
                            {"languageBias": LANGUAGE_HINTS[start.language_hint]}
                            if LANGUAGE_HINTS[start.language_hint]
                            else {}
                        ),
                    }
                )
            await send(
                "ready",
                provider="mock" if mock else "meta",
                max_seconds=MAX_STREAM_SECONDS,
                partial_mode="replace",
            )
            started = perf_counter()
            first_partial = None
            stopped = asyncio.Event()

            async def client_to_upstream():
                nonlocal received
                while True:
                    message = await asyncio.wait_for(ws.receive(), 15)
                    if message["type"] == "websocket.disconnect":
                        return "cancel"
                    if message.get("bytes") is not None:
                        chunk = message["bytes"]
                        if len(chunk) > MAX_FRAME_BYTES or len(chunk) % 2:
                            raise ValueError("Frame PCM inválido")
                        received += len(chunk)
                        if received > limit:
                            raise OverflowError
                        if upstream:
                            await upstream.send(chunk)
                        continue
                    command = json.loads(message.get("text") or "{}").get("type")
                    if command == "stop":
                        stopped.set()
                        if upstream:
                            await upstream.send(json.dumps({"type": "endStream"}))
                        return "stop"
                    if command == "cancel":
                        return "cancel"

            async def upstream_to_client():
                nonlocal first_partial
                if upstream is None:  # mock: never transcribes, waits for the client to stop
                    await stopped.wait()
                    return ""
                async for raw in upstream:
                    event = json.loads(raw)
                    kind = event.get("type")
                    if kind == "speechStart":
                        await send("speech_start", turn_id=event.get("turnId"))
                    elif kind == "transcript" and not event.get("final"):
                        first_partial = first_partial or (perf_counter() - started) * 1000
                        # CUMULATIVE: each partial is the full hypothesis; replace, never append.
                        await send("partial", text=event.get("transcript", ""), replace=True)
                    elif kind in ("transcript", "speechComplete"):
                        return event.get("transcript", "")
                    elif kind == "error":
                        raise MetaAPIError("Error realtime del proveedor")
                raise MetaAPIError("Stream realtime cerrado sin transcripción final")

            sender = asyncio.create_task(client_to_upstream())
            receiver = asyncio.create_task(upstream_to_client())
            done, _ = await asyncio.wait({sender, receiver}, return_when=asyncio.FIRST_COMPLETED)
            if sender in done and sender.result() == "cancel":
                receiver.cancel()
                await send("cancelled")
                return await ws.close(1000)
            text = (
                await asyncio.wait_for(receiver, 20) if receiver not in done else receiver.result()
            )
            sender.cancel()
            status = "completed"
            duration_ms = received / (rate * 2) * 1000
            await send(
                "final",
                text=text,
                audio_duration_ms=round(duration_ms),
                provider="mock" if mock else "meta",
                first_partial_ms=round(first_partial) if first_partial else None,
            )
            if start.answer and text.strip():
                await send("answer_started")
                timing: dict = {}
                transcript = Transcription(
                    transcript=text,
                    provider="meta",
                    model=MetaVoiceAdapter.model,
                    execution_status="completed",
                    audio_duration_ms=min(duration_ms, 60000),
                    latency_ms=(perf_counter() - started) * 1000,
                )
                try:
                    guide_result = await answer_question(
                        owner, correlation, text, start.external_processing_confirmed, None, timing
                    )
                except HTTPException as exc:
                    detail = exc.detail if isinstance(exc.detail, dict) else {"code": "error"}
                    return await fail(detail.get("code", "error"), "Guía no disponible", 1011)
                await send(
                    "answer",
                    answer=wilo_answer(
                        session, transcript, guide_result, timing, start.language_hint
                    ).model_dump(mode="json"),
                )
            await send("done")
            await ws.close(1000)
        except OverflowError:
            status = "validation_error"
            await fail("duration_exceeded", f"Máximo {MAX_STREAM_SECONDS} s de audio")
        except (ValueError, TimeoutError):
            status = "validation_error"
            await fail("bad_audio", "Frames PCM 16 bits mono, máximo 64 KiB, sin pausas largas")
        except HTTPException as exc:
            await fail(
                "unavailable" if exc.status_code != 429 else "rate_limited",
                "Consumo o proveedor no disponible",
                1013,
            )
        except (MetaAPIError, OSError):
            status = "provider_error"
            await fail("stt_error", "Transcripción en tiempo real no disponible", 1011)
        finally:
            if upstream:
                await upstream.close()
            if reservation:
                await asyncio.to_thread(
                    ledger.finish,
                    reservation,
                    status,
                    {
                        "usage": {"audio_duration_ms": round(received / (rate * 2) * 1000)},
                        "model": MetaVoiceAdapter.model,
                        "mode": "realtime_push_to_talk",
                        "correlation_id": correlation,
                    },
                )
