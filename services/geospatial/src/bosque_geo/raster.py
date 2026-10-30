"""Bounded local raster analysis. Raster paths never come from HTTP requests."""

import hashlib
from datetime import date
from pathlib import Path
from threading import BoundedSemaphore
from time import monotonic
from typing import Literal

import numpy as np
import rasterio
from pydantic import BaseModel, ConfigDict, Field, model_validator
from pyproj import Geod
from rasterio.features import geometry_mask, geometry_window, shapes
from rasterio.warp import transform_geom

from bosque_geo.contracts import CanopyStatistics, Polygon

READS = BoundedSemaphore(1)
GEOD = Geod(ellps="WGS84")


class RasterSpec(BaseModel):
    model_config = ConfigDict(extra="forbid")
    path: Path
    sha256: str = Field(pattern=r"^[0-9a-f]{64}$")
    source_id: Literal["chmv2", "synthetic"]
    version: str
    period: str
    source_url: str
    license: str
    attribution: str
    scale: float = Field(gt=0, allow_inf_nan=False)
    offset: float = Field(allow_inf_nan=False)
    zero_policy: Literal["valid", "exclude_ambiguous"]
    validated: Literal[True]
    source_acquisition_start: date | None = None
    source_acquisition_end: date | None = None
    acquisition_reason: str | None = "Fecha por tile no verificada"

    @model_validator(mode="after")
    def acquisition_interval(self):
        if bool(self.source_acquisition_start) != bool(self.source_acquisition_end):
            raise ValueError("Se requieren ambas fechas o ninguna")
        if self.source_acquisition_start:
            if self.source_acquisition_start > self.source_acquisition_end:
                raise ValueError("Intervalo de adquisición invertido")
            self.acquisition_reason = None
        elif not self.acquisition_reason:
            raise ValueError("Fechas ausentes requieren una razón")
        return self


def area_m2(geometry: dict) -> float:
    from shapely.geometry import shape
    from shapely.geometry.polygon import orient

    return abs(GEOD.geometry_area_perimeter(orient(shape(geometry), sign=1))[0])


class LocalCanopyProvider:
    def __init__(self, spec: RasterSpec):
        path = spec.path.resolve(strict=True)
        if not path.is_file() or path.suffix.lower() not in {".tif", ".tiff"}:
            raise ValueError("Se requiere GeoTIFF local")
        if path.stat().st_size > 64 * 1024 * 1024:
            raise ValueError("Configure una ventana local de hasta 64 MiB")
        with path.open("rb") as file:
            digest = hashlib.file_digest(file, "sha256").hexdigest()
        if digest != spec.sha256:
            raise ValueError("Raster no coincide con manifiesto")
        self.spec = spec.model_copy(update={"path": path})

    def analyze(self, area: Polygon) -> CanopyStatistics:
        started = monotonic()

        def within_deadline(value):
            if monotonic() - started > 10:
                raise TimeoutError("Análisis excede 10 segundos")
            return value

        geographic = area.model_dump(mode="json")
        coords = area.coordinates[0]
        if max(x for x, y in coords) - min(x for x, y in coords) > 1:
            raise ValueError("Área local requerida; no se admite antimeridiano")
        queried = area_m2(geographic)
        if not 0 < queried <= 1_000_000:
            raise ValueError("Área máxima: 1 km²")
        if not READS.acquire(blocking=False):
            raise RuntimeError("Análisis raster ocupado")
        try:
            with (
                rasterio.Env(
                    GDAL_NUM_THREADS="1", GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR"
                ),
                rasterio.open(self.spec.path, driver="GTiff") as src,
            ):
                if src.crs is None or src.count != 1:
                    raise ValueError("Raster requiere CRS y una banda")
                geometry = transform_geom("EPSG:4326", src.crs, geographic)
                try:
                    window = geometry_window(src, [geometry])
                except rasterio.errors.WindowError:
                    raise ValueError("Polígono sin intersección raster") from None
                if window.width * window.height > 100_000:
                    raise ValueError("Máximo 100000 píxeles por consulta")
                data = within_deadline(src.read(1, window=window, masked=True))
                transform = src.window_transform(window)
                inside = geometry_mask([geometry], data.shape, transform, invert=True)
                valid = inside & ~np.ma.getmaskarray(data) & np.isfinite(data.data)
                if self.spec.zero_policy == "exclude_ambiguous":
                    valid &= data.data != 0
                values = (
                    data.data[valid].astype("float64") * self.spec.scale
                    + self.spec.offset
                )
                if not values.size:
                    raise ValueError("No hay píxeles válidos en el polígono")
                if np.any(values < 0):
                    raise ValueError("Alturas negativas: revisar codificación")
                coverage = sum(
                    within_deadline(area_m2(transform_geom(src.crs, "EPSG:4326", geom)))
                    for geom, value in shapes(
                        valid.astype("uint8"), mask=valid, transform=transform
                    )
                )
                return CanopyStatistics(
                    source_id=self.spec.source_id,
                    source_version=self.spec.version,
                    valid_pixels=int(values.size),
                    min_height_m=float(values.min()),
                    max_height_m=float(values.max()),
                    mean_height_m=float(values.mean()),
                    queried_area_m2=queried,
                    coverage_area_m2=coverage,
                    source_crs=src.crs.to_string(),
                    period=self.spec.period,
                    limitations=[
                        "Altura estimada; no crecimiento anual ni validación de campo.",
                        "Selección por centro de píxel; cobertura puede superar el borde.",
                        f"Política de ceros: {self.spec.zero_policy}.",
                    ],
                )
        finally:
            READS.release()
