"""Ephemeral push-to-talk WAV validation and documented Meta ASR wire contract."""

import json
import wave
from io import BytesIO
from time import perf_counter
from typing import Literal

from pydantic import BaseModel, Field

from bosque_ai.meta import MetaAPIError, MetaResponsesClient

MAX_AUDIO_BYTES = 3 * 1024 * 1024
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
    limitations: list[str] = Field(default_factory=list)


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

    def __init__(self, client: MetaResponsesClient):
        self.client = client

    async def transcribe(self, audio: bytes, duration_ms: float) -> Transcription:
        started = perf_counter()
        body = await self.client.request_json(
            "asr/transcribe",
            files={
                "request": (
                    None,
                    json.dumps(
                        {
                            "model": self.model,
                            "mode": "PUSH_TO_TALK",
                            "audioEncoding": "WAV",
                            "languageBias": ["spanish"],
                            "keywords": KEYWORDS,
                        }
                    ),
                    "application/json",
                ),
                "audio": ("recording.wav", audio, "audio/wav"),
            },
        )
        text = body.get("transcript")
        if not isinstance(text, str) or len(text) > 8000:
            raise MetaAPIError("Transcripción Meta inválida")
        # Local decoded duration remains trustworthy even if upstream usage is absent.
        usage = {"audio_duration_ms": round(duration_ms)}
        return Transcription(
            transcript=text,
            provider="meta",
            model=self.model,
            execution_status="completed",
            audio_duration_ms=duration_ms,
            latency_ms=(perf_counter() - started) * 1000,
            usage=usage,
        )
