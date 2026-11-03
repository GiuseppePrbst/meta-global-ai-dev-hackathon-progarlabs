#!/usr/bin/env python3
"""Sincroniza un catalogo estructurado de parques/senderos desde fichas publicas CONAF.

No genera rutas GPS, no informa apertura en tiempo real, no copia fotografias ni
textos descriptivos extensos. Una descarga fallida queda como NOT_VERIFIED.

Requisitos de investigacion: pip install requests beautifulsoup4
Uso: python scripts/sync_conaf_parks.py --output data/public/conaf
     python scripts/sync_conaf_parks.py --output data/public/conaf --check
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import time
import unicodedata
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup

SOURCE_HOST = "www.conaf.cl"
HEADERS = {"User-Agent": "BosqueVivoChile-Parks-Research/1.0 (+https://progarlabs.com/)"}
DISTANCE = re.compile(r"Longitud\s*:\s*([\d.,]+)\s*(km|m)\b", re.IGNORECASE)
DURATION = re.compile(r"Duraci[oó]n\s+[^:]{0,48}:\s*([^.;]+)", re.IGNORECASE)
DIFFICULTY = re.compile(r"Dificultad\s+de\s+caminata\s*:\s*([^.;]+)", re.IGNORECASE)
TRAIL_START = re.compile(r"\bSendero\s+(?=[\wÁÉÍÓÚÑáéíóúñ])", re.IGNORECASE)
TRAIL_NAME = re.compile(r"^(.{2,130}?)\s+Longitud\s*:", re.IGNORECASE | re.DOTALL)
AREA = re.compile(r"([\d.,]+)")
SCHEMA = "1.0.0"


def slug(text: str) -> str:
    clean = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", clean.lower()).strip("-")


def distance_m(text: str):
    m = DISTANCE.search(text)
    if not m:
        return None
    number = m.group(1)
    if "." in number and "," in number:
        number = number.replace(".", "").replace(",", ".")
    elif "," in number:
        number = number.replace(",", ".")
    elif "." in number and len(number.rsplit(".", 1)[-1]) == 3 and m.group(2).lower() == "m":
        number = number.replace(".", "")
    try:
        dist = float(number) * (1000 if m.group(2).lower() == "km" else 1)
        return round(dist, 2) if 0 < dist < 200000 else None
    except ValueError:
        return None


def duration_minutes(text: str):
    match = DURATION.search(text)
    if not match:
        return None, None
    phrase = " ".join(match.group(1).split())
    if re.search(r"\ba\b|[-–]", phrase):
        return None, phrase[:100]
    m = re.search(r"([\d.,]+)\s*(minutos?|horas?|d[ií]as?)\b", phrase, re.IGNORECASE)
    if not m:
        return None, phrase[:100]
    amount = float(m.group(1).replace(",", "."))
    scale = 1440 if m.group(2).lower().startswith(("día", "dia")) else 60 if m.group(2).lower().startswith("hora") else 1
    return round(amount * scale), phrase[:100]


def park_table(html: str):
    soup = BeautifulSoup(html, "html.parser")
    title = soup.find(["h1", "h2"], string=re.compile(r"Parque Nacional", re.I))
    if not title:
        raise ValueError("No park title found; layout may have changed")
    result = {}
    for tr in soup.find_all("tr"):
        cells = tr.find_all(["td", "th"], recursive=False)
        if len(cells) < 2:
            continue
        key = " ".join(cells[0].stripped_strings).strip().lower()
        # Keep word boundaries in the source data as often the page uses nested tags.
        text = " ".join(cells[1].stripped_strings).strip()
        if key and text and key not in result:
            result[key] = text
    return result


def find_cell(rows, starts_with):
    for key, value in rows.items():
        if key.startswith(starts_with):
            return value
    return None


def parse_trails(park_id: str, text: str | None, source_url: str):
    if not text:
        return []
    matches = list(TRAIL_START.finditer(text))
    result = []
    seen = set()
    for i, match in enumerate(matches):
        chunk = text[match.end():matches[i + 1].start() if i + 1 < len(matches) else len(text)].strip()
        named = TRAIL_NAME.match(chunk)
        if not named:
            continue
        name = " ".join(named.group(1).split())
        if len(name) > 100:
            continue
        whole_name = "Sendero " + name
        key = slug(whole_name)
        if not key or key in seen:
            continue
        seen.add(key)
        dist = distance_m(chunk)
        dur, duration_original = duration_minutes(chunk)
        difficulty = DIFFICULTY.search(chunk)
        if re.search(r"^de Chile\b", name, re.I):
            whole_name = "Sendero de Chile"
        result.append({
            "id": park_id + "-" + key,
            "park_id": park_id,
            "name": whole_name,
            "distance_m": dist,
            "duration_minutes": dur,
            "duration_basis": "one_way" if "trayecto (ida)" in chunk.lower() else "total" if "total del recorrido" in chunk.lower() else None,
            "duration_source_text": duration_original,
            "difficulty": " ".join(difficulty.group(1).split())[:65] if difficulty else None,
            "source_url": source_url,
            "source_section": "Senderos habilitados",
            "evidence_status": "listed_in_official_park_profile",
            "geometry": None,
            "opening_status": "not_verified"
        })
    return result


def official_url(url):
    parsed = urlparse(url)
    if parsed.scheme != "https" or parsed.netloc != SOURCE_HOST or not parsed.path.startswith("/parque_nacionales/"):
        raise ValueError("Unapproved source URL: " + url)
    return url


def fetch(session, url, timeout, retries):
    official_url(url)
    last = None
    for trial in range(retries + 1):
        try:
            response = session.get(url, headers=HEADERS, timeout=timeout)
            if response.status_code in (429, 502, 503, 504):
                last = "HTTP " + str(response.status_code)
                if trial < retries:
                    time.sleep(min(30, 2 ** (trial + 1)))
                    continue
            response.raise_for_status()
            if len(response.content) > 2_000_000:
                raise ValueError("HTML larger than allowed")
            return response.text
        except (requests.RequestException, ValueError) as error:
            last = str(error)[:180]
            if trial < retries:
                time.sleep(min(30, 2 ** (trial + 1)))
    raise RuntimeError(last)


def build(index: dict, session, timeout: int, retries: int, delay: float):
    compiled = datetime.now(timezone.utc).isoformat(timespec="seconds")
    profiles, trails = [], []
    for park in index["parks"]:
        status = "source_unavailable"
        profile = {"park_id": park["id"], "park_name": park["name"],
                   "source_url": park["official_profile_url"], "fetched_at": compiled,
                   "source_status": status, "trails_section_status": "not_verified",
                   "trails_extracted": 0, "area_ha_text": None, "provinces_text": None,
                   "communes_text": None, "geometry": None, "error": None}
        try:
            source = official_url(park["official_profile_url"])
            html = fetch(session, source, timeout, retries)
            rows = park_table(html)
            section = find_cell(rows, "senderos habilitados")
            items = parse_trails(park["id"], section, source)
            trails.extend(items)
            profile.update({
                "source_status": "retrieved",
                "source_sha256_html": hashlib.sha256(html.encode("utf-8")).hexdigest(),
                "trails_section_status": "parsed" if items else "not_listed_or_unparsed",
                "trails_extracted": len(items),
                "area_ha_text": find_cell(rows, "superficie (ha)"),
                "provinces_text": find_cell(rows, "provincias"),
                "communes_text": find_cell(rows, "comunas"),
            })
        except (ValueError, RuntimeError, requests.RequestException) as e:
            profile["error"] = str(e)[:180]
        profiles.append(profile)
        print(f'{park["id"]}: {profile["source_status"]}, trails={profile["trails_extracted"]}', file=sys.stderr)
        if delay:
            time.sleep(delay)
    return {
        "profiles": {"schema_version": SCHEMA, "generated_at": compiled,
                     "source": index["source_catalog"], "parks": profiles},
        "trails": {"schema_version": SCHEMA, "generated_at": compiled,
                   "source": index["source_catalog"],
                   "caveat": "Textual trail facts only. No route geometry or live opening status.",
                   "trails": sorted(trails, key=lambda x: (x["park_id"], x["name"]))},
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--index", type=Path, default=Path("data/public/conaf/parks.json"))
    parser.add_argument("--output", type=Path, default=Path("data/public/conaf"))
    parser.add_argument("--timeout", type=int, default=20)
    parser.add_argument("--retries", type=int, default=2)
    parser.add_argument("--delay", type=float, default=0.75)
    parser.add_argument("--check", action="store_true", help="Offline schema check; no HTTP")
    args = parser.parse_args()
    index = json.loads(args.index.read_text(encoding="utf-8"))
    parks = index.get("parks", [])
    if len(parks) != index.get("park_count") or len({p["id"] for p in parks}) != len(parks):
        raise SystemExit("Invalid park inventory (count/unique IDs)")
    for park in parks:
        official_url(park["official_profile_url"])
    if args.check:
        for name in ("trails.json", "park_profiles_synced.json", "trails_synced.json"):
            path = args.output / name
            if path.exists():
                json.loads(path.read_text(encoding="utf-8"))
        print(f"OK: {len(parks)} indexed national parks; JSON valid")
        return
    out = build(index, requests.Session(), args.timeout, args.retries, args.delay)
    args.output.mkdir(parents=True, exist_ok=True)
    for key, filename in (("profiles", "park_profiles_synced.json"), ("trails", "trails_synced.json")):
        target = args.output / filename
        target.write_text(json.dumps(out[key], indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    profiles = out["profiles"]["parks"]
    succeeded = sum(p["source_status"] == "retrieved" for p in profiles)
    found = len(out["trails"]["trails"])
    print(f"Parques consultados: {len(parks)}; páginas recuperadas: {succeeded}; senderos extraídos: {found}")
    if succeeded != len(parks):
        raise SystemExit("Incomplete sources; review individual errors before publishing")


if __name__ == "__main__":
    main()
