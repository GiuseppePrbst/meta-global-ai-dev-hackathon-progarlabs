"""Real bilingual recordings for Wilo: transcribe, align to the reading script, score.

    uv run --project services/api python evaluations/wilo_asr.py real --config <cfg> --clips A006
    uv run --project services/api python evaluations/wilo_asr.py align
    uv run --project services/api python evaluations/wilo_asr.py real-summary

Shares transcribe() and its ledger reservation with the synthetic campaign
(wilo_asr.py). Audio, per-clip transcripts and the filled review sheet stay in the
private package folder; only the aggregate goes to evaluations/wilo/.
"""

import asyncio
import csv
import json
import re
from pathlib import Path
from statistics import mean, quantiles

from wilo_asr import (
    ROOT,
    TARIFF_PER_SECOND,
    cer,
    distance,
    fold,
    settings_from,
    transcribe,
    wer,
)

PACKAGE = Path(
    "D:/data/bosque-vivo/wilo-voice-evaluation/real-recordings/wilo_voice_eval_2026-11-03"
)
REAL_OUT = Path("D:/data/bosque-vivo/wilo-voice-evaluation/results")
# condition: (use generated keywords, language hint); hints map to API-accepted values.
REAL_CONDITIONS = {
    "kw_auto": (True, "auto"),
    "nokw_auto": (False, "auto"),
    "kw_es": (True, "es"),
    "kw_en": (True, "en"),
    "kw_mixed": (True, "mixed"),
}
EXTRA_TERMS = ["Bosque Vivo", "ProGarLabs", "Wilo", "chucao", "cachaña", "huet-huet"]


def read_bank(root: Path | None = None) -> list[dict]:
    root = root or PACKAGE
    with (root / "metadata/reference_bank.csv").open(encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))


def reading_order(bank: list[dict]) -> list[str]:
    """Order the speaker reported: ES bank 01–26, hard 27–38, adversarial 39–44, EN 01–26."""
    ids = [r["utterance_id"] for r in bank]

    def number(u):
        return int(u[:2])

    return (
        [u for u in ids if number(u) <= 26 and u.endswith("-ES")]
        + [u for u in ids if 27 <= number(u) <= 44]
        + [u for u in ids if number(u) <= 26 and u.endswith("-EN")]
    )


def similarity(reference: str, hypothesis: str) -> float:
    return max(0.0, 1 - wer(reference, hypothesis))


def align(
    order: list[str], texts: dict[str, str], drafts: list[tuple[str, str]]
) -> list[dict]:
    """Monotonic alignment of clips to the reading script; ASR text only picks the line.

    A clip may repeat the previous line (retake) or skip up to two lines. Below 0.5
    similarity, or with two lines tied, it stays pending_review and is never scored.
    """
    rows, pointer = [], 0
    for clip, draft in drafts:
        window = range(max(0, pointer - 1), min(len(order), pointer + 3))
        scored = sorted(
            ((similarity(texts[order[j]], draft), j) for j in window), reverse=True
        )
        best, j = scored[0] if scored else (0.0, pointer)
        tie = len(scored) > 1 and scored[1][0] >= best - 0.05
        ok = best >= 0.5 and not tie
        rows.append(
            {
                "clip_id": clip,
                "utterance_id": order[j] if ok else "",
                "alignment_score": round(best, 3),
                "retake": ok and j == pointer - 1,
                "review_status": "script_aligned" if ok else "pending_review",
            }
        )
        if ok:
            pointer = j + 1
    return rows


def edit_ops(ref: list, hyp: list) -> dict:
    """Substitutions, deletions (omissions) and insertions of a minimum alignment."""
    n, m = len(ref), len(hyp)
    d = [[i + j if not i or not j else 0 for j in range(m + 1)] for i in range(n + 1)]
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            d[i][j] = min(
                d[i - 1][j] + 1,
                d[i][j - 1] + 1,
                d[i - 1][j - 1] + (ref[i - 1] != hyp[j - 1]),
            )
    ops, i, j = {"substitutions": 0, "deletions": 0, "insertions": 0}, n, m
    while i or j:
        if i and j and d[i][j] == d[i - 1][j - 1] + (ref[i - 1] != hyp[j - 1]):
            ops["substitutions"] += ref[i - 1] != hyp[j - 1]
            i, j = i - 1, j - 1
        elif i and d[i][j] == d[i - 1][j] + 1:
            ops["deletions"] += 1
            i -= 1
        else:
            ops["insertions"] += 1
            j -= 1
    return ops


def term_classes() -> dict[str, list[str]]:
    from bosque_api.atlas import get_atlas

    atlas = get_atlas()
    taxa = atlas.by_type["Taxon"]
    trails = {re.sub(r"^Senderos?\s+", "", t["name"]) for t in atlas.by_type["Trail"]}
    return {
        "scientific": sorted(
            {t["data"]["scientific_name"] for t in taxa}
            | {t["data"]["scientific_name"].split()[0] for t in taxa}
        ),
        "park": sorted(
            {p["data"]["short_name"] for p in atlas.by_type["Park"]}
            | {s for p in atlas.by_type["Park"] for s in p["data"]["sectors"]}
        ),
        "trail": sorted(t for t in trails if len(t) > 4),
        "common_name": sorted(
            {n for t in taxa for n in t["data"]["common_names"]} | set(EXTRA_TERMS)
        ),
    }


def contains(term: str, text: str) -> bool:
    return re.search(rf"\b{re.escape(fold(term))}\b", fold(text)) is not None


def score_row(reference: str, hypothesis: str, classes: dict) -> dict:
    ref_words, hyp_words = fold(reference).split(), fold(hypothesis).split()
    out = {
        "wer": wer(reference, hypothesis),
        "cer": cer(reference, hypothesis),
        "wer_accents": distance(reference.lower().split(), hypothesis.lower().split())
        / max(1, len(reference.split())),
        "words": len(ref_words),
        **edit_ops(ref_words, hyp_words),
    }
    for name, terms in classes.items():
        present = [t for t in terms if contains(t, reference)]
        # A shorter term inside a longer present one (genus in binomial) is counted once.
        present = [
            t
            for t in present
            if not any(t != o and fold(t) in fold(o) for o in present)
        ]
        found = [t for t in present if contains(t, hypothesis)]
        out[f"{name}_terms"], out[f"{name}_hits"] = len(present), len(found)
        out[f"{name}_missed"] = [t for t in present if t not in found]
    return out


def block(items: list[dict], classes) -> dict | None:
    if not items:
        return None
    words = sum(i["words"] for i in items) or 1
    out = {
        "clips": len(items),
        "wer_mean": round(mean(i["wer"] for i in items), 4),
        "wer_pooled": round(
            sum(i["substitutions"] + i["deletions"] + i["insertions"] for i in items)
            / words,
            4,
        ),
        "wer_with_accents_mean": round(mean(i["wer_accents"] for i in items), 4),
        "cer_mean": round(mean(i["cer"] for i in items), 4),
        "substitutions": sum(i["substitutions"] for i in items),
        "deletions": sum(i["deletions"] for i in items),
        "insertions": sum(i["insertions"] for i in items),
    }
    for name in classes:
        total = sum(i[f"{name}_terms"] for i in items)
        hits = sum(i[f"{name}_hits"] for i in items)
        out[f"{name}_accuracy"] = round(hits / total, 4) if total else None
        out[f"{name}_terms"] = total
    return out


def load_rows() -> list[dict]:
    path = REAL_OUT / "real.jsonl"
    if not path.exists():
        return []
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines()]


async def run_real(args):
    """Transcribe clips under one condition; (clip, condition) pairs already run are skipped."""
    from bosque_ai.voice import LANGUAGE_HINTS
    from bosque_api.atlas import voice_keywords

    settings = settings_from(args.config)
    manifest = json.loads(
        (PACKAGE / "metadata/manifest.json").read_text(encoding="utf-8")
    )
    clips = [
        c for c in manifest["clips"] if not args.clips or c["clip_id"] in args.clips
    ]
    if args.only_aligned:
        aligned = json.loads((REAL_OUT / "alignment.json").read_text(encoding="utf-8"))
        keep = {a["clip_id"] for a in aligned if a["utterance_id"]}
        clips = [c for c in clips if c["clip_id"] in keep]
    REAL_OUT.mkdir(parents=True, exist_ok=True)
    done = {(r["clip_id"], r["condition"]) for r in load_rows()}
    use_kw, hint = REAL_CONDITIONS[args.condition]
    todo = [c for c in clips if (c["clip_id"], args.condition) not in done][: args.max]
    semaphore = asyncio.Semaphore(4)
    out = REAL_OUT / "real.jsonl"

    async def one(clip):
        async with semaphore:
            content = (PACKAGE / clip["wav_package_path"]).read_bytes()
            row = await transcribe(
                settings,
                content,
                keywords=voice_keywords() if use_kw else [],
                bias=LANGUAGE_HINTS[hint],
            )
        row.update(clip_id=clip["clip_id"], condition=args.condition)
        with out.open("a", encoding="utf-8") as f:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")

    await asyncio.gather(*(one(c) for c in todo))
    print(f"{args.condition}: sent {len(todo)}, already run {len(clips) - len(todo)}")


def align_real(args):
    """Align kw_auto drafts to the reported reading order; fill the private review sheet."""
    bank = read_bank()
    texts = {r["utterance_id"]: r["reference_text"] for r in bank}
    languages = {r["utterance_id"]: r["language"] for r in bank}
    drafts = sorted(
        (r["clip_id"], r.get("transcript") or "")
        for r in load_rows()
        if r["condition"] == "kw_auto"
    )
    aligned = align(reading_order(bank), texts, drafts)
    (REAL_OUT / "alignment.json").write_text(
        json.dumps(aligned, indent=1), encoding="utf-8"
    )
    sheet = PACKAGE / "metadata/alignment_review.csv"
    with sheet.open(encoding="utf-8-sig") as f:
        review = list(csv.DictReader(f))
    by_clip = {a["clip_id"]: a for a in aligned}
    for row in review:
        a = by_clip.get(row["clip_id"])
        if not a:
            continue
        u = a["utterance_id"]
        row.update(
            utterance_id=u,
            reference_transcript_verbatim=texts.get(u, ""),
            language=languages.get(u, ""),
            speaker_id="S1" if u else "",
            reviewer="owner reading script (03-11) + agent order alignment"
            if u
            else "",
            review_status=a["review_status"],
            external_processing_permission="approved",
            notes=f"alignment_score={a['alignment_score']}"
            + ("; retake" if a["retake"] else ""),
        )
    with sheet.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(review[0]))
        writer.writeheader()
        writer.writerows(review)
    counts = {
        k: sum(a["review_status"] == k for a in aligned)
        for k in ("script_aligned", "pending_review")
    }
    lines = len({a["utterance_id"] for a in aligned if a["utterance_id"]})
    print(
        counts, "retakes:", sum(a["retake"] for a in aligned), "distinct lines:", lines
    )


def summarize_real(args):
    bank = {r["utterance_id"]: r for r in read_bank()}
    aligned = {
        a["clip_id"]: a
        for a in json.loads((REAL_OUT / "alignment.json").read_text(encoding="utf-8"))
    }
    rows = load_rows()
    classes = term_classes()
    conditions: dict[str, dict] = {}
    for r in rows:
        c = conditions.setdefault(
            r["condition"], {"rows": [], "errors": 0, "latency": [], "seconds": 0.0}
        )
        c["seconds"] += r["duration_ms"] / 1000
        if "transcript" not in r:
            c["errors"] += 1
            continue
        c["latency"].append(r["latency_ms"])
        utterance = aligned.get(r["clip_id"], {}).get("utterance_id")
        if utterance:
            ref = bank[utterance]
            c["rows"].append(
                {
                    "language": ref["language"],
                    "category": ref["category"],
                    "clip": r["clip_id"],
                    **score_row(ref["reference_text"], r["transcript"], classes),
                }
            )
    summary = {
        "schema_version": "1.0.0",
        "set": "real_bilingual_recordings",
        "speakers": 1,
        "reference_basis": "Owner-reported reading script, aligned by order plus ASR similarity; "
        "not an independent verbatim transcription",
        "alignment": {
            "script_aligned": sum(1 for a in aligned.values() if a["utterance_id"]),
            "pending_review": sum(1 for a in aligned.values() if not a["utterance_id"]),
            "retakes": sum(1 for a in aligned.values() if a["retake"]),
        },
        "conditions": {},
    }
    for name, c in sorted(conditions.items()):
        lat = sorted(c["latency"])
        missed: dict[str, int] = {}
        for i in c["rows"]:
            for k in classes:
                for t in i[f"{k}_missed"]:
                    missed[t] = missed.get(t, 0) + 1
        summary["conditions"][name] = {
            "requests": len(lat) + c["errors"],
            "errors": c["errors"],
            "scored_clips": len(c["rows"]),
            "audio_seconds": round(c["seconds"], 1),
            "estimated_cost_usd": round(int(c["seconds"]) * TARIFF_PER_SECOND, 4),
            "latency_ms_p50": round(lat[len(lat) // 2], 1) if lat else None,
            "latency_ms_p95": round(quantiles(lat, n=20)[-1], 1)
            if len(lat) > 1
            else None,
            "all": block(c["rows"], classes),
            "by_language": {
                lang: block([i for i in c["rows"] if i["language"] == lang], classes)
                for lang in ("es", "en", "mixed")
            },
            "by_category": {
                cat: block([i for i in c["rows"] if i["category"] == cat], classes)
                for cat in sorted({i["category"] for i in c["rows"]})
            },
            "missed_terms": dict(sorted(missed.items(), key=lambda x: -x[1])),
        }
    compared = [c for k, c in conditions.items() if k != "kw_auto"]
    paired = (
        set.intersection(*[{i["clip"] for i in c["rows"]} for c in compared])
        if compared
        else set()
    )
    if paired and "kw_auto" in conditions:
        paired &= {i["clip"] for i in conditions["kw_auto"]["rows"]}
    summary["paired_subset"] = {
        "clips": len(paired),
        "by_condition": {
            k: block([i for i in c["rows"] if i["clip"] in paired], classes)
            for k, c in sorted(conditions.items())
        },
        "by_language": {
            k: {
                lang: block(
                    [
                        i
                        for i in c["rows"]
                        if i["clip"] in paired and i["language"] == lang
                    ],
                    classes,
                )
                for lang in ("es", "en", "mixed")
            }
            for k, c in sorted(conditions.items())
        },
    }
    text = json.dumps(summary, ensure_ascii=False, indent=1)
    # Aggregates only: no per-clip transcript may leak into the versioned file.
    assert not any(
        len(r.get("transcript") or "") > 25 and r["transcript"] in text for r in rows
    )
    target = ROOT / "evaluations/wilo/asr-real-summary.json"
    target.write_text(text + "\n", encoding="utf-8", newline="\n")
    for k, v in summary["conditions"].items():
        a = v["all"] or {}
        print(
            k,
            v["requests"],
            v["errors"],
            a.get("clips"),
            a.get("wer_mean"),
            a.get("cer_mean"),
            a.get("scientific_accuracy"),
            a.get("park_accuracy"),
            v["latency_ms_p50"],
            v["latency_ms_p95"],
        )
