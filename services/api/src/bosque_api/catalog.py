import json
from functools import lru_cache
from importlib.resources import files

from pydantic import TypeAdapter

from bosque_api.models import Species


@lru_cache
def get_species() -> tuple[Species, ...]:
    content = files("bosque_api").joinpath("resources/species.json").read_text(encoding="utf-8")
    species = TypeAdapter(list[Species]).validate_python(json.loads(content))
    if len({item.id for item in species}) != len(species):
        raise ValueError("Catálogo tiene identificadores duplicados")
    names = [item.accepted_name or item.scientific_name for item in species]
    if len(set(names)) != len(names):
        raise ValueError("Catálogo tiene taxones duplicados")
    return tuple(species)
