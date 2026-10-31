"""Auditable catalog prioritization (A6). Eligibility gates first, then weights.

Inputs are versioned: taxa.json, conservation.json, media-availability.json and
puyehue-gbif-occurrences.json. A threatened category never adds points (only
whether an RCE record exists), and a taxon without processable media cannot be
selected for recognition whatever its score. Output: catalog-prioritization.json.
"""

import json
from pathlib import Path

from bosque_api.biodiversity import get_conservation, get_taxa

HERE = Path(__file__).parent / "biodiversity"
WEIGHTS = {
    "park_presence": 0.25,
    "reusable_media": 0.25,
    "visual_diversity_and_traits": 0.15,
    "responsible_education": 0.15,
    "source_quality": 0.10,
    "conservation_information": 0.10,
}
PRESENCE = {"documented_in_park": 1.0, "regional_candidate": 0.4, "not_assessed": 0.0}
# Sparse taxa outside the media registry: probe of 31-10-2026 (GBIF, Chile).
PROBE = {"boletus-chilensis": 0, "amanita-gayana": 0}
MIN_MEDIA = 20  # processable photos needed before a recognition benchmark


def score(taxon, availability: dict, rce: set[str], occurrences: dict) -> dict:
    row = availability.get(taxon.id, {})
    processable = row.get("processable_license", PROBE.get(taxon.id, 0))
    observations = row.get("selected_observations", 0)
    gates = {
        "taxonomy_resolvable": taxon.taxonomy.status != "unresolved",
        "sources_identified": bool(taxon.profile.sources) or taxon.id in rce,
        "processing_rights_checked": processable > 0,
        "presence_declared": True,  # puyehue_status is mandatory in the model
        "privacy_assessed": True,  # sensitivity is mandatory in the model
    }
    parts = {
        "park_presence": PRESENCE[taxon.puyehue_status],
        "reusable_media": min(processable, 100) / 100,
        "visual_diversity_and_traits": 0.5 * min(observations / 20, 1)
        + 0.5 * (len(taxon.profile.traits) >= 2),
        "responsible_education": 1.0 if taxon.sensitivity == "none" else 0.4,
        "source_quality": (
            {"source_checked": 1.0, "name_discrepancy": 0.7, "unresolved": 0.0}[
                taxon.taxonomy.status
            ]
            + (1.0 if taxon.profile.review_status == "draft_sourced" else 0.5)
        )
        / 2,
        "conservation_information": 1.0 if taxon.id in rce else 0.5,
    }
    total = round(sum(WEIGHTS[k] * v for k, v in parts.items()), 3)
    eligible = all(gates.values())
    if not eligible:
        decision = "knowledge_only: " + ", ".join(k for k, v in gates.items() if not v)
    elif taxon.group == "mammal" and taxon.sensitivity == "location_sensitive":
        decision = "knowledge_only: sensitive mammal; recognition would reward searching it"
    elif processable < MIN_MEDIA:
        decision = f"knowledge_only: fewer than {MIN_MEDIA} processable photos"
    else:
        decision = "recognition_benchmark"
    return {
        "taxon_id": taxon.id,
        "kingdom": taxon.classification.kingdom,
        "group": taxon.group,
        "gates": gates,
        "eligible": eligible,
        "components": {k: round(v, 3) for k, v in parts.items()},
        "score": total,
        "decision": decision,
        "processable_media_seen": processable,
        "candidates_seen": row.get("candidates_seen"),
        "selected_observations": observations,
        "media_rejected_by_license": row.get("rejected_by_license"),
        "record_cc_but_media_restricted": row.get("record_cc_but_media_restricted"),
        "gbif_in_bcn_polygon_passing_filters": occurrences.get(taxon.id),
        "puyehue_status": taxon.puyehue_status,
        "sensitivity": taxon.sensitivity,
    }


def main():
    availability = {
        t["label"]: t
        for t in json.loads((HERE / "media-availability.json").read_text("utf-8"))["taxa"]
    }
    occurrences = {
        t["label"]: t.get("records_passing_filters")
        for t in json.loads((HERE / "puyehue-gbif-occurrences.json").read_text("utf-8"))[
            "taxa"
        ]
    }
    rce = {a.taxon_id for a in get_conservation().assessments}
    rows = sorted(
        (score(t, availability, rce, occurrences) for t in get_taxa()),
        key=lambda r: -r["score"],
    )
    data = {
        "computed_at": "2026-10-31",
        "weights": WEIGHTS,
        "rules": [
            "Gates before weights: no rights, no resolvable taxonomy or no sources -> "
            "knowledge only, whatever the score.",
            "RCE category never adds points; only the existence of a record does.",
            "Location-sensitive taxa score lower in responsible education; sensitive "
            "mammals stay knowledge-only (used only as out-of-catalog negatives).",
            f"Recognition benchmark needs >= {MIN_MEDIA} processable photos.",
        ],
        "taxa": rows,
    }
    (HERE / "catalog-prioritization.json").write_text(
        json.dumps(data, indent=1, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    for r in rows:
        print(f"{r['score']:.3f} {r['taxon_id']:28} {r['decision']}")


if __name__ == "__main__":
    main()
