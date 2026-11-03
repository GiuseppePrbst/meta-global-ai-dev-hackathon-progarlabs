"""Reference masks independent of SAM, and mask-level metrics against them.

References: the agent's box per instance initialises OpenCV GrabCut (classical
graph-cut, no Meta model) on the same prepared pixels SAM received; the agent then
reviews every overlay and accepts or rejects it. Status: `agent_grabcut_reviewed`,
never expert ground truth. Metrics compare SAM masks to accepted references only.
Run with OpenCV available, e.g. `uv run --with opencv-python-headless ...`.
"""

import argparse
import json
from itertools import pairwise
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

STATUS = "agent_grabcut_reviewed"


def grabcut(image: np.ndarray, box: list[float], iterations: int = 6) -> np.ndarray:
    import cv2

    h, w = image.shape[:2]
    x0, y0, x1, y1 = (round(v) for v in box)
    x0, y0 = max(0, x0), max(0, y0)
    x1, y1 = min(w - 1, x1), min(h - 1, y1)
    mask = np.zeros((h, w), np.uint8)
    bgd, fgd = np.zeros((1, 65), np.float64), np.zeros((1, 65), np.float64)
    cv2.grabCut(
        image[:, :, ::-1].copy(),
        mask,
        (x0, y0, x1 - x0, y1 - y0),
        bgd,
        fgd,
        iterations,
        cv2.GC_INIT_WITH_RECT,
    )
    return np.isin(mask, (cv2.GC_FGD, cv2.GC_PR_FGD))


def build(scenes: list[dict], out: Path) -> list[dict]:
    """GrabCut each reference box of each scene on its prepared image; review sheet."""
    from tools.meta_sam_api_lab.lab import describe_media

    rows = []
    for scene in scenes:
        boxes = scene.get("reference_boxes") or []
        if not boxes:
            continue
        info = describe_media(Path(scene["file"]), False)
        from io import BytesIO

        image = np.asarray(Image.open(BytesIO(info["image_bytes"])).convert("RGB"))
        h, w = image.shape[:2]
        folder = out / scene["scene_id"]
        folder.mkdir(parents=True, exist_ok=True)
        instances = []
        for k, b in enumerate(boxes):
            px = [b[0] * w, b[1] * h, b[2] * w, b[3] * h]
            mask = grabcut(image, px)
            Image.fromarray(mask.astype(np.uint8) * 255).save(folder / f"inst-{k}.png")
            instances.append(
                {"index": k, "box": [round(v) for v in px], "pixels": int(mask.sum())}
            )
        rows.append(
            {
                "scene_id": scene["scene_id"],
                "size": [w, h],
                "instances": instances,
                "complete": bool(scene.get("reference_complete")),
                "status": "pending_review",
            }
        )
        overlay = image.astype(np.float32)
        for k in range(len(boxes)):
            m = np.asarray(Image.open(folder / f"inst-{k}.png")) > 0
            color = np.array(
                [
                    (52, 211, 153),
                    (168, 85, 247),
                    (34, 211, 238),
                    (251, 146, 60),
                    (244, 114, 182),
                    (250, 204, 21),
                    (96, 165, 250),
                ][k % 7],
                np.float32,
            )
            overlay[m] = overlay[m] * 0.45 + color * 0.55
        Image.fromarray(overlay.astype(np.uint8)).save(
            folder / "review.jpg", quality=85
        )
    return rows


def sheet(rows: list[dict], out: Path, name: str, per=12, tile=380):
    pages = []
    for start in range(0, len(rows), per):
        chunk = rows[start : start + per]
        canvas = Image.new(
            "RGB", (4 * tile, ((len(chunk) + 3) // 4) * (tile + 16)), "white"
        )
        for i, row in enumerate(chunk):
            im = Image.open(out / row["scene_id"] / "review.jpg")
            im.thumbnail((tile - 4, tile - 4))
            x, y = (i % 4) * tile, (i // 4) * (tile + 16)
            canvas.paste(im, (x, y))
            ImageDraw.Draw(canvas).text(
                (x + 2, y + tile - 2), row["scene_id"], fill="black"
            )
        path = out / f"{name}-{start // per}.jpg"
        canvas.save(path, quality=82)
        pages.append(path)
    return pages


def boundary(mask: np.ndarray) -> np.ndarray:
    pad = np.pad(mask, 1)
    inner = pad[:-2, 1:-1] & pad[2:, 1:-1] & pad[1:-1, :-2] & pad[1:-1, 2:]
    return mask & ~inner


def boundary_f1(pred: np.ndarray, ref: np.ndarray, tolerance: int) -> float | None:
    """Boundary F1 with a pixel tolerance (distance transform via OpenCV)."""
    import cv2

    bp, br = boundary(pred), boundary(ref)
    if not bp.any() or not br.any():
        return None
    dist_r = cv2.distanceTransform((~br).astype(np.uint8), cv2.DIST_L2, 3)
    dist_p = cv2.distanceTransform((~bp).astype(np.uint8), cv2.DIST_L2, 3)
    precision = float((dist_r[bp] <= tolerance).mean())
    recall = float((dist_p[br] <= tolerance).mean())
    return (
        0.0
        if precision + recall == 0
        else 2 * precision * recall / (precision + recall)
    )


def iou(a: np.ndarray, b: np.ndarray) -> float:
    union = (a | b).sum()
    return float((a & b).sum() / union) if union else 0.0


def evaluate(
    pred: list[np.ndarray], refs: list[np.ndarray], complete: bool, tolerance: int
) -> dict:
    """Instance matching by mask IoU >= 0.5, plus pixel-level union metrics.

    With an incomplete reference (not every instance annotated), unmatched
    predictions are not counted as false positives and precision is omitted.
    """
    pairs = sorted(
        ((iou(p, r), i, j) for i, p in enumerate(pred) for j, r in enumerate(refs)),
        reverse=True,
    )
    used_p, used_r, matched = set(), set(), []
    for value, i, j in pairs:
        if value < 0.5:
            break
        if i in used_p or j in used_r:
            continue
        used_p.add(i)
        used_r.add(j)
        matched.append((i, j, value))
    union_p = np.zeros_like(refs[0])
    for p in pred:
        union_p = union_p | p
    union_r = np.zeros_like(refs[0])
    for r in refs:
        union_r = union_r | r
    tp_px = int((union_p & union_r).sum())
    precision = tp_px / union_p.sum() if complete and union_p.sum() else None
    recall = tp_px / union_r.sum() if union_r.sum() else None
    # Fragmentation: predictions overlapping each reference by >= 10 % of the prediction.
    fragments = [
        sum(1 for p in pred if (p & r).sum() >= 0.1 * max(1, p.sum())) for r in refs
    ]
    return {
        "matched": len(matched),
        "missed": len(refs) - len(matched),
        "false_positives": (len(pred) - len(matched)) if complete else None,
        "mean_mask_iou": round(float(np.mean([m[2] for m in matched])), 4)
        if matched
        else None,
        "mean_dice": round(float(np.mean([2 * m[2] / (1 + m[2]) for m in matched])), 4)
        if matched
        else None,
        "pixel_precision": round(precision, 4) if precision is not None else None,
        "pixel_recall": round(recall, 4) if recall is not None else None,
        "union_iou": round(iou(union_p, union_r), 4) if complete else None,
        "boundary_f1": round(
            float(
                np.mean(
                    [
                        b
                        for b in (
                            boundary_f1(pred[i], refs[j], tolerance)
                            for i, j, _ in matched
                        )
                        if b is not None
                    ]
                )
            ),
            4,
        )
        if matched
        else None,
        "fragmented_references": sum(f > 1 for f in fragments),
        "predicted_instances": len(pred),
        "reference_instances": len(refs),
    }


def load_masks(
    folder: Path, paths: list[str], size: tuple[int, int]
) -> list[np.ndarray]:
    out = []
    for p in paths:
        m = np.asarray(Image.open(folder / p).convert("L")) > 0
        if m.shape[::-1] != tuple(size):
            m = (
                np.asarray(
                    Image.fromarray(m.astype(np.uint8) * 255).resize(
                        size, Image.Resampling.NEAREST
                    )
                )
                > 0
            )
        out.append(m)
    return out


def metrics(runs: Path, references: dict[str, tuple[Path, dict]]) -> list[dict]:
    """references: scene id -> (reference folder, reviewed row). v2 scenes that reuse
    a v1 image are also registered under the base scene id."""
    rows = []
    for run in sorted(runs.iterdir()):
        result_path = run / "result.json"
        if not result_path.is_file():
            continue
        result = json.loads(result_path.read_text("utf-8"))
        scene = result.get("source_ref")
        refs_root, ref = references.get(scene, (None, None))
        if (
            result.get("media") != "image"
            or not ref
            or result["status"] not in ("completed", "no_matches")
        ):
            continue
        accepted = [i for i in ref["instances"] if i.get("accepted")]
        if not accepted:
            continue
        size = tuple(ref["size"])
        refs = load_masks(
            refs_root / ref["scene_id"],
            [f"inst-{i['index']}.png" for i in accepted],
            size,
        )
        objs = result["frames"][0]["objects"] if result.get("frames") else []
        pred = load_masks(run, [o["mask"] for o in objs], size)
        tolerance = max(2, round(0.01 * float(np.hypot(*size))))
        complete = ref["complete"] and len(accepted) == len(ref["instances"])
        rows.append(
            {
                "exp_id": run.name,
                "scene": scene,
                "mode": result.get("prompt_mode"),
                "prompt": result.get("prompt")
                if result.get("prompt_mode") == "concept"
                else None,
                "reference_status": STATUS,
                "reference_complete": complete,
                **evaluate(pred, refs, complete, tolerance),
            }
        )
    return rows


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=["build", "metrics"])
    parser.add_argument("--scenes", type=Path)
    parser.add_argument(
        "--refs", type=Path, nargs="+", required=True, help="Private reference folders"
    )
    parser.add_argument("--runs", type=Path)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    scenes = json.loads(args.scenes.read_text("utf-8")) if args.scenes else []
    if args.action == "build":
        out = args.refs[0]
        rows = build(scenes, out)
        (out / "references.json").write_text(
            json.dumps(rows, indent=1), encoding="utf-8"
        )
        print([str(p) for p in sheet(rows, out, "review")])
    else:
        references = {}
        for folder in args.refs:
            for r in json.loads((folder / "review.json").read_text("utf-8")):
                references[r["scene_id"]] = (folder, r)
                references.setdefault(r["scene_id"].removesuffix("-v2"), (folder, r))
        rows = metrics(args.runs, references)
        args.output.write_text(
            json.dumps(rows, indent=1, ensure_ascii=False) + "\n", encoding="utf-8"
        )
        print(len(rows), "rows")


if __name__ == "__main__":
    main()


def build_track(spec: dict, out: Path) -> dict:
    """Per-frame references for a prepared clip: {"clip": dir, "frames": {i: [boxes px]}}."""
    rows = {}
    frames = sorted((Path(spec["clip"]) / "frames").glob("*.png"))
    for index, boxes in spec["frames"].items():
        image = np.asarray(Image.open(frames[int(index)]).convert("RGB"))
        rows[index] = []
        for k, box in enumerate(boxes):
            mask = grabcut(image, box)
            name = f"f{int(index):04d}-inst{k}.png"
            Image.fromarray(mask.astype(np.uint8) * 255).save(out / name)
            rows[index].append({"instance": k, "mask": name, "pixels": int(mask.sum())})
        overlay = image.astype(np.float32)
        for k, row in enumerate(rows[index]):
            m = np.asarray(Image.open(out / row["mask"])) > 0
            overlay[m] = (
                overlay[m] * 0.45
                + np.array([(52, 211, 153), (168, 85, 247)][k % 2]) * 0.55
            )
        Image.fromarray(overlay.astype(np.uint8)).save(
            out / f"review-f{int(index):04d}.jpg", quality=85
        )
    return rows


def track_metrics(run: Path, refs: Path, review: dict) -> dict:
    """Per annotated frame: matched IoU per reference instance, and identity stability
    (which provider ID covers each reference instance over time)."""
    result = json.loads((run / "result.json").read_text("utf-8"))
    frames = result.get("frames", [])
    size = tuple(result["prepared_size"])
    per_frame, owner = [], {}
    for index, instances in review["frames"].items():
        idx = int(index)
        objs = frames[idx]["objects"] if idx < len(frames) else []
        pred = load_masks(run, [o["mask"] for o in objs], size)
        for inst in instances:
            if not inst.get("accepted"):
                continue
            ref = load_masks(refs, [inst["mask"]], size)[0]
            scores = [iou(p, ref) for p in pred]
            best = int(np.argmax(scores)) if scores else None
            value = scores[best] if scores else 0.0
            if value >= 0.5:
                owner.setdefault(inst["instance"], []).append(str(objs[best]["id"]))
            per_frame.append(
                {
                    "frame": idx,
                    "instance": inst["instance"],
                    "iou": round(value, 4),
                    "matched": value >= 0.5,
                }
            )
    matched = [p for p in per_frame if p["matched"]]
    switches = sum(sum(a != b for a, b in pairwise(ids)) for ids in owner.values())
    return {
        "exp_id": run.name,
        "annotated_frame_instances": len(per_frame),
        "matched": len(matched),
        "mean_iou_matched": round(float(np.mean([p["iou"] for p in matched])), 4)
        if matched
        else None,
        "mean_iou_all": round(float(np.mean([p["iou"] for p in per_frame])), 4)
        if per_frame
        else None,
        "id_switches": switches,
        "ids_per_instance": {str(k): sorted(set(v)) for k, v in owner.items()},
        "per_frame": per_frame,
        "reference_status": STATUS,
    }
