"""Verify acquisition indexes and compare footprint weighting without rewriting #13 evidence."""

import argparse
import json
from datetime import UTC, date, datetime
from pathlib import Path

import pyarrow.compute as pc
import pyarrow.parquet as pq
from bosque_geo.context import ContextAreaRequest
from bosque_geo.contracts import Polygon
from bosque_geo.raster import LocalCanopyProvider, RasterSpec
from bosque_geo.weighted import weighted_statistics
from rasterio.warp import transform_geom
from shapely.geometry import box, mapping, shape

from evaluations.forest_sources import digest, download, save


def acquisition(indexes: Path, quadkey: str) -> dict:
    tables, receipts = {}, {}
    for name, columns in [
        ("acq_dates.parquet", ["quadkey", "acq_start", "acq_end", "acq_n"]),
        ("tiles.parquet", ["quadkey", "cog_url", "tile_size_bytes"]),
    ]:
        path = indexes / name
        file = pq.ParquetFile(path)
        if file.metadata.num_rows > 300000 or path.stat().st_size > 8 * 1024**2:
            raise ValueError("Índice excede límite")
        table = file.read(columns=columns)
        keys = table.column("quadkey")
        if pc.count(keys).as_py() != len(table) or pc.count_distinct(
            keys
        ).as_py() != len(table):
            raise ValueError("Clave de tile nula o duplicada")
        tables[name] = table
        receipts[name] = {
            "sha256": digest(path),
            "rows": len(table),
            "schema": str(file.schema_arrow),
        }
    date_keys = set(tables["acq_dates.parquet"]["quadkey"].to_pylist())
    tile_keys = set(tables["tiles.parquet"]["quadkey"].to_pylist())
    if date_keys - tile_keys:
        raise ValueError("Relación uno a uno inválida: fechas sin tile")
    rows = {
        name: table.filter(pc.equal(table["quadkey"], quadkey)).to_pylist()
        for name, table in tables.items()
    }
    start = end = None
    reason = "Tile sin fechas en índice"
    if rows["acq_dates.parquet"]:
        record = rows["acq_dates.parquet"][0]
        if record["acq_start"] and record["acq_end"] and record["acq_n"] > 0:
            start, end = record["acq_start"], record["acq_end"]
            if date.fromisoformat(start) > date.fromisoformat(end):
                raise ValueError("Fechas invertidas")
            reason = None
    return {
        "quadkey": quadkey,
        "source_acquisition_start": start,
        "source_acquisition_end": end,
        "acquisition_reason": reason,
        "records": rows,
        "indexes": receipts,
        "tiles_without_date_rows": len(tile_keys - date_keys),
    }


def run(manifest: Path, output: Path):
    checkout = Path(__file__).resolve().parents[1]
    if output.resolve().is_relative_to(checkout):
        raise ValueError("Índices y manifiestos locales fuera del checkout")
    output.mkdir(parents=True)
    for name in ["acq_dates.parquet", "tiles.parquet"]:
        receipt = download(
            "https://data.source.coop/tge-labs/meta-chm-v2/" + name,
            output / name,
            8 * 1024**2,
        )
        if receipt["status"] != "downloaded":
            raise ValueError("Índice no disponible dentro del límite")
        save(output / (name + ".receipt.json"), receipt)
    temporal = acquisition(output, "2102332230")
    original = RasterSpec.model_validate_json(manifest.read_bytes())
    expected_url = "https://data.source.coop/tge-labs/meta-chm-v2/chm/2102332230.tif"
    if (
        temporal["records"]["tiles.parquet"][0]["cog_url"] != expected_url
        or original.source_url != expected_url
    ):
        raise ValueError("Manifiesto e índice no corresponden al mismo COG")
    updated = RasterSpec.model_validate(
        {
            **original.model_dump(),
            **{
                k: temporal[k]
                for k in [
                    "source_acquisition_start",
                    "source_acquisition_end",
                    "acquisition_reason",
                ]
            },
        }
    )
    save(output / "manifest.json", updated.model_dump(mode="json"))
    history = json.loads(
        (checkout / "data/public/chmv2-window-2026-10-27.json").read_bytes()
    )
    area = history["area"]
    provider = LocalCanopyProvider(updated)
    full = weighted_statistics(provider, ContextAreaRequest(area=area))
    # Offset the AOI by a quarter pixel to exercise partial footprints on the real window.
    raster_geometry = transform_geom("EPSG:4326", "EPSG:3857", area)
    west, south, east, north = shape(raster_geometry).bounds
    pixel = (east - west) / 64
    partial = transform_geom(
        "EPSG:3857",
        "EPSG:4326",
        mapping(box(west + pixel / 4, south, east - pixel / 4, north)),
    )
    weighted = weighted_statistics(provider, ContextAreaRequest(area=partial))
    center = provider.analyze(Polygon.model_validate(partial))
    evidence = {
        "accessed_at": datetime.now(UTC).isoformat(),
        "temporal": temporal,
        "full_window_weighted": full.model_dump(mode="json"),
        "partial_aoi": partial,
        "partial_weighted": weighted.model_dump(mode="json"),
        "partial_center_method": center.model_dump(),
        "historical_statistics_unchanged": history["statistics"],
        "limitations": [
            "El intervalo de seis adquisiciones no fecha cada píxel.",
            "Comparación de métodos, no exactitud científica de altura.",
        ],
    }
    save(output / "evidence.json", evidence)
    return evidence


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    print(json.dumps(run(args.manifest, args.output), ensure_ascii=False, indent=2))
