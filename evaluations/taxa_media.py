"""Fill `media` in taxa.json: up to 3 redistributable photos per knowledge taxon.

Only first views that passed the agent's visual review, with a license that allows
redistribution (CC0, CC BY, CC BY-SA), and never from the frozen test split, so a
photo shown in a profile is not a benchmark case. Images are linked, not hosted.
Sensitive taxa get photos too: no coordinates are stored or exposed.
"""

import argparse
import json
from pathlib import Path

HERE = Path(__file__).parent
TAXA = HERE.parent / "services/api/src/bosque_api/resources/taxa.json"


def image_url(record: dict) -> str:
    """Direct image: iNaturalist 'medium', Commons 640 px thumbnail."""
    if record["source_dataset"] == "wikimedia_commons_category":
        return record["thumbnail_url"].split("?")[0].replace("/330px-", "/640px-")
    return record["media_url"].replace("/original.", "/medium.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--review", type=Path, required=True, help="Private review")
    args = parser.parse_args()
    review = json.loads(args.review.read_text(encoding="utf-8"))
    manifest = json.loads(
        (HERE / "biodiversity/media-manifest.json").read_text(encoding="utf-8")
    )["records"]
    taxa = json.loads(TAXA.read_text(encoding="utf-8"))
    for taxon in taxa:
        pool = [
            r
            for r in manifest
            if r["species_id"] == taxon["id"]
            and r.get("view_index", 0) == 0
            and r["split"] == "development"
            and not review.get(r["image_id"], {}).get("excluded")
            and r["redistribution_allowed"] != "no"
            and r.get("author")
        ]
        taxon["media"] = [
            {
                "media_id": r["image_id"],
                "media_url": image_url(r),
                "source_url": r.get("source_url") or r["media_url"],
                "author": r["author"],
                "license": r["license"],
                "attribution": r["attribution"],
                "redistribution": r["redistribution_allowed"],
                "review_status": "agent_visual_check",
            }
            for r in sorted(pool, key=lambda r: r["image_id"])[:3]
        ]
    TAXA.write_text(
        json.dumps(taxa, indent=1, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    print({t["id"]: len(t["media"]) for t in taxa})


if __name__ == "__main__":
    main()
