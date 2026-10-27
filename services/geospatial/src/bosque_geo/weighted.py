"""Pixel footprint intersections in a metric CRS; historical center statistics unchanged."""

from time import monotonic

import numpy as np
import rasterio
from pyproj import Transformer
from rasterio.features import geometry_window
from rasterio.warp import transform_geom
from shapely import transform
from shapely.geometry import Polygon as ShapePolygon

from bosque_geo.context import ContextAreaRequest, check_query, projected
from bosque_geo.contracts import WeightedStatistics
from bosque_geo.raster import READS, LocalCanopyProvider


def weighted_statistics(
    provider: LocalCanopyProvider, request: ContextAreaRequest
) -> WeightedStatistics:
    query = projected(check_query(request))
    spec = provider.spec
    started = monotonic()
    if not READS.acquire(blocking=False):
        raise RuntimeError("Análisis raster ocupado")
    values, weights = [], []
    ambiguous = invalid = 0.0
    source_crs = "unknown"
    try:
        with (
            rasterio.Env(
                GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR", GDAL_NUM_THREADS="1"
            ),
            rasterio.open(spec.path, driver="GTiff") as src,
        ):
            if src.crs is None or src.count != 1:
                raise ValueError("Raster requiere CRS y una banda")
            source_crs = src.crs.to_string()
            geometry = transform_geom(
                "EPSG:4326", src.crs, request.area.model_dump(mode="json")
            )
            try:
                window = geometry_window(src, [geometry])
            except rasterio.errors.WindowError:
                window = None
            if window is not None:
                if window.width * window.height > 10000:
                    raise ValueError("Ponderación limitada a 10000 píxeles")
                data = src.read(1, window=window, masked=True)
                mask = np.ma.getmaskarray(data)
                affine = src.window_transform(window)
                transformer = Transformer.from_crs(src.crs, 32718, always_xy=True)
                for row in range(data.shape[0]):
                    if monotonic() - started > 10:
                        raise TimeoutError(
                            "Ponderación excede plazo cooperativo de 10 s"
                        )
                    for col in range(data.shape[1]):
                        cell = ShapePolygon(
                            [
                                affine @ (col, row),
                                affine @ (col + 1, row),
                                affine @ (col + 1, row + 1),
                                affine @ (col, row + 1),
                            ]
                        )
                        weight = (
                            transform(cell, transformer.transform, interleaved=False)
                            .intersection(query)
                            .area
                        )
                        if weight <= 1e-9:
                            continue
                        raw = float(data.data[row, col])
                        if mask[row, col] or not np.isfinite(raw):
                            invalid += weight
                        elif raw == 0 and spec.zero_policy == "exclude_ambiguous":
                            ambiguous += weight
                        else:
                            height = raw * spec.scale + spec.offset
                            if not np.isfinite(height) or height < 0:
                                raise ValueError("Altura decodificada inválida")
                            values.append(height)
                            weights.append(weight)
    finally:
        READS.release()
    valid = sum(weights)
    total = valid + ambiguous + invalid
    return WeightedStatistics(
        status="ok" if values else "no_valid_data" if total else "no_coverage",
        source_id=spec.source_id,
        source_version=spec.version,
        source_crs=source_crs,
        aoi_area_m2=query.area,
        raster_intersection_area_m2=min(query.area, total),
        valid_area_m2=valid,
        ambiguous_zero_area_m2=ambiguous,
        nodata_area_m2=invalid,
        coverage_fraction=min(1.0, valid / query.area),
        ambiguous_fraction=ambiguous / total if total else None,
        valid_pixels=len(values),
        mean_height_m=float(np.average(values, weights=weights)) if values else None,
        min_height_m=min(values) if values else None,
        max_height_m=max(values) if values else None,
        source_acquisition_start=spec.source_acquisition_start,
        source_acquisition_end=spec.source_acquisition_end,
        acquisition_reason=spec.acquisition_reason,
        limitations=[
            "Media condicionada a píxeles válidos; los ceros ambiguos no son altura cero.",
            "Altura estimada, no altura dominante del catastro ni crecimiento anual.",
            "Ponderación con aristas proyectadas; no precisión geodésica ni servicio público.",
        ],
    )
