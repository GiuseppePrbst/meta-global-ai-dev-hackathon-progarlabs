"""Muse + SAM + catalog (E1/Q7): identify on the original photo vs the SAM crop.

The crop is the SAM mask's bounding box plus 20 % context margin on each side, so
diagnostic surroundings survive. Flora uses the production `verify` adapter;
fauna and fungi use the experimental multikingdom pipeline (no endpoint). Every
call goes through the ledger (phase H). Output is private; a sanitized summary
(decision, assessment, accepted taxon) is published.
"""

import argparse
import asyncio
import json
from io import BytesIO
from pathlib import Path
from time import perf_counter

from PIL import Image

PANEL = {"birds": "fauna", "fungi": "fungi", "trees": "flora", "plants": "flora"}


def crop_with_context(image: Image.Image, box: list[int], margin=0.2) -> Image.Image:
    x0, y0, x1, y1 = box
    dx, dy = (x1 - x0) * margin, (y1 - y0) * margin
    return image.crop(
        (
            max(0, int(x0 - dx)),
            max(0, int(y0 - dy)),
            min(image.width, int(x1 + dx)),
            min(image.height, int(y1 + dy)),
        )
    )


def highlight(image: Image.Image, mask_path: Path) -> Image.Image:
    """Experiment D: full photo, everything outside the SAM mask dimmed to 30 %."""
    import numpy as np

    mask = np.asarray(Image.open(mask_path).convert("L")) > 0
    pixels = np.asarray(image, dtype=np.float32)
    pixels[~mask] *= 0.3
    return Image.fromarray(pixels.astype("uint8"))


def jpeg(image: Image.Image) -> bytes:
    buffer = BytesIO()
    image.convert("RGB").save(buffer, "JPEG", quality=92)
    return buffer.getvalue()


async def identify(
    run: Path,
    domain: str,
    variant: str,
    config_path: Path,
    model="muse-spark-1.3",
    phase="H",
) -> dict:
    from bosque_ai.meta import MetaAPIError, MetaResponsesClient, MuseSparkAdapter
    from bosque_api.catalog import get_comparators, get_species
    from bosque_api.execution import ExecutionStore
    from bosque_api.images import prepare_image

    from evaluations.multikingdom_campaign import panel_config
    from tools.meta_sam_api_lab.lab import (
        campaign_from_private,
        config_from_private,
        phase_admission,
    )

    result = json.loads((run / "result.json").read_text("utf-8"))
    original = Image.open(next((run / "frames").glob("*"))).convert("RGB")
    objects = result["frames"][0]["objects"]
    largest = max(objects, key=lambda o: o["foreground_pixels"])
    if variant == "original":
        image = original
    elif variant == "highlight":
        image = highlight(original, run / largest["mask"])
    else:
        image = crop_with_context(original, largest["box"])
    data = prepare_image(jpeg(image), "image/jpeg")
    config = config_from_private(config_path)
    owner, cap = phase_admission(
        phase, campaign_from_private(config_path).phase_caps_usd[phase]
    )
    ledger = ExecutionStore(config)
    reservation = await asyncio.to_thread(ledger.reserve, owner, "identify", cap)
    client = MetaResponsesClient(config.model_api_key, config.meta_timeout_seconds)
    status, row, started = "provider_error", {}, perf_counter()
    try:
        if PANEL[domain] == "flora":
            species = get_species()
            ident = await MuseSparkAdapter(client, model).identify(
                data,
                "image/jpeg",
                {s.id: s.scientific_name for s in species},
                strategy="verify",
                comparators=[c.model_dump() for c in get_comparators()],
                traits={
                    s.id: s.morphology
                    for s in species
                    if s.trait_validation_status != "pending"
                },
            )
        else:
            from bosque_ai.multikingdom import identify_organism

            panel = panel_config(PANEL[domain])
            ident = await identify_organism(
                client,
                model,
                PANEL[domain],
                data,
                "image/jpeg",
                panel["catalog"],
                strategy="candidates",
            )
        status = "completed"
        row = {
            "accepted": ident.accepted_species_id,
            "proposed": [
                c.species_id for c in [*ident.candidates, *ident.exploratory_candidates]
            ],
            "catalog_assessment": ident.catalog_assessment,
            "similar_out_of_catalog": ident.similar_out_of_catalog,
            "observed_traits": ident.observed_traits[:5],
            "prompt_version": ident.prompt_version,
        }
    except MetaAPIError as exc:
        row = {"error": type(exc).__name__}
    finally:
        await asyncio.to_thread(
            ledger.finish,
            reservation,
            status,
            {"model": model, "usage": client.usage.copy()},
        )
    return {
        "run": run.name,
        "variant": variant,
        "model": model,
        "status": status,
        "crop_size": list(image.size),
        "latency_ms": round((perf_counter() - started) * 1000),
        "usage": client.usage.copy(),
        **row,
    }


async def main(
    runs,
    root,
    scenes,
    config,
    out,
    variants=("original", "sam_crop"),
    model="muse-spark-1.3",
    phase="H",
):
    done = json.loads(out.read_text("utf-8")) if out.is_file() else []
    seen = {(r["run"], r["variant"], r.get("model", "muse-spark-1.3")) for r in done}
    for name in runs:
        run = root / name
        result = json.loads((run / "result.json").read_text("utf-8"))
        if result["status"] != "completed":
            continue
        domain = scenes[result["source_ref"]]["domain"]  # v2 scenes keep their domain
        for variant in variants:
            if (name, variant, model) in seen:
                continue
            done.append(await identify(run, domain, variant, config, model, phase))
            out.write_text(
                json.dumps(done, indent=1, ensure_ascii=False), encoding="utf-8"
            )
            print(
                name,
                variant,
                done[-1].get("accepted"),
                done[-1].get("catalog_assessment"),
                flush=True,
            )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("runs", nargs="+")
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--scenes", type=Path, required=True)
    parser.add_argument("--config", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument(
        "--variants",
        nargs="+",
        default=["original", "sam_crop"],
        choices=["original", "sam_crop", "highlight"],
    )
    parser.add_argument("--model", default="muse-spark-1.3")
    parser.add_argument("--phase", default="H")
    args = parser.parse_args()
    scenes = {s["scene_id"]: s for s in json.loads(args.scenes.read_text("utf-8"))}
    asyncio.run(
        main(
            args.runs,
            args.root,
            scenes,
            args.config,
            args.output,
            args.variants,
            args.model,
            args.phase,
        )
    )
