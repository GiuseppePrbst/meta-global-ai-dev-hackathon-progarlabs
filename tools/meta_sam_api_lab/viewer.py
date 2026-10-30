"""Independent loopback-only viewer. No credentials or source metadata reach its frontend."""

import asyncio
import json
import logging
from datetime import UTC, datetime
from pathlib import Path
from typing import Literal
from uuid import uuid4

from fastapi import FastAPI, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse, JSONResponse
from PIL import Image
from pydantic import BaseModel, ConfigDict, Field

from tools.meta_sam_api_lab.lab import (
    CONCEPTS,
    SAFE_ID,
    ObjectSpec,
    campaign_from_private,
    config_from_private,
    describe_media,
    ledger_status,
    plan_request,
    run_experiment,
)
from tools.meta_sam_api_lab.media import private_path
from tools.meta_sam_api_lab.metrics import (
    QUALITY,
    mask_metrics,
    polygon_mask,
    track_metrics,
)


class RunRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    source: str = Field(min_length=1, max_length=300)
    concept: str | None = None
    objects: list[ObjectSpec] | None = Field(default=None, max_length=16)
    direction: Literal["both", "forward", "backward"] | None = None
    include_confidence: bool = False
    parent_experiment_id: str | None = Field(default=None, max_length=64)
    correction_reason: str | None = Field(default=None, max_length=300)
    phase: Literal["A", "B", "C", "D", "E"] | None = None
    experiment_note: str | None = Field(default=None, max_length=1000)


class Reference(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reference_id: str = Field(pattern=r"^[A-Za-z0-9_-]{1,32}$")
    frame: int = Field(ge=0)
    polygons: list[list[list[float]]] = Field(min_length=1, max_length=20)


class ReviewRequest(BaseModel):
    """Human review stored beside, never inside, the provider result."""

    model_config = ConfigDict(extra="forbid")
    reviewer: str = Field(min_length=1, max_length=100)
    quality: Literal[QUALITY] | None = None
    notes: str = Field(default="", max_length=2000)
    references: list[Reference] = Field(default_factory=list, max_length=500)


RESULT_FIELDS = {
    "status",
    "model",
    "model_version",
    "concept",
    "media",
    "cleanup",
    "usage",
    "latency_ms",
    "estimated_usd",
    "preview_estimated_usd",
    "frames",
    "tracks",
    "fps",
    "masks",
    "no_mask_frames",
    "prompt_mode",
    "prompt",
    "objects",
    "direction",
    "prompt_frame",
    "prepared_size",
    "frames_processed_estimate",
    "include_confidence",
    "parent_experiment_id",
    "correction_reason",
    "created_at",
    "source_ref",
    "campaign_phase",
    "experiment_note",
}


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

    def saved(identifier: str) -> Path:
        if not SAFE_ID.fullmatch(identifier):
            raise HTTPException(404, "Result not found")
        path = root / "outputs" / identifier
        if not (path / "result.json").is_file():
            raise HTTPException(404, "Result not found")
        return path

    def describe(source: Path) -> dict:
        try:
            info = describe_media(source, source.suffix.lower() == ".mp4")
        except (ValueError, HTTPException) as exc:
            raise HTTPException(422, str(getattr(exc, "detail", exc))) from None
        info.pop("image_bytes", None)
        return info

    def plan(item: RunRequest):
        source = asset(item.source)
        info = describe(source)
        try:
            return source, plan_request(
                info, item.concept, item.objects, item.direction
            )
        except ValueError as exc:
            raise HTTPException(422, str(exc)) from None

    @app.get("/")
    def index():
        return FileResponse(static / "viewer.html")

    @app.get("/{name}.js")
    def javascript(name: str):
        if name not in {"viewer", "geometry"}:
            raise HTTPException(404, "Not found")
        return FileResponse(static / f"{name}.js", media_type="text/javascript")

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
                    "concept": data.get("concept") or "spatial",
                    "media": data["media"],
                    "prompt_mode": data.get("prompt_mode") or "concept",
                    "parent_experiment_id": data.get("parent_experiment_id"),
                }
            )
        return {"sources": sources, "results": results, "concepts": sorted(CONCEPTS)}

    @app.get("/api/result/{identifier}")
    def result(identifier: str):
        data = json.loads((saved(identifier) / "result.json").read_text("utf-8"))
        return {key: value for key, value in data.items() if key in RESULT_FIELDS}

    @app.get("/api/source")
    def source_info(path: str):
        """Prepared size, frames and FPS: the space every prompt coordinate uses."""
        return describe(asset(path))

    @app.post("/api/preview")
    def preview(item: RunRequest):
        """Exact request a run would send, plus read-only budget. Never reserves."""
        _, planned = plan(item)
        try:
            budget = ledger_status(config_from_private(config_file))
        except Exception:  # noqa: BLE001 - private config/DB detail stays server-side
            budget = {"status": "unavailable", "can_reserve": False}
        return {
            **planned,
            "include_confidence": item.include_confidence,
            "budget": budget,
        }

    @app.get("/api/costs")
    def costs():
        """Authorization, reservations, reported usage and estimate; no billing API."""
        from tools.meta_sam_api_lab.costs import cost_report

        try:
            campaign = campaign_from_private(config_file)
            return cost_report(
                config_from_private(config_file),
                campaign.authorized_usd if campaign else 1,
                root,
            )
        except Exception:  # noqa: BLE001 - private config/DB detail stays server-side
            raise HTTPException(503, "Cost ledger unavailable") from None

    @app.get("/api/review/{identifier}")
    def latest_review(identifier: str):
        reviews = sorted(saved(identifier).glob("review-*.json"))
        return json.loads(reviews[-1].read_text("utf-8")) if reviews else None

    @app.post("/api/review/{identifier}")
    def review(identifier: str, item: ReviewRequest):
        folder = saved(identifier)
        data = json.loads((folder / "result.json").read_text("utf-8"))
        frames = {f["frame"]: f for f in data.get("frames") or []}
        evaluations, matches = [], {}
        for reference in item.references:
            frame = frames.get(reference.frame)
            if frame is None:
                raise HTTPException(422, "Reference frame not in result")
            with Image.open(folder / frame["source"]) as image:
                size = image.size
            if any(
                not (0 <= x <= size[0] and 0 <= y <= size[1])
                for polygon in reference.polygons
                for x, y, *_ in polygon
            ):
                raise HTTPException(422, "Reference outside prepared media")
            try:
                truth = polygon_mask(size, reference.polygons)
            except ValueError as exc:
                raise HTTPException(422, str(exc)) from None
            scored = []
            for obj in frame["objects"]:
                with Image.open(folder / obj["mask"]) as mask:
                    scored.append((obj["id"], mask_metrics(mask, truth)))
            best = max(scored, key=lambda pair: pair[1]["iou"] or 0, default=None)
            evaluations.append(
                {
                    "reference_id": reference.reference_id,
                    "frame": reference.frame,
                    "best_predicted_id": best[0] if best else None,
                    "metrics": best[1]
                    if best
                    else mask_metrics(Image.new("1", size), truth),
                    "all_predictions": dict(scored),
                }
            )
            matches.setdefault(reference.frame, {})[reference.reference_id] = (
                (best[0], best[1]["iou"] or 0) if best else (None, 0)
            )
        record = {
            "classification": "RESTRICTED",
            "result_id": identifier,
            "reviewed_at": datetime.now(UTC).isoformat(timespec="seconds"),
            **item.model_dump(),
            "evaluations": evaluations,
            "tracking": track_metrics(matches) if data["media"] == "video" else None,
            "note": "Human reference; model confidence is not IoU or accuracy.",
        }
        stamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%S%fZ")
        with (folder / f"review-{stamp}.json").open("x", encoding="utf-8") as target:
            json.dump(record, target, indent=2)
        return record

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
        source, _ = plan(item)  # same validation as preview, before any reservation
        if item.parent_experiment_id is not None:
            saved(item.parent_experiment_id)
        config = config_from_private(config_file)
        campaign = campaign_from_private(config_file)
        if campaign and item.phase is None:
            raise HTTPException(422, "Research campaign requires a phase")
        cap = campaign.phase_caps_usd[item.phase] if campaign and item.phase else None
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
                        objects=item.objects,
                        direction=item.direction,
                        include_confidence=item.include_confidence,
                        parent_experiment_id=item.parent_experiment_id,
                        correction_reason=item.correction_reason,
                        source_ref=item.source,
                        phase=item.phase,
                        phase_cap_usd=cap,
                        experiment_note=item.experiment_note,
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
                                    "prompt_mode": "spatial"
                                    if item.objects
                                    else "concept",
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
