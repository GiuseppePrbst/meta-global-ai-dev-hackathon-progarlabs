"""Provider 429 handling, backoff, resume without duplicates and stage-1 reuse."""

import json
import sys
from pathlib import Path
from typing import ClassVar

import httpx
import pytest
from bosque_ai.contracts import Identification
from bosque_ai.meta import MetaAPIError, MetaResponsesClient, MetaRetryableError
from PIL import Image
from pydantic import SecretStr

sys.path.insert(0, str(Path(__file__).parents[3]))
from evaluations import botanical_campaign as campaign


@pytest.mark.parametrize(
    ("status", "headers", "retryable", "after"),
    [
        (429, {"Retry-After": "15"}, True, 15.0),
        (503, {}, True, None),
        (500, {"Retry-After": "soon"}, True, None),
        (400, {}, False, None),
        (413, {}, False, None),
    ],
)
async def test_provider_errors_are_classified_per_meta_docs(
    status, headers, retryable, after
):
    client = MetaResponsesClient(
        SecretStr("test"),
        transport=httpx.MockTransport(
            lambda r: httpx.Response(status, headers=headers)
        ),
    )
    with pytest.raises(MetaAPIError) as error:
        await client.output_text(
            "muse-spark-1.3", "x", b"img", "image/jpeg", schema={"type": "object"}
        )
    assert isinstance(error.value, MetaRetryableError) is retryable
    if retryable:
        assert error.value.status == status and error.value.retry_after == after


async def test_backoff_honors_retry_after_and_never_retries_permanent_errors():
    delays, calls = [], []

    async def sleep(seconds):
        delays.append(seconds)

    async def rate_limited_twice():
        calls.append(1)
        if len(calls) < 3:
            raise MetaRetryableError("limited", 429, 15.0)
        return "ok"

    assert await campaign.with_backoff(rate_limited_twice, sleep=sleep) == "ok"
    assert len(calls) == 3 and all(d >= 15 for d in delays)

    async def permanent():
        calls.append(1)
        raise MetaAPIError("truncated")

    calls.clear()
    with pytest.raises(MetaAPIError):
        await campaign.with_backoff(permanent, sleep=sleep)
    assert len(calls) == 1

    async def always_limited():
        raise MetaRetryableError("limited", 503, None)

    with pytest.raises(MetaRetryableError):
        await campaign.with_backoff(always_limited, attempts=3, sleep=sleep)


class FakeLedger:
    reserved: ClassVar[list] = []

    def __init__(self, config):
        pass

    def reserve(self, owner, operation, *cap):
        FakeLedger.reserved.append((owner, cap))
        return len(FakeLedger.reserved)

    def finish(self, *args):
        pass


def identification(**extra):
    return Identification(
        status="candidates",
        provider="meta",
        model="muse-spark-1.3",
        execution_status="completed",
        message="x",
        candidates=[{"species_id": "nothofagus-pumilio", "evidence": "e"}],
        catalog_assessment="supported_candidate",
        acceptance="accepted",
        accepted_species_id="nothofagus-pumilio",
        observed_traits=["t"],
        prompt_version="open-set-abstain-v1",
        **extra,
    )


async def test_resume_skips_done_cases_and_verify_reuses_identical_stage1(
    tmp_path, monkeypatch
):
    from types import SimpleNamespace as NS

    import bosque_api.execution
    from bosque_ai import meta

    from tools.meta_sam_api_lab import lab

    images = tmp_path / "images"
    images.mkdir()
    for name in ("a.jpg", "b.jpg", "c.jpg"):
        Image.new("RGB", (8, 8), "green").save(images / name)
    calls = {"identify": [], "verify": []}

    class Adapter:
        model = "muse-spark-1.3"

        def __init__(self, client, model="muse-spark-1.3"):
            self.client = client

        async def identify(self, image, content_type, catalog, **kw):
            calls["identify"].append(kw["strategy"])
            return identification()

        async def verify_candidate(self, result, *args):
            calls["verify"].append(result.prompt_version)
            return result.model_copy(update={"strategy": "verify"})

    FakeLedger.reserved = []
    monkeypatch.setattr(meta, "MuseSparkAdapter", Adapter)
    monkeypatch.setattr(bosque_api.execution, "ExecutionStore", FakeLedger)
    monkeypatch.setattr(
        lab,
        "config_from_private",
        lambda cfg: NS(
            model_api_key=SecretStr("k"), meta_timeout_seconds=1, budget_concurrency=4
        ),
    )
    monkeypatch.setattr(
        lab, "campaign_from_private", lambda cfg: NS(phase_caps_usd={"F": 10})
    )
    output = tmp_path / "results.json"
    output.write_text(json.dumps([{"image_id": "a", "status": "completed"}]))
    cases = [
        {
            "image_id": i,
            "file": f"{i}.jpg",
            "species_id": "nothofagus-pumilio",
            "organ": "leaf",
        }
        for i in "abc"
    ]
    stage1 = {"b": identification().model_dump(mode="json")}
    rows = await campaign.run_cases(
        cases,
        "open-set",
        tmp_path / "cfg",
        images,
        output,
        strategy="verify",
        phase="F",
        stage1=stage1,
        log=lambda m: None,
    )
    assert [r["image_id"] for r in rows] == ["a", "b", "c"]
    assert calls["verify"] == ["open-set-abstain-v1"]  # b: only stage 2 paid
    assert calls["identify"] == ["verify"]  # c: full run; a: never resent
    assert len(FakeLedger.reserved) == 2 and FakeLedger.reserved[0] == (
        "sam-api-lab:F",
        (10_000_000,),
    )
    assert next(r for r in rows if r["image_id"] == "b")["stage1_reused"] is True
    again = await campaign.run_cases(
        cases,
        "open-set",
        tmp_path / "cfg",
        images,
        output,
        strategy="verify",
        phase="F",
        log=lambda m: None,
    )
    assert len(again) == 3 and len(FakeLedger.reserved) == 2  # resume: nothing resent
