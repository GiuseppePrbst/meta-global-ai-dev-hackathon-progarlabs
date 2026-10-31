import json

import pytest
from bosque_ai.meta import MetaAPIError
from bosque_ai.multikingdom import identify_organism, prompt_for

CATALOG = {
    "pteroptochos-tarnii": "Pteroptochos tarnii",
    "troglodytes-aedon": "Troglodytes aedon",
}


class FakeClient:
    def __init__(self, answer):
        self.answer, self.usage, self.prompts = answer, {"prompt_tokens": 10}, []

    async def output_text(self, model, prompt, image, content_type, **kw):
        self.prompts.append(prompt)
        return json.dumps(self.answer)


def answer(candidates, assessment, traits=("cola levantada",), contradictory=()):
    return {
        "candidates": [
            {
                "species_id": c,
                "evidence": "rasgo visible",
                "contradictory_evidence": list(contradictory),
            }
            for c in candidates
        ],
        "limitations": [],
        "message": "ok",
        "observed_traits": list(traits),
        "missing_traits": [],
        "recommended_next_photo": None,
        "catalog_assessment": assessment,
        "similar_out_of_catalog": [],
    }


async def run(data, **kw):
    client = FakeClient(data)
    result = await identify_organism(
        client, "muse-spark-1.3", "fauna", b"x", "image/jpeg", CATALOG, **kw
    )
    return result, client


async def test_supported_candidate_is_accepted_with_versioned_prompt():
    result, _ = await run(answer(["pteroptochos-tarnii"], "supported_candidate"))
    assert result.accepted_species_id == "pteroptochos-tarnii"
    assert result.prompt_version == "fauna-open-set-candidates-v1"
    assert result.strategy == "fauna-candidates"


@pytest.mark.parametrize(
    "data",
    [
        answer(
            ["pteroptochos-tarnii"], "out_of_catalog_suspected"
        ),  # similar external species
        answer(
            ["pteroptochos-tarnii"], "non_diagnostic_photo"
        ),  # blurred / no organism
        answer(
            ["pteroptochos-tarnii"], "supported_candidate", traits=()
        ),  # incomplete answer
        answer(
            ["pteroptochos-tarnii"], "supported_candidate", contradictory=["pecho rufo"]
        ),
        answer([], "out_of_catalog_suspected"),  # other kingdom
    ],
)
async def test_abstention_paths_never_accept(data):
    result, _ = await run(data)
    assert result.acceptance == "not_accepted" and result.accepted_species_id is None
    assert result.candidates == []


async def test_taxon_outside_catalog_fails_explicitly():
    with pytest.raises(MetaAPIError):
        await run(answer(["puma-concolor"], "supported_candidate"))


async def test_invalid_response_fails_explicitly():
    with pytest.raises(MetaAPIError):
        await run({"candidates": "nope"})


def test_fungi_prompt_forbids_consumption_and_knowledge_adds_sourced_traits():
    text = prompt_for("fungi", {"cyttaria-hariotii": "Cyttaria hariotii"}, "candidates")
    assert "No hables de consumo, comestibilidad" in text
    rich = prompt_for(
        "fauna",
        CATALOG,
        "knowledge",
        knowledge={"pteroptochos-tarnii": ["garganta oscura"]},
        comparators=[
            {
                "scientific_name": "Scelorchilus rubecula",
                "confused_with": ["pteroptochos-tarnii"],
                "diagnostic_traits": ["vientre barrado"],
            }
        ],
    )
    assert "garganta oscura" in rich and "Scelorchilus rubecula" in rich
    with pytest.raises(ValueError):
        prompt_for("flora", CATALOG, "candidates")  # trees keep the production pipeline
