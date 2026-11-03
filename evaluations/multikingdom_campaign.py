"""Multikingdom Meta campaign (31-10-2026): prepare, freeze, run, report.

Cases come from media-manifest.json after the agent's visual review (a private
file with exclusions and organ/view notes). Each panel has a development split
for smoke tests and prompt fixes and a test split frozen BEFORE any test call.
Flora reuses the production `verify` pipeline; fauna and fungi use the separate
multikingdom pipeline. Originals and raw responses stay in the private folder;
the published report holds IDs, labels, decisions, usage and metrics.
"""

import argparse
import asyncio
import hashlib
import json
from pathlib import Path

from evaluations import botanical_campaign as bc
from evaluations import botanical_registry as reg
from evaluations import open_set_eval as ose
from evaluations.biodiversity_registry import PANELS

HERE = Path(__file__).parent / "biodiversity"
DATA = Path()  # --data: private folder
CONFIG = Path()  # --config: private lab configuration
ENVIRONMENT = "Category:Puyehue_National_Park"  # landscapes without a target organism


def load(name: str):
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def download(record: dict) -> dict:
    """iNaturalist 'large' rendition; Commons/Pl@ntNet as in the 30-10 campaign."""
    folder = DATA / "biodiversity-originals"
    folder.mkdir(parents=True, exist_ok=True)
    if record["source_dataset"] == "wikimedia_commons_category" and "/330px-" in (
        record.get("thumbnail_url") or ""
    ):  # standard 1280 px rendition: cached by Commons, enough for identification
        record = {
            **record,
            "source_dataset": "plantnet_verified_gbif",  # direct URL branch
            "media_url": record["thumbnail_url"]
            .split("?")[0]
            .replace("/330px-", "/1280px-"),
        }
    elif record["source_dataset"] == "inaturalist_research_gbif":
        record = {
            **record,
            "source_dataset": "plantnet_verified_gbif",  # direct URL branch
            "media_url": record["media_url"].replace("/original.", "/large."),
        }
    import time
    from urllib.error import HTTPError

    for attempt in range(6):  # Commons/S3 answer 429 under bursts
        try:
            return bc.download(record, folder)
        except HTTPError as exc:
            if exc.code != 429 or attempt == 5:
                raise
            time.sleep(10 * (attempt + 1))


def environment_records(limit: int = 8) -> list[dict]:
    pages = reg.commons_files("https://commons.wikimedia.org/wiki/" + ENVIRONMENT)
    out = []
    for page in pages:
        record = reg.commons_record("environment", page)
        if record["external_processing_allowed"] and record["mime"] == "image/jpeg":
            out.append(
                {**record, "role": "environment", "panel": "all", "split": "test"}
            )
    return out[:limit]


def prepare():
    """Join manifest + private review, download, attach multiview and environment."""
    review = json.loads((DATA / "biodiversity-review.json").read_text(encoding="utf-8"))
    manifest = load("media-manifest.json")["records"]
    firsts = [
        r for r in manifest if r.get("view_index", 0) == 0 and not r["leak_reason"]
    ]
    extra = {}
    for r in manifest:
        if r.get("view_index", 0) > 0 and not review.get(r["image_id"], {}).get(
            "excluded"
        ):
            extra.setdefault(r["occurrence_id"], []).append(r)
    cases = []
    for r in firsts + environment_records():
        note = review.get(r["image_id"], {})
        if note.get("excluded"):
            continue
        file = download(r)
        views = [
            v
            for v in extra.get(r.get("occurrence_id"), [])
            if not review.get(v["image_id"], {}).get("excluded")
        ][:1]
        cases.append(
            {
                "image_id": r["image_id"],
                "species_id": r["species_id"],
                "panel": r["panel"],
                "role": r["role"],
                "negative": r["role"] != "catalog",
                "organ": note.get("organ", r.get("organ", "unknown")),
                "split": r["split"],
                "individual_group": r.get("individual_group"),
                "license": r["license"],
                "author": r["author"],
                "source_url": r.get("source_url") or r["media_url"],
                **file,
                "extra_files": [download(v)["file"] for v in views],
                "extra_image_ids": [v["image_id"] for v in views],
                "agent_review": note,
            }
        )
    (DATA / "mk-cases.json").write_text(
        json.dumps(cases, indent=1, ensure_ascii=False), encoding="utf-8"
    )
    print(len(cases), "cases prepared")


def panel_sets(cases: list[dict], panel: str, split: str) -> list[dict]:
    """Own panel cases plus cross-kingdom and environment negatives (test only)."""
    own = [c for c in cases if c["panel"] == panel and c["split"] == split]
    if split != "test":
        return own
    others = [
        {**c, "role": "cross_kingdom", "negative": True}
        for c in cases
        if c["panel"] not in (panel, "all")
        and c["split"] == "test"
        and c["role"] == "catalog"
    ]
    others = sorted(others, key=lambda c: c["sha256"])[:10]  # deterministic sample
    environment = [{**c, "negative": True} for c in cases if c["panel"] == "all"]
    return own + others + environment


def freeze():
    cases = json.loads((DATA / "mk-cases.json").read_text(encoding="utf-8"))
    frozen = {
        panel: {
            split: [
                {
                    k: c[k]
                    for k in (
                        "image_id",
                        "species_id",
                        "role",
                        "organ",
                        "sha256",
                        "license",
                        "author",
                        "source_url",
                        "extra_image_ids",
                    )
                }
                for c in panel_sets(cases, panel, split)
            ]
            for split in ("development", "test")
        }
        for panel in PANELS
    }
    canonical = json.dumps(frozen, sort_keys=True, ensure_ascii=False).encode()
    groups = {}
    for c in cases:
        groups.setdefault(c["individual_group"], set()).add(c["split"])
    leaks = [g for g, s in groups.items() if g and len(s) > 1]
    if leaks:
        raise SystemExit(f"Group in both splits: {leaks[:3]}")
    data = {
        "set": "multikingdom-independent-2026-10-31",
        "frozen_at": "2026-10-31",
        "freeze_sha256": hashlib.sha256(canonical).hexdigest(),
        "label_status": "platform label (iNaturalist research grade / Pl@ntNet / Commons) "
        "+ agent visual review; no human or expert review",
        "leak_controls": [
            "observation",
            "individual_group (observation, photographer+date, exact and dHash<=6)",
            "previous campaigns: image, observation, group and dHash<=6",
            "max two first views per photographer and taxon",
        ],
        "panels": frozen,
    }
    (HERE / "frozen-sets.json").write_text(
        json.dumps(data, indent=1, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    print(data["freeze_sha256"])


def panel_config(panel: str) -> dict:
    from bosque_api.biodiversity import get_taxa

    taxa = {t.id: t for t in get_taxa()}
    catalog = {
        label: name
        for label, (name, role, _) in PANELS[panel].items()
        if role == "catalog"
    }
    return {
        "catalog": catalog,
        "knowledge": {k: taxa[k].profile.traits for k in catalog if k in taxa},
        "comparators": [
            c
            for c in load("comparators.json")
            if set(c["confused_with"]) & set(catalog)
        ],
    }


def checked_cases(panel: str, split: str) -> list[dict]:
    """Test cases must match the frozen manifest (ids and hashes)."""
    cases = json.loads((DATA / "mk-cases.json").read_text(encoding="utf-8"))
    chosen = panel_sets(cases, panel, split)
    if split == "test":
        frozen = load("frozen-sets.json")["panels"][panel]["test"]
        if [(c["image_id"], c["sha256"]) for c in frozen] != [
            (c["image_id"], c["sha256"]) for c in chosen
        ]:
            raise SystemExit("Test cases differ from the frozen set")
    return chosen


def multiview(cases):
    return [
        {
            **c,
            "image_id": f"{c['image_id']}#views={n}",
            "extra_files": c["extra_files"][: n - 1],
            "views": ["unspecified"] * n,
        }
        for c in cases
        if c["extra_files"]
        for n in (1, 2)
    ]


PLAN = {  # step -> (panel, split, strategy, experiment, model, subset)
    "smoke-flora": ("flora", "development", "verify", "open-set", "muse-spark-1.3", 6),
    "smoke-fauna": ("fauna", "development", "candidates", "mk", "muse-spark-1.3", 6),
    "smoke-fungi": ("fungi", "development", "candidates", "mk", "muse-spark-1.3", 6),
    "dev-fauna-candidates": (
        "fauna",
        "development",
        "candidates",
        "mk",
        "muse-spark-1.3",
        None,
    ),
    "dev-fauna-knowledge": (
        "fauna",
        "development",
        "knowledge",
        "mk",
        "muse-spark-1.3",
        None,
    ),
    "dev-fungi-candidates": (
        "fungi",
        "development",
        "candidates",
        "mk",
        "muse-spark-1.3",
        None,
    ),
    "dev-fungi-knowledge": (
        "fungi",
        "development",
        "knowledge",
        "mk",
        "muse-spark-1.3",
        None,
    ),
    "test-flora-baseline": (
        "flora",
        "test",
        "baseline",
        "open-set",
        "muse-spark-1.3",
        None,
    ),
    "test-flora-verify": (
        "flora",
        "test",
        "verify",
        "open-set",
        "muse-spark-1.3",
        None,
    ),
    "test-flora-verify-traits": (  # subset fixed before test runs (budget)
        "flora",
        "test",
        "verify",
        "D",
        "muse-spark-1.3",
        60,
    ),
    "test-flora-multiview": (
        "flora",
        "test",
        "verify",
        "multiview",
        "muse-spark-1.3",
        None,
    ),
    "test-fauna-candidates": (
        "fauna",
        "test",
        "candidates",
        "mk",
        "muse-spark-1.3",
        None,
    ),
    "test-fauna-knowledge": (
        "fauna",
        "test",
        "knowledge",
        "mk",
        "muse-spark-1.3",
        None,
    ),
    "test-fauna-wonder": ("fauna", "test", "knowledge", "mk", "muse-wonder-1.0", 40),
    "test-fungi-candidates": (
        "fungi",
        "test",
        "candidates",
        "mk",
        "muse-spark-1.3",
        None,
    ),
    "test-fungi-knowledge": (
        "fungi",
        "test",
        "knowledge",
        "mk",
        "muse-spark-1.3",
        None,
    ),
}


async def run(step: str, config: Path):
    panel, split, strategy, experiment, model, subset = PLAN[step]
    cases = checked_cases(panel, split)
    if experiment == "multiview":
        cases = multiview([c for c in cases if not c["negative"]])
    if subset:  # deterministic: the same cases for every paired subset
        cases = sorted(cases, key=lambda c: c["sha256"])[:subset]
    out = DATA / f"mk-{step}.json"
    rows = await bc.run_cases(
        cases,
        "D" if experiment == "D" else experiment,
        config,
        DATA / "biodiversity-originals",
        out,
        strategy=strategy,
        phase="G",
        domain="flora" if panel == "flora" else panel,
        panel=None if panel == "flora" else panel_config(panel),
        model=model,
    )
    print(step, json.dumps(ose.metrics(rows)["negatives_false_acceptance"]))


def report():
    """Public summary: metrics per step, paired comparisons, per-case decisions."""
    cases = {
        c["image_id"]: c
        for c in json.loads((DATA / "mk-cases.json").read_text("utf-8"))
    }
    steps, rows_by_step = {}, {}
    for step, plan in PLAN.items():
        path = DATA / f"mk-{step}.json"
        if not path.is_file():
            continue
        rows = json.loads(path.read_text(encoding="utf-8"))
        rows_by_step[step] = rows
        latency = sorted(r["latency_ms"] for r in rows if r["status"] == "completed")
        usage = [r.get("usage") or {} for r in rows]
        role = {}
        for r in rows:
            c = cases.get(r["image_id"].split("#")[0], {})
            role.setdefault(c.get("role", "?"), []).append(r)
        steps[step] = {
            "plan": dict(
                zip(
                    ("panel", "split", "strategy", "experiment", "model", "subset"),
                    plan,
                    strict=True,
                )
            ),
            "n": len(rows),
            "metrics": ose.metrics(rows),
            "negatives_by_role": {
                k: ose.metrics(v)["negatives_false_acceptance"]
                for k, v in role.items()
                if k != "catalog"
            },
            "by_species": {
                label: ose.metrics(
                    [r for r in rows if r["label"] == label and not r["negative"]]
                )["correct_accepted_on_positives"]
                for label in sorted({r["label"] for r in rows if not r["negative"]})
            },
            "latency_ms": {
                "mean": round(sum(latency) / len(latency)) if latency else None,
                "median": latency[len(latency) // 2] if latency else None,
                "p95": latency[int(0.95 * (len(latency) - 1))] if latency else None,
            },
            "tokens": {
                "prompt": sum(u.get("prompt_tokens", 0) for u in usage),
                "completion": sum(u.get("completion_tokens", 0) for u in usage),
            },
            "cases": [
                {
                    k: r.get(k)
                    for k in (
                        "image_id",
                        "label",
                        "negative",
                        "status",
                        "accepted",
                        "proposed",
                        "catalog_assessment",
                        "similar_out_of_catalog",
                        "latency_ms",
                        "error",
                    )
                }
                for r in rows
            ],
        }
    pairs = {}
    for a, b in (
        ("test-flora-baseline", "test-flora-verify"),
        ("test-flora-verify", "test-flora-verify-traits"),
        ("test-fauna-candidates", "test-fauna-knowledge"),
        ("test-fungi-candidates", "test-fungi-knowledge"),
    ):
        if a in rows_by_step and b in rows_by_step:
            pairs[f"{a} vs {b}"] = ose.paired(rows_by_step[a], rows_by_step[b])
    if "test-fauna-wonder" in rows_by_step and "test-fauna-knowledge" in rows_by_step:
        ids = {r["image_id"] for r in rows_by_step["test-fauna-wonder"]}
        spark = [
            r for r in rows_by_step["test-fauna-knowledge"] if r["image_id"] in ids
        ]
        pairs["spark vs wonder (same fauna subset)"] = ose.paired(
            spark, rows_by_step["test-fauna-wonder"]
        )
        steps["test-fauna-knowledge@wonder-subset"] = {
            "n": len(spark),
            "metrics": ose.metrics(spark),
        }
    data = {
        "campaign": "multikingdom-2026-10-31",
        "label_status": "weakly_labeled: platform labels + agent visual review; no expert review",
        "frozen_set_sha256": load("frozen-sets.json")["freeze_sha256"],
        "steps": steps,
        "paired": pairs,
    }
    (HERE / "multikingdom-results.json").write_text(
        json.dumps(data, indent=1, ensure_ascii=False) + "\n", encoding="utf-8"
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=["prepare", "freeze", "run", "report"])
    parser.add_argument("steps", nargs="*")
    parser.add_argument("--data", type=Path, required=True)
    parser.add_argument("--config", type=Path)
    args = parser.parse_args()
    DATA, CONFIG = args.data, args.config
    if args.action == "prepare":
        prepare()
    elif args.action == "freeze":
        freeze()
    elif args.action == "report":
        report()
    else:
        for step in args.steps:
            asyncio.run(run(step, args.config))
