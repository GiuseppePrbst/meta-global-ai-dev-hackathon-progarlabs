"""Open-set identification: contract, prompts, acceptance, verification. MockTransport only."""

import json

import httpx
import pytest
from bosque_ai import open_set
from bosque_ai.contracts import Identification
from bosque_ai.meta import MetaAPIError, MetaResponsesClient, MuseSparkAdapter
from pydantic import SecretStr, ValidationError

CATALOG = {
    "nothofagus-pumilio": "Nothofagus pumilio",
    "podocarpus-nubigenus": "Podocarpus nubigenus",
}
COMPARATORS = [
    {
        "scientific_name": "Nothofagus antarctica",
        "confused_with": ["nothofagus-pumilio"],
        "diagnostic_traits": ["Margen irregularmente dentado."],
    },
    {
        "scientific_name": "Saxegothaea conspicua",
        "confused_with": ["podocarpus-nubigenus"],
        "diagnostic_traits": ["Envés con bandas glaucas."],
    },
]
TRAITS = {"nothofagus-pumilio": ["Margen crenado con dos lóbulos entre nervaduras."]}


def analysis(assessment="supported_candidate", candidates=None, observed=None, **extra):
    return {
        "candidates": [
            {"species_id": "nothofagus-pumilio", "evidence": "margen crenado"}
        ]
        if candidates is None
        else candidates,
        "limitations": [],
        "message": "Análisis sintético",
        "observed_traits": ["margen crenado"] if observed is None else observed,
        "missing_traits": [],
        "recommended_next_photo": None,
        "catalog_assessment": assessment,
        "similar_out_of_catalog": [],
        **extra,
    }


def transport(*bodies, finish="stop", seen=None):
    queue = list(bodies)

    def handle(request):
        if seen is not None:
            seen.append(json.loads(request.content))
        return httpx.Response(
            200,
            json={
                "choices": [
                    {
                        "finish_reason": finish,
                        "message": {"content": json.dumps(queue.pop(0))},
                    }
                ],
                "usage": {
                    "prompt_tokens": 100,
                    "completion_tokens": 50,
                    "total_tokens": 150,
                },
            },
        )

    return MetaResponsesClient(SecretStr("test"), transport=httpx.MockTransport(handle))


async def identify(client, strategy, images=0):
    return await MuseSparkAdapter(client).identify(
        b"synthetic",
        "image/jpeg",
        CATALOG,
        additional_images=[(b"view", "image/jpeg")] * images or None,
        strategy=strategy,
        comparators=COMPARATORS,
        traits=TRAITS,
    )


async def test_valid_species_is_accepted_and_presented():
    seen = []
    result = await identify(transport(analysis(), seen=seen), "abstain")
    assert (
        result.acceptance == "accepted"
        and result.accepted_species_id == "nothofagus-pumilio"
    )
    assert (
        result.status == "candidates"
        and result.catalog_assessment == "supported_candidate"
    )
    assert seen[0]["max_completion_tokens"] == 1600
    assert "CONJUNTO ABIERTO" in seen[0]["messages"][0]["content"][0]["text"]
    assert (
        "Saxegothaea" not in seen[0]["messages"][0]["content"][0]["text"]
    )  # B has no comparators


@pytest.mark.parametrize(
    ("body", "assessment"),
    [
        # Look-alike outside the catalog: hypothesis kept, never presented.
        (
            analysis(
                "out_of_catalog_suspected",
                similar_out_of_catalog=["Nothofagus antarctica"],
            ),
            "out_of_catalog_suspected",
        ),
        (
            analysis("non_diagnostic_photo", candidates=[], observed=[]),
            "non_diagnostic_photo",
        ),  # blurry/landscape
        (
            analysis("insufficient_evidence", candidates=[]),
            "insufficient_evidence",
        ),  # unknown organ
        # Model claims support but reports a contradiction: downgraded.
        (
            analysis(
                candidates=[
                    {
                        "species_id": "nothofagus-pumilio",
                        "evidence": "x",
                        "contradictory_evidence": ["hoja dentada irregular"],
                    }
                ]
            ),
            "insufficient_evidence",
        ),
        (
            analysis(observed=[]),
            "insufficient_evidence",
        ),  # no observed trait behind the claim
    ],
)
async def test_abstention_states_never_present_candidates(body, assessment):
    result = await identify(transport(body), "abstain")
    assert result.status == "insufficient_evidence" and result.candidates == []
    assert (
        result.acceptance == "not_accepted" and result.catalog_assessment == assessment
    )
    # Hypotheses survive for review but are never presented as an identification.
    assert all(c.species_id in CATALOG for c in result.exploratory_candidates)


async def test_comparators_prompt_and_verification_only_when_accepted():
    seen = []
    result = await identify(
        transport(
            analysis(),
            {
                "verdict": "contradicted",
                "supporting_traits": [],
                "contradicting_traits": ["margen dentado irregular"],
                "more_likely_comparator": "Nothofagus antarctica",
            },
            seen=seen,
        ),
        "verify",
    )
    assert len(seen) == 2  # identification + verification
    verification_prompt = seen[1]["messages"][0]["content"][0]["text"]
    assert (
        "Nothofagus antarctica" in verification_prompt
        and "Saxegothaea" not in verification_prompt
    )
    assert seen[1]["max_completion_tokens"] == 800
    assert (
        result.acceptance == "not_accepted"
        and result.catalog_assessment == "out_of_catalog_suspected"
    )
    assert result.similar_out_of_catalog == ["Nothofagus antarctica"]
    assert set(result.stage_usage) == {"identification", "verification"}
    seen.clear()
    await identify(
        transport(analysis("insufficient_evidence", candidates=[]), seen=seen), "verify"
    )
    assert len(seen) == 1  # abstention: no second paid call
    seen.clear()
    await identify(transport(analysis(), seen=seen), "comparators")
    assert "Saxegothaea conspicua" in seen[0]["messages"][0]["content"][0]["text"]


async def test_baseline_payload_and_contract_are_unchanged():
    seen = []
    body = {"candidates": [], "message": "x", "limitations": []}
    result = await identify(transport(body, seen=seen), "baseline")
    schema = seen[0]["response_format"]["json_schema"]["schema"]
    assert "catalog_assessment" not in schema["properties"]
    assert seen[0]["max_completion_tokens"] == 1200
    assert (
        result.catalog_assessment == "not_assessed"
        and result.acceptance == "not_applicable"
    )
    assert result.prompt_version == "botanical-multiview-v3"
    legacy = {"status": "insufficient_evidence", "provider": "mock", "message": "x"}
    assert Identification.model_validate(legacy).acceptance == "not_applicable"


@pytest.mark.parametrize(
    ("body", "finish"),
    [
        ({"candidates": "malformed"}, "stop"),
        (
            analysis(
                candidates=[{"species_id": "lophozonia-obliqua", "evidence": "x"}]
            ),
            "stop",
        ),  # ID outside catalog
        (analysis(), "length"),  # truncated at the token cap
    ],
)
async def test_malformed_foreign_or_truncated_responses_are_provider_errors(
    body, finish
):
    with pytest.raises(MetaAPIError):
        await identify(transport(body, finish=finish), "abstain")


async def test_meta_http_error_and_unknown_strategy():
    failing = MetaResponsesClient(
        SecretStr("test"), transport=httpx.MockTransport(lambda r: httpx.Response(500))
    )
    with pytest.raises(MetaAPIError):
        await identify(failing, "abstain")
    with pytest.raises(ValueError, match="Estrategia"):
        await identify(transport(analysis()), "always-accept")


@pytest.mark.parametrize("extra", [0, 1, 2])
async def test_multiview_one_to_three_views_of_same_individual(extra):
    seen = []
    await identify(transport(analysis(), seen=seen), "abstain", images=extra)
    assert (
        len([c for c in seen[0]["messages"][0]["content"] if c["type"] == "image_url"])
        == extra + 1
    )


async def test_more_than_three_views_rejected_before_any_call():
    seen = []
    with pytest.raises(ValueError, match="tres"):
        await identify(transport(analysis(), seen=seen), "abstain", images=3)
    assert seen == []


def test_contract_rejects_incoherent_acceptance():
    base = {
        "provider": "meta",
        "model": "m",
        "execution_status": "completed",
        "message": "x",
    }
    candidate = {"species_id": "a", "evidence": "e"}
    with pytest.raises(ValidationError):  # accepted without supported assessment
        Identification(
            **base,
            status="candidates",
            candidates=[candidate],
            acceptance="accepted",
            accepted_species_id="a",
        )
    with pytest.raises(ValidationError):  # not accepted but still presented
        Identification(
            **base,
            status="candidates",
            candidates=[candidate],
            acceptance="not_accepted",
        )
    with pytest.raises(ValidationError):  # accepted ID is not the first candidate
        Identification(
            **base,
            status="candidates",
            candidates=[candidate],
            acceptance="accepted",
            accepted_species_id="b",
            catalog_assessment="supported_candidate",
        )


def test_comparator_retrieval_is_selective():
    assert "Saxegothaea" not in open_set.comparator_block(
        COMPARATORS, {"nothofagus-pumilio"}
    )
    assert open_set.comparator_block(COMPARATORS, {"unrelated"}) == ""
