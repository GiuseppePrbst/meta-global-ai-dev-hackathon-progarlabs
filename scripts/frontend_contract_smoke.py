#!/usr/bin/env python3
"""External-client walk through the contract José integrates (stdlib only, no backend imports).

    WILO_DEMO_TOKEN=<token> python scripts/frontend_contract_smoke.py --base-url http://127.0.0.1:8000

Steps: list parks → Puyehue → trails → map → taxon → eligibility → Wilo text question.
In mock mode the Atlas steps must return real data and Wilo must answer status "mock".
Exit code 1 on the first broken expectation; never sends audio or calls Meta itself.
"""

import argparse
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request


def call(base, method, path, token=None, form=None):
    data = urllib.parse.urlencode(form).encode() if form else None
    request = urllib.request.Request(base + path, data=data, method=method)
    if token:
        request.add_header("Authorization", "Bearer " + token)
    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            return response.status, json.loads(response.read())
    except urllib.error.HTTPError as exc:
        return exc.code, json.loads(exc.read() or b"{}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="http://127.0.0.1:8000")
    args = parser.parse_args()
    base, token = args.base_url.rstrip("/"), os.environ.get("WILO_DEMO_TOKEN")
    checks = []

    def expect(label, ok):
        checks.append((label, bool(ok)))
        print(("PASS " if ok else "FAIL ") + label)

    status, health = call(base, "GET", "/health")
    expect("health 200", status == 200)
    status, parks = call(base, "GET", "/parks?region=los-lagos")
    expect("parks lists Puyehue", status == 200 and any(p["id"] == "puyehue" for p in parks["items"]))
    status, park = call(base, "GET", "/parks/puyehue")
    expect("Puyehue official area and live_status not_verified",
           status == 200 and park["area_ha"] == 112755 and park["live_status"] == "not_verified")
    status, trails = call(base, "GET", "/parks/puyehue/trails?include_secondary=true")
    expect("trails keep source_status and never geometry",
           status == 200 and trails and all(t["geometry"] is None for t in trails)
           and {t["source_status"] for t in trails} >= {"official_named_only", "secondary_reference"})
    status, park_map = call(base, "GET", "/parks/puyehue/map")
    expect("map has bbox, null boundary with reason",
           status == 200 and park_map["boundary_geometry"] is None and park_map["bbox"]
           and park_map["boundary_unavailable_reason"])
    status, taxon = call(base, "GET", "/taxa/campephilus-magellanicus")
    expect("taxon profile with sources", status == 200 and taxon["profile"]["sources"])
    status, eligibility = call(base, "GET", "/taxa/campephilus-magellanicus/eligibility")
    expect("eligibility demo_ready but not collectible (sensitive)",
           status == 200 and eligibility["status"] == "demo_ready" and not eligibility["collectible"])
    if not token:
        expect("WILO_DEMO_TOKEN set for the Wilo step", False)
    else:
        status, answer = call(base, "POST", "/guide/ask", token, {
            "adult_confirmed": "true", "external_processing_confirmed": "true",
            "question": "¿Qué senderos tiene el Parque Nacional Puyehue?"})
        expect("Wilo answers 200", status == 200)
        if answer.get("status") == "mock":
            expect("mock is explicit: no sources, provider mock",
                   answer["provider"] == "mock" and answer["sources"] == [])
        else:
            expect("real answer cites atlas sources and returns entities",
                   answer["sources"] and answer["entities"] and answer["knowledge_version"])
        status, _ = call(base, "POST", "/guide/ask", None, {"adult_confirmed": "true", "question": "x"})
        expect("guide without identity is 401", status == 401)
    failed = [label for label, ok in checks if not ok]
    print(f"{len(checks) - len(failed)}/{len(checks)} checks passed")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
