"""Local media preparation only. No inference, network sources or private logs."""

import hashlib
import json
import shutil
import stat
import subprocess
import unicodedata
import zipfile
from pathlib import Path, PurePosixPath, PureWindowsPath


def private_path(path: Path) -> Path:
    path = path.resolve()
    if str(path).startswith("\\\\") or any(
        p.name.lower() in {"onedrive", "dropbox", "google drive"}
        for p in (path, *path.parents)
    ):
        raise ValueError("Use local non-synchronized storage")
    if any((parent / ".git").exists() for parent in (path, *path.parents)):
        raise ValueError("Private media must remain outside Git/worktrees")
    return path


def digest(path: Path) -> str:
    with path.open("rb") as source:
        return hashlib.file_digest(source, "sha256").hexdigest()


def inventory(path: Path) -> dict:
    records, names, possible_duplicates = [], set(), {}
    with zipfile.ZipFile(path) as archive:
        if len(archive.infolist()) > 10000:
            raise ValueError("Archive entry limit")
        for index, entry in enumerate(archive.infolist()):
            name = unicodedata.normalize("NFKC", entry.filename.replace("\\", "/"))
            parts = PurePosixPath(name).parts
            if (
                PurePosixPath(name).is_absolute()
                or PureWindowsPath(name).drive
                or ".." in parts
                or ":" in name
                or "\x00" in name
                or any(p.rstrip(". ") != p for p in parts)
                or any(
                    p.split(".")[0].upper()
                    in {
                        "CON",
                        "PRN",
                        "AUX",
                        "NUL",
                        *[f"COM{i}" for i in range(1, 10)],
                        *[f"LPT{i}" for i in range(1, 10)],
                    }
                    for p in parts
                )
            ):
                raise ValueError("Unsafe archive path")
            if name.casefold() in names:
                raise ValueError("Duplicate archive path")
            names.add(name.casefold())
            if (
                stat.S_ISLNK(entry.external_attr >> 16)
                or entry.flag_bits & 1
                or entry.file_size > 8 * 1024**3
                or entry.file_size / max(entry.compress_size, 1) > 200
            ):
                raise ValueError("Encrypted, linked or oversized archive entry")
            key = f"{entry.CRC}:{entry.file_size}"
            possible_duplicates.setdefault(key, []).append(index)
            records.append(
                {
                    "index": index,
                    "name": entry.filename,
                    "bytes": entry.file_size,
                    "compressed_bytes": entry.compress_size,
                    "directory": entry.is_dir(),
                }
            )
    total = sum(entry["bytes"] for entry in records)
    if total > 30 * 1024**3:
        raise ValueError("Archive total limit")
    return {
        "sha256": digest(path),
        "bytes": path.stat().st_size,
        "entries": records,
        "total_uncompressed_bytes": total,
        "possible_content_duplicates": [
            ids for ids in possible_duplicates.values() if len(ids) > 1
        ],
    }


def extract(path: Path, output: Path, index: int) -> Path:
    report = inventory(path)
    entry = report["entries"][index]
    if entry["directory"]:
        raise ValueError("Choose a file")
    output = private_path(output)
    output.mkdir(parents=True, exist_ok=True)
    if shutil.disk_usage(output).free < entry["bytes"] + 1024**3:
        raise ValueError("Insufficient free disk space")
    destination = output / (f"source-{index:03d}" + Path(entry["name"]).suffix.lower())
    created = False
    try:
        with (
            zipfile.ZipFile(path) as archive,
            archive.open(archive.infolist()[index]) as source,
            destination.open("xb") as target,
        ):
            created = True
            copied = 0
            while chunk := source.read(1024 * 1024):
                copied += len(chunk)
                if copied > entry["bytes"]:
                    raise ValueError("Expanded size mismatch")
                target.write(chunk)
            if copied != entry["bytes"]:
                raise ValueError("Truncated entry")
    except FileExistsError:
        raise ValueError("Refusing overwrite") from None
    except Exception:
        if created:
            destination.unlink(missing_ok=True)
        raise
    return destination


def command(arguments: list[str], timeout: int = 120) -> bytes:
    try:
        return subprocess.run(
            arguments, check=True, capture_output=True, timeout=timeout
        ).stdout
    except (subprocess.SubprocessError, OSError):
        raise ValueError("Media tool failed; no private stderr exposed") from None


def probe(path: Path) -> dict:
    data = json.loads(
        command(
            [
                "ffprobe",
                "-v",
                "error",
                "-show_format",
                "-show_streams",
                "-of",
                "json",
                str(path),
            ]
        )
    )
    video = next(s for s in data["streams"] if s["codec_type"] == "video")
    numerator, denominator = map(int, video["avg_frame_rate"].split("/"))
    fps = numerator / denominator if denominator else 0
    duration = float(data["format"]["duration"])
    rotation = next(
        (
            s.get("rotation", 0)
            for s in video.get("side_data_list", [])
            if "rotation" in s
        ),
        int(video.get("tags", {}).get("rotate", 0)),
    )
    if not 0 < fps <= 240 or not 0 < duration <= 86400:
        raise ValueError("Invalid frame rate or duration")
    return {
        "container": data["format"]["format_name"],
        "codec": video["codec_name"],
        "width": video["width"],
        "height": video["height"],
        "fps": fps,
        "duration_seconds": duration,
        "rotation": rotation,
        "frames": int(video.get("nb_frames", round(fps * duration))),
        "bytes": path.stat().st_size,
        "subtitle_streams": sum(s["codec_type"] == "subtitle" for s in data["streams"]),
    }


WIDTHS = (640, 960, 1280)  # 1920 source; larger only once smaller ones justify it


def prepare_clip(
    source: Path, output: Path, *, start=0.0, seconds=5.0, fps=10, width=640
) -> dict:
    if not 0 <= start or not 0 < seconds <= 10 or not 1 <= fps <= 30:
        raise ValueError("Clip limit: 10 seconds, 1–30 FPS")
    if width not in WIDTHS:
        raise ValueError(f"Prepared width must be one of {WIDTHS}")
    output = private_path(output)
    output.mkdir(parents=True, exist_ok=False)
    original = probe(source)
    if start + seconds > original["duration_seconds"]:
        raise ValueError("Clip exceeds source duration")
    clip = output / "original.mp4"
    command(
        [
            "ffmpeg",
            "-v",
            "error",
            "-n",
            "-ss",
            str(start),
            "-i",
            str(source),
            "-t",
            str(seconds),
            "-map",
            "0:v:0",
            "-an",
            "-sn",
            "-map_metadata",
            "-1",
            "-vf",
            f"fps={fps},scale={width}:-2",
            "-c:v",
            "libx264",
            "-crf",
            "20",
            "-pix_fmt",
            "yuv420p",
            "-movflags",
            "+faststart",
            str(clip),
        ]
    )
    frames = output / "frames"
    frames.mkdir()
    command(
        [
            "ffmpeg",
            "-v",
            "error",
            "-n",
            "-i",
            str(clip),
            "-vsync",
            "0",
            str(frames / "%06d.png"),
        ]
    )
    prepared = probe(clip)
    actual_frames = len(list(frames.glob("*.png")))
    if actual_frames > 300 or actual_frames != prepared["frames"]:
        raise ValueError("Frame correspondence mismatch")
    manifest = {
        "classification": "RESTRICTED",
        "original": original,
        "prepared": prepared,
        "source_sha256": digest(source),
        "clip_sha256": digest(clip),
        "start_seconds": start,
        "relative_frame_time": "frame_index / prepared.fps",
        "rotation_applied": "FFmpeg autorotate; original metadata removed",
        "spatial_transform": f"resize to width {width}, preserve aspect, "
        "no georeferencing",
        "scale_from_original": [
            prepared["width"] / original["width"],
            prepared["height"] / original["height"],
        ],
    }
    (output / "preparation.json").write_text(
        json.dumps(manifest, indent=2), encoding="utf-8"
    )
    return manifest


def prepare_resolution_matrix(
    source: Path, output: Path, *, start: float, seconds=5.0, fps=10, widths=WIDTHS
) -> dict:
    """Same source, interval, FPS and duration; only the output width changes."""
    clips = {
        width: prepare_clip(
            source,
            output / f"w{width}",
            start=start,
            seconds=seconds,
            fps=fps,
            width=width,
        )
        for width in widths
    }
    frames = {clip["prepared"]["frames"] for clip in clips.values()}
    if len(frames) != 1:
        raise ValueError("Resolution clips must share the same frames")
    matrix = {
        "classification": "RESTRICTED",
        "source_sha256": next(iter(clips.values()))["source_sha256"],
        "start_seconds": start,
        "seconds": seconds,
        "fps": fps,
        "frames": frames.pop(),
        "controlled_variable": "prepared width",
        "billing_note": "SAM video bills per processed frame; resolution does not change "
        "the tariff, only payload, upload and latency",
        "clips": [
            {
                "width": clip["prepared"]["width"],
                "height": clip["prepared"]["height"],
                "bytes": clip["prepared"]["bytes"],
                "clip_sha256": clip["clip_sha256"],
                "scale_from_original": clip["scale_from_original"],
                "within_lab_upload_limit": clip["prepared"]["bytes"] <= 20 * 1024**2,
            }
            for clip in clips.values()
        ],
    }
    (output / "resolution-matrix.json").write_text(
        json.dumps(matrix, indent=2), encoding="utf-8"
    )
    return matrix
