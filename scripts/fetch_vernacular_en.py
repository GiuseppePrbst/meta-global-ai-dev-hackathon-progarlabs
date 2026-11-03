#!/usr/bin/env python3
"""English vernacular names for the catalog from the GBIF species API (search vocabulary only).

    uv run --project services/api python scripts/fetch_vernacular_en.py

Names feed Atlas search terms and ASR keywords so English questions resolve to the
same taxa; they are never shown as validated facts. Each taxon keeps its GBIF URL.
"""

import json
import sys
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "services/api/src/bosque_api/resources/vernacular-en.json"


def main():
    sys.path.insert(0, str(ROOT / "services/api/src"))
    from bosque_api.biodiversity import get_taxa

    out = {}
    with httpx.Client(base_url="https://api.gbif.org/v1/", timeout=20) as client:
        for taxon in get_taxa():
            match = client.get(
                "species/match",
                params={"name": taxon.scientific_name, "strict": "true"},
            ).json()
            key = match.get("usageKey")
            if not key or match.get("matchType") != "EXACT":
                out[taxon.id] = {
                    "names": [],
                    "gbif_key": None,
                    "note": "Sin coincidencia exacta en GBIF",
                }
                continue
            rows = client.get(
                f"species/{key}/vernacularNames", params={"limit": 200}
            ).json()["results"]
            names = []
            for row in rows:
                name = " ".join(row.get("vernacularName", "").split())
                if (
                    row.get("language") == "eng"
                    and name
                    and name.casefold() not in {n.casefold() for n in names}
                ):
                    names.append(name)
            out[taxon.id] = {
                "names": names[:3],
                "gbif_key": key,
                "source_url": f"https://www.gbif.org/species/{key}",
            }
    doc = {
        "schema_version": "1.0.0",
        "source": "GBIF species API, vernacularNames (language=eng)",
        "accessed_at": "2026-11-03",
        "use": "search_and_asr_vocabulary_only",
        "taxa": out,
    }
    OUTPUT.write_text(
        json.dumps(doc, ensure_ascii=False, indent=1) + "\n",
        encoding="utf-8",
        newline="\n",
    )
    print({k: v["names"] for k, v in out.items()})


if __name__ == "__main__":
    main()
