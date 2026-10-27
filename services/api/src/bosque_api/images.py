"""Decode and re-encode in memory; no source metadata crosses the provider boundary."""

import warnings
from io import BytesIO

from fastapi import HTTPException
from PIL import Image, ImageOps, UnidentifiedImageError

MAX_IMAGE_BYTES = 10 * 1024 * 1024
MAX_PIXELS = 16_000_000
IMAGE_TYPES = {"JPEG": "image/jpeg", "PNG": "image/png", "WEBP": "image/webp"}


def prepare_image(content: bytes, mime: str) -> bytes:
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(BytesIO(content)) as image:
                if IMAGE_TYPES.get(image.format) != mime:
                    raise HTTPException(415, "El contenido no coincide con el tipo de imagen")
                if image.width * image.height > MAX_PIXELS or max(image.size) > 8192:
                    raise HTTPException(422, "Imagen excede dimensiones permitidas")
                if getattr(image, "n_frames", 1) != 1:
                    raise HTTPException(422, "Se requiere una imagen estática")
                image.verify()
            with Image.open(BytesIO(content)) as image:
                normalized = ImageOps.exif_transpose(image).convert("RGB")
                clean = Image.new("RGB", normalized.size)
                clean.paste(normalized)
                output = BytesIO()
                clean.save(output, format="JPEG", quality=90)
                result = output.getvalue()
                if len(result) > MAX_IMAGE_BYTES:
                    raise HTTPException(413, "Imagen preparada supera 10 MiB")
                return result
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError, Warning):
        raise HTTPException(422, "Imagen inválida o demasiado grande para decodificar") from None


def segment_image(image: bytes, segmentation) -> bytes:
    """Use the largest returned object; preserve full frame and scale with a black background."""
    from meta_sam_parser import SegmentationMask, decode_mask_to_raster

    if segmentation.status != "completed" or not segmentation.masks:
        return image
    mask = max(segmentation.masks, key=lambda m: m.width * m.height)
    decoded = decode_mask_to_raster(
        SegmentationMask(
            encoding=mask.encoding, payload=mask.payload, width=mask.width, height=mask.height
        )
    )
    with Image.open(BytesIO(image)) as original:
        alpha = Image.frombytes("L", (mask.width, mask.height), bytes(v * 255 for v in decoded))
        left, top, right, bottom = (int(v) for v in mask.bounds)
        alpha = alpha.resize((right - left, bottom - top), Image.Resampling.NEAREST)
        full = Image.new("L", original.size)
        full.paste(alpha, (left, top))
        result = Image.composite(original, Image.new("RGB", original.size, "black"), full)
        output = BytesIO()
        result.save(output, "JPEG", quality=90)
        return output.getvalue()
