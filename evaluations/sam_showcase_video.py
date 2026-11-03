"""Compose the Bosque Vivo SAM 3.1 showcase from saved real results. No Meta calls.

Blocks (private JSON) name run folders; every pixel of colour comes from a SAM mask
in those folders. Video blocks show each inferred frame for out_fps/inference_fps
output frames (nearest earlier inference, no interpolation; frames without masks
are shown without masks). Writes MP4s and a provenance manifest next to them,
outside Git.
"""

import argparse
import json
import math
import shutil
import subprocess
from pathlib import Path

from PIL import Image

from tools.meta_sam_api_lab import showcase as sc

FPS = 30


def shrink(image, objects, max_side=1280):
    """Downscale photo and masks together to on-screen size (nearest for masks)."""
    import numpy as np

    scale = max_side / max(image.size)
    if scale >= 1:
        return image, objects
    size = (round(image.width * scale), round(image.height * scale))
    small = []
    for o in objects:
        mask = Image.fromarray(o["array"].astype("uint8") * 255).resize(
            size, Image.Resampling.NEAREST
        )
        box = [round(v * scale) for v in o["box"]]
        small.append({**o, "array": np.asarray(mask) > 0, "box": box})
    return image.resize(size, Image.Resampling.LANCZOS), small


def image_block(block, root: Path, size, vertical=False):
    run = sc.load_run(root / block["run"])
    image, objs = shrink(sc.frame_image(run, 0), sc.masks_for(run, 0))
    concept = block.get("concept_label", run["result"].get("prompt") or "objeto")
    labels = {o["id"]: f"SAM · {concept} #{i + 1}" for i, o in enumerate(objs)}
    seconds = block.get("seconds", 4)
    frame = None
    for k in range(int(seconds * FPS)):
        if k % 3 and frame is not None:  # animation at 10 FPS; repeat in between
            yield frame
            continue
        phase = k / (seconds * FPS)
        mode = block.get("mode", "overlay")
        if block.get("reveal") and phase < 0.25:
            media = image  # original first, then the real masks fade in
        else:
            media = sc.draw_masks(
                image,
                objs,
                mode=mode,
                phase=min(1.0, (phase - 0.25) / 0.5 + 0.2),
                labels=labels if block.get("labels", True) else None,
                selected=block.get("selected"),
            )
        frame = layout(media, block, size, vertical)
        yield frame


def compare_block(block, root: Path, size, vertical=False):
    left, right = (sc.load_run(root / r) for r in block["runs"])
    a = sc.draw_masks(
        *shrink(sc.frame_image(left, 0), sc.masks_for(left, 0)), phase=0.9
    )
    b = sc.draw_masks(
        *shrink(sc.frame_image(right, 0), sc.masks_for(right, 0)), phase=0.9
    )
    h = max(a.height, b.height)
    pair = Image.new("RGB", (a.width + b.width + 24, h), sc.BG)
    pair.paste(a, (0, 0))
    pair.paste(b, (a.width + 24, 0))
    frame = layout(pair, block, size, vertical)
    for _ in range(int(block.get("seconds", 5) * FPS)):
        yield frame


def video_block(block, root: Path, size, vertical=False):
    run = sc.load_run(root / block["run"])
    count = len(run["result"]["frames"])
    fps = run["result"].get("fps", 10)
    concept = block.get("concept_label", run["result"].get("prompt") or "objeto")
    cache = {}
    loops = block.get("loops", 1)
    for k in range(int(count / fps * FPS * loops)):
        index = math.floor((k / FPS) * fps + 1e-9) % count  # nearest earlier inference
        if index not in cache:
            objs = sc.masks_for(run, index)
            labels = {o["id"]: f"SAM · {concept} · ID {o['id']}" for o in objs}
            media = sc.draw_masks(
                sc.frame_image(run, index),
                objs,
                mode=block.get("mode", "overlay"),
                phase=0.8,
                labels=labels,
                label_scale=0.8,
            )
            cache = {
                index: layout(
                    media,
                    {
                        **block,
                        "lines": block["lines"]
                        + [f"frame {index} · {len(objs)} máscaras"],
                    },
                    size,
                    vertical,
                )
            }
        yield cache[index]


def muse_block(block, root: Path, size, vertical=False):
    run = sc.load_run(root / block["run"])
    image, objs = shrink(sc.frame_image(run, 0), sc.masks_for(run, 0))
    target = max(objs, key=lambda o: o["foreground_pixels"])
    media = sc.draw_masks(
        image,
        objs,
        mode="dim",
        selected=target["id"],
        phase=0.9,
        labels={target["id"]: block["sam_label"]},
    )
    x0, y0, x1, y1 = target["box"]
    crop = image.crop((x0, y0, x1, y1))
    crop.thumbnail((media.width // 3, media.height // 3))
    media.paste(crop, (media.width - crop.width - 12, media.height - crop.height - 12))
    frame = layout(media, block, size, vertical)
    for _ in range(int(block.get("seconds", 6) * FPS)):
        yield frame


def title_block(block, root: Path, size, vertical=False):
    frame = sc.title_card(block["title"], block["subtitle"], size)
    for _ in range(int(block.get("seconds", 3) * FPS)):
        yield frame


def layout(media, block, size, vertical):
    if not vertical:
        return sc.slide(
            media,
            block["title"],
            block.get("lines", []),
            kicker=block.get("kicker", ""),
            footer=block.get("footer", ""),
            size=size,
        )
    canvas = Image.new("RGB", size, sc.BG)
    pic = sc.fit(media, (size[0] - 60, int(size[1] * 0.58)))
    canvas.paste(pic, ((size[0] - pic.width) // 2, 220))
    from PIL import ImageDraw

    d = ImageDraw.Draw(canvas)
    d.text(
        (40, 90), block.get("kicker", "").upper(), font=sc.font(34), fill=(168, 85, 247)
    )
    d.text((40, 140), block["title"], font=sc.font(60), fill=(240, 240, 235))
    y = 260 + pic.height
    for line in block.get("lines", []):
        for chunk in sc.wrap(line, 38):
            d.text((40, y), chunk, font=sc.font(36), fill=(200, 205, 200))
            y += 50
    for i, chunk in enumerate(sc.wrap(block.get("footer", ""), 70)):
        d.text(
            (40, size[1] - 120 + i * 30), chunk, font=sc.font(24), fill=(130, 140, 135)
        )
    return canvas


KINDS = {
    "title": title_block,
    "image": image_block,
    "compare": compare_block,
    "video": video_block,
    "muse": muse_block,
}


def render(blocks, root: Path, out: Path, size, vertical=False):
    frames = out.with_suffix(".frames")
    if frames.exists():
        shutil.rmtree(frames)
    frames.mkdir(parents=True)
    n, marks = 0, []
    for block in blocks:
        start = n
        for image in KINDS[block["kind"]](block, root, size, vertical):
            image.save(frames / f"{n:06d}.png", compress_level=1)
            n += 1
        marks.append(
            {
                "block": block.get("id", block["kind"]),
                "start_s": start / FPS,
                "end_s": n / FPS,
            }
        )
    subprocess.run(
        [
            "ffmpeg",
            "-v",
            "error",
            "-y",
            "-framerate",
            str(FPS),
            "-i",
            str(frames / "%06d.png"),
            "-c:v",
            "libx264",
            "-preset",
            "slow",
            "-crf",
            "17",
            "-pix_fmt",
            "yuv420p",
            "-movflags",
            "+faststart",
            str(out),
        ],
        check=True,
    )
    shutil.rmtree(frames)
    return marks


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--blocks", type=Path, required=True)
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    from tools.meta_sam_api_lab.media import private_path

    out = private_path(args.output)
    out.mkdir(parents=True, exist_ok=True)
    spec = json.loads(args.blocks.read_text("utf-8"))
    manifest = {
        "classification": "PRIVATE_EXPORT",
        "fps": FPS,
        "videos": {},
        "sources": spec["sources"],
    }
    main_file = out / "BOSQUE_VIVO_SAM31_SHOWCASE.mp4"
    manifest["videos"][main_file.name] = render(
        spec["blocks"], args.root, main_file, (1920, 1080)
    )
    vertical = out / "BOSQUE_VIVO_SAM31_SHOWCASE_vertical.mp4"
    manifest["videos"][vertical.name] = render(
        spec["blocks"], args.root, vertical, (1080, 1920), vertical=True
    )
    for clip, ids in spec.get("clips", {}).items():
        blocks = [b for b in spec["blocks"] if b.get("id") in ids]
        manifest["videos"][f"clip-{clip}.mp4"] = render(
            blocks, args.root, out / f"clip-{clip}.mp4", (1920, 1080)
        )
    manifest["blocks"] = [
        {
            k: v
            for k, v in b.items()
            if k in ("id", "kind", "run", "runs", "title", "footer")
        }
        for b in spec["blocks"]
    ]
    (out / "provenance.json").write_text(
        json.dumps(manifest, indent=1, ensure_ascii=False), encoding="utf-8"
    )
    print(json.dumps(manifest["videos"], indent=1))


if __name__ == "__main__":
    main()
