"""Segmentation/tracking metrics against human references. Pillow only, no inference.

Without a human reference nothing here is called: no IoU/Dice from model output alone.
"""

from itertools import pairwise

from PIL import Image, ImageChops, ImageDraw

QUALITY = (
    "correct",
    "partial",
    "over_segmented",
    "under_segmented",
    "wrong_object",
    "missed_object",
    "background_confused",
    "no_detection",
)


def polygon_mask(size: tuple[int, int], polygons: list[list[list[float]]]) -> Image:
    """Rasterize human polygons drawn in prepared-media pixels."""
    mask = Image.new("1", size)
    draw = ImageDraw.Draw(mask)
    for polygon in polygons:
        if len(polygon) < 3:
            raise ValueError("A reference polygon needs at least three vertices")
        draw.polygon([tuple(point) for point in polygon], fill=255)
    return mask


def _count(mask: Image) -> int:
    return sum(mask.convert("L").histogram()[1:])


def mask_metrics(predicted: Image, reference: Image) -> dict:
    """Pixel metrics; a ratio with an empty denominator is None, never 0 or 1."""
    if predicted.size != reference.size:
        raise ValueError("Predicted and reference masks must share prepared size")
    predicted, reference = predicted.convert("1"), reference.convert("1")
    tp = _count(ImageChops.logical_and(predicted, reference))
    fp = _count(predicted) - tp
    fn = _count(reference) - tp
    union = tp + fp + fn

    def ratio(a, b):
        return a / b if b else None

    return {
        "true_positive_px": tp,
        "false_positive_px": fp,
        "false_negative_px": fn,
        "iou": ratio(tp, union),
        "dice": ratio(2 * tp, 2 * tp + fp + fn),
        "precision": ratio(tp, tp + fp),
        "recall": ratio(tp, tp + fn),
        "reference_coverage": ratio(tp, tp + fn),
    }


def track_metrics(
    matches: dict[int, dict[str, tuple[str | None, float]]], threshold=0.5
):
    """Video association per reference object.

    ``matches[frame][reference_id] = (predicted_id or None, iou)`` for frames where a
    human marked that reference. A frame counts as associated when IoU >= threshold.
    Identity switches count changes of predicted ID between associated frames.
    """
    summary = {}
    references = sorted({ref for frame in matches.values() for ref in frame})
    for ref in references:
        frames = sorted(f for f in matches if ref in matches[f])
        associated = [
            f
            for f in frames
            if matches[f][ref][0] is not None and matches[f][ref][1] >= threshold
        ]
        ids = [matches[f][ref][0] for f in associated]
        runs = sum(
            1
            for i, f in enumerate(frames)
            if f in associated and (i == 0 or frames[i - 1] not in associated)
        )
        summary[ref] = {
            "reference_frames": len(frames),
            "associated_frames": len(associated),
            "lost_frames": len(frames) - len(associated),
            "identity_switches": sum(a != b for a, b in pairwise(ids)),
            "fragments": runs,
            "threshold_iou": threshold,
        }
    return summary
