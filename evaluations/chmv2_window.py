"""Read only a 64x64 CHMv2 window at the atlas reference center, never a whole tile."""

import argparse
import hashlib
import json
from datetime import UTC, datetime
from pathlib import Path

import rasterio
from bosque_geo.contracts import CHMV2_SOURCE, Polygon
from bosque_geo.raster import LocalCanopyProvider, RasterSpec
from rasterio.warp import transform, transform_geom
from rasterio.windows import Window, bounds

URL = "https://data.source.coop/tge-labs/meta-chm-v2/chm/2102332230.tif"
# Reference frame center already used by the atlas; not a tree or official park boundary.
LON, LAT = -(72 + 5 / 60), -(40 + 41 / 60)


def run(output: Path):
    output.mkdir(parents=True, exist_ok=True)
    path = output / "chmv2-reference-window.tif"
    if path.exists():
        raise ValueError("Use an empty output folder; existing evidence is preserved")
    with (
        rasterio.Env(
            GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR",
            GDAL_HTTP_TIMEOUT="15",
            GDAL_HTTP_MAX_RETRY="0",
            CPL_VSIL_CURL_ALLOWED_EXTENSIONS=".tif",
            GDAL_NUM_THREADS="1",
        ),
        rasterio.open(URL) as src,
    ):
        if src.crs.to_epsg() != 3857 or src.count != 1 or src.dtypes != ("uint8",):
            raise ValueError(
                "Source metadata changed; review encoding before processing"
            )
        x, y = transform("EPSG:4326", src.crs, [LON], [LAT])
        row, col = src.index(x[0], y[0])
        window = Window(col - 32, row - 32, 64, 64)
        pixels = src.read(1, window=window)
        profile = {
            "driver": "GTiff",
            "dtype": "uint8",
            "count": 1,
            "width": 64,
            "height": 64,
            "crs": src.crs,
            "transform": src.window_transform(window),
        }
        with rasterio.open(path, "w", **profile) as dst:
            dst.write(pixels, 1)
        left, bottom, right, top = bounds(window, src.transform)
        geometry = transform_geom(
            src.crs,
            "EPSG:4326",
            {
                "type": "Polygon",
                "coordinates": [
                    [
                        [left, bottom],
                        [right, bottom],
                        [right, top],
                        [left, top],
                        [left, bottom],
                    ]
                ],
            },
        )
        metadata = {
            "source_url": URL,
            "crs": src.crs.to_string(),
            "resolution_crs_units": list(src.res),
            "nodata": src.nodata,
            "scales": list(src.scales),
            "offsets": list(src.offsets),
            "window": [col - 32, row - 32, 64, 64],
        }
    spec = RasterSpec(
        path=path.resolve(),
        sha256=hashlib.sha256(path.read_bytes()).hexdigest(),
        source_id="chmv2",
        version="v2-ml3; source.coop 2026-06",
        period="Collection 2005-03-15/2020-08-31; tile acquisition not verified",
        source_url=URL,
        license="CC-BY-4.0",
        attribution=CHMV2_SOURCE.attribution,
        scale=1,
        offset=0,
        zero_policy="exclude_ambiguous",
        validated=True,
    )
    (output / "manifest.json").write_text(
        spec.model_dump_json(indent=2), encoding="utf-8"
    )
    stats = LocalCanopyProvider(spec).analyze(Polygon.model_validate(geometry))
    return {
        "timestamp_utc": datetime.now(UTC).isoformat(),
        "metadata": metadata,
        "window_sha256": spec.sha256,
        "area": geometry,
        "statistics": stats.model_dump(),
        "limitations": [
            "Reference center, not an official park polygon or field observation.",
            "Zeros excluded as ambiguous; mean is conditional on positive pixels.",
            "Per-tile acquisition dates and local accuracy remain unverified.",
        ],
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--output",
        type=Path,
        required=True,
        help="Local folder outside Git checkout; no whole tiles downloaded",
    )
    print(json.dumps(run(parser.parse_args().output), ensure_ascii=False, indent=2))
