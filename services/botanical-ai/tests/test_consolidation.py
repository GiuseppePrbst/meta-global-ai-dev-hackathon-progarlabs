import json

import httpx
import pytest
from bosque_ai.evaluation import EvaluationCase, summarize, validate_cases
from bosque_ai.meta import MetaResponsesClient, MuseSparkAdapter
from pydantic import SecretStr


async def test_typed_analysis_records_only_usage_and_controlled_knowledge():
    def handle(request):
        data = json.loads(request.content)
        assert data["max_completion_tokens"] == 1200
        # Reasoning shares the cap; default effort truncated real photos.
        assert data["reasoning_effort"] == "minimal"
        assert "pending" in data["messages"][0]["content"][0]["text"]
        return httpx.Response(
            200,
            json={
                "choices": [
                    {
                        "finish_reason": "stop",
                        "message": {
                            "content": json.dumps(
                                {
                                    "candidates": [],
                                    "message": "Otra fotografía",
                                    "limitations": ["Dibujo sintético"],
                                }
                            )
                        },
                    }
                ],
                "usage": {
                    "prompt_tokens": 40,
                    "completion_tokens": 20,
                    "total_tokens": 60,
                    "private": "never retained",
                },
            },
        )

    client = MetaResponsesClient(
        SecretStr("test"), transport=httpx.MockTransport(handle)
    )
    result = await MuseSparkAdapter(client).identify(
        b"synthetic",
        "image/jpeg",
        {"id": "Name"},
        knowledge={"id": {"trait_validation_status": "pending"}},
    )
    assert result.status == "insufficient_evidence"
    assert result.usage == {
        "prompt_tokens": 40,
        "completion_tokens": 20,
        "total_tokens": 60,
    }
    assert result.prompt_version == "botanical-multiview-v3"


@pytest.mark.parametrize("group", ["campaign_id", "spatial_block", "perceptual_group"])
def test_evaluation_prevents_group_leakage(group):
    case = EvaluationCase(
        case_id="one",
        species_id=None,
        file="synthetic.png",
        sha256="1" * 64,
        license="synthetic",
        source="synthetic",
        authorized=True,
        photo_type="ground",
        reviewer="human",
        individual_id="one",
        partition="development",
        validation_status="synthetic",
        campaign_id="campaign-one",
        spatial_block="block-one",
        perceptual_group="group-one",
    )
    second = case.model_copy(
        update={
            "case_id": "two",
            "individual_id": "two",
            "partition": "test",
            "sha256": "2" * 64,
            "campaign_id": "campaign-two",
            "spatial_block": "block-two",
            "perceptual_group": "group-two",
            group: getattr(case, group),
        }
    )
    with pytest.raises(ValueError, match="Fuga"):
        validate_cases([case, second], set())


def test_empty_dataset_never_claims_metrics():
    result = summarize([], [])
    assert result["status"] == "not_evaluated"
    assert result["top1"] is None and result["false_positives"] is None
