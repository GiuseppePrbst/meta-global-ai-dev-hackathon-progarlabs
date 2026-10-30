import asyncio
import json

import httpx
import pytest
from bosque_ai.contracts import Identification
from bosque_ai.evaluation import (
    EvaluationCase,
    EvaluationResult,
    summarize,
    validate_cases,
)
from bosque_ai.meta import (
    MetaAPIError,
    MetaResponsesClient,
    MuseSparkAdapter,
    SAMAdapter,
)
from bosque_ai.segmentation import SegmentationRequest, parse_segmentation
from pydantic import SecretStr


@pytest.mark.parametrize(
    "content",
    [
        "invalid",
        '{"candidates":[]}',
        json.dumps(
            {
                "candidates": [{"species_id": "unknown", "evidence": "visible"}],
                "limitations": [],
                "message": "test",
            }
        ),
    ],
)
async def test_provider_invalid_analysis_never_becomes_abstention(content):
    transport = httpx.MockTransport(
        lambda r: httpx.Response(
            200,
            json={
                "choices": [{"finish_reason": "stop", "message": {"content": content}}]
            },
        )
    )
    adapter = MuseSparkAdapter(
        MetaResponsesClient(SecretStr("test"), transport=transport)
    )
    with pytest.raises(MetaAPIError):
        await adapter.identify(b"synthetic", "image/jpeg", {"valid": "Valid species"})


async def test_total_deadline_does_not_depend_on_transport_timeout():
    async def handle(request):
        await asyncio.sleep(0.05)
        return httpx.Response(200)

    client = MetaResponsesClient(
        SecretStr("test"), timeout_seconds=0.01, transport=httpx.MockTransport(handle)
    )
    with pytest.raises(MetaAPIError, match="tiempo"):
        await client.output_text("test", "test", b"synthetic", "image/jpeg")


@pytest.mark.parametrize(
    "choices", [None, [], [None], [{"finish_reason": "stop", "message": None}]]
)
async def test_malformed_chat_envelope_is_sanitized(choices):
    client = MetaResponsesClient(
        SecretStr("test"),
        transport=httpx.MockTransport(
            lambda r: httpx.Response(200, json={"choices": choices})
        ),
    )
    with pytest.raises(MetaAPIError):
        await MuseSparkAdapter(client).identify(b"synthetic", "image/jpeg", {})


def test_sam_empty_is_valid_but_malformed_is_not():
    request = SegmentationRequest(width=4, height=3)
    assert parse_segmentation("", request, "sam-3.1").status == "no_matches"
    with pytest.raises(MetaAPIError):
        parse_segmentation("garbage", request, "sam-3.1")


async def test_sam_failure_is_optional_and_typed():
    adapter = SAMAdapter(
        MetaResponsesClient(
            SecretStr("test"),
            transport=httpx.MockTransport(lambda r: httpx.Response(429)),
        )
    )
    result = await adapter.segment_typed(
        b"synthetic", "image/jpeg", SegmentationRequest(width=4, height=3)
    )
    assert result.status == "error" and result.masks == []


def case(**kwargs):
    return EvaluationCase(
        case_id="one",
        species_id="valid",
        file="image.png",
        sha256="0" * 64,
        license="test",
        source="synthetic",
        authorized=True,
        photo_type="leaf",
        reviewer="test",
        individual_id="one",
        partition="test",
        validation_status="validated",
        **kwargs,
    )


def test_evaluation_never_scores_mocks_and_counts_real_abstention():
    mock = Identification(
        status="insufficient_evidence", provider="mock", message="mock"
    )
    result = EvaluationResult(
        case_id="one", provider="mock", identification=mock, total_latency_ms=1
    )
    assert summarize([case()], [result])["top1"] is None
    real = Identification(
        status="insufficient_evidence",
        provider="meta",
        model="test",
        execution_status="completed",
        message="abstain",
    )
    result = EvaluationResult(
        case_id="one", provider="meta", identification=real, total_latency_ms=1
    )
    summary = summarize([case()], [result])
    assert summary["top1"] == 0 and summary["abstentions"] == 1


def test_evaluation_rejects_leakage_and_unknown_taxa():
    one = case()
    two = one.model_copy(
        update={"case_id": "two", "partition": "development", "sha256": "1" * 64}
    )
    with pytest.raises(ValueError, match="Fuga"):
        validate_cases([one, two], {"valid"})
    with pytest.raises(ValueError, match="Etiqueta"):
        validate_cases([one], {"other"})
