"""Multikingdom media registry for the 31-10-2026 campaign. Public metadata only.

Extends botanical_registry (same license policy, COL XR resolution, hashing and
leak-proof grouping) to fauna and fungi and to new flora material. Sources:
iNaturalist research-grade and Pl@ntNet verified via GBIF, and Wikimedia Commons.
The media license decides, never the record license: an iNaturalist record CC BY
with a CC BY-NC photo is rejected. Images previously used to choose `verify`
(30-10 campaign and open-set set) are excluded by image id, observation, group
and perceptual hash. Labels stay platform labels; nothing is marked reviewed.
"""

import argparse
import hashlib
import json
from datetime import UTC, datetime
from pathlib import Path

from evaluations import botanical_registry as reg

SEARCH = "https://api.gbif.org/v1/occurrence/search"
SCHEMA = "bosque-vivo-multikingdom-media/1"
# benchmark -> label -> (scientific name, role, wanted processable media)
# Roles: catalog = in the recognition catalog of that benchmark; hard = look-alike
# outside it; general = other organism of the same kingdom outside it.
PANELS = {
    "flora": {
        **{
            sid: (name, "catalog", 18)
            for sid, name in (
                ("nothofagus-dombeyi", "Nothofagus dombeyi"),
                ("eucryphia-cordifolia", "Eucryphia cordifolia"),
                ("aextoxicon-punctatum", "Aextoxicon punctatum"),
                ("weinmannia-trichosperma", "Weinmannia trichosperma"),
                ("laureliopsis-philippiana", "Laureliopsis philippiana"),
                ("podocarpus-nubigenus", "Podocarpus nubigenus"),
                ("nothofagus-betuloides", "Nothofagus betuloides"),
                ("nothofagus-pumilio", "Nothofagus pumilio"),
            )
        },
        "nothofagus-nitida": ("Nothofagus nitida", "hard", 5),
        "nothofagus-obliqua": ("Nothofagus obliqua", "hard", 5),
        "nothofagus-antarctica": ("Nothofagus antarctica", "hard", 5),
        "laurelia-sempervirens": ("Laurelia sempervirens", "hard", 5),
        "saxegothaea-conspicua": ("Saxegothaea conspicua", "hard", 5),
        "podocarpus-salignus": ("Podocarpus salignus", "hard", 4),
        "caldcluvia-paniculata": ("Caldcluvia paniculata", "hard", 4),
        "drimys-winteri": ("Drimys winteri", "general", 3),
        "luma-apiculata": ("Luma apiculata", "general", 3),
        "embothrium-coccineum": ("Embothrium coccineum", "general", 3),
        "gevuina-avellana": ("Gevuina avellana", "general", 3),
    },
    "fauna": {
        "enicognathus-leptorhynchus": ("Enicognathus leptorhynchus", "catalog", 22),
        "campephilus-magellanicus": ("Campephilus magellanicus", "catalog", 22),
        "pteroptochos-tarnii": ("Pteroptochos tarnii", "catalog", 22),
        "troglodytes-aedon": ("Troglodytes aedon", "catalog", 22),
        "theristicus-melanopis": ("Theristicus melanopis", "catalog", 22),
        "enicognathus-ferrugineus": ("Enicognathus ferrugineus", "hard", 8),
        "scelorchilus-rubecula": ("Scelorchilus rubecula", "hard", 8),
        "colaptes-pitius": ("Colaptes pitius", "hard", 8),
        "pteroptochos-castaneus": ("Pteroptochos castaneus", "hard", 6),
        "theristicus-caudatus": ("Theristicus caudatus", "hard", 6),
        "cistothorus-platensis": ("Cistothorus platensis", "hard", 6),
        "veniliornis-lignarius": ("Veniliornis lignarius", "hard", 6),
        "dromiciops-gliroides": ("Dromiciops gliroides", "general", 5),
        "leopardus-guigna": ("Leopardus guigna", "general", 5),
        "puma-concolor": ("Puma concolor", "general", 4),
        "turdus-falcklandii": ("Turdus falcklandii", "general", 4),
    },
    "fungi": {
        "cyttaria-hariotii": ("Cyttaria hariotii", "catalog", 20),
        "cyttaria-espinosae": ("Cyttaria espinosae", "catalog", 16),
        "cyttaria-darwinii": ("Cyttaria darwinii", "hard", 10),
        "amanita-muscaria": ("Amanita muscaria", "general", 5),
        "fistulina-antarctica": ("Fistulina antarctica", "general", 5),
        "aleurodiscus-vitellinus": ("Aleurodiscus vitellinus", "general", 4),
    },
}
# Countries tried in order; non-Chilean material only when Chile is short and the
# taxon looks the same across its range (recorded per record as `country`).
COUNTRIES = ("CL", "AR", None)


def license_of(url: str | None) -> str:
    """iNaturalist media license URL -> short text for license_policy."""
    value = (url or "").lower()
    if "publicdomain/zero" in value:
        return "CC0"
    if "/licenses/" in value:
        kind = value.split("/licenses/", 1)[1].split("/", 1)[0]
        return "CC " + kind.upper()
    return url or ""


def inat_records(label: str, key: str, country: str | None, max_pages=6) -> list[dict]:
    """Research-grade iNaturalist media with a processable *media* license."""
    params = {
        "checklistKey": reg.COL_XR,
        "taxonKey": key,
        "datasetKey": reg.DATASETS["inaturalist_research"],
        "mediaType": "StillImage",
        "limit": 300,
    }
    if country:
        params["country"] = country
    out, offset = [], 0
    for _ in range(max_pages):
        data = reg.get(SEARCH, {**params, "offset": offset})
        for occ in data["results"]:
            photos = [m for m in occ.get("media", []) if m.get("type") == "StillImage"]
            for index, item in enumerate(photos[:3]):  # same individual, multiview
                text = license_of(item.get("license"))
                original = item.get("identifier") or ""
                out.append(
                    {
                        "image_id": f"gbif:{occ['key']}:{index}",
                        "species_id": label,
                        "source_dataset": "inaturalist_research_gbif",
                        "occurrence_id": str(occ["key"]),
                        "source_url": occ.get("occurrenceID"),
                        "media_url": original,
                        "thumbnail_url": original.replace("/original.", "/small.")
                        or None,
                        "mime": item.get("format"),
                        "organ": "unknown",
                        "organ_provenance": "not_provided_by_source",
                        "country": occ.get("countryCode"),
                        "collection_date": (occ.get("eventDate") or "")[:10] or None,
                        "author": item.get("creator") or item.get("rightsHolder"),
                        "attribution": f"{item.get('rightsHolder') or item.get('creator')}"
                        f", iNaturalist ({text})",
                        "label_source": "inaturalist_research_grade",
                        "source_sha1": None,
                        "acquisition_group": None,
                        "view_index": index,
                        **reg.license_policy(text),
                        "record_license": occ.get("license"),
                    }
                )
        offset += params["limit"]
        if data.get("endOfRecords"):
            break
        if len([r for r in out if r["external_processing_allowed"]]) > 120:
            break  # ponytail: enough to pick from; more pages only cost time
    return out


def previously_used(data: Path) -> dict:
    """IDs, observations, groups and hashes from the cases that chose `verify`."""
    used = {"ids": set(), "occurrences": set(), "groups": set(), "hashes": set()}
    for name in (
        "botanical-campaign-cases.json",
        "botanical-campaign-multiview.json",
        "open-set-eval-cases.json",
        "open-set-eval-candidates.json",
    ):
        path = data / name
        if not path.is_file():
            continue
        for case in json.loads(path.read_text(encoding="utf-8")):
            used["ids"].add(case["image_id"])
            used["occurrences"].add(case.get("occurrence_id"))
            used["groups"].add(case.get("individual_group"))
            used["hashes"].add(case.get("perceptual_hash"))
    for values in used.values():
        values.discard(None)
    return used


def leaks(record: dict, used: dict) -> str | None:
    if record["image_id"] in used["ids"]:
        return "used_in_previous_campaign"
    if record.get("individual_group") in used["groups"]:
        return "individual_used_in_previous_campaign"
    if record.get("occurrence_id") in used["occurrences"]:
        return "observation_used_in_previous_campaign"
    if record.get("perceptual_hash") and any(
        reg.hamming(record["perceptual_hash"], h) <= 6 for h in used["hashes"]
    ):
        return "near_duplicate_of_previous_campaign"
    return None


def split_for(group: str) -> str:
    """One quarter development (smoke and prompt fixes), the rest frozen test."""
    return (
        "development"
        if int(hashlib.sha256(group.encode()).hexdigest(), 16) % 4 == 0
        else "test"
    )


def pick(records: list[dict], wanted: int) -> list[dict]:
    """Processable media, one first view per observation, spread over observers."""
    ok = [r for r in records if r["external_processing_allowed"]]
    firsts = [r for r in ok if r.get("view_index", 0) == 0]
    chosen, authors = [], {}
    for r in sorted(firsts, key=lambda r: r["image_id"]):
        if len(chosen) == wanted:
            break
        if authors.get(r["author"], 0) >= 2:  # one photographer cannot dominate
            continue
        authors[r["author"]] = authors.get(r["author"], 0) + 1
        chosen.append(r)
    occ = {r["occurrence_id"] for r in chosen}
    extra = [r for r in ok if r.get("view_index", 0) > 0 and r["occurrence_id"] in occ]
    return chosen + extra


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--cache", type=Path, required=True, help="Outside Git")
    parser.add_argument("--previous", type=Path, required=True, help="Private cases")
    parser.add_argument("--botanical", type=Path, required=True)
    args = parser.parse_args()
    from tools.meta_sam_api_lab.media import private_path

    cache = private_path(args.cache)
    cache.mkdir(parents=True, exist_ok=True)
    used = previously_used(private_path(args.previous))
    queried_at = datetime.now(UTC).isoformat(timespec="seconds")
    old = json.loads(
        (args.botanical / "candidate-manifest.json").read_text(encoding="utf-8")
    )["records"]
    records, availability, taxa = [], [], {}
    for panel, members in PANELS.items():
        for label, (name, role, wanted) in members.items():
            taxon = reg.resolve(name)
            taxa[label] = taxon
            row = {"panel": panel, "label": label, "name": name, "role": role}
            if taxon["match_type"] not in reg.RESOLVED or not taxon["accepted_key"]:
                row["status"] = "taxonomy_unresolved"
                availability.append(row)
                continue
            pool, tried = [], []
            # Unused 30-10 tree candidates first (metadata already audited).
            pool += [
                {**r, "source_url": r["media_url"], "collection_date": None}
                for r in old
                if r["species_id"] == label and r["human_label_status"] != "rejected"
            ]
            for country in COUNTRIES:
                tried.append(country or "any")
                pool += inat_records(label, taxon["accepted_key"], country)
                if (
                    len([r for r in pool if r["external_processing_allowed"]])
                    >= 3 * wanted
                ):
                    break
            if panel == "flora":
                pool += reg.plantnet_records(label, taxon["accepted_key"], 60)
            seen, unique = set(), []
            for r in pool:
                if r["image_id"] not in seen:
                    seen.add(r["image_id"])
                    unique.append(r)
            for r in unique:
                r.setdefault("view_index", 0)
                r.setdefault("collection_date", None)
            # Known leaks (id, observation, old group, old hash) never take a slot.
            unique = [r for r in unique if not leaks(r, used)]
            chosen = pick(unique, wanted)
            for r in chosen:
                if not r.get("perceptual_hash"):
                    reg.hash_thumbnail(r, cache)
            row.update(
                status="ok",
                countries_tried=tried,
                candidates_seen=len(unique),
                processable_license=sum(
                    r["external_processing_allowed"] for r in unique
                ),
                rejected_by_license={
                    reason: sum(r.get("reason") == reason for r in unique)
                    for reason in sorted(
                        {r.get("reason") for r in unique if r.get("reason")}
                    )
                },
                record_cc_but_media_restricted=sum(
                    1
                    for r in unique
                    if not r["external_processing_allowed"]
                    and "creativecommons.org/licenses/by/"
                    in (r.get("record_license") or "")
                ),
            )
            availability.append(row)
            for r in chosen:
                r.update(panel=panel, role=role)
                r["leak_reason"] = leaks(r, used)
            records += chosen
    reg.assign_groups(records)  # observation, acquisition, exact and dHash<=6
    final = []
    for r in records:
        taxon = taxa[r["species_id"]]
        r.pop("split", None)
        r.update(
            accepted_scientific_name=taxon["accepted_name"],
            kingdom={"flora": "Plantae", "fauna": "Animalia", "fungi": "Fungi"}[
                r["panel"]
            ],
            accepted_taxon_id=taxon["accepted_key"],
            taxonomy_checklist=reg.COL_XR,
            media_type="photo",
            media_license=r["license"],
            quality_status="pending_agent_review",
            review_status="platform_label_only",
            split=split_for(r["individual_group"]),
            reviewed_at=None,
            reviewer=None,
        )
        r.pop("reason", None)
        final.append(r)
    for row in availability:
        mine = [r for r in final if r["species_id"] == row["label"]]
        row["selected_media"] = len(mine)
        row["selected_observations"] = len({r["individual_group"] for r in mine})
        row["excluded_as_leak"] = sum(bool(r["leak_reason"]) for r in mine)
    args.output.mkdir(parents=True, exist_ok=True)
    meta = {"queried_at": queried_at, "taxonomy_checklist": reg.COL_XR}
    for name, data in (
        ("media-availability.json", {**meta, "taxa": availability}),
        ("media-manifest.json", {**meta, "schema": SCHEMA, "records": final}),
    ):
        (args.output / name).write_text(
            json.dumps(data, indent=1, ensure_ascii=False) + "\n", encoding="utf-8"
        )
    print(json.dumps({"taxa": len(availability), "media": len(final)}))


if __name__ == "__main__":
    main()
