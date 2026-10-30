"""Detectree2 crown benchmark for hosted SAM 3.1: box-from-reference vs text concept.

Source: CanopyRS/Detectree2 (Hugging Face), from Ball, Jackson, Hickman & Koay 2023,
Zenodo 10.5281/zenodo.8136161 v2, CC BY 4.0. Tiles are cached OUTSIDE Git; only
tile names and metrics are published. A box taken from the reference annotation
makes the task easier: it measures delineation, never autonomous detection.
Tropical Malaysia at ~0.1 m/px does not represent Valdivian temperate forest.
"""

import argparse
import asyncio
import json
import urllib.parse
import urllib.request
from io import BytesIO
from pathlib import Path

from PIL import Image

DATASET = "CanopyRS/Detectree2"
ROWS = "https://datasets-server.huggingface.co/rows"
ATTRIBUTION = (
    "Ball, Jackson, Hickman & Koay (2023), Crown Data for 'Accurate delineation of "
    "individual tree crowns in tropical forests from aerial RGB imagery using Mask "
    "R-CNN', Zenodo 10.5281/zenodo.8136161, CC BY 4.0; via CanopyRS/Detectree2"
)


def rle_counts(text: str) -> list[int]:
    """COCO compressed RLE string -> run lengths (pycocotools rleFrString)."""
    counts, p = [], 0
    while p < len(text):
        value, k, more = 0, 0, True
        while more:
            c = ord(text[p]) - 48
            value |= (c & 0x1F) << (5 * k)
            more = bool(c & 0x20)
            p += 1
            k += 1
            if not more and c & 0x10:
                value |= -1 << (5 * k)
        if len(counts) > 2:
            value += counts[-2]
        counts.append(value)
    return counts


def rle_mask(rle: dict) -> Image.Image:
    """Column-major COCO RLE -> mode L mask (255 = crown)."""
    height, width = rle["size"]
    flat = bytearray(height * width)
    position, on = 0, False
    for run in rle_counts(rle["counts"]):
        if on:
            flat[position : position + run] = b"\xff" * run
        position += run
        on = not on
    if position != height * width:
        raise ValueError("RLE length does not match mask size")
    # Stored column-major: build W x H then transpose to H x W.
    return Image.frombytes("L", (height, width), bytes(flat)).transpose(
        Image.Transpose.TRANSPOSE
    )


def choose_crown(annotations: dict, size: int, margin: int = 5) -> int | None:
    """Largest reference crown whose box is not truncated by the tile edge."""
    best, best_area = None, 0
    for index, (x, y, w, h) in enumerate(annotations["bbox"]):
        inside = (
            x > margin
            and y > margin
            and x + w < size - margin
            and y + h < size - margin
        )
        if inside and w * h > best_area:
            best, best_area = index, w * h
    return best


def save_tile(url: str, path: Path) -> None:
    with urllib.request.urlopen(url, timeout=60) as response:
        Image.open(BytesIO(response.read())).convert("RGB").save(path)


def fetch_rows(offset: int, length: int, split="test") -> list[dict]:
    query = urllib.parse.urlencode(
        {
            "dataset": DATASET,
            "config": "default",
            "split": split,
            "offset": offset,
            "length": length,
        }
    )
    with urllib.request.urlopen(f"{ROWS}?{query}", timeout=60) as response:
        return [r["row"] for r in json.load(response)["rows"]]


async def evaluate(
    rows, cache: Path, root: Path, config, phase_cap: float, run_experiment
):
    from tools.meta_sam_api_lab.metrics import mask_metrics

    results = []
    for row in rows:
        tile = Path(row["tile_name"]).stem
        path = cache / f"{tile}.png"
        if not path.is_file():
            # Signed temporary URL: used once, never stored or logged.
            await asyncio.to_thread(save_tile, row["image"]["src"], path)
        index = choose_crown(row["annotations"], row["width"])
        if index is None:
            results.append({"tile": tile, "status": "no_untruncated_crown"})
            continue
        x, y, w, h = row["annotations"]["bbox"][index]
        truth = rle_mask(row["annotations"]["segmentation"][index])
        entry = {
            "tile": tile,
            "reference_crowns_in_tile": len(row["annotations"]["bbox"]),
            "selected_crown_index": index,
        }
        for mode in ("box_from_reference", "concept_tree"):
            spec = (
                {
                    "objects": [
                        {
                            "id": 1,
                            "prompts": [{"frame": 0, "box": [x, y, x + w, y + h]}],
                        }
                    ]
                }
                if mode == "box_from_reference"
                else {"concept": "tree"}
            )
            from tools.meta_sam_api_lab.lab import ObjectSpec

            manifest = await run_experiment(
                config,
                path,
                root / "outputs" / f"detectree2-{mode}-{tile[-24:]}",
                spec.get("concept"),
                authorized=True,
                objects=[ObjectSpec.model_validate(o) for o in spec.get("objects", [])]
                or None,
                include_confidence=True,
                source_ref=f"public:{DATASET}:{tile}",
                phase="D",
                phase_cap_usd=phase_cap,
                experiment_note=f"Detectree2 {mode}; reference crown {index}",
            )
            folder = root / "outputs" / f"detectree2-{mode}-{tile[-24:]}"
            scored = []
            for frame in manifest.get("frames") or []:
                for obj in frame["objects"]:
                    with Image.open(folder / obj["mask"]) as mask:
                        scored.append((obj, mask_metrics(mask, truth)))
            best = max(scored, key=lambda s: s[1]["iou"] or 0, default=None)
            # Zero-shot output may be a different real crown: match against all.
            references = [rle_mask(r) for r in row["annotations"]["segmentation"]]
            any_reference = [
                max((mask_metrics(m, ref)["iou"] or 0) for ref in references)
                for m in [Image.open(folder / o["mask"]) for o, _ in scored]
            ]
            entry[mode] = {
                "best_iou_any_reference_crown": max(any_reference, default=0.0),
                "status": manifest["status"],
                "masks_returned": manifest.get("masks"),
                "best_iou": best[1]["iou"] if best else 0.0,
                "best_dice": best[1]["dice"] if best else 0.0,
                "precision": best[1]["precision"] if best else None,
                "recall": best[1]["recall"] if best else 0.0,
                "confidence": best[0].get("confidence") if best else None,
                "latency_ms": round(manifest.get("latency_ms") or 0),
                "estimated_usd": manifest.get("estimated_usd"),
            }
        results.append(entry)
    return results


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", type=Path, required=True)
    parser.add_argument("--root", type=Path, required=True, help="Private lab root")
    parser.add_argument(
        "--cache", type=Path, required=True, help="Tile cache outside Git"
    )
    parser.add_argument(
        "--output", type=Path, required=True, help="Public metrics JSON"
    )
    parser.add_argument("--tiles", type=int, default=4)
    parser.add_argument("--authorize-meta", action="store_true")
    parser.add_argument("--rescore", action="store_true", help="Score saved masks only")
    args = parser.parse_args()
    if not (args.authorize_meta or args.rescore) or not 1 <= args.tiles <= 5:
        raise SystemExit("Explicit --authorize-meta and 1-5 tiles required")
    from tools.meta_sam_api_lab.lab import (
        campaign_from_private,
        config_from_private,
        run_experiment,
    )
    from tools.meta_sam_api_lab.media import private_path

    cache = private_path(args.cache)
    cache.mkdir(parents=True, exist_ok=True)
    campaign = campaign_from_private(args.config)
    rows = fetch_rows(0, args.tiles)
    if args.rescore:  # reuse saved masks, never call Meta again

        async def offline(config, path, output, *a, **k):
            return json.loads((output / "result.json").read_text(encoding="utf-8"))

        run_experiment = offline
    results = asyncio.run(
        evaluate(
            rows,
            cache,
            private_path(args.root),
            config_from_private(args.config),
            campaign.phase_caps_usd["D"],
            run_experiment,
        )
    )
    box = [
        r["box_from_reference"]["best_iou"]
        for r in results
        if "box_from_reference" in r
    ]
    concept = [
        r["concept_tree"]["best_iou_any_reference_crown"]
        for r in results
        if "concept_tree" in r
    ]
    report = {
        "dataset": DATASET,
        "attribution": ATTRIBUTION,
        "license": "CC-BY-4.0",
        "split": "test",
        "selection": "first rows of test split; largest untruncated reference crown",
        "model": "sam-3.1",
        "n_tiles": len(results),
        "mean_iou_box_from_reference": sum(box) / len(box) if box else None,
        "mean_iou_concept_tree_best_match_any_crown": sum(concept) / len(concept)
        if concept
        else None,
        "concept_tree_tiles_with_any_mask": sum(
            bool(r["concept_tree"]["masks_returned"])
            for r in results
            if "concept_tree" in r
        ),
        "limitations": [
            "n tiny; not a benchmark score",
            "box from reference annotation: delineation only, not detection",
            "tropical Malaysia ~0.1 m/px; no transfer claim to Valdivian forest",
        ],
        "tiles": results,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=1) + "\n", encoding="utf-8")
    print(
        json.dumps(
            {
                k: v
                for k, v in report.items()
                if k.startswith(("n_", "mean_", "concept_"))
            }
        )
    )


if __name__ == "__main__":
    main()
