"""Resumable open-set campaign (phase F). Each step writes its private result file once.

Steps are skipped when their output exists, so a run interrupted by the daily
quota resumes without repeating paid calls. The ledger still decides admission.
"""

import argparse
import asyncio
import json
from pathlib import Path

from evaluations import open_set_eval as ose
from evaluations.botanical_campaign import run_cases

DATA = Path()  # set from --data: private folder with cases, copies and results
CONFIG = Path()  # set from --config: private lab configuration


def load(name):
    return json.loads((DATA / name).read_text(encoding="utf-8"))


def usable(cases):
    return [c for c in cases if not c["agent_visual_check"]["excluded"]]


def as_rows(results):
    """Historical 30-10 rows have no open-set fields: first candidate = presented."""
    rows = []
    for r in results:
        proposed = r.get("proposed", r.get("candidates", []))
        rows.append(
            {
                **r,
                "proposed": proposed,
                "accepted": r.get("accepted", proposed[0] if proposed else None)
                if "accepted" in r or r.get("strategy") in (None, "baseline")
                else None,
            }
        )
    return rows


def stage1_rows(verify_rows):
    """Strategy B from D's first stage (identical prompt): undo only the verification.

    A candidate rejected by verification sits first in exploratory_candidates and
    the result carries a 'verification' stage; that is what B would have accepted.
    """
    rows = []
    for r in verify_rows:
        ident = r.get("identification") or {}
        verified = "verification" in (r.get("stage_usage") or {})
        rejected = verified and not r["accepted"]
        first = (ident.get("exploratory_candidates") or [{}])[0].get("species_id")
        rows.append(
            {
                **r,
                "strategy": "abstain-from-verify-stage1",
                "accepted": first if rejected else r["accepted"],
            }
        )
    return rows


async def step(name, cases, strategy, experiment="open-set"):
    out = DATA / f"open-set-{name}.json"
    if out.is_file() and len(json.loads(out.read_text(encoding="utf-8"))) == len(cases):
        return json.loads(out.read_text(encoding="utf-8"))
    return await run_cases(
        cases,
        experiment,
        CONFIG,
        DATA / "botanical-originals",
        out,
        strategy=strategy,
        phase="F",
    )


def multiview_cases(cases):
    """For each multiview observation: 1, 2 and 3 views of the same individual."""
    out = []
    for c in cases:
        views = [c["file"], *c["extra_files"]]
        for n in range(1, len(views) + 1):
            out.append(
                {
                    **c,
                    "image_id": f"{c['image_id']}#views={n}",
                    "file": views[0],
                    "extra_files": views[1:n],
                    "views": c["views"][:n],
                }
            )
    return out


async def main(steps: list[str], chosen: str):
    dev = usable(load("botanical-campaign-cases.json"))
    evaluation = usable(load("open-set-eval-cases.json"))
    plan = {
        "dev-comparators": (dev, "comparators"),
        "dev-verify": (dev, "verify"),
        "multiview": (
            multiview_cases(load("botanical-campaign-multiview.json")),
            chosen,
        ),
        "eval-baseline": (evaluation, "baseline"),
        f"eval-{chosen}": (evaluation, chosen),
    }
    for name in steps:
        cases, strategy = plan[name]
        rows = await step(name, cases, strategy)
        print(
            name, json.dumps(ose.metrics(as_rows(rows))["negatives_false_acceptance"])
        )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("steps", nargs="+")
    parser.add_argument("--chosen", default="comparators")
    parser.add_argument("--data", type=Path, required=True)
    parser.add_argument("--config", type=Path, required=True)
    args = parser.parse_args()
    DATA, CONFIG = args.data, args.config
    asyncio.run(main(args.steps, args.chosen))
