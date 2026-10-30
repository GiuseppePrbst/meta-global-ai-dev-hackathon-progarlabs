"""Open-set evaluation: frozen independent set, paired strategy comparison, metrics.

Development set = the 47 cases of the 30-10 campaign (already used to design
the strategies). The independent set excludes every observation, Commons
photographer/date group, image and perceptual near-duplicate of that set and is
frozen (hash recorded) before any strategy runs on it. Labels remain platform
labels plus agent visual review: weakly_labeled_exploration, not accuracy.
"""

import hashlib
import json
import math

from evaluations import botanical_campaign as campaign
from evaluations import botanical_registry as registry

GENERAL_NEGATIVES = (  # natives of the same forests, less similar to the catalog
    "Drimys winteri",
    "Luma apiculata",
    "Embothrium coccineum",
    "Gevuina avellana",
    "Lomatia hirsuta",
    "Amomyrtus luma",
    "Persea lingue",
    "Fitzroya cupressoides",
)
HARD_NEGATIVES = {
    "Nothofagus antarctica": "47SYY",
    "Nothofagus nitida": "47T24",
    "Laurelia sempervirens": "3SMFQ",
    "Saxegothaea conspicua": "79QZ2",
    "Podocarpus salignus": "4KQ6P",
    "Prumnopitys andina": "4N89W",
}


def wilson(successes: int, n: int, z: float = 1.96) -> list[float] | None:
    """95% Wilson score interval; None without observations."""
    if n == 0:
        return None
    p = successes / n
    centre = (p + z * z / (2 * n)) / (1 + z * z / n)
    half = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / (1 + z * z / n)
    return [round(max(0.0, centre - half), 4), round(min(1.0, centre + half), 4)]


def rate(successes: int, n: int) -> dict:
    return {
        "k": successes,
        "n": n,
        "rate": successes / n if n else None,
        "ci95": wilson(successes, n),
    }


def metrics(rows: list[dict]) -> dict:
    """rows: label, negative, status, proposed (all hypotheses), accepted (id or None)."""
    positives = [r for r in rows if not r["negative"]]
    negatives = [r for r in rows if r["negative"]]
    done_pos = [r for r in positives if r["status"] == "completed"]
    done_neg = [r for r in negatives if r["status"] == "completed"]
    accepted_pos = [r for r in done_pos if r["accepted"]]
    correct_accepted = [r for r in accepted_pos if r["accepted"] == r["label"]]
    return {
        "top1_proposed": rate(
            sum(
                bool(r["proposed"]) and r["proposed"][0] == r["label"] for r in done_pos
            ),
            len(done_pos),
        ),
        "top3_proposed": rate(
            sum(r["label"] in r["proposed"] for r in done_pos), len(done_pos)
        ),
        "correct_accepted_on_positives": rate(len(correct_accepted), len(done_pos)),
        "coverage_positives": rate(len(accepted_pos), len(done_pos)),
        "selective_risk": rate(
            len(accepted_pos) - len(correct_accepted), len(accepted_pos)
        ),
        "unnecessary_abstention": rate(
            sum(
                not r["accepted"] and r["label"] in r["proposed"][:1] for r in done_pos
            ),
            len(done_pos),
        ),
        "negatives_with_proposal": rate(
            sum(bool(r["proposed"]) for r in done_neg), len(done_neg)
        ),
        "negatives_false_acceptance": rate(
            sum(bool(r["accepted"]) for r in done_neg), len(done_neg)
        ),
        "negatives_flagged_out_of_catalog": rate(
            sum(
                r.get("catalog_assessment") == "out_of_catalog_suspected"
                for r in done_neg
            ),
            len(done_neg),
        ),
        "provider_errors": rate(
            sum(r["status"] != "completed" for r in rows), len(rows)
        ),
    }


def paired(a: list[dict], b: list[dict]) -> dict:
    """Per-image comparison of two strategies on identical cases."""
    by_b = {r["image_id"]: r for r in b}
    both = [(r, by_b[r["image_id"]]) for r in a if r["image_id"] in by_b]

    def ok(r):  # correct outcome: accept the right species, or never accept a negative
        return not r["accepted"] if r["negative"] else r["accepted"] == r["label"]

    return {
        "n": len(both),
        "both_correct": sum(ok(x) and ok(y) for x, y in both),
        "only_first": sum(ok(x) and not ok(y) for x, y in both),
        "only_second": sum(ok(y) and not ok(x) for x, y in both),
        "both_wrong": sum(not ok(x) and not ok(y) for x, y in both),
    }


def exclusions(dev_cases: list[dict]) -> dict:
    return {
        "image_ids": {c["image_id"] for c in dev_cases},
        "occurrences": {
            c["occurrence_id"] for c in dev_cases if c.get("occurrence_id")
        },
        "groups": {
            c["individual_group"] for c in dev_cases if c.get("individual_group")
        },
        "acquisition": {
            c["acquisition_group"] for c in dev_cases if c.get("acquisition_group")
        },
        "phash": [c["perceptual_hash"] for c in dev_cases if c.get("perceptual_hash")],
    }


def leaks(record: dict, excluded: dict) -> bool:
    return (
        record["image_id"] in excluded["image_ids"]
        or record.get("occurrence_id") in excluded["occurrences"]
        or record.get("individual_group") in excluded["groups"]
        or (
            record.get("acquisition_group")
            and record["acquisition_group"] in excluded["acquisition"]
        )
        or any(
            record.get("perceptual_hash")
            and registry.hamming(record["perceptual_hash"], h) <= 6
            for h in excluded["phash"]
        )
    )


def freeze(cases: list[dict]) -> str:
    """Stable hash of the evaluation set identity; recorded before running."""
    keys = sorted((c["image_id"], c["species_id"], c["sha256"]) for c in cases)
    return hashlib.sha256(json.dumps(keys).encode()).hexdigest()


def label_of(name: str) -> str:
    return name.lower().replace(" ", "-")


def negative_pool(
    name: str, key: str | None, excluded: dict, per_taxon: int
) -> list[dict]:
    """Pl@ntNet verified observations first (one photo each), then Commons files."""
    label = label_of(name)
    key = key or registry.resolve(name)["accepted_key"]
    picked, seen = [], set()
    for r in registry.plantnet_records(label, key, 25):
        if len(picked) == per_taxon:
            break
        if (
            r["external_processing_allowed"]
            and r["occurrence_id"] not in seen
            and not leaks(r, excluded)
        ):
            seen.add(r["occurrence_id"])
            picked.append(r)
    if len(picked) < per_taxon:
        pages = registry.commons_files(
            "https://commons.wikimedia.org/wiki/Category:" + name.replace(" ", "_")
        )
        groups = set()
        for r in (registry.commons_record(label, p) for p in pages):
            if len(picked) == per_taxon:
                break
            group = r["acquisition_group"] or r["image_id"]
            if (
                r["external_processing_allowed"]
                and r["author"]
                and group not in groups
                and not leaks(r, excluded)
            ):
                groups.add(group)
                picked.append(r)
    for r in picked:
        r["negative"] = True
        r["negative_kind"] = "hard" if name in HARD_NEGATIVES else "general"
    return picked


def positive_pool(manifest: list[dict], excluded: dict, per_species: int) -> list[dict]:
    remaining = [
        r
        for r in manifest
        if r["human_label_status"] == "metadata_checked" and not leaks(r, excluded)
    ]
    return campaign.select(remaining, per_species)
