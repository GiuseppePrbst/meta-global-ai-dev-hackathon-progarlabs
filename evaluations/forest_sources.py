"""Acquire only a bounded official pilot subset. All binaries stay outside the checkout."""

import argparse
import hashlib
import json
import stat
from collections import Counter
from datetime import UTC, datetime
from pathlib import Path, PurePosixPath
from urllib.parse import urljoin, urlsplit
from zipfile import ZipFile

import fiona
import httpx
from bosque_geo.context import ContextLayer
from pyproj import CRS, Transformer
from shapely import normalize, to_wkb, transform
from shapely.geometry import box, mapping, shape
from shapely.ops import unary_union
from shapely.validation import explain_validity

CIREN = (
    "https://esri.ciren.cl/server/rest/services/USOS_DE_LA_TIERRA__CONAF/MapServer/13"
)
MINAGRI = (
    "https://ide.minagri.gob.cl/wp-content/uploads/DESCARGAS/CAPAS/"
    "PLANIFICACION_CATASTRAL/CATASTRO_CONAF/cbn_10reg_2018.rar"
)
BCN = (
    "https://www.bcn.cl/obtienearchivo?id=repositorio%2F10221%2F10404%2F2%2FSnaspe.zip"
)
HOSTS = {
    "ide.minagri.gob.cl",
    "www.bcn.cl",
    "obtienearchivo.bcn.cl",
    "data.source.coop",
}


def save(path, value):
    path.write_bytes(
        (json.dumps(value, ensure_ascii=False, indent=2) + "\n").encode("utf-8")
    )


def digest(path):
    with path.open("rb") as file:
        return hashlib.file_digest(file, "sha256").hexdigest()


def download(url, path, limit):
    if path.exists():
        raise ValueError("Use una carpeta nueva; no se sobrescriben fuentes")
    requested = url
    for _ in range(4):
        parsed = urlsplit(url)
        if (
            parsed.scheme != "https"
            or parsed.hostname not in HOSTS
            or parsed.username
            or parsed.password
            or parsed.port not in (None, 443)
        ):
            raise ValueError("URL no permitida")
        with httpx.stream(
            "GET", url, timeout=httpx.Timeout(30, connect=10), follow_redirects=False
        ) as response:
            if response.is_redirect:
                url = urljoin(url, response.headers["Location"])
                continue
            response.raise_for_status()
            size = int(response.headers.get("Content-Length", "0"))
            if size > limit:
                return {
                    "url": requested,
                    "http_status": response.status_code,
                    "declared_bytes": size,
                    "status": "blocked_by_byte_limit",
                }
            count = 0
            with path.open("xb") as file:
                for chunk in response.iter_bytes(1024 * 1024):
                    count += len(chunk)
                    if count > limit:
                        raise ValueError(
                            "Transferencia excede límite; archivo parcial no utilizable"
                        )
                    file.write(chunk)
            return {
                "url": requested,
                "final_url": url,
                "http_status": response.status_code,
                "bytes": count,
                "sha256": digest(path),
                "status": "downloaded",
            }
    raise ValueError("Demasiadas redirecciones")


def get_json(url, params):
    with httpx.stream(
        "GET", url, params=params, timeout=30, follow_redirects=False
    ) as response:
        response.raise_for_status()
        content = bytearray()
        for chunk in response.iter_bytes():
            content.extend(chunk)
            if len(content) > 16 * 1024**2:
                raise ValueError("Respuesta oficial excede 16 MiB")
    return json.loads(content)


def extract_zip(path, output):
    with ZipFile(path) as archive:
        entries = archive.infolist()
        if len(entries) > 100 or sum(e.file_size for e in entries) > 64 * 1024**2:
            raise ValueError("Archivo comprimido excede límites")
        seen = set()
        for entry in entries:
            name = PurePosixPath(entry.filename.replace("\\", "/"))
            target = (output / str(name)).resolve()
            if (
                name.is_absolute()
                or ".." in name.parts
                or ":" in str(name)
                or not target.is_relative_to(output.resolve())
                or stat.S_ISLNK(entry.external_attr >> 16)
                or entry.file_size > 64 * 1024**2
                or str(name).casefold() in seen
            ):
                raise ValueError("Componente ZIP inseguro")
            seen.add(str(name).casefold())
        output.mkdir()
        archive.extractall(output)
    return [
        {"name": p.name, "bytes": p.stat().st_size, "sha256": digest(p)}
        for p in sorted(output.iterdir())
        if p.is_file()
    ]


def profile(features, source_crs, aoi, schema):
    to_source = Transformer.from_crs(4326, source_crs, always_xy=True)
    to_metric = Transformer.from_crs(source_crs, 32718, always_xy=True)
    to_wgs = Transformer.from_crs(32718, 4326, always_xy=True)
    metric_aoi = transform(
        aoi,
        Transformer.from_crs(4326, 32718, always_xy=True).transform,
        interleaved=False,
    )
    source_aoi = transform(aoi, to_source.transform, interleaved=False)
    selected, invalid, quarantined, pieces = [], [], [], []
    for feature in features:
        geometry = shape(feature["geometry"]) if feature["geometry"] else None
        identifier = str(feature["properties"].get("objectid", feature.get("id")))
        if geometry is None or geometry.is_empty:
            invalid.append({"id": identifier, "reason": "null_or_empty"})
            continue
        if not geometry.is_valid or geometry.geom_type not in {
            "Polygon",
            "MultiPolygon",
        }:
            invalid.append(
                {
                    "id": identifier,
                    "reason": explain_validity(geometry),
                    "geometry_type": geometry.geom_type,
                }
            )
            if box(*geometry.bounds).intersects(source_aoi):
                quarantined.append(identifier)
            continue
        if not geometry.intersects(source_aoi):
            continue
        clipped = transform(
            geometry, to_metric.transform, interleaved=False
        ).intersection(metric_aoi)
        if clipped.area <= 0:
            continue
        output_geometry = transform(clipped, to_wgs.transform, interleaved=False)
        if not output_geometry.is_valid or output_geometry.geom_type not in {
            "Polygon",
            "MultiPolygon",
        }:
            quarantined.append(identifier)
            continue
        pieces.append(clipped)
        selected.append(
            {
                "type": "Feature",
                "id": identifier,
                "geometry": mapping(output_geometry),
                "properties": dict(feature["properties"]),
            }
        )
    geometries = [shape(f["geometry"]) for f in selected]
    hashes = [hashlib.sha256(to_wkb(normalize(g))).hexdigest() for g in geometries]
    union_area = unary_union(pieces).area if pieces else 0
    qa = {
        "source_crs": source_crs,
        "analysis_crs": "EPSG:32718",
        "schema": schema,
        "scanned_features": len(features),
        "source_invalid": invalid,
        "pilot_count": len(selected),
        "quarantined_pilot": quarantined,
        "duplicate_geometries": len(hashes) - len(set(hashes)),
        "duplicate_ids": len(selected) - len({f["id"] for f in selected}),
        "geometry_types": dict(Counter(g.geom_type for g in geometries)),
        "holes": sum(
            len(p.interiors)
            for g in geometries
            for p in (g.geoms if g.geom_type == "MultiPolygon" else [g])
        ),
        "null_counts": {
            k: sum(f["properties"].get(k) is None for f in selected) for k in schema
        },
        "blank_counts": {
            k: sum(
                isinstance(f["properties"].get(k), str)
                and not f["properties"][k].strip()
                for f in selected
            )
            for k in schema
        },
        "domains": {
            k: sorted({str(f["properties"].get(k)) for f in selected}) for k in schema
        },
        "aoi_area_m2": metric_aoi.area,
        "union_area_m2": min(metric_aoi.area, union_area),
        "overlap_excess_m2": max(0, sum(p.area for p in pieces) - union_area),
    }
    return {"type": "FeatureCollection", "features": selected}, qa


def run(output):
    checkout = Path(__file__).resolve().parents[1]
    if output.resolve().is_relative_to(checkout):
        raise ValueError("Datos fuente deben quedar fuera del repositorio")
    output.mkdir(parents=True)
    accessed_at = datetime.now(UTC).isoformat()
    to = Transformer.from_crs(4326, 32718, always_xy=True)
    back = Transformer.from_crs(32718, 4326, always_xy=True)
    x, y = to.transform(-(72 + 5 / 60), -(40 + 41 / 60))
    aoi = transform(
        box(x - 250, y - 250, x + 250, y + 250), back.transform, interleaved=False
    )
    save(output / "pilot-aoi.geojson", mapping(aoi))
    receipts = [
        download(MINAGRI, output / "cbn_10reg_2018.rar", 256 * 1024**2),
        download(BCN, output / "Snaspe.zip", 32 * 1024**2),
    ]
    save(output / "download-receipts.json", receipts)
    components = extract_zip(output / "Snaspe.zip", output / "bcn")
    with fiona.open(output / "bcn/snaspe.shp", encoding="UTF-8") as source:
        bcn_crs = CRS(source.crs).to_string()
        bcn_schema = dict(source.schema["properties"])
        bcn_features = [fiona.model.to_dict(f) for f in source]
    if (output / "bcn/snaspe.CPG").read_text().strip() != "UTF-8":
        raise ValueError("Encoding BCN cambió; revisión requerida")
    metadata = get_json(CIREN, {"f": "json"})
    save(output / "ciren-metadata.json", metadata)
    params = {
        "where": "1=1",
        "geometry": ",".join(map(str, aoi.bounds)),
        "geometryType": "esriGeometryEnvelope",
        "inSR": 4326,
        "spatialRel": "esriSpatialRelIntersects",
        "returnIdsOnly": "true",
        "f": "json",
    }
    ids = get_json(CIREN + "/query", params)
    identifiers = ids.get("objectIds")
    if (
        not identifiers
        or len(identifiers) > 300
        or len(set(identifiers)) != len(identifiers)
    ):
        raise ValueError("Consulta oficial falló o supera recorte acotado")
    data = get_json(
        CIREN + "/query",
        {
            "objectIds": ",".join(map(str, sorted(identifiers))),
            "outFields": "*",
            "outSR": 4326,
            "returnGeometry": "true",
            "f": "geojson",
        },
    )
    if (
        data.get("type") != "FeatureCollection"
        or data.get("exceededTransferLimit")
        or len(data["features"]) != len(identifiers)
        or {f["properties"]["objectid"] for f in data["features"]} != set(identifiers)
    ):
        raise ValueError("Respuesta de features incompleta")
    save(output / "ciren-raw.geojson", data)
    schema = {
        f["name"]: f["type"]
        for f in metadata["fields"]
        if f["type"] != "esriFieldTypeGeometry"
    }
    bundle, profiles = [], []
    for sid, kind, features, crs, fields in [
        ("conaf_2018_pilot", "forest", data["features"], "EPSG:4326", schema),
        ("bcn_snaspe_pilot", "protected", bcn_features, bcn_crs, bcn_schema),
    ]:
        collection, qa = profile(features, crs, aoi, fields)
        qa.update(id=sid, checked_at=datetime.now(UTC).isoformat())
        profiles.append(qa)
        save(output / "profiles.json", profiles)
        if qa["quarantined_pilot"] or qa["duplicate_ids"]:
            raise ValueError("QA piloto bloquea ingesta; no se reparan fuentes")
        path = output / (sid + ".geojson")
        save(path, collection)
        layer = ContextLayer(
            id=sid,
            kind=kind,
            producer="CONAF" if kind == "forest" else "BCN / compilación oficial",
            distributor="CIREN / IDE MINAGRI" if kind == "forest" else "BCN",
            source_url=CIREN
            if kind == "forest"
            else "https://www.bcn.cl/siit/mapas_vectoriales/index_html",
            version="2018; consulta REST " + accessed_at[:10]
            if kind == "forest"
            else "SNASPE edición no verificada",
            accessed_at=accessed_at,
            source_crs="EPSG:3857",
            license="Citar CONAF; redistribución pendiente"
            if kind == "forest"
            else "BCN libre uso con atribución",
            attribution="Corporación Nacional Forestal (CONAF)"
            if kind == "forest"
            else "Biblioteca del Congreso Nacional de Chile",
            rights_status="redistribution_pending"
            if kind == "forest"
            else "source_terms_checked",
            geometry_status="pilot_checked",
            taxonomy_status="partial" if kind == "forest" else "not_applicable",
            content_sha256=digest(path),
            limitations=[
                "Recorte de referencia; no límite oficial del piloto.",
                "Composición predominante no identifica individuos; protección solo referencial.",
            ],
        )
        bundle.append({"layer": layer.model_dump(), "file": path.name})
    save(output / "bundle.json", {"layers": bundle})
    evidence = {
        "accessed_at": accessed_at,
        "receipts": receipts,
        "bcn_components": components,
        "bcn_encoding": "CPG UTF-8; lectura explícita UTF-8",
        "bcn_crs": bcn_crs,
        "minagri_shp_crs": None,
        "minagri_shp_encoding": None,
        "minagri_shp_reason": "RAR excede límite; servicio oficial es un formato distinto",
        "service_crs": metadata["extent"]["spatialReference"],
        "raw_pilot_sha256": digest(output / "ciren-raw.geojson"),
        "profiles": profiles,
    }
    save(output / "evidence.json", evidence)
    return evidence


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    print(json.dumps(run(parser.parse_args().output), ensure_ascii=False, indent=2))
