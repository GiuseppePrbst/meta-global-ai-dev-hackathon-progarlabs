#!/usr/bin/env python3
"""Encuadre (bbox WGS84) por parque desde la capa privada BCN SNASPE; no redistribuye polígonos.

Uso de investigación: uv run --no-project --with pyshp --with shapely python scripts/park_bbox_bcn.py \
    data/public/conaf/parks.json data/public/conaf/park_bbox_bcn.json  (requiere Snaspe.zip privado)
"""
import hashlib, json, math, os, re, sys, unicodedata
import shapefile
from shapely.geometry import shape
R = 6378137.0
ZIP = os.environ.get("BCN_SNASPE_ZIP", "D:/data/bosque-vivo/bcn/Snaspe.zip")
SHP = os.environ.get("BCN_SNASPE_SHP", "D:/data/bosque-vivo/bcn/x/snaspe.shp")
def fold(s): return re.sub(r"[^a-z0-9]", "", unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower())
def ll(x, y): return round(math.degrees(x / R), 5), round(math.degrees(2 * math.atan(math.exp(y / R)) - math.pi / 2), 5)
parks = json.load(open(sys.argv[1], encoding="utf-8"))["parks"]
r = shapefile.Reader(SHP, encoding="utf-8")
# Explicit BCN-name aliases (older edition spelling); never fuzzy matching.
ALIAS = {"juanfernandez": "archipielago-juan-fernandez", "albertoagostini": "alberto-de-agostini",
         "nevadotrescruces": "nevado-de-tres-cruces", "palmasdecocalan": "las-palmas-de-cocalan",
         "radal7tazas": "radal-siete-tazas"}
groups = {}
for sr in r.iterShapeRecords():
    name = sr.record["Nombre"]
    if not name.startswith("P.N."):
        continue
    g = shape(sr.shape.__geo_interface__)
    key = fold(name[4:].strip())
    groups.setdefault(ALIAS.get(key, key), []).append(g)
out, missing = {}, []
for p in parks:
    geoms = groups.get(p["id"]) or groups.get(fold(p["name"]))
    if not geoms:
        missing.append(p["id"]); continue
    valid = [g for g in geoms if g.is_valid and not g.is_empty]
    if not valid:
        out[p["id"]] = {"bbox": None, "reason": "geometrías BCN inválidas; sin reparar"}; continue
    xs = [b for g in valid for b in (g.bounds[0], g.bounds[2])]; ys = [b for g in valid for b in (g.bounds[1], g.bounds[3])]
    (w, s), (e, n) = ll(min(xs), min(ys)), ll(max(xs), max(ys))
    out[p["id"]] = {"bbox": [w, s, e, n], "records": len(geoms), "valid_records": len(valid)}
zsha = hashlib.sha256(open(ZIP, "rb").read()).hexdigest()
doc = {"schema_version": "1.0.0", "source": "BCN Mapoteca, Snaspe.zip (Sistema Integrado de Información Territorial)",
       "source_url": "https://www.bcn.cl/obtienearchivo?id=repositorio%2F10221%2F10404%2F2%2FSnaspe.zip",
       "source_sha256": zsha, "source_crs": "EPSG:3857", "crs": "EPSG:4326", "license": "BCN: libre uso con atribución; cartografía referencial, no legal ni geodésica",
       "computed_at": "2026-11-03", "method": "Unión de los bounds de geometrías válidas (shapely is_valid) con nombre 'P.N.<parque>'; inválidas excluidas sin reparar.",
       "limitations": ["Edición BCN anterior a parques creados recientemente; esos parques no tienen bbox.", "Solo encuadre de mapa: no es límite oficial, no sirve para decidir si un punto está dentro del parque.", "La geometría poligonal no se redistribuye."],
       "parks": out, "not_in_source": missing}
json.dump(doc, open(sys.argv[2], "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print(len(out), "with entry;", sum(1 for v in out.values() if v["bbox"]), "bbox; missing:", missing)
