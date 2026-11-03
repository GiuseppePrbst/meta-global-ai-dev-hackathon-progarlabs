"""GBIF occurrences inside the BCN reference polygon of Puyehue: counts, no points.

A record inside a polygon is not reliable presence by itself. Filters: no GBIF
geospatial issue, coordinate uncertainty <= 1000 m, preserved specimen or human
observation. The result is aggregated per taxon (year range, datasets, basis,
uncertainty); coordinates are never written. Sensitive fauna get counts only.
The polygon (BCN 2826, EPSG:3857 reprojected and simplified to ~500 m) is
private input; it is a reference, not the official boundary.
"""

import argparse
import json
from collections import Counter
from datetime import UTC, datetime
from pathlib import Path

from evaluations import botanical_registry as reg
from evaluations.biodiversity_registry import PANELS

SEARCH = "https://api.gbif.org/v1/occurrence/search"
SENSITIVE = {"leopardus-guigna", "puma-concolor", "dromiciops-gliroides"}
EXTRA = {"boletus-chilensis": "Boletus chilensis", "amanita-gayana": "Amanita gayana"}


def summarize(label: str, name: str, wkt: str) -> dict:
    taxon = reg.resolve(name)
    row = {"label": label, "name": name, "col_xr": taxon["accepted_key"]}
    if taxon["match_type"] not in reg.RESOLVED:
        return {**row, "status": "taxonomy_unresolved"}
    params = {
        "checklistKey": reg.COL_XR,
        "taxonKey": taxon["accepted_key"],
        "geometry": wkt,
        "hasCoordinate": "true",
        "limit": 300,
    }
    raw = reg.get(SEARCH, {**params, "limit": 0})["count"]
    results = reg.get(SEARCH, params)["results"]  # ponytail: first 300 only; noted
    good = [
        o
        for o in results
        if not o.get("hasGeospatialIssues")
        and (o.get("coordinateUncertaintyInMeters") or 10**9) <= 1000
        and o.get("basisOfRecord") in {"HUMAN_OBSERVATION", "PRESERVED_SPECIMEN"}
        and o.get("taxonRank") in {"SPECIES", "SUBSPECIES", "VARIETY", "FORM"}
    ]
    years = sorted(o["year"] for o in good if o.get("year"))
    summary = {
        **row,
        "status": "ok",
        "records_in_polygon": raw,
        "records_inspected": len(results),
        "records_passing_filters": len(good),
        "year_range": [years[0], years[-1]] if years else None,
        "basis_of_record": dict(Counter(o["basisOfRecord"] for o in good)),
        "datasets": dict(
            Counter(o.get("datasetName") or o["datasetKey"] for o in good)
        ),
        "rejected_reasons": dict(
            Counter(
                "geospatial_issue"
                if o.get("hasGeospatialIssues")
                else "uncertainty_missing_or_over_1000m"
                if (o.get("coordinateUncertaintyInMeters") or 10**9) > 1000
                else "basis_or_rank"
                for o in results
                if o not in good
            )
        ),
    }
    if label not in SENSITIVE:  # verifiable keys, never coordinates
        summary["example_gbif_keys"] = [o["key"] for o in good[:5]]
    return summary


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--polygon", type=Path, required=True, help="Private WKT")
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    wkt = args.polygon.read_text().strip()
    rows = [
        summarize(label, name, wkt)
        for members in PANELS.values()
        for label, (name, role, _) in members.items()
        if role == "catalog" or label in SENSITIVE
    ] + [summarize(label, name, wkt) for label, name in EXTRA.items()]
    data = {
        "queried_at": datetime.now(UTC).isoformat(timespec="seconds"),
        "polygon": "BCN SNASPE objectid 2826 'P.N.Puyehue' (Región: Los Ríos in the "
        "attribute table), EPSG:3857 -> EPSG:4326, simplified 0.005 deg; reference only",
        "filters": "no geospatial issue; uncertainty <= 1000 m; human observation or "
        "preserved specimen; species rank or below; first 300 records per taxon",
        "evidence_rule": "Candidate scientific/citizen records; not official park "
        "presence until reviewed. No coordinates published.",
        "taxa": rows,
    }
    args.output.write_text(
        json.dumps(data, indent=1, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    print(json.dumps([(r["label"], r.get("records_passing_filters")) for r in rows]))


if __name__ == "__main__":
    main()
