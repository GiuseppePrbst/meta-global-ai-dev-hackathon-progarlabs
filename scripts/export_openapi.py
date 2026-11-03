#!/usr/bin/env python3
"""Export the FastAPI OpenAPI schema and contract examples deterministically.

    uv run --project services/api python scripts/export_openapi.py          # write
    uv run --project services/api python scripts/export_openapi.py --check  # CI drift check

docs/api/openapi.json and docs/api/examples/*.json are generated, never hand-edited:
FastAPI stays the single source of truth. Examples come from the real app in
local/mock mode (no network, no database), with per-request ids removed.
The one observed Meta answer lives in docs/api/examples/observed/ and is only
validated, not regenerated. TypeScript types: npx openapi-typescript docs/api/openapi.json
"""

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
API = ROOT / "docs/api"
VOLATILE = {
    "session_id",
    "correlation_id",
    "age_days",
    "stale",
}  # change per request or day
EXAMPLES = {
    "parks-los-lagos.json": ("GET", "/parks?region=los-lagos&limit=3"),
    "park-puyehue.json": ("GET", "/parks/puyehue"),
    "trails-puyehue.json": ("GET", "/parks/puyehue/trails?include_secondary=true"),
    "trail-closure.json": ("GET", "/trails/villarrica-sendero-pichillancahue"),
    "map-conguillio.json": ("GET", "/parks/conguillio/map"),
    "taxon-guigna.json": ("GET", "/taxa/leopardus-guigna"),
    "taxa-demo-only.json": ("GET", "/taxa?demo_only=true&limit=3"),
    "eligibility-guigna.json": ("GET", "/taxa/leopardus-guigna/eligibility"),
    "conservation-guigna-los-rios.json": (
        "GET",
        "/taxa/leopardus-guigna/conservation?region=los-rios",
    ),
    "knowledge-status.json": ("GET", "/knowledge/status"),
    "ask-text-mock.json": ("POST", "/guide/ask"),
    "error-ask-no-input.json": ("POST", "/guide/ask#empty"),
    "error-unauthorized.json": ("POST", "/guide/ask#noauth"),
}


def settings():
    sys.path.insert(0, str(ROOT / "services/api/src"))
    from bosque_api.config import Settings

    # Explicit values: the schema must not depend on the caller's environment or secrets.
    return Settings(
        _env_file=None,
        service_mode="local",
        ai_provider="mock",
        meta_enabled=False,
        demo_tokens={"demo": "example-token"},
    )


def strip(value):
    if isinstance(value, dict):
        return {k: strip(v) for k, v in value.items() if k not in VOLATILE}
    if isinstance(value, list):
        return [strip(v) for v in value]
    return value


def dump(value) -> str:
    return json.dumps(value, ensure_ascii=False, indent=1, sort_keys=True) + "\n"


def render() -> dict[str, str]:
    from fastapi.testclient import TestClient

    sys.path.insert(0, str(ROOT / "services/api/src"))
    from bosque_api.main import create_app

    app = create_app(settings())
    out = {"openapi.json": dump(app.openapi())}
    client = TestClient(app)
    auth = {"Authorization": "Bearer example-token"}
    for name, (method, path) in EXAMPLES.items():
        if method == "GET":
            response = client.get(path)
        elif path.endswith("#empty"):
            response = client.post(
                "/guide/ask", headers=auth, data={"adult_confirmed": "true"}
            )
        elif path.endswith("#noauth"):
            response = client.post(
                "/guide/ask", data={"adult_confirmed": "true", "question": "Hola"}
            )
        else:
            response = client.post(
                "/guide/ask",
                headers=auth,
                data={
                    "adult_confirmed": "true",
                    "question": "¿Qué senderos tiene Puyehue?",
                },
            )
        out[f"examples/{name}"] = dump(
            {
                "request": f"{method} {path.split('#')[0]}",
                "status": response.status_code,
                "kind": "generated_mock_mode",
                "body": strip(response.json()),
            }
        )
    return out


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    files = render()
    stale = [
        n
        for n, t in files.items()
        if not (API / n).exists() or (API / n).read_text(encoding="utf-8") != t
    ]
    if args.check:
        if stale:
            print(
                "Stale contract files: "
                + ", ".join(stale)
                + "; run scripts/export_openapi.py",
                file=sys.stderr,
            )
            return 1
        print(f"OpenAPI and {len(files) - 1} examples up to date")
        return 0
    for name, text in files.items():
        (API / name).parent.mkdir(parents=True, exist_ok=True)
        (API / name).write_text(text, encoding="utf-8", newline="\n")
    print(
        f"wrote {len(files)} files; {len(json.loads(files['openapi.json'])['paths'])} paths"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
