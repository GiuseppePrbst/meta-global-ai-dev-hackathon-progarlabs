"""Independent loopback-only viewer. No credentials or source metadata reach its frontend."""

import asyncio
import json
import logging
from pathlib import Path
from uuid import uuid4

from fastapi import FastAPI, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, ConfigDict, Field

from tools.meta_sam_api_lab.lab import CONCEPTS, config_from_private, run_experiment
from tools.meta_sam_api_lab.media import private_path


class RunRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    source: str = Field(min_length=1, max_length=300)
    concept: str = "tree"


def create_viewer(root: Path, config_file: Path, port: int = 8876):
    root = private_path(root)
    static = Path(__file__).parent
    app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)
    tasks = set()
    semaphore = asyncio.Semaphore(1)

    @app.middleware("http")
    async def local_only(request: Request, call_next):
        host = f"127.0.0.1:{port}"
        if request.headers.get("host") != host:
            return JSONResponse({"detail": "Loopback host required"}, status_code=403)
        if request.method == "POST" and (
            request.headers.get("x-lab-request") != "1"
            or request.headers.get("origin", f"http://{host}") != f"http://{host}"
        ):
            return JSONResponse(
                {"detail": "Same-origin request required"}, status_code=403
            )
        try:
            size = int(request.headers.get("content-length", "0"))
        except ValueError:
            return JSONResponse({"detail": "Invalid content length"}, status_code=400)
        if size < 0:
            return JSONResponse({"detail": "Invalid content length"}, status_code=400)
        if size > 21 * 1024**2:
            return JSONResponse({"detail": "Upload limit"}, status_code=413)
        response = await call_next(request)
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; "
            "img-src 'self' blob:; media-src 'self' blob:; connect-src 'self'; "
            "frame-ancestors 'none'; base-uri 'none'"
        )
        response.headers["Cache-Control"] = "no-store"
        response.headers["X-Content-Type-Options"] = "nosniff"
        return response

    def asset(path):
        resolved = (root / path).resolve()
        allowed = [root / name for name in ("photos", "prepared", "outputs", "uploads")]
        if (
            not any(resolved.is_relative_to(p) for p in allowed)
            or not resolved.is_file()
        ):
            raise HTTPException(404, "Media not found")
        if resolved.suffix.lower() not in {".jpg", ".jpeg", ".png", ".webp", ".mp4"}:
            raise HTTPException(404, "Media type not served")
        return resolved

    @app.get("/")
    def index():
        return FileResponse(static / "viewer.html")

    @app.get("/viewer.js")
    def javascript():
        return FileResponse(static / "viewer.js", media_type="text/javascript")

    @app.get("/assets/{path:path}")
    def media(path: str):
        return FileResponse(asset(path))

    @app.get("/api/catalog")
    def catalog():
        sources = []
        for directory in ("photos", "prepared", "uploads"):
            for path in sorted((root / directory).rglob("*")):
                if path.is_file() and (
                    path.suffix.lower() in {".jpg", ".jpeg", ".webp"}
                    or path.name in {"original.mp4", "000001.png"}
                    or directory == "uploads"
                    and path.suffix.lower() in {".mp4", ".png"}
                ):
                    try:
                        asset(str(path.relative_to(root)))
                        sources.append(str(path.relative_to(root)).replace("\\", "/"))
                    except HTTPException:
                        continue
        results = []
        for manifest in sorted((root / "outputs").glob("*/result.json")):
            data = json.loads(manifest.read_text(encoding="utf-8"))
            results.append(
                {
                    "id": manifest.parent.name,
                    "status": data["status"],
                    "concept": data["concept"],
                    "media": data["media"],
                }
            )
        return {"sources": sources, "results": results, "concepts": sorted(CONCEPTS)}

    @app.get("/api/result/{identifier}")
    def result(identifier: str):
        if not identifier or any(
            c not in "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-"
            for c in identifier
        ):
            raise HTTPException(404, "Result not found")
        path = root / "outputs" / identifier / "result.json"
        if not path.is_file():
            raise HTTPException(404, "Result not found")
        data = json.loads(path.read_text(encoding="utf-8"))
        fields = {
            "status",
            "model",
            "concept",
            "media",
            "cleanup",
            "usage",
            "latency_ms",
            "estimated_usd",
            "frames",
            "tracks",
            "fps",
            "masks",
            "no_mask_frames",
        }
        return {key: value for key, value in data.items() if key in fields}

    @app.post("/api/upload")
    async def upload(file: UploadFile):
        if file.content_type not in {
            "image/jpeg",
            "image/png",
            "image/webp",
            "video/mp4",
        }:
            raise HTTPException(415, "JPEG/PNG/WebP or prepared MP4 required")
        is_video = file.content_type == "video/mp4"
        limit = (20 if is_video else 10) * 1024**2
        content = await file.read(limit + 1)
        await file.close()
        if len(content) > limit:
            raise HTTPException(413, "Media limit")
        destination = root / "uploads"
        destination.mkdir(exist_ok=True)
        name = uuid4().hex + (
            ".mp4"
            if is_video
            else {"image/png": ".png", "image/webp": ".webp"}.get(
                file.content_type, ".jpg"
            )
        )
        (destination / name).write_bytes(content)
        return {"source": f"uploads/{name}"}

    @app.post("/api/run")
    async def run(item: RunRequest):
        if item.concept not in CONCEPTS:
            raise HTTPException(422, "One allowed concept required")
        source = asset(item.source)
        config = config_from_private(config_file)
        identifier = uuid4().hex
        output = root / "outputs" / identifier

        async def work():
            async with semaphore:
                try:
                    await run_experiment(
                        config,
                        source,
                        output,
                        item.concept,
                        video=source.suffix.lower() == ".mp4",
                        authorized=True,
                    )
                except Exception as exc:  # noqa: BLE001 - private worker boundary
                    path = output / "result.json"
                    if not path.is_file():
                        output.mkdir(parents=True, exist_ok=True)
                        path.write_text(
                            json.dumps(
                                {
                                    "status": "validation_error",
                                    "concept": item.concept,
                                    "media": "video"
                                    if source.suffix.lower() == ".mp4"
                                    else "image",
                                    "model": "sam-3.1",
                                    "cleanup": "not_uploaded",
                                }
                            ),
                            encoding="utf-8",
                        )
                    logging.getLogger(__name__).warning(
                        "lab_job_failed type=%s", type(exc).__name__
                    )

        task = asyncio.create_task(work())
        tasks.add(task)
        task.add_done_callback(tasks.discard)
        return {"id": identifier}

    return app
