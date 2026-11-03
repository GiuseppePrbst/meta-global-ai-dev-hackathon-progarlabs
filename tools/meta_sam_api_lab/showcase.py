"""Presentation renderer for real SAM 3.1 results. Offline: never calls Meta.

Reads a run folder written by run_experiment (result.json + masks/*.png + frames)
and draws only the provider's masks: vivid per-instance colours, glowing contours,
dimmed background or isolated object, and label chips that keep SAM's segmentation
apart from any Muse candidate. Video exports at a higher FPS repeat each inferred
frame (nearest earlier inference); masks are never interpolated or invented.
"""

import json
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

PALETTE = [  # high-contrast, colour-blind friendlier ordering; purple = ProGarLabs accent
    (52, 211, 153),
    (168, 85, 247),
    (34, 211, 238),
    (251, 146, 60),
    (244, 114, 182),
    (250, 204, 21),
    (96, 165, 250),
    (163, 230, 53),
]
BG = (11, 15, 13)
FONT = "C:/Windows/Fonts/bahnschrift.ttf"


def font(size: int):
    try:
        return ImageFont.truetype(FONT, size)
    except OSError:  # non-Windows CI: default bitmap font
        return ImageFont.load_default()


def color(index: int) -> tuple[int, int, int]:
    return PALETTE[index % len(PALETTE)]


def load_run(run: Path) -> dict:
    """Frames with their objects; colour index is stable per provider object ID."""
    result = json.loads((run / "result.json").read_text(encoding="utf-8"))
    ids = sorted(
        {o["id"] for f in result.get("frames", []) for o in f["objects"]}, key=str
    )
    order = {identifier: i for i, identifier in enumerate(ids)}
    return {"result": result, "order": order, "run": run}


def frame_image(run: dict, index: int) -> Image.Image:
    frames = sorted((run["run"] / "frames").glob("*"))
    with Image.open(frames[index]) as source:
        return source.convert("RGB")


def masks_for(run: dict, index: int) -> list[dict]:
    frames = run["result"].get("frames", [])
    if index >= len(frames):
        return []
    out = []
    for o in frames[index]["objects"]:
        with Image.open(run["run"] / o["mask"]) as mask:
            out.append(
                {
                    **o,
                    "array": np.asarray(mask.convert("L")) > 0,
                    "color_index": run["order"][o["id"]],
                }
            )
    return out


def draw_masks(
    image: Image.Image,
    objects: list[dict],
    *,
    mode: str = "overlay",
    phase: float = 1.0,
    selected: str | None = None,
    labels: dict[str, str] | None = None,
    label_scale: float = 1.0,
) -> Image.Image:
    """mode: overlay | dim | isolate | contour. phase 0-1 animates fill and glow."""
    base = np.asarray(image, dtype=np.float32)
    union = np.zeros(base.shape[:2], bool)
    for o in objects:
        union |= o["array"]
    if mode in ("dim", "isolate"):
        keep = (
            union
            if selected is None
            else next((o["array"] for o in objects if o["id"] == selected), union)
        )
        factor = 0.28 if mode == "dim" else 0.0
        fill = np.array(BG if mode == "isolate" else (0, 0, 0), np.float32)
        base = np.where(keep[..., None], base, base * factor + fill * (1 - factor))
    if mode == "isolate" and selected is not None:
        objects = [o for o in objects if o["id"] == selected]
    out = base.copy()
    alpha = 0.42 * min(1.0, phase * 1.5) if mode in ("overlay", "dim") else 0.0
    for o in objects:
        rgb = np.array(color(o["color_index"]), np.float32)
        m = o["array"]
        out[m] = out[m] * (1 - alpha) + rgb * alpha
    canvas = Image.fromarray(out.clip(0, 255).astype(np.uint8))
    # Contours: mask edge, blurred glow plus a crisp line.
    glow = Image.new("RGBA", canvas.size)
    line = Image.new("RGBA", canvas.size)
    width = max(2, round(min(canvas.size) / 300))
    pad = width * 8  # filters only inside each mask's padded bounding box
    for o in objects:
        ys, xs = np.nonzero(o["array"])
        if not len(xs):
            continue
        x0, y0 = max(0, xs.min() - pad), max(0, ys.min() - pad)
        x1, y1 = (
            min(canvas.width, xs.max() + pad + 1),
            min(canvas.height, ys.max() + pad + 1),
        )
        mask = Image.fromarray((o["array"][y0:y1, x0:x1] * 255).astype(np.uint8))
        edge = np.asarray(mask.filter(ImageFilter.MaxFilter(2 * width + 1))).astype(
            np.int16
        ) - np.asarray(mask.filter(ImageFilter.MinFilter(3)))
        edge = Image.fromarray((edge > 0).astype(np.uint8) * 255)
        rgb = color(o["color_index"])
        glow_alpha = int(110 + 90 * (0.5 + 0.5 * math.sin(phase * math.tau)))
        layer = Image.new("RGBA", mask.size, (*rgb, 0))
        layer.putalpha(
            edge.filter(ImageFilter.GaussianBlur(width * 2.5)).point(
                lambda v, a=glow_alpha: min(255, v * 2) * a // 255
            )
        )
        glow.alpha_composite(layer, (int(x0), int(y0)))
        crisp = Image.new("RGBA", mask.size, (*rgb, 0))
        crisp.putalpha(edge)
        line.alpha_composite(crisp, (int(x0), int(y0)))
    canvas = Image.alpha_composite(
        Image.alpha_composite(canvas.convert("RGBA"), glow), line
    )
    if labels:
        draw = ImageDraw.Draw(canvas)
        f = font(max(14, round(min(canvas.size) / 32 * label_scale)))
        for o in objects:
            text = labels.get(o["id"])
            if not text:
                continue
            ys, xs = np.nonzero(o["array"])
            if not len(xs):
                continue
            x, y = int(xs.min()), max(0, int(ys.min()) - f.size - 12)
            box = draw.textbbox((x + 10, y + 5), text, font=f)
            draw.rounded_rectangle(
                (box[0] - 8, box[1] - 5, box[2] + 8, box[3] + 5),
                8,
                fill=(*color(o["color_index"]), 230),
            )
            draw.text((x + 10, y + 5), text, font=f, fill=(10, 10, 10))
    return canvas.convert("RGB")


def fit(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    """Scale up or down to fit the box, keeping aspect (presentation only)."""
    scale = min(size[0] / image.width, size[1] / image.height)
    target = (max(1, round(image.width * scale)), max(1, round(image.height * scale)))
    return image.resize(target, Image.Resampling.LANCZOS)


def slide(
    media: Image.Image,
    title: str,
    lines: list[str],
    *,
    kicker: str = "",
    footer: str = "",
    size=(1920, 1080),
) -> Image.Image:
    """Dark slide: media as protagonist on the left, a short technical panel right."""
    canvas = Image.new("RGB", size, BG)
    panel_w = round(size[0] * 0.30)
    pic = fit(media, (size[0] - panel_w - 120, size[1] - 160))
    canvas.paste(
        pic,
        (60 + (size[0] - panel_w - 120 - pic.width) // 2, (size[1] - pic.height) // 2),
    )
    draw = ImageDraw.Draw(canvas)
    x = size[0] - panel_w + 10
    y = 150
    if kicker:
        draw.text((x, y), kicker.upper(), font=font(26), fill=(168, 85, 247))
        y += 46
    draw.text((x, y), title, font=font(54), fill=(240, 240, 235))
    y += 90
    for text in lines:
        for chunk in wrap(text, 34):
            draw.text((x, y), chunk, font=font(28), fill=(200, 205, 200))
            y += 40
        y += 14
    if footer:
        for i, chunk in enumerate(wrap(footer, 120)):
            draw.text(
                (60, size[1] - 70 + i * 26), chunk, font=font(20), fill=(130, 140, 135)
            )
    return canvas


def wrap(text: str, width: int) -> list[str]:
    words, lines, current = text.split(), [], ""
    for word in words:
        if len(current) + len(word) + 1 > width and current:
            lines.append(current)
            current = word
        else:
            current = f"{current} {word}".strip()
    return lines + ([current] if current else [])


def title_card(title: str, subtitle: str, size=(1920, 1080)) -> Image.Image:
    canvas = Image.new("RGB", size, BG)
    draw = ImageDraw.Draw(canvas)
    t = font(96)
    s = font(40)
    tw = draw.textlength(title, font=t)
    sw = draw.textlength(subtitle, font=s)
    draw.text(
        ((size[0] - tw) / 2, size[1] / 2 - 90), title, font=t, fill=(240, 240, 235)
    )
    draw.text(
        ((size[0] - sw) / 2, size[1] / 2 + 40), subtitle, font=s, fill=(168, 85, 247)
    )
    return canvas
