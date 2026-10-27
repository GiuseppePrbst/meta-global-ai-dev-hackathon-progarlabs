import base64
import json
import logging
from typing import Any

import httpx
from pydantic import SecretStr

logger = logging.getLogger(__name__)


class MetaAPIError(RuntimeError):
    """Error público sin incluir claves, imágenes ni respuesta del proveedor."""


class MetaResponsesClient:
    """Transporte Responses documentado por Meta; no es un identificador validado."""

    def __init__(
        self,
        api_key: SecretStr,
        timeout_seconds: float = 30,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        if not api_key.get_secret_value().strip():
            raise ValueError("MODEL_API_KEY no configurada")
        if not 0 < timeout_seconds <= 120:
            raise ValueError("Timeout debe estar entre 0 y 120 segundos")
        self.api_key = api_key
        self.timeout_seconds = timeout_seconds
        self.transport = transport

    async def output_text(
        self,
        model: str,
        prompt: str,
        image: bytes,
        content_type: str,
        *,
        stream: bool = False,
    ) -> str:
        data_url = f"data:{content_type};base64,{base64.b64encode(image).decode()}"
        payload = {
            "model": model,
            "input": [
                {
                    "type": "message",
                    "role": "user",
                    "content": [
                        {"type": "input_text", "text": prompt},
                        {"type": "input_image", "image_url": data_url},
                    ],
                }
            ],
            "stream": stream,
            "store": False,
        }
        try:
            async with httpx.AsyncClient(
                base_url="https://api.meta.ai/v1/",
                headers={"Authorization": f"Bearer {self.api_key.get_secret_value()}"},
                timeout=httpx.Timeout(self.timeout_seconds),
                transport=self.transport,
                follow_redirects=False,
            ) as client:
                if stream:
                    chunks: list[str] = []
                    completed = False
                    async with client.stream(
                        "POST", "responses", json=payload
                    ) as response:
                        response.raise_for_status()
                        async for line in response.aiter_lines():
                            if not line.startswith("data: ") or line == "data: [DONE]":
                                continue
                            event = json.loads(line[6:])
                            if not isinstance(event, dict):
                                raise MetaAPIError("Meta devolvió un evento inválido")
                            if event.get("type") in ("error", "response.failed"):
                                raise MetaAPIError(
                                    "Meta no pudo completar la respuesta"
                                )
                            if event.get("type") == "response.output_text.delta":
                                chunks.append(event["delta"])
                            if event.get("type") == "response.completed":
                                completed = True
                    if not completed:
                        raise MetaAPIError("Meta devolvió un stream incompleto")
                    text = "".join(chunks)
                else:
                    response = await client.post("responses", json=payload)
                    response.raise_for_status()
                    body: dict[str, Any] = response.json()
                    if not isinstance(body, dict):
                        raise MetaAPIError("Meta devolvió una respuesta inválida")
                    if body.get("status") != "completed":
                        raise MetaAPIError("Meta devolvió una respuesta incompleta")
                    text = "".join(
                        part["text"]
                        for item in body.get("output", [])
                        if isinstance(item, dict) and item.get("type") == "message"
                        for part in item.get("content", [])
                        if isinstance(part, dict) and part.get("type") == "output_text"
                    )
                if not text:
                    raise MetaAPIError("Meta no devolvió texto interpretable")
                return text
        except httpx.TimeoutException:
            logger.warning("meta_request_failed reason=timeout")
            raise MetaAPIError("Meta excedió el tiempo de espera") from None
        except httpx.HTTPStatusError as exc:
            logger.warning("meta_request_failed status=%s", exc.response.status_code)
            raise MetaAPIError("Meta rechazó la solicitud") from None
        except (httpx.RequestError, ValueError, KeyError, TypeError):
            logger.warning("meta_request_failed reason=transport_or_protocol")
            raise MetaAPIError("No se pudo interpretar la respuesta de Meta") from None


class MuseSparkAdapter:
    def __init__(self, client: MetaResponsesClient, model: str = "muse-spark-1.3"):
        self.client = client
        self.model = model

    async def describe(self, image: bytes, content_type: str) -> str:
        return await self.client.output_text(
            self.model,
            "Describe solo rasgos botánicos visibles. Expresa incertidumbre y no inventes probabilidades.",
            image,
            content_type,
        )


class SAMAdapter:
    def __init__(self, client: MetaResponsesClient, model: str = "sam-3.1"):
        self.client = client
        self.model = model

    async def segment(self, image: bytes, content_type: str) -> str:
        # shortcut: devuelve el protocolo SAM crudo; integrar parser oficial antes de usar máscaras.
        return await self.client.output_text(
            self.model, "tree", image, content_type, stream=True
        )
