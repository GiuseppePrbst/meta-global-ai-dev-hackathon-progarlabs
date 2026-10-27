"""Import reviewed local pilot GeoJSON atomically; never reads image URLs or credentials files."""

import argparse
import hashlib
import json
from pathlib import Path

import psycopg
from bosque_api.config import Settings
from bosque_api.context_store import ContextStore
from bosque_geo.context import ContextLayer


def run(bundle: Path, migrate: bool):
    url = Settings().database_url.get_secret_value()
    if not url:
        raise ValueError("DATABASE_URL no configurada")
    data = json.loads(bundle.read_text(encoding="utf-8"))
    prepared = []
    for item in data["layers"]:
        layer = ContextLayer.model_validate(item["layer"])
        path = (bundle.parent / item["file"]).resolve()
        if (
            not path.is_relative_to(bundle.parent.resolve())
            or path.stat().st_size > 16 * 1024**2
        ):
            raise ValueError("Ruta o tamaño de recorte no permitido")
        content = path.read_bytes()
        if hashlib.sha256(content).hexdigest() != layer.content_sha256:
            raise ValueError("Hash del recorte no coincide")
        prepared.append((layer, json.loads(content)["features"]))
    if migrate:
        sql = (
            Path(__file__).resolve().parents[1] / "services/api/sql/002_context.up.sql"
        )
        with psycopg.connect(url) as conn:
            conn.execute(sql.read_text(encoding="utf-8"))
    store = ContextStore(url)
    return {layer.id: store.ingest(layer, features) for layer, features in prepared}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("bundle", type=Path)
    parser.add_argument("--migrate", action="store_true")
    args = parser.parse_args()
    print(json.dumps(run(args.bundle, args.migrate)))
