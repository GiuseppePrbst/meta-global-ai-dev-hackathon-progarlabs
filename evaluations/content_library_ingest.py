"""Private ingest of a personal photo/video ZIP into the content library.

Originals, EXIF/GPS, thumbnails and contact sheets go to a private root outside Git,
passed with --root. This script prints only counts; it never writes coordinates to
stdout or to versioned files.

Usage (from the repository root):
    uv run --project services/api --extra dev --frozen python evaluations/content_library_ingest.py \
        --zip "<archivo>.zip" --root "<carpeta-privada>" --sheets
"""

import argparse
import hashlib
import json
import posixpath
import re
import stat
import subprocess
import zipfile
from datetime import UTC, datetime
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageDraw, ImageOps

IMAGE_EXT = {".jpg", ".jpeg"}
VIDEO_EXT = {".mp4", ".mov"}
THUMB_EDGE = 640
SHEET_COLS, SHEET_ROWS, CELL = 4, 4, 320
EXIF_ORIENTATION, EXIF_DATETIME_ORIGINAL, EXIF_IFD, GPS_IFD = (
    0x0112,
    0x9003,
    0x8769,
    0x8825,
)


def safe_member(name: str) -> str:
    """Reject traversal, absolute paths, backslashes and drive letters."""
    if (
        not name
        or name.startswith("/")
        or "\\" in name
        or re.match(r"^[A-Za-z]:", name)
    ):
        raise ValueError("Ruta ZIP insegura")
    # Check the raw parts: normpath would silently collapse "a/../b".
    if any(part in {"", ".", ".."} for part in name.split("/")):
        raise ValueError("Ruta ZIP insegura")
    return posixpath.basename(name)


def asset_id(file_name: str) -> str:
    stem = re.sub(r"[^a-z0-9]+", "-", Path(file_name).stem.lower()).strip("-")
    return f"own-{stem}"


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def probe_video(path: Path) -> dict:
    out = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-print_format",
            "json",
            "-show_streams",
            "-show_format",
            path,
        ],
        capture_output=True,
        text=True,
        check=True,
    )
    data = json.loads(out.stdout)
    video = next(s for s in data["streams"] if s["codec_type"] == "video")
    rotation = 0
    for side in video.get("side_data_list", []):
        rotation = int(side.get("rotation", rotation))
    num, den = (int(x) for x in video["avg_frame_rate"].split("/"))
    return {
        "codec": video["codec_name"],
        "width": int(video["width"]),
        "height": int(video["height"]),
        "fps": round(num / den, 3) if den else None,
        "duration_seconds": round(float(data["format"]["duration"]), 2),
        "rotation": rotation,
        "has_audio": any(s["codec_type"] == "audio" for s in data["streams"]),
    }


def image_facts(data: bytes) -> dict:
    with Image.open(BytesIO(data)) as image:
        exif = image.getexif()
        gps = exif.get_ifd(GPS_IFD)
        captured = exif.get_ifd(EXIF_IFD).get(EXIF_DATETIME_ORIGINAL) or exif.get(
            0x0132
        )
        width, height = image.size
        orientation = exif.get(EXIF_ORIENTATION, 1)
        display = (height, width) if orientation in {5, 6, 7, 8} else (width, height)
        coords = None
        if gps.get(1) and gps.get(2):
            coords = {"lat": _dms(gps[2], gps[1]), "lon": _dms(gps[4], gps[3])}
        return {
            "format": image.format,
            "width": width,
            "height": height,
            "display_width": display[0],
            "display_height": display[1],
            "orientation": orientation,
            "captured_at": captured,
            "gps": coords,
        }


def _dms(values, ref) -> float:
    degrees = sum(float(v) / 60**i for i, v in enumerate(values))
    return round(-degrees if ref in {"S", "W"} else degrees, 6)


def thumbnail(data: bytes, path: Path) -> None:
    with Image.open(BytesIO(data)) as image:
        normalized = ImageOps.exif_transpose(image).convert("RGB")
        normalized.thumbnail((THUMB_EDGE, THUMB_EDGE))
        normalized.save(path, "JPEG", quality=85)


def video_frames(path: Path, duration: float, out_dir: Path, stem: str) -> list[Path]:
    frames = []
    for share in (0.1, 0.35, 0.6, 0.85):
        target = out_dir / f"{stem}-{int(share * 100):02d}.jpg"
        subprocess.run(
            [
                "ffmpeg",
                "-v",
                "error",
                "-y",
                "-ss",
                f"{duration * share:.2f}",
                "-i",
                path,
                "-frames:v",
                "1",
                "-vf",
                f"scale={THUMB_EDGE}:-2",
                target,
            ],
            check=True,
        )
        frames.append(target)
    return frames


def contact_sheets(items: list[tuple[str, Path]], out_dir: Path) -> list[Path]:
    """Labelled grids for visual review; the labels are internal IDs, not species."""
    sheets = []
    per_sheet = SHEET_COLS * SHEET_ROWS
    for index in range(0, len(items), per_sheet):
        sheet = Image.new("RGB", (SHEET_COLS * CELL, SHEET_ROWS * CELL), "white")
        draw = ImageDraw.Draw(sheet)
        for slot, (label, path) in enumerate(items[index : index + per_sheet]):
            cell = Image.open(path).convert("RGB")
            cell.thumbnail((CELL - 8, CELL - 24))
            x, y = (slot % SHEET_COLS) * CELL, (slot // SHEET_COLS) * CELL
            sheet.paste(cell, (x + 4, y + 20))
            draw.text((x + 4, y + 4), label, fill="black")
        target = out_dir / f"sheet-{index // per_sheet:02d}.jpg"
        sheet.save(target, "JPEG", quality=85)
        sheets.append(target)
    return sheets


def ingest(zip_path: Path, root: Path, make_sheets: bool) -> dict:
    originals = root / "originals"
    private = root / "private-metadata"
    thumbs = root / "thumbnails-private"
    reports = root / "reports-private"
    for folder in (originals, private, thumbs, reports):
        folder.mkdir(parents=True, exist_ok=True)

    records, seen, rejected = [], {}, []
    with zipfile.ZipFile(zip_path) as archive:
        if archive.testzip() is not None:
            raise SystemExit("ZIP corrupto: falla testzip")
        for info in archive.infolist():
            if info.is_dir():
                continue
            mode = info.external_attr >> 16
            if stat.S_ISLNK(mode):
                rejected.append({"reason": "symlink"})
                continue
            file_name = safe_member(info.filename)
            suffix = Path(file_name).suffix.lower()
            if suffix not in IMAGE_EXT | VIDEO_EXT:
                rejected.append({"reason": "extension", "suffix": suffix})
                continue
            data = archive.read(info)
            digest = sha256(data)
            if digest in seen:
                rejected.append({"reason": "duplicate", "of": seen[digest]})
                continue
            stem_id = asset_id(file_name)
            target = originals / f"{stem_id}{suffix}"
            target.write_bytes(data)
            seen[digest] = stem_id
            record = {
                "asset_id": stem_id,
                "kind": "image" if suffix in IMAGE_EXT else "video",
                "file": target.name,
                "bytes": len(data),
                "sha256": digest,
            }
            if record["kind"] == "image":
                record.update(image_facts(data))
                thumbnail(data, thumbs / f"{stem_id}.jpg")
            else:
                record.update(probe_video(target))
                record["keyframes"] = [
                    p.name
                    for p in video_frames(
                        target, record["duration_seconds"], thumbs, stem_id
                    )
                ]
            records.append(record)

    records.sort(key=lambda r: r["asset_id"])
    manifest = {
        "generated_at": datetime.now(UTC).isoformat(timespec="seconds"),
        "source_sha256": sha256(zip_path.read_bytes()),
        "source_name": zip_path.name,
        "rejected": rejected,
        "records": records,
    }
    (private / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    if make_sheets:
        visuals = [
            (r["asset_id"], thumbs / f"{r['asset_id']}.jpg")
            for r in records
            if r["kind"] == "image"
        ]
        contact_sheets(visuals, reports)
    return manifest


def main() -> None:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawTextHelpFormatter
    )
    parser.add_argument("--zip", type=Path, required=True)
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument(
        "--sheets", action="store_true", help="Also write review contact sheets"
    )
    args = parser.parse_args()
    manifest = ingest(args.zip, args.root, args.sheets)
    kinds = {}
    for record in manifest["records"]:
        kinds[record["kind"]] = kinds.get(record["kind"], 0) + 1
    print(f"records={kinds} rejected={len(manifest['rejected'])}")


if __name__ == "__main__":
    main()
