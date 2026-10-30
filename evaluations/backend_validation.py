"""Validate an explicitly authorized loopback test database and HTTP backend; publish receipts only."""

import argparse
import hashlib
import json
from datetime import UTC, datetime
from pathlib import Path

import httpx
import psycopg
from bosque_api.config import Settings
from psycopg.conninfo import conninfo_to_dict
from shapely.geometry import mapping, shape

from evaluations.import_context import run as import_context


def run(bundle: Path, base_url: str, authorize: bool):
    if not authorize or base_url not in {
        "http://127.0.0.1:8059",
        "http://localhost:8059",
    }:
        raise ValueError(
            "Requiere autorización explícita y backend loopback de pruebas en 8059"
        )
    config = Settings()
    url = config.database_url.get_secret_value()
    info = conninfo_to_dict(url)
    if info.get("host") not in {"localhost", "127.0.0.1"} or not info.get(
        "dbname", ""
    ).startswith("bosque_demo"):
        raise ValueError("Solo base bosque_demo aislada y loopback")
    with psycopg.connect(url) as conn:
        superuser = conn.execute(
            "SELECT rolsuper FROM pg_roles WHERE rolname=current_user"
        ).fetchone()[0]
        if superuser:
            raise ValueError("No usar credenciales administrativas en backend")
        version = conn.execute("SELECT PostGIS_Lib_Version()").fetchone()[0]
    first, second = import_context(bundle, False), import_context(bundle, False)
    assert first == second
    with psycopg.connect(url) as conn:
        counts = conn.execute(
            "SELECT source_id,count(*),bool_and(ST_IsValid(geom)),min(ST_SRID(geom)) "
            "FROM context_features GROUP BY source_id ORDER BY source_id"
        ).fetchall()
        identifiers = dict(
            conn.execute(
                "SELECT source_id,json_agg(feature_id ORDER BY feature_id) "
                "FROM context_features GROUP BY source_id"
            ).fetchall()
        )
    data = json.loads(bundle.read_bytes())
    aoi = json.loads((bundle.parent / "pilot-aoi.geojson").read_bytes())
    geometry = shape(aoi.get("geometry", aoi))
    point = geometry.representative_point()
    cases = {
        "point_interior": (
            "/context/point",
            {"location": {"coordinates": list(point.coords[0])}},
        ),
        "point_exterior": ("/context/point", {"location": {"coordinates": [0, 0]}}),
        "area_pilot": ("/context/area", {"area": mapping(geometry)}),
    }
    # Exercise holes/multipart using the public AOI without altering source features.
    from shapely.geometry import MultiPolygon, box

    xmin, ymin, xmax, ymax = geometry.bounds
    inner = box(
        xmin + (xmax - xmin) * 0.4,
        ymin + (ymax - ymin) * 0.4,
        xmin + (xmax - xmin) * 0.6,
        ymin + (ymax - ymin) * 0.6,
    )
    cases["area_hole"] = (
        "/context/area",
        {"area": mapping(geometry.difference(inner))},
    )
    pieces = [
        box(xmin, ymin, xmin + (xmax - xmin) * 0.2, ymax),
        box(xmin + (xmax - xmin) * 0.8, ymin, xmax, ymax),
    ]
    cases["area_multipart"] = ("/context/area", {"area": mapping(MultiPolygon(pieces))})
    forest = next(item for item in data["layers"] if item["layer"]["kind"] == "forest")
    feature = json.loads((bundle.parent / forest["file"]).read_bytes())["features"][0]
    boundary = shape(feature["geometry"]).boundary.interpolate(0.5, normalized=True)
    cases["point_boundary"] = (
        "/context/point",
        {"location": {"coordinates": list(boundary.coords[0])}},
    )
    headers = {}
    if config.service_mode == "demo":
        token = next(iter(config.demo_tokens.values())).get_secret_value()
        headers["Authorization"] = "Bearer " + token
    responses = {}
    with httpx.Client(base_url=base_url, headers=headers, timeout=30) as client:
        layers = client.get("/layers")
        layers.raise_for_status()
        for name, (route, body) in cases.items():
            response = client.post(route, json=body)
            response.raise_for_status()
            result = response.json()
            responses[name] = {
                key: result[key] for key in ("status", "coverage", "quality_flags")
            }
            responses[name]["forest_matches"] = len(result["forest_context"])
            responses[name]["protected_matches"] = len(result["protected_context"])
        assert responses["point_interior"]["forest_matches"] >= 1
        assert responses["point_exterior"]["status"] == "no_coverage"
    return {
        "timestamp_utc": datetime.now(UTC).isoformat(),
        "postgis_version": version,
        "database_superuser": False,
        "transport": "loopback_http",
        "bundle_sha256": hashlib.sha256(bundle.read_bytes()).hexdigest(),
        "ingest_first": first,
        "ingest_second": second,
        "layer_count": len(layers.json()),
        "feature_counts_valid_srid": counts,
        "feature_identifiers": identifiers,
        "source_hashes": {
            item["layer"]["id"]: item["layer"]["content_sha256"]
            for item in data["layers"]
        },
        "responses": responses,
        "limitations": [
            "Piloto local; no validación ecológica ni redistribución de geometrías."
        ],
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("bundle", type=Path)
    parser.add_argument("--base-url", default="http://127.0.0.1:8059")
    parser.add_argument("--authorize-test-database", action="store_true")
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    result = run(args.bundle, args.base_url, args.authorize_test_database)
    args.output.write_bytes(
        (json.dumps(result, ensure_ascii=False, indent=2) + "\n").encode()
    )
    print("Validation receipt saved; no source geometries or credentials exported")
