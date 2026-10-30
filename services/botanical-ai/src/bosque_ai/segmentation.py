"""SAM geometry decoded by the official parser, never as a species label."""

from typing import Literal

from meta_sam_parser import (
    CompletedOutcome,
    InvalidSegmentationMaskError,
    decode_mask_to_raster,
    image_segmentation_format,
)
from pydantic import BaseModel, Field

from bosque_ai.meta import MetaAPIError


class SegmentationRequest(BaseModel):
    width: int = Field(gt=0, le=8192)
    height: int = Field(gt=0, le=8192)
    concept: str = Field(default="tree", min_length=1, max_length=100)


class Mask(BaseModel):
    object_id: str
    width: int = Field(gt=0)
    height: int = Field(gt=0)
    encoding: Literal["lossless", "one_bit"]
    payload: str = Field(repr=False)
    bounds: tuple[float, float, float, float]


class SegmentationResult(BaseModel):
    status: Literal["completed", "no_matches", "error", "disabled"]
    model: str
    width: int
    height: int
    masks: list[Mask] = Field(default_factory=list)
    error: str | None = None


def parse_segmentation(
    text: str, request: SegmentationRequest, model: str
) -> SegmentationResult:
    try:
        if len(text) > 2_000_000:
            raise ValueError("Output limit")
        parser = image_segmentation_format().create_parser()
        parser.push(text)
        result = parser.finish(CompletedOutcome()).result
        if result.diagnostics:
            raise ValueError("Invalid geometry")
        masks = []
        total_pixels = 0
        for record in result.records:
            if record.kind == "text":
                raise ValueError("Unexpected text")
            if record.kind != "mask":
                continue
            mask = record.mask
            total_pixels += mask.width * mask.height
            if total_pixels > 32_000_000 or len(masks) >= 32:
                raise ValueError("Total mask limit")
            bounds = record.bounds
            if (
                bounds.left < 0
                or bounds.top < 0
                or bounds.right > request.width
                or bounds.bottom > request.height
            ):
                raise ValueError("Bounds outside image")
            if mask.width * mask.height > request.width * request.height:
                raise ValueError("Mask limit")
            decoded = decode_mask_to_raster(mask)
            if len(decoded) != mask.width * mask.height:
                raise ValueError("Invalid mask")
            masks.append(
                Mask(
                    object_id=record.object_id,
                    width=mask.width,
                    height=mask.height,
                    encoding=mask.encoding,
                    payload=mask.payload,
                    bounds=(bounds.left, bounds.top, bounds.right, bounds.bottom),
                )
            )
        return SegmentationResult(
            status="completed" if masks else "no_matches",
            model=model,
            width=request.width,
            height=request.height,
            masks=masks,
        )
    except (ValueError, TypeError, InvalidSegmentationMaskError):
        raise MetaAPIError("Salida SAM inválida; no se utilizaron máscaras") from None
