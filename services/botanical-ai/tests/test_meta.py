import json

import httpx
import pytest
from bosque_ai.contracts import Candidate, Identification, MockIdentifier
from bosque_ai.meta import (
    MetaAPIError,
    MetaResponsesClient,
    MuseSparkAdapter,
    SAMAdapter,
)
from pydantic import SecretStr, ValidationError


@pytest.mark.asyncio
async def test_mock_is_explicit_abstention():
    result = await MockIdentifier().identify(b"synthetic", "image/png")
    assert result.provider == "mock"
    assert result.candidates == []
    assert result.status == "insufficient_evidence"


def test_mock_cannot_be_mislabelled_as_real_inference():
    with pytest.raises(ValidationError):
        Identification(
            status="candidates",
            provider="mock",
            candidates=[
                Candidate(species_id="nothofagus-dombeyi", evidence="invented")
            ],
            message="not permitted",
        )


@pytest.mark.asyncio
async def test_muse_request_uses_documented_responses_envelope():
    def handle(request):
        assert str(request.url) == "https://api.meta.ai/v1/responses"
        assert request.headers["Authorization"] == "Bearer test-placeholder"
        body = json.loads(request.content)
        assert body["model"] == "muse-spark-1.3"
        assert body["store"] is False
        assert body["input"][0]["content"][1]["image_url"].startswith(
            "data:image/png;base64,"
        )
        return httpx.Response(
            200,
            json={
                "status": "completed",
                "output": [
                    {
                        "type": "message",
                        "content": [{"type": "output_text", "text": "Hojas visibles"}],
                    }
                ],
            },
        )

    client = MetaResponsesClient(
        SecretStr("test-placeholder"), transport=httpx.MockTransport(handle)
    )
    assert (
        await MuseSparkAdapter(client).describe(b"synthetic", "image/png")
        == "Hojas visibles"
    )


@pytest.mark.asyncio
async def test_sam_reads_stream_without_pretending_to_parse_masks():
    def handle(request):
        body = json.loads(request.content)
        assert body["model"] == "sam-3.1"
        assert body["stream"] is True
        assert body["input"][0]["content"][0]["text"] == "tree"
        return httpx.Response(
            200,
            text='data: {"type":"response.output_text.delta","delta":"<0f>"}\n\n'
            'data: {"type":"response.completed"}\n\ndata: [DONE]\n\n',
        )

    client = MetaResponsesClient(
        SecretStr("test-placeholder"), transport=httpx.MockTransport(handle)
    )
    assert await SAMAdapter(client).segment(b"synthetic", "image/png") == "<0f>"


@pytest.mark.asyncio
@pytest.mark.parametrize("status", [401, 429, 500])
async def test_http_errors_do_not_expose_provider_payload_or_key(status, caplog):
    def handle(request):
        return httpx.Response(status, text="sensitive-image-data")

    client = MetaResponsesClient(
        SecretStr("test-placeholder"), transport=httpx.MockTransport(handle)
    )
    with pytest.raises(MetaAPIError) as error:
        await MuseSparkAdapter(client).describe(b"sensitive-image-data", "image/png")
    assert "sensitive-image-data" not in str(error.value) + caplog.text
    assert "test-placeholder" not in str(error.value) + caplog.text


@pytest.mark.asyncio
async def test_timeout_is_sanitized():
    def handle(request):
        raise httpx.ReadTimeout("sensitive timeout", request=request)

    client = MetaResponsesClient(
        SecretStr("test-placeholder"), transport=httpx.MockTransport(handle)
    )
    with pytest.raises(MetaAPIError, match="tiempo de espera"):
        await MuseSparkAdapter(client).describe(b"synthetic", "image/png")


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "response",
    [
        httpx.Response(200, text="not json"),
        httpx.Response(200, json=[]),
        httpx.Response(200, text="null"),
        httpx.Response(200, json={"status": "completed", "output": ["invalid"]}),
        httpx.Response(200, json={"status": "failed", "output": []}),
        httpx.Response(200, json={"status": "completed", "output": []}),
    ],
)
async def test_invalid_or_incomplete_response_is_not_success(response):
    client = MetaResponsesClient(
        SecretStr("test-placeholder"),
        transport=httpx.MockTransport(lambda request: response),
    )
    with pytest.raises(MetaAPIError):
        await MuseSparkAdapter(client).describe(b"synthetic", "image/png")


@pytest.mark.asyncio
async def test_incomplete_sam_stream_is_rejected():
    client = MetaResponsesClient(
        SecretStr("test-placeholder"),
        transport=httpx.MockTransport(
            lambda request: httpx.Response(
                200,
                text='data: {"type":"response.output_text.delta","delta":"partial"}\n\n',
            )
        ),
    )
    with pytest.raises(MetaAPIError, match="incompleto"):
        await SAMAdapter(client).segment(b"synthetic", "image/png")


@pytest.mark.asyncio
@pytest.mark.parametrize("event", ['"sensitive-image-data"', "null", "[]"])
async def test_scalar_sam_event_is_sanitized(event, caplog):
    client = MetaResponsesClient(
        SecretStr("test-placeholder"),
        transport=httpx.MockTransport(
            lambda request: httpx.Response(200, text=f"data: {event}\n\n")
        ),
    )
    with pytest.raises(MetaAPIError, match="evento inválido") as error:
        await SAMAdapter(client).segment(b"synthetic", "image/png")
    assert "sensitive-image-data" not in str(error.value) + caplog.text
    assert "test-placeholder" not in str(error.value) + caplog.text


def test_missing_key_and_invalid_timeout_are_rejected():
    with pytest.raises(ValueError, match="MODEL_API_KEY"):
        MetaResponsesClient(SecretStr(""))
    with pytest.raises(ValueError, match="Timeout"):
        MetaResponsesClient(SecretStr("test-placeholder"), timeout_seconds=0)
