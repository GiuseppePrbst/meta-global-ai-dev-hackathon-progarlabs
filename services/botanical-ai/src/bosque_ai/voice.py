"""Ephemeral push-to-talk WAV validation and documented Meta ASR wire contract."""

import json
import wave
from io import BytesIO
from time import perf_counter
from typing import Literal

from pydantic import BaseModel, Field

from bosque_ai.meta import MetaAPIError, MetaResponsesClient

MAX_AUDIO_BYTES = 3 * 1024 * 1024
# Meta publishes no keyword limit (schemas page, 2026-11-03); this local cap keeps the
# request small and was exercised against the real API (docs/WILO_ASR_REAL_EVALUATION.md).
MAX_KEYWORDS = 100
# Not in the published schema; the real API answers 400 "ASR keyword N exceeds the
# maximum length of 30 characters" (2026-11-03).
MAX_KEYWORD_CHARS = 30
LANGUAGE_BIAS = ["Spanish"]  # language names, as in Meta's examples ("English")
# Internal hints mapped to values the real API accepted (03-11); "auto" sends no bias.
LANGUAGE_HINTS = {
    "auto": None,
    "es": ["Spanish"],
    "en": ["English"],
    "mixed": ["Spanish", "English"],
}
KEYWORDS = [
    "Coigüe",
    "Ulmo",
    "Tepa",
    "Laurel",
    "Tineo",
    "Lenga",
    "Olivillo",
    "Nothofagus",
    "Nothofagus dombeyi",
    "Laureliopsis philippiana",
]


class Transcription(BaseModel):
    transcript: str = Field(max_length=8000)
    provider: Literal["mock", "meta"]
    model: str | None = None
    execution_status: Literal["mock", "completed"]
    audio_duration_ms: float = Field(ge=0, le=60000)
    latency_ms: float = Field(ge=0)
    usage: dict[str, int] = Field(default_factory=dict)
    correlation_id: str | None = None
    provider_session_id: str | None = None
    turns: list[dict] = Field(default_factory=list)
    limitations: list[str] = Field(default_factory=list)


def keyword_list(terms) -> list[str]:
    """Deduplicated, bounded keyword list; order is priority (product, places, taxa)."""
    seen, out = set(), []
    for term in terms:
        term = " ".join(str(term).split())
        if 2 <= len(term) <= MAX_KEYWORD_CHARS and term.casefold() not in seen:
            seen.add(term.casefold())
            out.append(term)
    return out[:MAX_KEYWORDS]


def prepare_audio(content: bytes) -> tuple[bytes, float]:
    if len(content) > MAX_AUDIO_BYTES:
        raise ValueError("Audio supera 3 MiB")
    try:
        with wave.open(BytesIO(content), "rb") as recording:
            if (
                recording.getnchannels() != 1
                or recording.getsampwidth() != 2
                or recording.getframerate() not in (16000, 24000)
                or recording.getcomptype() != "NONE"
            ):
                raise ValueError("Requiere WAV mono PCM 16 bits a 16 o 24 kHz")
            frames = recording.getnframes()
            duration = frames / recording.getframerate()
            if not 0 < duration <= 60:
                raise ValueError("Audio debe durar más de 0 y hasta 60 segundos")
            pcm = recording.readframes(frames)
            if len(pcm) != frames * 2:
                raise ValueError("Audio truncado")
            output = BytesIO()
            with wave.open(output, "wb") as clean:
                clean.setparams(recording.getparams())
                clean.writeframes(pcm)
        return output.getvalue(), duration * 1000
    except (wave.Error, EOFError, OSError):
        raise ValueError("Audio WAV inválido") from None


class MetaVoiceAdapter:
    model = "muse-voice-transcribe-1.0"

    def __init__(
        self,
        client: MetaResponsesClient,
        keywords: list[str] | None = None,
        language_bias: list[str] | None = LANGUAGE_BIAS,
        mode: Literal["PUSH_TO_TALK", "ENDPOINTING"] = "PUSH_TO_TALK",
    ):
        self.client = client
        self.keywords = keyword_list(KEYWORDS if keywords is None else keywords)
        self.language_bias = language_bias
        self.mode = mode

    def request(self) -> dict:
        body = {"model": self.model, "mode": self.mode, "audioEncoding": "WAV"}
        if self.language_bias:
            body["languageBias"] = self.language_bias
        if self.keywords:
            body["keywords"] = self.keywords
        return body

    async def transcribe(self, audio: bytes, duration_ms: float) -> Transcription:
        started = perf_counter()
        body = await self.client.request_json(
            "asr/transcribe",
            files={
                "request": (None, json.dumps(self.request()), "application/json"),
                "audio": ("recording.wav", audio, "audio/wav"),
            },
        )
        text = body.get("transcript")
        if not isinstance(text, str) or len(text) > 8000:
            raise MetaAPIError("Transcripción Meta inválida")
        # Local decoded duration remains trustworthy even if upstream usage is absent.
        usage = {"audio_duration_ms": round(duration_ms)}
        if isinstance(body.get("audioDurationMs"), int):
            usage["provider_audio_duration_ms"] = body["audioDurationMs"]
        turns = body.get("turns") if isinstance(body.get("turns"), list) else []
        return Transcription(
            transcript=text,
            provider="meta",
            model=self.model,
            execution_status="completed",
            audio_duration_ms=duration_ms,
            latency_ms=(perf_counter() - started) * 1000,
            usage=usage,
            provider_session_id=body.get("sessionId")
            if isinstance(body.get("sessionId"), str)
            else None,
            turns=[
                {k: t.get(k) for k in ("turnId", "startMs", "endMs", "transcript")}
                for t in turns[:50]
                if isinstance(t, dict)
            ],
        )
