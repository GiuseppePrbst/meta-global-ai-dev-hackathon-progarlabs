"""Versioned, idempotent RCE import for the taxa of the knowledge catalog only.

Reads the private official workbook (never versioned), checks its SHA-256 and
writes resources/conservation.json with the selected facts: category text,
territorial scopes, criteria, process, decree and RCE distribution flags. Same
input -> byte-identical output. A taxon without a match is listed explicitly;
it is never given LC. Run with openpyxl, e.g.:
uv run --project services/api --with openpyxl python -m evaluations.rce_import ...
"""

import argparse
import hashlib
import json
from pathlib import Path

from bosque_api.biodiversity import REGIONS, parse_scopes

URL = (
    "https://clasificacionespecies.mma.gob.cl/wp-content/uploads/2026/10/"
    "NominaDeEspecies_SegunEstadoConservacion-Chile_actualizado_20mProcesoRCE_20octubre2026.xlsx"
)
SHA256 = "1a1dadbaf554a53f39143c40a898fc252bc2e3354734b202fb31deba4fbe607d"
# Column order in the sheet (geographic), mapped to the book's region codes.
SHEET_ORDER = [
    "XV",
    "I",
    "II",
    "III",
    "IV",
    "V",
    "RM",
    "VI",
    "VII",
    "XVI",
    "VIII",
    "IX",
    "XIV",
    "X",
    "XI",
    "XII",
]


# Column positions used by build(); the import fails if their headers change.
HEADERS = {
    0: "NOMBRE CIENT",
    2: "SINONIMIA",
    24: "Los Lagos",
    32: "CATEGOR",
    33: "FUENTE",
}
HEADERS |= {34: "Criterio", 35: "PROCESO", 36: "DECRETO"}


def check_headers(header: tuple) -> None:
    changed = [i for i, text in HEADERS.items() if text not in str(header[i] or "")]
    if changed:
        raise SystemExit(f"Encabezados RCE cambiaron en columnas {changed}: revisar")


def canonical(name: str) -> str:
    return " ".join(name.replace("\n", " ").split()[:2]).lower()


def catalog_names(api: Path) -> dict[str, list[str]]:
    resources = api / "src/bosque_api/resources"
    species = {
        s["id"]: s
        for s in json.loads((resources / "species.json").read_text(encoding="utf-8"))
    }
    names = {}
    for taxon in json.loads((resources / "taxa.json").read_text(encoding="utf-8")):
        if taxon.get("species_ref"):
            s = species[taxon["species_ref"]]
            names[taxon["id"]] = [
                s.get("accepted_name") or s["scientific_name"],
                *s.get("synonyms", []),
            ]
        else:
            names[taxon["id"]] = [
                taxon["scientific_name"],
                *taxon["taxonomy"].get("synonyms_reviewed", []),
            ]
    return names


def build(rows: list[tuple], names: dict[str, list[str]], version_text: str) -> dict:
    index = {}
    for row in rows:
        if row and row[0]:
            keys = [row[0]] + [
                s for s in str(row[2] or "").replace("\n", ",").split(",") if s.strip()
            ]
            for key in keys:
                index.setdefault(canonical(key), row)
    assessments, not_found = [], {}
    for taxon_id, searched in sorted(names.items()):
        row = next(
            (index[canonical(n)] for n in searched if canonical(n) in index), None
        )
        if row is None:
            not_found[taxon_id] = sorted({canonical(n) for n in searched})
            continue
        flags = dict(zip(SHEET_ORDER, row[11:27], strict=True))
        assessments.append(
            {
                "taxon_id": taxon_id,
                "system": "RCE",
                "jurisdiction": "Chile",
                "rce_name": " ".join(str(row[0]).split()),
                "category_text": " ".join(str(row[32]).split()),
                "scopes": [s.model_dump() for s in parse_scopes(str(row[32]))],
                "criteria": " ".join(str(row[34]).split())
                if row[34] not in (None, "--")
                else None,
                "process": int(row[35]) if isinstance(row[35], int | float) else None,
                "decree": " ".join(str(row[36]).split()) if row[36] else None,
                "source_of_category": str(row[33]).strip(),
                "distribution_regions": [
                    REGIONS[c] for c in SHEET_ORDER if flags[c] == 1
                ],
            }
        )
    return {
        "source": {
            "title": "Nómina de especies según estado de conservación, RCE (MMA)",
            "url": URL,
            "file_name": URL.rsplit("/", 1)[1],
            "sha256": SHA256,
            "version_text": version_text,
            "accessed_at": "2026-10-31",
            "redistribution": "Sin licencia publicada: se versionan solo hechos seleccionados "
            "con atribución; el libro íntegro queda fuera de Git.",
            "review_status": "imported_unreviewed",
        },
        "assessments": assessments,
        "not_found": not_found,
    }


def main():
    import openpyxl

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--xlsx", type=Path, required=True)
    parser.add_argument("--api", type=Path, default=Path("services/api"))
    args = parser.parse_args()
    if hashlib.sha256(args.xlsx.read_bytes()).hexdigest() != SHA256:
        raise SystemExit(
            "Hash del libro RCE distinto: revisar versión antes de importar"
        )
    book = openpyxl.load_workbook(args.xlsx, read_only=True, data_only=True)
    rows = list(book["Especies"].iter_rows(values_only=True))
    check_headers(rows.pop(0))
    version = " ".join(str(book["Ayuda"]["A1"].value).split())
    data = build(rows, catalog_names(args.api), version)
    out = args.api / "src/bosque_api/resources/conservation.json"
    out.write_text(
        json.dumps(data, indent=1, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    print(len(data["assessments"]), "found;", sorted(data["not_found"]))


if __name__ == "__main__":
    main()
