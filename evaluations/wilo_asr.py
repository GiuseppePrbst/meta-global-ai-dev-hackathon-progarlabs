"""Real Muse Voice Transcribe campaign for Wilo (file + realtime), ledger-bound.

    uv run --project services/api python evaluations/wilo_asr.py run \
        --config <private-config.json> --audio D:/data/bosque-vivo/wilo-asr/audio \
        --output D:/data/bosque-vivo/wilo-asr

Audio is synthetic TTS (evaluations/wilo_tts.ps1). Every request reserves budget in the
shared ledger under identity `wilo-voice-lab` with an atomic USD 5 cap; raw rows stay
private, `summarize` writes the versioned aggregate. Hypotheses tested:
H1 generated keywords improve proper/scientific names; H2 the Spanish bias helps;
H3 moderate noise degrades WER; H4 a second voice keeps quality; H5 ENDPOINTING splits
turns; H6 realtime partials arrive before the final transcript. Keyword limits (500 terms,
30 characters) were probed separately and are documented in WILO_ASR_REAL_EVALUATION.md.
"""

import argparse
import asyncio
import json
import re
import sys
import unicodedata
import wave
from io import BytesIO
from pathlib import Path
from time import perf_counter

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

OWNER = "wilo-voice-lab"
CAP_USD = 5
# Covers the 60 s maximum (60 x 0.18 / 3600 = USD 0.003); the synthetic run used 0.01.
VOICE_RESERVATION_USD = 0.005
TARIFF_PER_SECOND = 0.18 / 3600


def fold(text: str) -> str:
    text = (
        unicodedata.normalize("NFKD", text.lower()).encode("ascii", "ignore").decode()
    )
    return " ".join(re.findall(r"[a-z0-9]+", text))


def distance(a: list, b: list) -> int:
    row = list(range(len(b) + 1))
    for i, x in enumerate(a, 1):
        prev, row[0] = row[0], i
        for j, y in enumerate(b, 1):
            prev, row[j] = row[j], min(row[j] + 1, row[j - 1] + 1, prev + (x != y))
    return row[-1]


def wer(ref: str, hyp: str) -> float:
    r = fold(ref).split()
    return distance(r, fold(hyp).split()) / max(1, len(r))


def cer(ref: str, hyp: str) -> float:
    r = fold(ref).replace(" ", "")
    return distance(list(r), list(fold(hyp).replace(" ", ""))) / max(1, len(r))


def term_hits(terms: list[str], hyp: str) -> dict:
    folded = fold(hyp)
    loose = sum(fold(t) in folded for t in terms)
    exact = sum(t.lower() in hyp.lower() for t in terms)
    return {
        "terms": len(terms),
        "loose": loose,
        "exact": exact,
        "missed": [t for t in terms if fold(t) not in folded],
    }


def noisy(content: bytes, snr_db: float = 10, seed: int = 7) -> bytes:
    """Add seeded white noise at a fixed SNR (moderate background noise)."""
    import numpy as np

    with wave.open(BytesIO(content)) as w:
        params, frames = w.getparams(), w.readframes(w.getnframes())
    signal = np.frombuffer(frames, dtype="<i2").astype(np.float64)
    power = np.mean(signal**2) or 1.0
    noise = np.random.default_rng(seed).normal(
        0, np.sqrt(power / 10 ** (snr_db / 10)), signal.size
    )
    out = BytesIO()
    with wave.open(out, "wb") as w:
        w.setparams(params)
        w.writeframes(np.clip(signal + noise, -32768, 32767).astype("<i2").tobytes())
    return out.getvalue()


def joined(first: bytes, second: bytes, gap_s: float = 1.5) -> bytes:
    parts = []
    for content in (first, second):
        with wave.open(BytesIO(content)) as w:
            params, frames = w.getparams(), w.readframes(w.getnframes())
        parts.append(frames)
    out = BytesIO()
    with wave.open(out, "wb") as w:
        w.setparams(params)
        w.writeframes(parts[0] + b"\x00\x00" * int(params.framerate * gap_s) + parts[1])
    return out.getvalue()


def settings_from(path: Path):
    from tools.meta_sam_api_lab.lab import config_from_private

    base = config_from_private(path)
    return base.model_copy(
        update={"voice_reservation_units": int(VOICE_RESERVATION_USD * 1e6)}
    )


async def transcribe(settings, content: bytes, *, keywords, bias, mode="PUSH_TO_TALK"):
    from bosque_ai.meta import MetaAPIError, MetaResponsesClient
    from bosque_ai.voice import MetaVoiceAdapter, prepare_audio
    from bosque_api.execution import ExecutionStore

    ledger = ExecutionStore(settings)
    reservation = await asyncio.to_thread(
        ledger.reserve, OWNER, "transcribe", int(CAP_USD * 1e6)
    )
    audio, duration = prepare_audio(content)
    client = MetaResponsesClient(settings.model_api_key, 60)
    status, row = "provider_error", {"duration_ms": duration}
    try:
        started = perf_counter()
        result = await MetaVoiceAdapter(client, keywords, bias, mode).transcribe(
            audio, duration
        )
        row.update(
            transcript=result.transcript,
            latency_ms=(perf_counter() - started) * 1000,
            turns=len(result.turns),
            provider_duration_ms=result.usage.get("provider_audio_duration_ms"),
        )
        status = "completed"
    except MetaAPIError as exc:
        row.update(error=type(exc).__name__, status_code=getattr(exc, "status", None))
    finally:
        await asyncio.to_thread(
            ledger.finish,
            reservation,
            status,
            {
                "usage": {"audio_duration_ms": round(duration)},
                "model": "muse-voice-transcribe-1.0",
                "experiment": "wilo-asr",
            },
        )
    return row


async def realtime(settings, content: bytes, keywords) -> dict:
    """Paced realtime push-to-talk: first partial and final latency."""
    import websockets
    from bosque_api.execution import ExecutionStore

    with wave.open(BytesIO(content)) as w:
        pcm, rate = w.readframes(w.getnframes()), w.getframerate()
    ledger = ExecutionStore(settings)
    reservation = await asyncio.to_thread(
        ledger.reserve, OWNER, "transcribe", int(CAP_USD * 1e6)
    )
    row, status = {"duration_ms": len(pcm) / (rate * 2) * 1000}, "provider_error"
    try:
        async with websockets.connect(
            "wss://api.meta.ai/v1/asr/realtime", open_timeout=10
        ) as ws:
            await ws.send(
                json.dumps(
                    {
                        "authorization": {
                            "accessToken": "Bearer "
                            + settings.model_api_key.get_secret_value()
                        },
                        "audioEncoding": "PCM_16KHZ",
                        "model": "muse-voice-transcribe-1.0",
                        "mode": "PUSH_TO_TALK",
                        "partialMode": "CUMULATIVE",
                        "emitAudioProgress": False,
                        "keywords": keywords,
                        "languageBias": ["Spanish"],
                    }
                )
            )
            ack = json.loads(await asyncio.wait_for(ws.recv(), 10))
            assert "sessionId" in ack, "no handshake ack"
            started = perf_counter()
            chunk = rate * 2 // 10  # 100 ms frames, real-time pacing

            async def pump():
                for i in range(0, len(pcm), chunk):
                    await ws.send(pcm[i : i + chunk])
                    await asyncio.sleep(0.1)
                await ws.send(json.dumps({"type": "endStream"}))
                return perf_counter()

            sender = asyncio.create_task(pump())
            partials, first = 0, None
            async for raw in ws:
                event = json.loads(raw)
                if event.get("type") == "transcript" and not event.get("final"):
                    partials += 1
                    first = first or (perf_counter() - started) * 1000
                elif (
                    event.get("type") == "transcript"
                    or event.get("type") == "speechComplete"
                ):
                    ended = await sender
                    row.update(
                        transcript=event.get("transcript", ""),
                        partials=partials,
                        first_partial_ms=first,
                        final_after_end_ms=(perf_counter() - ended) * 1000,
                    )
                    status = "completed"
                    break
                elif event.get("type") == "error":
                    row.update(error=event.get("errorCode") or "error")
                    break
    except (
        OSError,
        AssertionError,
        TimeoutError,
        websockets.WebSocketException,
    ) as exc:
        row.update(error=type(exc).__name__)
    finally:
        await asyncio.to_thread(
            ledger.finish,
            reservation,
            status,
            {
                "usage": {"audio_duration_ms": round(row["duration_ms"])},
                "model": "muse-voice-transcribe-1.0",
                "experiment": "wilo-asr-realtime",
            },
        )
    return row


async def run(args):
    from bosque_api.atlas import voice_keywords

    settings = settings_from(args.config)
    phrases = json.loads(
        (ROOT / "evaluations/wilo_asr_phrases.json").read_text(encoding="utf-8")
    )["phrases"]
    audio = {p.stem: p.read_bytes() for p in args.audio.glob("*.wav")}
    keywords = voice_keywords()
    out = args.output / "results.jsonl"
    done = set()
    if out.exists():
        done = {
            (r["phrase"], r["condition"])
            for r in map(json.loads, out.read_text().splitlines())
        }
    plan = []
    for p in phrases:
        helena, sabina = audio[f"{p['id']}-helena"], audio[f"{p['id']}-sabina"]
        plan += [
            (p, "helena_kw_es", helena, {"keywords": keywords, "bias": ["Spanish"]}),
            (p, "helena_nokw_es", helena, {"keywords": [], "bias": ["Spanish"]}),
            (p, "helena_kw_nobias", helena, {"keywords": keywords, "bias": None}),
            (p, "helena_nokw_nobias", helena, {"keywords": [], "bias": None}),
            (p, "sabina_kw_es", sabina, {"keywords": keywords, "bias": ["Spanish"]}),
            (
                p,
                "helena_noise10_kw_es",
                noisy(helena),
                {"keywords": keywords, "bias": ["Spanish"]},
            ),
            (
                p,
                "helena_noise10_nokw_es",
                noisy(helena),
                {"keywords": [], "bias": ["Spanish"]},
            ),
        ]
    by_id = {p["id"]: p for p in phrases}
    two_turns = joined(audio["p02-helena"], audio["p17-helena"])
    extra = {
        "id": "p02+p17",
        "category": "two_turns",
        "text": by_id["p02"]["text"] + " " + by_id["p17"]["text"],
        "terms": by_id["p02"]["terms"] + by_id["p17"]["terms"],
    }
    for mode in ("PUSH_TO_TALK", "ENDPOINTING"):
        plan.append(
            (
                extra,
                f"two_turns_{mode.lower()}",
                two_turns,
                {"keywords": keywords, "bias": ["Spanish"], "mode": mode},
            )
        )
        plan.append(
            (
                by_id["p21"],
                f"pauses_{mode.lower()}",
                audio["p21-helena"],
                {"keywords": keywords, "bias": ["Spanish"], "mode": mode},
            )
        )
    semaphore = asyncio.Semaphore(4)

    async def one(p, condition, content, options):
        if (p["id"], condition) in done:
            return
        async with semaphore:
            row = await transcribe(settings, content, **options)
        row.update(
            phrase=p["id"],
            category=p["category"],
            condition=condition,
            reference=p["text"],
        )
        if "transcript" in row:
            row.update(
                wer=wer(p["text"], row["transcript"]),
                cer=cer(p["text"], row["transcript"]),
                **term_hits(p["terms"], row["transcript"]),
            )
        with out.open("a", encoding="utf-8") as f:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")

    await asyncio.gather(*(one(*item) for item in plan))
    for pid in ("p02", "p07", "p12", "p16", "p21", "p24", "p25", "p27"):
        if (pid, "realtime_kw_es") in done:
            continue
        row = await realtime(settings, audio[f"{pid}-helena"], keywords)
        p = by_id[pid]
        row.update(
            phrase=pid,
            category=p["category"],
            condition="realtime_kw_es",
            reference=p["text"],
        )
        if "transcript" in row:
            row.update(
                wer=wer(p["text"], row["transcript"]),
                cer=cer(p["text"], row["transcript"]),
                **term_hits(p["terms"], row["transcript"]),
            )
        with out.open("a", encoding="utf-8") as f:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")


def summarize(args):
    from statistics import mean, median

    rows = [
        json.loads(line)
        for line in (args.output / "results.jsonl")
        .read_text(encoding="utf-8")
        .splitlines()
    ]
    groups: dict[str, list] = {}
    for r in rows:
        groups.setdefault(r["condition"], []).append(r)
    table = {}
    for condition, items in sorted(groups.items()):
        ok = [r for r in items if "transcript" in r]
        terms = sum(r["terms"] for r in ok) or 1
        table[condition] = {
            "requests": len(items),
            "completed": len(ok),
            "errors": len(items) - len(ok),
            "wer_mean": round(mean(r["wer"] for r in ok), 4) if ok else None,
            "cer_mean": round(mean(r["cer"] for r in ok), 4) if ok else None,
            "term_accuracy_loose": round(sum(r["loose"] for r in ok) / terms, 4),
            "term_accuracy_exact": round(sum(r["exact"] for r in ok) / terms, 4),
            "latency_ms_median": round(median(r["latency_ms"] for r in ok), 1)
            if ok and "latency_ms" in ok[0]
            else None,
            "audio_seconds": round(sum(r["duration_ms"] for r in items) / 1000, 1),
            "turns": [r.get("turns") for r in ok]
            if condition.startswith(("two_turns", "pauses"))
            else None,
            "first_partial_ms_median": round(
                median(r["first_partial_ms"] for r in ok if r.get("first_partial_ms")),
                1,
            )
            if condition.startswith("realtime")
            and any(r.get("first_partial_ms") for r in ok)
            else None,
            "final_after_end_ms_median": round(
                median(r["final_after_end_ms"] for r in ok), 1
            )
            if condition.startswith("realtime") and ok
            else None,
        }
    by_category: dict[str, list] = {}
    for r in groups.get("helena_kw_es", []):
        if "wer" in r:
            by_category.setdefault(r["category"], []).append(r["wer"])
    missed: dict[str, int] = {}
    for r in groups.get("helena_kw_es", []) + groups.get("sabina_kw_es", []):
        for term in r.get("missed", []):
            missed[term] = missed.get(term, 0) + 1
    seconds = sum(r["duration_ms"] for r in rows) / 1000
    summary = {
        "schema_version": "1.0.0",
        "model": "muse-voice-transcribe-1.0",
        "audio": "synthetic TTS (Windows Helena es-ES, Sabina es-MX)",
        "requests": len(rows),
        "audio_seconds": round(seconds, 1),
        "estimated_cost_usd": round(int(seconds) * TARIFF_PER_SECOND, 4),
        "conditions": table,
        "wer_by_category_helena_kw_es": {
            k: round(mean(v), 4) for k, v in sorted(by_category.items())
        },
        "missed_terms_kw_es": dict(sorted(missed.items(), key=lambda x: -x[1])),
        "examples": [
            {
                k: r.get(k)
                for k in ("phrase", "condition", "reference", "transcript", "wer")
            }
            for r in rows
            if r.get("wer", 0) > 0.2
        ][:25],
    }
    target = ROOT / "evaluations/wilo/asr-summary.json"
    target.parent.mkdir(exist_ok=True)
    target.write_text(
        json.dumps(summary, ensure_ascii=False, indent=1) + "\n",
        encoding="utf-8",
        newline="\n",
    )
    print(
        json.dumps(
            {k: summary[k] for k in ("requests", "audio_seconds", "estimated_cost_usd")}
        )
    )
    for condition, row in table.items():
        print(condition, row)


def main():
    import wilo_real

    parser = argparse.ArgumentParser()
    parser.add_argument(
        "action", choices=["run", "summarize", "real", "align", "real-summary"]
    )
    parser.add_argument("--config", type=Path)
    parser.add_argument(
        "--audio", type=Path, default=Path("D:/data/bosque-vivo/wilo-asr/audio")
    )
    parser.add_argument(
        "--output", type=Path, default=Path("D:/data/bosque-vivo/wilo-asr")
    )
    parser.add_argument(
        "--condition", choices=list(wilo_real.REAL_CONDITIONS), default="kw_auto"
    )
    parser.add_argument("--clips", nargs="*", help="Clip ids for a pilot; default all")
    parser.add_argument("--max", type=int, default=100)
    parser.add_argument("--only-aligned", action="store_true")
    args = parser.parse_args()
    actions = {
        "run": lambda: asyncio.run(run(args)),
        "summarize": lambda: summarize(args),
        "real": lambda: asyncio.run(wilo_real.run_real(args)),
        "align": lambda: wilo_real.align_real(args),
        "real-summary": lambda: wilo_real.summarize_real(args),
    }
    actions[args.action]()


if __name__ == "__main__":
    main()
