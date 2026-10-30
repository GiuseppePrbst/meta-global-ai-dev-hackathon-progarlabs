"""Botanical exploration with Muse Spark on licensed third-party photos.

Labels are platform labels (Pl@ntNet community / Commons category) plus an agent
visual check: results are `weakly_labeled_exploration`, never a validated benchmark.
Originals stay OUTSIDE Git; the published summary holds IDs, licenses and scores.
Reuses MuseSparkAdapter/SAMAdapter and the lab ledger; no second classifier.
"""

import asyncio
import hashlib
import json
from pathlib import Path
from time import perf_counter

from evaluations import botanical_registry as registry

NEGATIVES = {  # label -> COL XR key (resolved by the registry); not catalog species
    "laurelia-sempervirens": "3SMFQ",
    "nothofagus-antarctica": "47SYY",
    "nothofagus-nitida": "47T24",
    "saxegothaea-conspicua": "79QZ2",
    "podocarpus-salignus": "4KQ6P",
    "prumnopitys-andina": "4N89W",
}


def select(records: list[dict], per_species: int = 5) -> list[dict]:
    """Pl@ntNet first (source-declared organ), distinct groups, varied organs."""
    chosen = []
    for species in sorted({r["species_id"] for r in records}):
        pool = [
            r
            for r in records
            if r["species_id"] == species
            and r["human_label_status"] == "metadata_checked"
        ]
        pool.sort(
            key=lambda r: (
                r["source_dataset"] != "plantnet_verified_gbif",
                r["image_id"],
            )
        )
        picked, groups, organs = [], set(), set()
        for prefer_new_organ in (True, False):
            for r in pool:
                if len(picked) == per_species:
                    break
                if r in picked or r["individual_group"] in groups:
                    continue
                if prefer_new_organ and r["organ"] in organs:
                    continue
                picked.append(r)
                groups.add(r["individual_group"])
                organs.add(r["organ"])
        chosen += picked
    return chosen


def original_url(record: dict) -> str:
    if record["source_dataset"] == "plantnet_verified_gbif":
        return record["media_url"]
    # Commons: description page -> original file via Special:FilePath (no signature).
    name = record["media_url"].rsplit("/wiki/", 1)[1]
    return "https://commons.wikimedia.org/wiki/Special:FilePath/" + name.removeprefix(
        "File:"
    )


def download(record: dict, folder: Path) -> dict:
    from io import BytesIO

    from PIL import Image

    target = folder / (
        hashlib.sha256(record["image_id"].encode()).hexdigest()[:24] + ".jpg"
    )
    if not target.is_file():
        content = registry.get(original_url(record), raw=True)
        with Image.open(BytesIO(content)) as image:
            image.thumbnail((2048, 2048))  # keeps prepare_image under its pixel limits
            image.convert("RGB").save(target, quality=92)
    data = target.read_bytes()
    return {"file": target.name, "sha256": hashlib.sha256(data).hexdigest()}


async def identify(
    adapter, image: bytes, catalog, knowledge=None, extra=None, views=None
):
    started = perf_counter()
    result = await adapter.identify(
        image,
        "image/jpeg",
        catalog,
        knowledge=knowledge,
        additional_images=extra,
        views=views,
    )
    return result, (perf_counter() - started) * 1000


def score(cases: list[dict]) -> dict:
    """Exploratory agreement with platform labels; denominators explicit."""

    def block(items):
        catalog = [c for c in items if not c["negative"]]
        negatives = [c for c in items if c["negative"]]
        ok = [c for c in catalog if c["status"] == "completed"]
        top1 = sum(
            bool(c["candidates"]) and c["candidates"][0] == c["label"] for c in ok
        )
        top3 = sum(c["label"] in c["candidates"] for c in ok)
        return {
            "catalog_cases": len(catalog),
            "completed": len(ok),
            "top1_agreement": top1 / len(ok) if ok else None,
            "top3_agreement": top3 / len(ok) if ok else None,
            "abstentions": sum(not c["candidates"] for c in ok),
            "negative_cases": len(negatives),
            "negatives_with_catalog_candidate": sum(
                bool(c["candidates"]) for c in negatives if c["status"] == "completed"
            ),
            "provider_errors": sum(c["status"] != "completed" for c in items),
        }

    by_species = {}
    for c in cases:
        by_species.setdefault(c["label"], []).append(c)
    by_organ = {}
    for c in cases:
        by_organ.setdefault(c["organ"], []).append(c)
    return {
        "label_status": "weakly_labeled_exploration",
        "overall": block(cases),
        "by_species": {k: block(v) for k, v in sorted(by_species.items())},
        "by_organ": {k: block(v) for k, v in sorted(by_organ.items())},
    }


def knowledge_from_catalog(species) -> dict:
    """Same evidence block the API sends to Muse (experiment D)."""
    return {
        s.id: {
            "accepted_name": s.accepted_name,
            "synonyms": s.synonyms,
            "source_checked_morphology": s.morphology
            if s.trait_validation_status != "pending"
            else [],
            "trait_validation_status": s.trait_validation_status,
            "trait_sources": s.trait_sources,
        }
        for s in species
    }


def load(path: Path) -> list[dict]:
    return json.loads(path.read_text(encoding="utf-8"))["records"]


async def run_cases(cases, experiment: str, cfg: Path, images: Path, output: Path):
    """One Muse identification per case (B: SAM concept crop first). Private output."""
    from bosque_ai.meta import (
        MetaAPIError,
        MetaResponsesClient,
        MuseSparkAdapter,
        SAMAdapter,
    )
    from bosque_ai.segmentation import SegmentationRequest
    from bosque_api.catalog import get_species
    from bosque_api.execution import ExecutionStore
    from bosque_api.images import prepare_image, segment_image
    from PIL import Image

    from tools.meta_sam_api_lab.lab import (
        admit_phase,
        campaign_from_private,
        config_from_private,
    )

    config, campaign = config_from_private(cfg), campaign_from_private(cfg)
    species = get_species()
    catalog = {s.id: s.scientific_name for s in species}
    knowledge = knowledge_from_catalog(species) if experiment == "D" else None
    ledger = ExecutionStore(config)
    client = MetaResponsesClient(config.model_api_key, config.meta_timeout_seconds)
    adapter = MuseSparkAdapter(client)
    results = []
    for case in cases:
        owner = await asyncio.to_thread(
            admit_phase, config, "C", campaign.phase_caps_usd["C"]
        )
        reservation = await asyncio.to_thread(ledger.reserve, owner, "identify")
        client.usage.clear()
        status, row = "provider_error", {}
        started = perf_counter()
        try:
            image = prepare_image((images / case["file"]).read_bytes(), "image/jpeg")
            extra = [
                (prepare_image((images / f).read_bytes(), "image/jpeg"), "image/jpeg")
                for f in case.get("extra_files", [])
            ]
            if experiment == "B":
                with Image.open(__import__("io").BytesIO(image)) as decoded:
                    width, height = decoded.size
                seg = await SAMAdapter(client).segment_typed(
                    image, "image/jpeg", SegmentationRequest(width=width, height=height)
                )
                row["segmentation_status"] = seg.status
                try:
                    image = segment_image(image, seg)
                except (ValueError, OSError):
                    row["segmentation_status"] = "error"
            ident = await adapter.identify(
                image,
                "image/jpeg",
                catalog,
                knowledge=knowledge,
                additional_images=extra or None,
                views=case.get("views"),
            )
            status = "completed"
            row.update(
                candidates=[c.species_id for c in ident.candidates],
                identification=ident.model_dump(mode="json"),
            )
        except MetaAPIError:
            row["candidates"] = []
        finally:
            usage = client.usage.copy()
            model = "sam-3.1+muse-spark-1.3" if experiment == "B" else "muse-spark-1.3"
            await asyncio.to_thread(
                ledger.finish,
                reservation,
                status,
                {"model": model, "usage": usage, "experiment": experiment},
            )
        results.append(
            {
                "image_id": case["image_id"],
                "label": case["species_id"],
                "negative": bool(case.get("negative")),
                "organ": case["organ"],
                "experiment": experiment,
                "status": status,
                "latency_ms": round((perf_counter() - started) * 1000),
                "usage": usage,
                **row,
            }
        )
        output.write_text(
            json.dumps(results, indent=1, ensure_ascii=False), encoding="utf-8"
        )
        await asyncio.sleep(1)
    return results
