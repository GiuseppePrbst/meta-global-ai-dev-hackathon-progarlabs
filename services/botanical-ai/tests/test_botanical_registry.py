"""Botanical registry and organ breakdown: synthetic responses, no network."""

import json
import sys
from pathlib import Path

import pytest
from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).parents[3]))
from bosque_ai.contracts import Identification
from bosque_ai.evaluation import EvaluationCase, EvaluationResult, summarize

from evaluations import botanical_registry as registry

ROOT = Path(__file__).parents[3]


@pytest.mark.parametrize(
    ("text", "allowed", "redistribution", "reason"),
    [
        ("CC BY-SA 4.0", True, "share_alike_with_attribution", None),
        ("cc-by-sa", True, "share_alike_with_attribution", None),
        ("CC BY 4.0", True, "with_attribution", None),
        ("CC0", True, "yes", None),
        ("Public domain", True, "yes", None),
        ("CC BY-NC 4.0", False, "no", "non_commercial"),
        ("CC_BY_NC_4_0", False, "no", "non_commercial"),
        ("CC BY-ND 4.0", False, "no", "no_derivatives"),
        ("GFDL", False, "no", "gfdl_only"),
        ("All rights reserved", False, "no", "license_unrecognized"),
        (None, False, "no", "license_missing"),
    ],
)
def test_license_policy_is_per_media_and_conservative(
    text, allowed, redistribution, reason
):
    policy = registry.license_policy(text)
    assert policy["external_processing_allowed"] is allowed
    assert policy["redistribution_allowed"] == redistribution
    assert policy["reason"] == reason


def col(**overrides):
    base = {
        "key": "K1",
        "canonical": "Nothofagus dombeyi",
        "authorship": "(Mirb.) Blume",
        "match_type": "EXACT",
        "synonym": False,
        "accepted_key": "K1",
    }
    return base | overrides


def test_crosswalk_status_separates_authorship_synonyms_and_collisions():
    legacy = {"canonicalName": "Nothofagus dombeyi", "authorship": "(Mirb.) Oerst."}
    assert (
        registry.crosswalk_status(legacy, col(), []) == "exact_name_authorship_differs"
    )
    legacy["authorship"] = "(Mirb.) Blume"
    assert registry.crosswalk_status(legacy, col(), [col(accepted_key="K1")]) == "exact"
    assert (
        registry.crosswalk_status(legacy, col(synonym=True), []) == "synonym_in_col_xr"
    )
    assert (
        registry.crosswalk_status(legacy, col(), [col(accepted_key="OTHER")])
        == "synonym_collision"
    )
    assert registry.crosswalk_status(legacy, col(match_type="NONE"), []) == "unresolved"
    genus_only = col(match_type="HIGHERRANK", accepted_key="GENUS")
    assert registry.crosswalk_status(legacy, col(), [genus_only]) == "exact"
    assert registry.collisions(col(), [genus_only, col(accepted_key="X")]) == [
        col(accepted_key="X")
    ]
    assert (
        registry.crosswalk_status({"canonicalName": "X y"}, col(), []) == "name_differs"
    )


def test_plantnet_media_license_differs_from_record_and_organ_comes_from_source(
    monkeypatch,
):
    response = {
        "results": [
            {
                "key": 1,
                "countryCode": "CL",
                "license": "http://creativecommons.org/licenses/by/4.0/legalcode",
                "media": [
                    {
                        "type": "StillImage",
                        "title": "Synthetic species: leaf",
                        "license": "someone (cc-by-sa)",
                        "creator": "someone",
                        "identifier": "https://example.invalid/a",
                    },
                    {
                        "type": "StillImage",
                        "title": "Synthetic species",
                        "license": "someone (cc-by-nc)",
                        "creator": "someone",
                        "identifier": "https://example.invalid/b",
                    },
                ],
            }
        ]
    }
    monkeypatch.setattr(registry, "get", lambda *a, **k: response)
    leaf, other = registry.plantnet_records("synthetic", "K1", 5)
    assert leaf["license"] == "cc-by-sa" and leaf["record_license"].endswith(
        "by/4.0/legalcode"
    )
    assert (
        leaf["organ"] == "leaf"
        and leaf["organ_provenance"] == "plantnet_media_title:leaf"
    )
    assert other["organ"] == "unknown" and other["external_processing_allowed"] is False
    assert leaf["occurrence_id"] == other["occurrence_id"] == "1"


def test_commons_record_never_infers_organ_from_filename():
    page = {
        "pageid": 7,
        "title": "File:Synthetic leaf bark flower.jpg",
        "imageinfo": [
            {
                "descriptionurl": "https://commons.wikimedia.org/wiki/File:x.jpg",
                "thumburl": None,
                "sha1": "a" * 40,
                "extmetadata": {
                    "LicenseShortName": {"value": "CC BY-SA 4.0"},
                    "Artist": {"value": "<a href='x'>Synthetic Author</a>"},
                    "DateTimeOriginal": {"value": "2020-01-02 10:00"},
                },
            }
        ],
    }
    record = registry.commons_record("synthetic", page)
    assert record["organ"] == "unknown" and record["author"] == "Synthetic Author"
    assert record["acquisition_group"] == "commons:Synthetic Author|2020-01-02"
    assert record["label_source"] == "commons_category_membership"


def synthetic_image(seed: int):
    image = Image.new("L", (64, 64), 0)
    ImageDraw.Draw(image).rectangle((seed, 8, seed + 20, 40), fill=255)
    return image


def test_dhash_groups_near_duplicates_and_splits_never_leak():
    base = synthetic_image(4)
    resized = base.resize((48, 48))
    other = synthetic_image(40)
    assert registry.hamming(registry.dhash(base), registry.dhash(resized)) <= 6
    assert registry.hamming(registry.dhash(base), registry.dhash(other)) > 6
    records = [
        {"image_id": "a", "perceptual_hash": registry.dhash(base)},
        {"image_id": "b", "perceptual_hash": registry.dhash(resized)},
        {
            "image_id": "c",
            "perceptual_hash": registry.dhash(other),
            "occurrence_id": "9",
        },
        {"image_id": "d", "occurrence_id": "9"},  # same observation, no hash
        {"image_id": "e", "acquisition_group": "commons:x|2020-01-01"},
        {"image_id": "f", "acquisition_group": "commons:x|2020-01-01"},
        {"image_id": "g", "source_sha1": "s"},
        {"image_id": "h", "source_sha1": "s"},
    ]
    registry.assign_groups(records)
    groups = {}
    for record in records:
        groups.setdefault(record["individual_group"], set()).add(record["split"])
    assert all(len(splits) == 1 for splits in groups.values())
    by_id = {r["image_id"]: r for r in records}
    for a, b in ["ab", "cd", "ef", "gh"]:
        assert by_id[a]["individual_group"] == by_id[b]["individual_group"]
    # Same group is not the same as a copy: only exact/perceptual matches are duplicates.
    assert [k for k, r in by_id.items() if r["possible_duplicate"]] == [
        "a",
        "b",
        "g",
        "h",
    ]
    again = [dict(r) for r in records]
    registry.assign_groups(again)
    assert [r["split"] for r in again] == [r["split"] for r in records]  # reproducible


def test_finalize_never_claims_human_review_and_rejects_incomplete():
    taxon = {"col_xr": {"accepted_key": "K1"}}
    ok = {
        "media_url": "u",
        "author": "x",
        "species_id": "s",
        **registry.license_policy("CC BY 4.0"),
    }
    nc = {
        "media_url": "u",
        "author": "x",
        "species_id": "s",
        **registry.license_policy("CC BY-NC"),
    }
    anonymous = {
        "media_url": "u",
        "author": None,
        "species_id": "s",
        **registry.license_policy("CC0"),
    }
    assert registry.finalize(ok, taxon)["human_label_status"] == "metadata_checked"
    assert registry.finalize(nc, taxon)["rejection_reason"] == "non_commercial"
    assert registry.finalize(anonymous, taxon)["rejection_reason"] == "missing:author"
    assert ok["reviewer"] is None and ok["taxonomy_checklist"] == registry.COL_XR


def test_published_manifest_is_consistent_when_present():
    path = ROOT / "evaluations/botanical/candidate-manifest.json"
    if not path.is_file():
        pytest.skip("registry not generated")
    data = json.loads(path.read_text(encoding="utf-8"))
    assert data["schema"] == registry.SCHEMA
    required = {
        "image_id", "species_id", "accepted_taxon_id", "taxonomy_checklist",
        "source_dataset", "occurrence_id", "media_url", "organ", "country", "license",
        "author", "external_processing_allowed", "redistribution_allowed",
        "human_label_status", "individual_group", "acquisition_group", "split", "sha256",
        "perceptual_hash", "reviewed_at", "reviewer",
    }  # fmt: skip
    groups = {}
    for record in data["records"]:
        assert required <= record.keys()
        assert record["human_label_status"] in {
            "candidate",
            "metadata_checked",
            "rejected",
        }
        assert record["organ"] in registry.ORGANS
        if record["human_label_status"] == "metadata_checked":
            assert record["external_processing_allowed"] and record["license"]
        groups.setdefault(record["individual_group"], set()).add(record["split"])
    assert all(len(splits) == 1 for splits in groups.values())


def test_summary_breaks_down_by_photographed_organ():
    def case(identifier, kind, species):
        return EvaluationCase(
            case_id=identifier,
            species_id=species,
            file=f"{identifier}.jpg",
            sha256=identifier * 64,
            license="CC-BY-4.0",
            source="synthetic",
            authorized=True,
            photo_type=kind,
            reviewer="synthetic",
            individual_id=identifier,
            partition="test",
            validation_status="validated",
        )

    def result(identifier, candidates):
        return EvaluationResult(
            case_id=identifier,
            provider="meta",
            total_latency_ms=1,
            identification=Identification(
                status="candidates" if candidates else "insufficient_evidence",
                provider="meta",
                model="synthetic",
                execution_status="completed",
                message="synthetic",
                candidates=[
                    {"species_id": s, "evidence": "synthetic"} for s in candidates
                ],
            ),
        )

    cases = [case("a", "leaf", "x"), case("b", "leaf", "x"), case("c", "bark", "x")]
    summary = summarize(
        cases, [result("a", ["x"]), result("b", ["y", "x"]), result("c", [])]
    )
    assert summary["by_photo_type"]["leaf"] == {
        "executed": 2, "evaluable": 2, "top1": 0.5, "top3": 1.0, "abstentions": 0,
    }  # fmt: skip
    assert summary["by_photo_type"]["bark"]["abstentions"] == 1
    assert summary["by_photo_type"]["bark"]["top1"] == 0
