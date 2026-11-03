"""Pruebas offline: parser CONAF sin llamadas de red ni inferencia (unittest y pytest)."""
import importlib.util
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / "data/public/conaf"

try:
    import bs4  # noqa: F401
    import requests  # noqa: F401
except ImportError:
    module = None
else:
    spec = importlib.util.spec_from_file_location("sync_conaf_parks", ROOT / "scripts/sync_conaf_parks.py")
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

REAL_LAYOUTS = (
    "Región de La Araucanía Sendero Pichillancahue ➔ cerrado desde el 25 de julio al 31 de "
    "diciembre de 2026 , inclusive. Longitud: 3,8 km. Duración del trayecto (ida): 2 horas. "
    "Dificultad de caminata: exigente. Sector Jeinimeni Sendero Escorial El Silencio Longitud: "
    "2,6 km. Duración total del recorrido: 2 horas y media. Dificulta de caminata: fácil "
    "Riesgos del sector: puma. El sendero cierra desde junio a septiembre. Ruta Valle Los "
    "Glaciares Longitud: 50 km. Duración total del recorrido: 4 a 5 días. Sendero Alerce "
    "Milenario (sector Mirador) Longitud: 2,4 km. Duración total del recorrido: 1 hora (de ida)."
)
URL = "https://www.conaf.cl/parque_nacionales/parque-nacional-mock/"


@unittest.skipIf(module is None, "requiere requests y beautifulsoup4")
class ParserTest(unittest.TestCase):
    def test_parse_source_table(self):
        rows = module.park_table(HTML)
        self.assertEqual(rows["superficie (ha)"], "1.200")
        self.assertIn("Sendero Los Colonos", rows["senderos habilitados"])

    def test_trails_metric_units_and_direction(self):
        items = module.parse_trails("mock-park", module.park_table(HTML)["senderos habilitados"], URL)
        self.assertEqual(len(items), 3)
        self.assertEqual((items[0]["distance_m"], items[0]["duration_minutes"]), (350, 20))
        self.assertEqual((items[1]["distance_m"], items[1]["duration_minutes"]), (3740, 480))
        self.assertEqual(items[1]["duration_basis"], "one_way")
        self.assertEqual(items[2]["distance_m"], 40)
        self.assertTrue(all(x["geometry"] is None for x in items))

    def test_unknown_or_unlisted_trails_are_not_invented(self):
        self.assertEqual(module.parse_trails("none", None, URL), [])
        self.assertEqual(module.parse_trails("none", "Senderos a revisar", URL), [])

    def test_source_allowlist(self):
        module.official_url("https://www.conaf.cl/parque_nacionales/parque-nacional-puyehue/")
        for bad in ("https://evil.example.com/parque_nacionales/a/", "http://www.conaf.cl/parque_nacionales/a/"):
            with self.assertRaises(ValueError):
                module.official_url(bad)

    def test_parse_duration_range_preserves_uncertainty(self):
        value, text = module.duration_minutes("Duración total del recorrido: 5 a 6 horas.")
        self.assertIsNone(value)
        self.assertEqual(text, "5 a 6 horas")

    def test_real_layout_variants(self):
        by = {t["name"]: t for t in module.parse_trails("p", REAL_LAYOUTS, URL)}
        self.assertEqual(list(by), [
            "Sendero Pichillancahue", "Sendero Escorial El Silencio",
            "Ruta Valle Los Glaciares", "Sendero Alerce Milenario",
        ])
        closed = by["Sendero Pichillancahue"]
        self.assertEqual(closed["opening_status"], "published_closure")
        self.assertTrue(closed["published_closure"].startswith("cerrado desde el 25 de julio"))
        self.assertEqual((closed["region_label"], closed["duration_basis"]), ("La Araucanía", "one_way"))
        escorial = by["Sendero Escorial El Silencio"]
        self.assertEqual((escorial["sector"], escorial["duration_minutes"]), ("Jeinimeni", 150))
        self.assertEqual((escorial["difficulty"], escorial["risks"]), ("fácil", "puma"))
        self.assertEqual(escorial["conditions"], ["El sendero cierra desde junio a septiembre"])
        self.assertEqual(escorial["opening_status"], "not_verified")
        ruta = by["Ruta Valle Los Glaciares"]
        self.assertEqual(ruta["sector"], "Jeinimeni")
        self.assertIsNone(ruta["duration_minutes"])
        self.assertEqual((ruta["duration_min_minutes"], ruta["duration_max_minutes"]), (5760, 7200))
        alerce = by["Sendero Alerce Milenario"]
        self.assertEqual((alerce["sector"], alerce["duration_basis"]), ("Mirador", "one_way"))

    def test_contact_data_is_scrubbed(self):
        text = module.scrub("Escribir a nombre.apellido@conaf.cl o al +56 9 93266653.")
        self.assertNotIn("@", text)
        self.assertNotIn("93266653", text)

    def test_review_resets_when_page_changes(self):
        trails = [{"park_id": "p", "review_status": "parsed_unreviewed"}]
        review = {"reviewer": "r", "reviewed_at": "2026-11-03", "parks": {"p": {"source_sha256_html": "a"}}}
        module.apply_review([{"park_id": "p", "source_sha256_html": "b"}], trails, review)
        self.assertEqual(trails[0]["review_status"], "parsed_unreviewed")
        module.apply_review([{"park_id": "p", "source_sha256_html": "a"}], trails, review)
        self.assertEqual(trails[0]["review_status"], "agent_reviewed_against_source")

    def test_species_names_only(self):
        names = module.species_mentions("bosque de ulmo (Eucryphia cordifolia) y coigüe (Nothofagus dombeyi)")
        self.assertEqual(names, ["Eucryphia cordifolia", "Nothofagus dombeyi"])


class SnapshotTest(unittest.TestCase):
    """Published files only; runs without third-party packages."""

    def load(self, name):
        return json.loads((BASE / name).read_text(encoding="utf-8"))

    def test_published_snapshot_is_consistent(self):
        parks = self.load("parks.json")["parks"]
        profiles = self.load("park_profiles_synced.json")["parks"]
        trails = self.load("trails_synced.json")["trails"]
        self.assertEqual({p["id"] for p in parks}, {p["park_id"] for p in profiles})
        self.assertTrue(all(p["source_status"] == "retrieved" for p in profiles))
        for p in profiles:
            self.assertEqual(p.get("trails_label_count", 0), p["trails_extracted"], p["park_id"])
        self.assertTrue(all(t["geometry"] is None and t["opening_status"] != "open" for t in trails))
        self.assertEqual(len({t["id"] for t in trails}), len(trails))
        self.assertNotIn("@", (BASE / "park_profiles_synced.json").read_text(encoding="utf-8"))

    def test_secondary_never_overrides_official(self):
        doc = self.load("secondary_sources.json")
        area = next(c for c in doc["conflicts"] if c["id"] == "puyehue-area-ha")
        self.assertEqual((area["official"]["value"], area["resolution"]), (112755, "official_preferred"))
        self.assertTrue(all(c["decision"] == "candidate_not_official" for c in doc["trail_candidates"]))
        bbox = self.load("park_bbox_bcn.json")["parks"]["puyehue"]["bbox"]
        self.assertTrue(-73 < bbox[0] < bbox[2] < -71 and -41 < bbox[1] < bbox[3] < -40)


if __name__ == "__main__":
    unittest.main()
