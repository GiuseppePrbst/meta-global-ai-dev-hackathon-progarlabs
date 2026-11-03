"""Pruebas offline: parser CONAF sin llamadas de red ni inferencia."""
import importlib.util
from pathlib import Path

import pytest

pytest.importorskip("requests")
pytest.importorskip("bs4")

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("sync_conaf_parks", ROOT / "scripts/sync_conaf_parks.py")
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

HTML = """
<html><body><h2>Parque Nacional de prueba</h2>
<table><tr><td>Superficie (ha)</td><td>1.200</td></tr>
<tr><td>Senderos habilitados</td><td>
Sendero Los Colonos Longitud: 350 m. Duración del recorrido: 20 minutos.
Dificultad de caminata: fácil.
Sendero Travesía Río Blanco Longitud: 3,74 km.
Duración del trayecto (ida): 8 horas. Dificultad de caminata: muy difícil.
Sendero universal Huellas Longitud: 40 m. Duración total del recorrido: 10 minutos.
Dificultad de caminata: fácil.
</td></tr></table></body></html>
"""


def test_parse_source_table():
    rows = module.park_table(HTML)
    assert rows["superficie (ha)"] == "1.200"
    assert "Sendero Los Colonos" in rows["senderos habilitados"]


def test_trails_metric_units_and_direction():
    rows = module.park_table(HTML)
    items = module.parse_trails("mock-park", rows["senderos habilitados"],
                                "https://www.conaf.cl/parque_nacionales/parque-nacional-mock/")
    assert len(items) == 3
    assert items[0]["distance_m"] == 350
    assert items[0]["duration_minutes"] == 20
    assert items[1]["distance_m"] == 3740
    assert items[1]["duration_minutes"] == 480
    assert items[1]["duration_basis"] == "one_way"
    assert items[2]["distance_m"] == 40
    assert all(x["geometry"] is None for x in items)


def test_unknown_or_unlisted_trails_are_not_invented():
    assert module.parse_trails("none", None, "https://www.conaf.cl/") == []
    assert module.parse_trails("none", "Senderos a revisar", "https://www.conaf.cl/") == []


def test_source_allowlist():
    import pytest
    module.official_url("https://www.conaf.cl/parque_nacionales/parque-nacional-puyehue/")
    with pytest.raises(ValueError):
        module.official_url("https://evil.example.com/parque_nacionales/a/")
    with pytest.raises(ValueError):
        module.official_url("http://www.conaf.cl/parque_nacionales/a/")


def test_parse_duration_range_preserves_uncertainty():
    value, text = module.duration_minutes("Duración total del recorrido: 5 a 6 horas.")
    assert value is None and text == "5 a 6 horas"
