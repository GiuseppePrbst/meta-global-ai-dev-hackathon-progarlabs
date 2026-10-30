"""Botanical source registry for the eight catalog species. Public metadata only.

Queries GBIF (Catalogue of Life Extended Release taxonomy) and Wikimedia Commons.
With --cache it downloads small thumbnails OUTSIDE Git, only to compute exact and
perceptual hashes for deduplication. It never trains, never calls Meta, never
publishes images and never marks a record human_reviewed: platform labels stay
platform labels until a ProGarLabs reviewer checks them.
"""

import argparse
import hashlib
import json
import time
import urllib.parse
import urllib.request
from datetime import UTC, datetime
from io import BytesIO
from pathlib import Path

COL_XR = "7ddf754f-d193-4cc9-b351-99906754a03b"
GBIF_BACKBONE = "d7dddbf4-2cf0-4f39-9b2a-bb099caae36c"
DATASETS = {
    "plantnet_verified": "7a3679ef-5582-4aaa-81f0-8c2545cafc81",  # 10.15468/gtebaa
    "plantnet_automatic": "14d5676a-2c54-4f94-9023-1e8dcd822aa0",  # 10.15468/mma2ec
    "inaturalist_research": "50c9509d-22c7-4a22-a47d-8c48425ef4a7",
}
# Taxonomic neighbours to measure false positives/abstention. Names only: their
# discriminating traits must come from cited botanical sources, not from this list.
HARD_NEGATIVES = {
    "nothofagus-dombeyi": ["Nothofagus nitida", "Nothofagus obliqua"],
    "laureliopsis-philippiana": ["Laurelia sempervirens"],
    "nothofagus-pumilio": ["Nothofagus antarctica"],
    "podocarpus-nubigenus": [
        "Saxegothaea conspicua",
        "Podocarpus salignus",
        "Prumnopitys andina",
    ],
}
ORGANS = {
    "whole_tree",
    "leaf",
    "leaf_underside",
    "bark",
    "flower",
    "fruit",
    "branch",
    "seed",
    "unknown",
}
PLANTNET_ORGANS = {
    "habit": "whole_tree",
    "leaf": "leaf",
    "bark": "bark",
    "flower": "flower",
    "fruit": "fruit",
    "branch": "branch",
}
USER_AGENT = "BosqueVivoResearch/0.2 (ProGarLabs; botanical source registry)"
SCHEMA = "bosque-vivo-botanical-candidates/1"


def get(url: str, params: dict | None = None, raw=False):
    if params:
        url += "?" + urllib.parse.urlencode(params, doseq=True)
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=30) as response:
        data = response.read()
    time.sleep(0.2)  # ponytail: fixed politeness delay, no adaptive rate limiting
    return data if raw else json.loads(data)


def license_policy(text: str | None) -> dict:
    """Per-media license -> what ProGarLabs (a company) may do. Conservative."""
    value = (text or "").lower().replace("_", "-").replace(" ", "-")
    if not value:
        return {
            "license": None,
            "external_processing_allowed": False,
            "redistribution_allowed": "no",
            "reason": "license_missing",
        }
    if "-nc" in value or "noncommercial" in value or "non-commercial" in value:
        reason = "non_commercial"
    elif "-nd" in value or "noderiv" in value:
        reason = "no_derivatives"
    elif "gfdl" in value and "cc" not in value:
        reason = "gfdl_only"
    elif "cc0" in value or "public-domain" in value or value in {"pd", "pdm"}:
        return {
            "license": text,
            "external_processing_allowed": True,
            "redistribution_allowed": "yes",
            "reason": None,
        }
    elif "by-sa" in value or "cc-by-sa" in value:
        return {
            "license": text,
            "external_processing_allowed": True,
            "redistribution_allowed": "share_alike_with_attribution",
            "reason": None,
        }
    elif "by" in value:
        return {
            "license": text,
            "external_processing_allowed": True,
            "redistribution_allowed": "with_attribution",
            "reason": None,
        }
    else:
        reason = "license_unrecognized"
    return {
        "license": text,
        "external_processing_allowed": False,
        "redistribution_allowed": "no",
        "reason": reason,
    }


def resolve(name: str) -> dict:
    data = get(
        "https://api.gbif.org/v2/species/match",
        {"scientificName": name, "checklistKey": COL_XR},
    )
    usage = data.get("usage") or {}
    accepted = data.get("acceptedUsage") or usage
    return {
        "query": name,
        "key": usage.get("key"),
        "name": usage.get("name"),
        "canonical": usage.get("canonicalName"),
        "authorship": usage.get("authorship"),
        "status": usage.get("status"),
        "match_type": data.get("diagnostics", {}).get("matchType"),
        "synonym": data.get("synonym"),
        "accepted_key": accepted.get("key"),
        "accepted_name": accepted.get("name"),
    }


RESOLVED = {"EXACT", "VARIANT"}


def collisions(col: dict, synonyms: list[dict]) -> list[dict]:
    """Catalog synonyms that COL XR resolves, at species level, to another taxon."""
    return [
        s
        for s in synonyms
        if s["match_type"] in RESOLVED and s["accepted_key"] != col["accepted_key"]
    ]


def crosswalk_status(legacy: dict, col: dict, synonyms: list[dict]) -> str:
    if col["match_type"] not in RESOLVED or not col["key"]:
        return "unresolved"
    if col["synonym"]:
        return "synonym_in_col_xr"
    if collisions(col, synonyms):
        return "synonym_collision"
    if legacy.get("canonicalName") != col["canonical"]:
        return "name_differs"
    if (legacy.get("authorship") or "").strip() != (col["authorship"] or "").strip():
        return "exact_name_authorship_differs"
    return "exact"


def crosswalk(species: dict, queried_at: str) -> dict:
    legacy_key = species["taxonomy"]["gbif_id"]
    legacy = get(f"https://api.gbif.org/v1/species/{legacy_key}")
    col = resolve(species["scientific_name"])
    synonyms = [resolve(name) for name in species.get("synonyms", [])]
    return {
        "species_id": species["id"],
        "scientific_name": species["scientific_name"],
        "legacy": {
            "gbif_backbone_key": legacy_key,
            "checklist": legacy.get("datasetKey"),
            "scientific_name": legacy.get("scientificName"),
            "taxonomic_status": legacy.get("taxonomicStatus"),
            "source": f"https://api.gbif.org/v1/species/{legacy_key}",
        },
        "col_xr": {**col, "checklist": COL_XR},
        "catalog_synonyms_in_col_xr": synonyms,
        "status": crosswalk_status(legacy, col, synonyms),
        "authorship_differs": (legacy.get("authorship") or "").strip()
        != (col["authorship"] or "").strip(),
        "synonym_collisions": [
            {"query": s["query"], "col_xr_accepted": s["accepted_name"]}
            for s in collisions(col, synonyms)
        ],
        "unresolved_synonyms": [
            {"query": s["query"], "match_type": s["match_type"]}
            for s in synonyms
            if s["match_type"] not in RESOLVED
        ],
        "queried_at": queried_at,
        "resolution_source": "https://api.gbif.org/v2/species/match",
    }


def occurrence_counts(col_key: str) -> dict:
    base = {"checklistKey": COL_XR, "taxonKey": col_key, "limit": 0}
    search = "https://api.gbif.org/v1/occurrence/search"
    faceted = get(
        search,
        {
            **base,
            "mediaType": "StillImage",
            "facet": ["license", "country", "basisOfRecord"],
            "facetLimit": 10,
        },
    )
    counts = {
        "occurrences": get(search, base)["count"],
        "with_still_image": faceted["count"],
        "facets_with_image": {
            facet["field"].lower(): {c["name"]: c["count"] for c in facet["counts"]}
            for facet in faceted["facets"]
        },
    }
    for name, dataset in DATASETS.items():
        counts[f"{name}_with_image"] = get(
            search, {**base, "mediaType": "StillImage", "datasetKey": dataset}
        )["count"]
    return counts


def commons_files(category_url: str) -> list[dict]:
    title = urllib.parse.unquote(category_url.rsplit("/wiki/", 1)[1])
    params = {
        "action": "query",
        "format": "json",
        "generator": "categorymembers",
        "gcmtitle": title,
        "gcmtype": "file",
        "gcmlimit": 50,
        "prop": "imageinfo",
        "iiprop": "url|sha1|size|mime|extmetadata",
        "iiurlwidth": 256,
        "iiextmetadatafilter": "LicenseShortName|Artist|DateTimeOriginal|Credit",
    }
    files = []
    while True:
        data = get("https://commons.wikimedia.org/w/api.php", params)
        files += list(data.get("query", {}).get("pages", {}).values())
        if "continue" not in data:
            return sorted(files, key=lambda page: page["title"])
        params.update(data["continue"])


def _strip_html(value: str | None) -> str | None:
    if value is None:
        return None
    import re

    return re.sub(r"<[^>]+>", "", value).strip() or None


def commons_record(species_id: str, page: dict) -> dict:
    info = page["imageinfo"][0]
    meta = info.get("extmetadata", {})
    license_text = meta.get("LicenseShortName", {}).get("value")
    author = _strip_html(meta.get("Artist", {}).get("value"))
    taken = (_strip_html(meta.get("DateTimeOriginal", {}).get("value")) or "")[:10]
    return {
        "image_id": "commons:" + str(page["pageid"]),
        "species_id": species_id,
        "source_dataset": "wikimedia_commons_category",
        "occurrence_id": None,
        "media_url": info["descriptionurl"],
        "thumbnail_url": info.get("thumburl"),
        "mime": info.get("mime"),
        "organ": "unknown",
        "organ_provenance": "not_provided_by_source",
        "country": None,
        "author": author,
        "attribution": f"{author or 'Unknown author'}, {page['title']}, Wikimedia Commons",
        "label_source": "commons_category_membership",
        "source_sha1": info.get("sha1"),
        "acquisition_group": f"commons:{author}|{taken}" if author and taken else None,
        **license_policy(license_text),
        "record_license": None,
    }


def plantnet_records(species_id: str, col_key: str, limit: int) -> list[dict]:
    data = get(
        "https://api.gbif.org/v1/occurrence/search",
        {
            "checklistKey": COL_XR,
            "taxonKey": col_key,
            "datasetKey": DATASETS["plantnet_verified"],
            "mediaType": "StillImage",
            "limit": limit,
        },
    )
    records = []
    for occurrence in data["results"]:
        for index, item in enumerate(occurrence.get("media", [])):
            if item.get("type") != "StillImage":
                continue
            title = item.get("title") or ""
            tag = title.rsplit(":", 1)[-1].strip().lower() if ":" in title else ""
            # Media license string looks like "author (cc-by-sa)"; keep the raw value.
            raw = item.get("license") or ""
            license_text = (
                raw[raw.rfind("(") + 1 : raw.rfind(")")] if "(" in raw else raw
            )
            records.append(
                {
                    "image_id": f"gbif:{occurrence['key']}:{index}",
                    "species_id": species_id,
                    "source_dataset": "plantnet_verified_gbif",
                    "occurrence_id": str(occurrence["key"]),
                    "media_url": item.get("identifier"),
                    # Pl@ntNet serves the same image in a small "s" rendition.
                    "thumbnail_url": (item.get("identifier") or "").replace(
                        "/image/o/", "/image/s/"
                    )
                    or None,
                    "mime": item.get("format"),
                    "organ": PLANTNET_ORGANS.get(tag, "unknown"),
                    "organ_provenance": f"plantnet_media_title:{tag}"
                    if tag
                    else "not_provided_by_source",
                    "country": occurrence.get("countryCode"),
                    "author": item.get("creator") or item.get("rightsHolder"),
                    "attribution": raw or None,
                    "label_source": "plantnet_community_validated",
                    "source_sha1": None,
                    "acquisition_group": None,
                    **license_policy(license_text),
                    "record_license": occurrence.get("license"),
                }
            )
    return records


def dhash(image) -> str:
    """64-bit difference hash of a thumbnail: deterministic near-duplicate signal."""
    from PIL import Image

    small = image.convert("L").resize((9, 8), Image.Resampling.LANCZOS)
    pixels = small.tobytes()  # mode L: one byte per pixel
    bits = [
        pixels[row * 9 + col] > pixels[row * 9 + col + 1]
        for row in range(8)
        for col in range(8)
    ]
    return f"{int(''.join('1' if b else '0' for b in bits), 2):016x}"


def hamming(a: str, b: str) -> int:
    return (int(a, 16) ^ int(b, 16)).bit_count()


def hash_thumbnail(record: dict, cache: Path) -> None:
    from PIL import Image

    record.update(sha256=None, perceptual_hash=None, hash_basis=None)
    url = record["thumbnail_url"] or record["media_url"]
    if not url:
        record["hash_basis"] = "no_downloadable_media"
        return
    target = cache / (hashlib.sha256(record["image_id"].encode()).hexdigest() + ".bin")
    try:
        content = target.read_bytes() if target.is_file() else get(url, raw=True)
        with Image.open(BytesIO(content)) as image:
            image.thumbnail((256, 256))
            record["perceptual_hash"] = dhash(image)
    except Exception as exc:  # noqa: BLE001 - recorded as missing, never invented
        record["hash_basis"] = "download_or_decode_failed:" + type(exc).__name__
        return
    target.write_bytes(content)
    record["downloaded_sha256"] = hashlib.sha256(content).hexdigest()
    # sha256 is of the downloaded file; for Commons that is a thumbnail, not the original.
    record["hash_basis"] = "thumbnail" if record["thumbnail_url"] else "original"
    if record["hash_basis"] == "original":
        record["sha256"] = record["downloaded_sha256"]


def assign_groups(records: list[dict], max_distance=6) -> None:
    """Union observation, acquisition, exact and perceptual duplicates; split per group.

    Every image of one group shares a split, so the same individual (or a near copy)
    can never sit in development and test at once.
    """
    parent = list(range(len(records)))

    def find(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i

    seen = {}
    for i, record in enumerate(records):
        for key in (
            record.get("occurrence_id") and "obs:" + record["occurrence_id"],
            record.get("acquisition_group"),
            record.get("source_sha1") and "sha1:" + record["source_sha1"],
            record.get("downloaded_sha256") and "sha256:" + record["downloaded_sha256"],
        ):
            if key:
                if key in seen:
                    parent[find(i)] = find(seen[key])
                seen.setdefault(key, i)
    duplicates = set()  # exact or perceptual copies only, not same photographer/day
    for key in ("source_sha1", "downloaded_sha256"):
        values = [r.get(key) for r in records]
        duplicates |= {i for i, v in enumerate(values) if v and values.count(v) > 1}
    hashed = [i for i, r in enumerate(records) if r.get("perceptual_hash")]
    for n, i in enumerate(hashed):  # ponytail: O(n^2), fine for hundreds of images
        for j in hashed[n + 1 :]:
            if (
                hamming(records[i]["perceptual_hash"], records[j]["perceptual_hash"])
                <= max_distance
            ):
                parent[find(i)] = find(j)
                duplicates |= {i, j}
    for i, record in enumerate(records):
        root = records[find(i)]["image_id"]
        record["individual_group"] = (
            "grp:" + hashlib.sha256(root.encode()).hexdigest()[:12]
        )
        record["possible_duplicate"] = i in duplicates
        record["split"] = (
            "test"
            if int(hashlib.sha256(record["individual_group"].encode()).hexdigest(), 16)
            % 2
            else "development"
        )


def finalize(record: dict, taxon: dict) -> dict:
    """Fill the versioned schema; review status never exceeds metadata_checked."""
    required = ("media_url", "license", "author", "species_id")
    missing = [k for k in required if not record.get(k)]
    if not record["external_processing_allowed"] or missing:
        status = "rejected"
        reason = record["reason"] or "missing:" + ",".join(missing)
    else:
        status, reason = "metadata_checked", None
    record.update(
        accepted_taxon_id=taxon["col_xr"]["accepted_key"],
        taxonomy_checklist=COL_XR,
        human_label_status=status,
        rejection_reason=reason,
        reviewed_at=None,
        reviewer=None,
    )
    record.pop("reason", None)
    return record


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--species", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--cache", type=Path, help="Thumbnail cache outside Git")
    parser.add_argument("--plantnet-sample", type=int, default=15)
    args = parser.parse_args()
    catalog = json.loads(args.species.read_text(encoding="utf-8"))
    queried_at = datetime.now(UTC).isoformat(timespec="seconds")
    taxa, inventory, records = [], [], []
    for species in catalog:
        taxon = crosswalk(species, queried_at)
        taxa.append(taxon)
        key = taxon["col_xr"]["accepted_key"]
        pages = commons_files(
            f"https://commons.wikimedia.org/wiki/Category:{species['scientific_name'].replace(' ', '_')}"
        )
        species_records = [commons_record(species["id"], p) for p in pages]
        species_records += plantnet_records(species["id"], key, args.plantnet_sample)
        records += [(r, taxon) for r in species_records]
        inventory.append(
            {
                "species_id": species["id"],
                "col_xr_key": key,
                "gbif": occurrence_counts(key),
                "commons_direct_files": len(pages),
                "hard_negatives": [
                    {"name": name, "col_xr": resolve(name)}
                    for name in HARD_NEGATIVES.get(species["id"], [])
                ],
            }
        )
    if args.cache:
        from tools.meta_sam_api_lab.media import private_path

        cache = private_path(args.cache)
        cache.mkdir(parents=True, exist_ok=True)
        for record, _ in records:
            hash_thumbnail(record, cache)
    else:
        for record, _ in records:
            record.update(
                sha256=None, perceptual_hash=None, hash_basis="not_downloaded"
            )
    plain = [r for r, _ in records]
    assign_groups(plain)
    final = [finalize(r, t) for r, t in records]
    for item in inventory:
        mine = [r for r in final if r["species_id"] == item["species_id"]]
        item["candidates"] = {
            "total": len(mine),
            "metadata_checked": sum(
                r["human_label_status"] == "metadata_checked" for r in mine
            ),
            "rejected": sum(r["human_label_status"] == "rejected" for r in mine),
            "human_reviewed": 0,
            "organs_source_provided": {
                organ: sum(r["organ"] == organ for r in mine)
                for organ in sorted(ORGANS)
                if any(r["organ"] == organ for r in mine)
            },
            "rejection_reasons": {
                reason: sum(r["rejection_reason"] == reason for r in mine)
                for reason in sorted(
                    {r["rejection_reason"] for r in mine if r["rejection_reason"]}
                )
            },
            "possible_duplicates": sum(r["possible_duplicate"] for r in mine),
            "split_groups": len({r["individual_group"] for r in mine}),
            "hashed": sum(r["perceptual_hash"] is not None for r in mine),
        }
    args.output.mkdir(parents=True, exist_ok=True)
    meta = {"queried_at": queried_at, "taxonomy_checklist": COL_XR}
    for name, data in (
        ("gbif-colxr-crosswalk.json", {**meta, "species": taxa}),
        ("source-inventory.json", {**meta, "species": inventory}),
        ("candidate-manifest.json", {**meta, "schema": SCHEMA, "records": final}),
    ):
        (args.output / name).write_text(
            json.dumps(data, indent=1, ensure_ascii=False) + "\n", encoding="utf-8"
        )
    print(json.dumps({"species": len(taxa), "candidates": len(final)}))


if __name__ == "__main__":
    main()
