"""Private derivatives for the content library: normalized scenes, clips and the SAM handoff.

Reads the private manifest and curation written by content_library_ingest.py and writes
everything under the private root passed with --root. Outputs
carry no EXIF/GPS and no audio unless explicitly kept. Scene and clip choices are made by
visual review, so they are passed in SCENES and CLIPS, never derived from file order.

Usage (from the repository root):
    uv run --project services/api --extra dev --frozen python evaluations/content_library_prepare.py --root "<carpeta-privada>"
"""

import argparse
import json
import subprocess
from pathlib import Path

from PIL import Image, ImageOps

MAX_EDGE = 2048

# Visual-review selections (see docs/CONTENT_ENRICHMENT_REPORT.md for the criteria).
SCENES = {
    "helechos": [
        "own-img-5289",
        "own-img-5315",
        "own-img-5316",
        "own-img-5290",
        "own-img-5277",
    ],
    "arboles": [
        "own-img-5106",
        "own-img-5104",
        "own-img-5100",
        "own-img-5322",
        "own-img-5360",
    ],
    "vegetacion_compleja": [
        "own-img-5276",
        "own-img-5293",
        "own-img-5291",
        "own-img-5410",
        "own-img-5337",
    ],
}
# Intervals chosen from the 5-second frame scan: start in seconds, durations for SAM clips.
CLIPS = {
    "own-img-5097": {
        "start": 3.0,
        "durations": [3, 5, 10],
        "why": "arbol aislado con tronco visible",
    },
    "own-img-5098": {
        "start": 48.0,
        "durations": [3, 5, 10],
        "why": "arbol completo con poste; revisar personas al borde",
    },
    "own-img-5098-pinos": {
        "source": "own-img-5098",
        "start": 2.0,
        "durations": [3, 5, 10],
        "why": "troncos de pino con dosel oclusivo",
    },
}
SHOWCASE_VIDEOS = ["own-img-5097", "own-img-5098"]


def run_ffmpeg(*args) -> None:
    subprocess.run(["ffmpeg", "-v", "error", "-y", *args], check=True)


def make_clip(source: Path, start: float, duration: int, target: Path) -> None:
    run_ffmpeg(
        "-ss",
        f"{start:.2f}",
        "-t",
        str(duration),
        "-i",
        source,
        "-an",
        "-map_metadata",
        "-1",
        "-c:v",
        "libx264",
        "-preset",
        "medium",
        "-crf",
        "23",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        target,
    )


def make_showcase(source: Path, target: Path) -> None:
    run_ffmpeg(
        "-i",
        source,
        "-an",
        "-map_metadata",
        "-1",
        "-c:v",
        "libx264",
        "-preset",
        "medium",
        "-crf",
        "26",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        target,
    )


def normalized_scene(source: Path, target: Path) -> tuple[int, int]:
    """Apply EXIF orientation, drop metadata, cap the long edge; no GPS survives."""
    with Image.open(source) as image:
        fixed = ImageOps.exif_transpose(image).convert("RGB")
        fixed.thumbnail((MAX_EDGE, MAX_EDGE))
        fixed.save(target, "JPEG", quality=92)
        return fixed.size


def main() -> None:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawTextHelpFormatter
    )
    parser.add_argument("--root", type=Path, required=True)
    args = parser.parse_args()
    root = args.root
    manifest = json.loads(
        (root / "private-metadata/manifest.json").read_text(encoding="utf-8")
    )
    curation = {
        e["asset_id"]: e
        for e in json.loads(
            (root / "curation/curation.json").read_text(encoding="utf-8")
        )
    }
    records = {r["asset_id"]: r for r in manifest["records"]}
    handoff = root / "sam-handoff"
    scenes_dir, clips_dir, prepared = (
        handoff / "scenes",
        handoff / "clips",
        root / "video-prepared",
    )
    for folder in (scenes_dir, clips_dir, prepared):
        folder.mkdir(parents=True, exist_ok=True)

    entries = []
    for category, ids in SCENES.items():
        for asset_id in ids:
            record, card = records[asset_id], curation[asset_id]
            target = scenes_dir / f"{asset_id}.jpg"
            width, height = normalized_scene(
                root / "originals" / record["file"], target
            )
            entries.append(
                {
                    "scene_id": asset_id,
                    "category": category,
                    "kind": "image",
                    "normalized_file": f"sam-handoff/scenes/{target.name}",
                    "source_file": f"originals/{record['file']}",
                    "source_sha256": record["sha256"],
                    "width": width,
                    "height": height,
                    "visual_roles": card["visual_roles"],
                    "quality": card["quality"],
                    "risks": card["flags"],
                    "note": card["note"],
                }
            )

    video_meta = {r["asset_id"]: r for r in manifest["records"] if r["kind"] == "video"}
    for clip_id, spec in CLIPS.items():
        source_id = spec.get("source", clip_id)
        source = root / "originals" / video_meta[source_id]["file"]
        for duration in spec["durations"]:
            name = f"{clip_id}-{duration}s-t{int(spec['start'])}.mp4"
            make_clip(source, spec["start"], duration, clips_dir / name)
            entries.append(
                {
                    "scene_id": name.removesuffix(".mp4"),
                    "category": "clip_video",
                    "kind": "video",
                    "normalized_file": f"sam-handoff/clips/{name}",
                    "source_file": f"originals/{video_meta[source_id]['file']}",
                    "source_sha256": video_meta[source_id]["sha256"],
                    "start_seconds": spec["start"],
                    "duration_seconds": duration,
                    "fps": video_meta[source_id]["fps"],
                    "display_size": [720, 1280],
                    "rotation_source": video_meta[source_id]["rotation"],
                    "audio": "removed",
                    "visual_roles": ["arbol_completo", "copa", "tronco"],
                    "risks": ["personas"] if clip_id == "own-img-5098" else [],
                    "note": spec["why"],
                }
            )

    for video_id in SHOWCASE_VIDEOS:
        make_showcase(
            root / "originals" / video_meta[video_id]["file"],
            prepared / f"{video_id}-showcase.mp4",
        )

    manifest_out = {
        "schema": "sam-media-handoff/1",
        "owner_consent_note": "Sin permiso de procesamiento externo confirmado por el titular; no enviar a Meta.",
        "external_processing_permission": "not_confirmed",
        "publication_permission": "not_granted",
        "missing_categories": ["fauna", "hongos"],
        "scenes": entries,
    }
    (handoff / "manifest.json").write_text(
        json.dumps(manifest_out, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(
        f"scenes={sum(e['kind'] == 'image' for e in entries)} clips={sum(e['kind'] == 'video' for e in entries)}"
    )


if __name__ == "__main__":
    main()
