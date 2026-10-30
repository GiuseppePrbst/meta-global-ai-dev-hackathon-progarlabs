import asyncio
import json
import wave
from io import BytesIO

import httpx
import pytest
from bosque_ai.guide import GuideToolError, query_guide
from bosque_ai.meta import MetaAPIError, MetaResponsesClient, MuseSparkAdapter
from bosque_ai.voice import MetaVoiceAdapter, prepare_audio
from pydantic import SecretStr


def wav(seconds=0.1, rate=16000, channels=1, width=2):
    output = BytesIO()
    with wave.open(output, "wb") as recording:
        recording.setparams((channels, width, rate, 0, "NONE", "not compressed"))
        recording.writeframes(b"\x00" * int(seconds * rate) * channels * width)
    return output.getvalue()


@pytest.mark.parametrize(
    "content",
    [
        b"broken",
        wav(61),
        wav(rate=8000),
        wav(channels=2),
        wav(width=1),
        wav()[:-3],
        wav(0),
    ],
    ids=[
        "corrupt",
        "too-long",
        "sample-rate",
        "stereo",
        "sample-width",
        "truncated",
        "empty",
    ],
)
def test_audio_rejects_corruption_duration_codec_and_truncation(content):
    with pytest.raises(ValueError):
        prepare_audio(content)


async def test_spanish_transcription_wire_contract():
    audio, duration = prepare_audio(wav(rate=24000))

    def handle(request):
        assert request.url.path == "/v1/asr/transcribe"
        assert b'"languageBias": ["spanish"]' in request.content
        assert b"muse-voice-transcribe-1.0" in request.content
        assert b"PUSH_TO_TALK" in request.content
        assert b"Laureliopsis philippiana" in request.content
        assert 'filename="recording.wav"' in request.content.decode(errors="ignore")
        return httpx.Response(
            200, json={"transcript": "¿Cómo distingo coigüe de lenga?"}
        )

    client = MetaResponsesClient(
        SecretStr("test"), transport=httpx.MockTransport(handle)
    )
    result = await MetaVoiceAdapter(client).transcribe(audio, duration)
    assert result.transcript == "¿Cómo distingo coigüe de lenga?"
    assert result.usage == {"audio_duration_ms": 100}


def completion(message, reason="stop"):
    return {
        "choices": [{"finish_reason": reason, "message": message}],
        "usage": {"prompt_tokens": 2, "completion_tokens": 1},
    }


def tool(name="get_species_profile", arguments='{"species_id":"one"}'):
    return {
        "id": "call-1",
        "type": "function",
        "function": {"name": name, "arguments": arguments},
    }


async def test_guide_real_tool_cycle_and_consulted_citations():
    calls = []

    def handle(request):
        body = json.loads(request.content)
        calls.append(body)
        if len(calls) == 1:
            return httpx.Response(
                200, json=completion({"tool_calls": [tool()]}, "tool_calls")
            )
        assert body["messages"][-2]["role"] == "assistant"
        assert body["messages"][-1]["tool_call_id"] == "call-1"
        assert "tools" not in body
        return httpx.Response(
            200,
            json=completion(
                {
                    "content": json.dumps(
                        {
                            "answer": "Nombre taxonómico de referencia.",
                            "source_ids": ["species:one"],
                            "insufficient_evidence": False,
                        }
                    )
                }
            ),
        )

    def execute(name, args):
        assert name == "get_species_profile" and args == {"species_id": "one"}
        return {
            "data": "reference",
            "sources": [{"id": "species:one", "url": "https://example.org"}],
        }

    client = MetaResponsesClient(
        SecretStr("test"), transport=httpx.MockTransport(handle)
    )
    answer = await query_guide(client, "muse-spark-1.3", "¿Qué especie?", [], execute)
    assert answer.tools_used == ["get_species_profile"]
    assert answer.sources[0]["id"] == "species:one"
    assert answer.usage == {"prompt_tokens": 4, "completion_tokens": 2}


@pytest.mark.parametrize(
    "calls", [[tool(arguments="not-json")], [tool()] * 5, [tool(), tool()]]
)
async def test_guide_rejects_malformed_or_excessive_calls(calls):
    client = MetaResponsesClient(
        SecretStr("test"),
        transport=httpx.MockTransport(
            lambda r: httpx.Response(
                200, json=completion({"tool_calls": calls}, "tool_calls")
            )
        ),
    )
    with pytest.raises(GuideToolError):
        await query_guide(
            client, "muse-spark-1.3", "test", [], lambda *a: {"sources": []}
        )


async def test_guide_no_sources_abstains_without_final_generation():
    client = MetaResponsesClient(
        SecretStr("test"),
        transport=httpx.MockTransport(
            lambda r: httpx.Response(
                200, json=completion({"content": "unsupported fact"})
            )
        ),
    )
    result = await query_guide(client, "muse-spark-1.3", "test", [], lambda *a: {})
    assert result.insufficient_evidence and not result.sources
    assert "unsupported" not in result.answer


@pytest.mark.parametrize(
    "reply",
    [
        {"source_ids": ["invented"], "insufficient_evidence": False},
        {"source_ids": [], "insufficient_evidence": False},
    ],
)
async def test_guide_never_accepts_unconsulted_references(reply):
    count = 0

    def handle(request):
        nonlocal count
        count += 1
        message = (
            {"tool_calls": [tool()]}
            if count == 1
            else {"content": json.dumps({"answer": "untrusted", **reply})}
        )
        return httpx.Response(
            200, json=completion(message, "tool_calls" if count == 1 else "stop")
        )

    client = MetaResponsesClient(
        SecretStr("test"), transport=httpx.MockTransport(handle)
    )
    with pytest.raises(MetaAPIError):
        await query_guide(
            client,
            "muse-spark-1.3",
            "test",
            [],
            lambda *a: {"sources": [{"id": "species:one"}]},
        )


async def test_guide_wall_timeout():
    async def handle(request):
        await asyncio.sleep(0.05)
        return httpx.Response(200, json={})

    client = MetaResponsesClient(
        SecretStr("test"), timeout_seconds=0.01, transport=httpx.MockTransport(handle)
    )
    with pytest.raises(MetaAPIError):
        await query_guide(client, "muse-spark-1.3", "test", [], lambda *a: {})


async def test_multiview_one_specimen_with_adaptive_photo():
    def handle(request):
        body = json.loads(request.content)
        assert len(body["messages"][0]["content"]) == 4
        assert "MISMO ejemplar" in body["messages"][0]["content"][0]["text"]
        assert "leaf" in body["messages"][0]["content"][0]["text"]
        return httpx.Response(
            200,
            json=completion(
                {
                    "content": json.dumps(
                        {
                            "candidates": [],
                            "limitations": ["synthetic"],
                            "message": "Falta evidencia",
                            "observed_traits": [],
                            "missing_traits": ["Envés no visible"],
                            "recommended_next_photo": "leaf_underside",
                        }
                    )
                }
            ),
        )

    adapter = MuseSparkAdapter(
        MetaResponsesClient(SecretStr("test"), transport=httpx.MockTransport(handle))
    )
    result = await adapter.identify(
        b"synthetic",
        "image/jpeg",
        {},
        additional_images=[(b"synthetic", "image/jpeg")] * 2,
        views=["whole_tree", "leaf", "bark"],
    )
    assert result.status == "insufficient_evidence"
    assert result.evidence_status == "additional_photo_requested"
    assert result.recommended_next_photo == "leaf_underside"
    with pytest.raises(ValueError):
        await adapter.identify(
            b"synthetic",
            "image/jpeg",
            {},
            additional_images=[(b"synthetic", "image/jpeg")] * 3,
        )
