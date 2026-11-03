#!/usr/bin/env python3
"""Sincroniza un catalogo estructurado de parques/senderos desde fichas publicas CONAF.

No genera rutas GPS, no informa apertura en tiempo real, no copia fotografias ni
textos descriptivos extensos. Una descarga fallida queda como NOT_VERIFIED.

Requisitos de investigacion: pip install requests beautifulsoup4
Uso: python scripts/sync_conaf_parks.py --output data/public/conaf
     python scripts/sync_conaf_parks.py --output data/public/conaf --html-dir <privado>
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
SCHEMA = "1.1.0"
# Labels seen across the 46 profiles (2026-11-03), including typos such as "Dificulta".
LABEL = re.compile(
    r"(Longitud|Duraci[oó]n[^:.]{0,40}|Dificulta\w*\s+de\s+(?:la\s+)?caminata(?:\s+invernal)?"
    r"|Riesgos del sector|Advertencia)\s*:",
    re.IGNORECASE,
)
HEADER = re.compile(
    r"^(Sector|Regi[oó]n de)\s+(.+?)\s+(?=(?:Sendero|Senderos|Ruta|Expedici[oó]n|Circuito|Traves[ií]a)\b)"
)
SECTOR_SUFFIX = re.compile(r"\s*\(sector\s+([^)]+)\)\s*$", re.IGNORECASE)
ONE_WAY = re.compile(r"\bida\b", re.IGNORECASE)
AMOUNT = r"(\d+(?:[.,]\d+)?)"
UNIT = r"(minutos?|horas?|d[ií]as?)"
SECTORS = re.compile(r"dividido en (?:\w+ )?sectores?\s*:\s*([^.]+)\.", re.IGNORECASE)
SPECIES = re.compile(r"\(\s*([A-Z][a-z]+ [a-z]+(?: [a-z]+)?)\s*\)")
EMAIL = re.compile(r"[\w.+-]+@[\w-]+\.[\w.]+")
PHONE = re.compile(r"\+?\(?\d{2,3}\)?(?:[\s-]?\d){7,}")


def scrub(text: str | None) -> str | None:
    """Drop personal contact data copied from public pages; the link keeps the full text."""
    if not text:
        return text
    return PHONE.sub("[teléfono omitido]", EMAIL.sub("[correo omitido]", text))


def slug(text: str) -> str:
    clean = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", clean.lower()).strip("-")


def number(text: str, unit: str = "") -> float:
    """'3,74' -> 3.74; '1.200' (thousands) -> 1200; '60.832,00' -> 60832."""
    if "." in text and "," in text:
        text = text.replace(".", "").replace(",", ".")
    elif "," in text:
        text = text.replace(",", ".")
    elif "." in text and len(text.rsplit(".", 1)[-1]) == 3 and unit != "km":
        text = text.replace(".", "")
    return float(text)


def distance_m(text: str):
    m = re.search(r"Longitud\s*:\s*([\d.,]+)\s*(km|m)\b", text, re.IGNORECASE)
    if not m:
        return None
    try:
        unit = m.group(2).lower()
        dist = number(m.group(1), unit) * (1000 if unit == "km" else 1)
    except ValueError:
        return None
    return round(dist, 2) if 0 < dist < 200000 else None


def minutes(amount: str, unit: str) -> float:
    unit = unit.lower()
    scale = 1440 if unit.startswith(("día", "dia")) else 60 if unit.startswith("hora") else 1
    return float(amount.replace(",", ".")) * scale


def duration_range(phrase: str):
    """(min, max) minutes: '2 horas y media' -> 150; '5 a 7 horas' -> (300, 420)."""
    p = " ".join(phrase.split())
    m = re.match(rf"^{AMOUNT}\s*(?:a|-|–)\s*{AMOUNT}\s*{UNIT}", p, re.IGNORECASE)
    if m:
        return round(minutes(m.group(1), m.group(3))), round(minutes(m.group(2), m.group(3)))
    m = re.match(rf"^{AMOUNT}\s*{UNIT}(?:\s+a\s+{AMOUNT}\s*{UNIT})?", p, re.IGNORECASE)
    if not m:
        return None, None
    low = minutes(m.group(1), m.group(2))
    if m.group(3):
        return round(low), round(minutes(m.group(3), m.group(4)))
    rest = p[m.end():]
    if re.match(r"^\s*y\s+media\b", rest, re.IGNORECASE) and m.group(2).lower().startswith("hora"):
        low += 30
    elif extra := re.match(rf"^\s*y\s+{AMOUNT}\s*{UNIT}", rest, re.IGNORECASE):
        low += minutes(extra.group(1), extra.group(2))
    return round(low), round(low)


def duration_minutes(text: str):
    """Single published value or None for ranges/ambiguous text, plus source phrase."""
    match = re.search(r"Duraci[oó]n[^:.]{0,48}:\s*([^.;]+)", text, re.IGNORECASE)
    if not match:
        return None, None
    phrase = " ".join(match.group(1).split())
    low, high = duration_range(phrase)
    return (low if low is not None and low == high else None), phrase[:100]


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


def visit_notice(html: str) -> str | None:
    """'Información para visitar el parque' block that precedes the data table."""
    text = " ".join(BeautifulSoup(html, "html.parser").get_text(" ").split())
    m = re.search(r"Información para visitar el parque\s+(.{10,900}?)\s+Unidad\s", text)
    return m.group(1) if m else None


def find_cell(rows, starts_with):
    for key, value in rows.items():
        if key.startswith(starts_with):
            return value
    return None


def sentences(text: str) -> list[str]:
    # Force a boundary before every label so a missing period ("fácil Riesgos") still splits.
    text = LABEL.sub(lambda m: ". " + m.group(0), " ".join(text.split()))
    return [s.strip() for s in re.split(r"(?<!\d)\.\s+|\.$", text) if s.strip(" .")]


def new_trail(park_id, name, sector, part, value, source_url, region_label=None, closure=""):
    closure = closure.strip(" ,.")
    return {
        "id": park_id + "-" + slug(name),
        "park_id": park_id,
        "name": name,
        "sector": sector,
        "region_label": region_label,
        "kind": "bike" if "bicicleta" in name.lower() else "walking",
        "distance_m": distance_m(part),
        "distance_basis": "one_way" if ONE_WAY.search(value) else None,
        "duration_minutes": None,
        "duration_min_minutes": None,
        "duration_max_minutes": None,
        "duration_basis": None,
        "duration_source_text": None,
        "difficulty": None,
        "winter_difficulty": None,
        "risks": None,
        "conditions": [closure] if closure else [],
        "published_closure": closure or None,
        "source_url": source_url,
        "source_section": "Senderos habilitados",
        "evidence_status": "listed_in_official_park_profile",
        "review_status": "parsed_unreviewed",
        "geometry": None,
        "geometry_available": False,
        # A published closure is official text, not a live check; absence never means open.
        "opening_status": "published_closure" if closure else "not_verified",
    }


def parse_trails(park_id: str, text: str | None, source_url: str):
    """One trail per 'Longitud:' label; its name is the fragment right before it.

    Free sentences between labels are kept as that trail's official conditions
    (closures, permits, guides); they are never turned into opening status.
    """
    if not text:
        return []
    items, current, sector, region, pending = [], None, None, None, ""

    def flush():
        if pending and current is not None:
            current["conditions"].append(scrub(pending)[:240])

    for part in sentences(text):
        label = LABEL.match(part)
        if not label:
            flush()
            pending = part
            continue
        key = label.group(1).lower()
        value = part[label.end():].strip()
        if key == "longitud":
            name, pending = pending, ""
            name, _, closure = name.partition("➔")
            if head := HEADER.match(name):
                if head.group(1) == "Sector":
                    sector = head.group(2)
                else:
                    region, sector = head.group(2), None
                name = name[head.end():]
            own = SECTOR_SUFFIX.search(name)
            name = SECTOR_SUFFIX.sub("", name).strip()
            if not 2 <= len(name) <= 100:
                current = None
                continue
            current = new_trail(
                park_id, name, own.group(1) if own else sector, part, value, source_url,
                region, closure,
            )
            items.append(current)
            continue
        flush()
        pending = ""
        if current is None:
            continue
        if key.startswith("duraci"):
            low, high = duration_range(value)
            current.update(
                duration_source_text=value[:100],
                duration_min_minutes=low,
                duration_max_minutes=high,
                duration_minutes=low if low is not None and low == high else None,
                duration_basis="one_way" if ONE_WAY.search(key + " " + value)
                else "total" if "total" in key else None,
            )
        elif "invernal" in key:
            current["winter_difficulty"] = value[:65] or None
        elif key.startswith("dificulta"):
            current["difficulty"] = value[:65] or None
        elif key.startswith("riesgos"):
            current["risks"] = value[:400] or None
        else:
            current["conditions"].append(scrub(part)[:240])
    flush()
    seen, unique = set(), []
    for item in items:
        if item["id"] not in seen:
            seen.add(item["id"])
            unique.append(item)
    return unique


def species_mentions(text: str | None) -> list[str]:
    """Scientific names in parentheses ('ulmo (Eucryphia cordifolia)'); never locations.

    Common names are not extracted: free prose gives no reliable boundary for them.
    """
    return list(dict.fromkeys(SPECIES.findall(" ".join((text or "").split()))))


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


def profile_fields(park_id: str, html: str, source: str) -> tuple[dict, list[dict]]:
    rows = park_table(html)
    section = find_cell(rows, "senderos habilitados")
    items = parse_trails(park_id, section, source)
    area = find_cell(rows, "superficie")
    sectors = SECTORS.search(find_cell(rows, "datos generales") or "")
    flora_fauna = " ".join(filter(None, (find_cell(rows, "flora"), find_cell(rows, "fauna"))))
    return {
        "source_status": "retrieved",
        "source_sha256_html": hashlib.sha256(html.encode("utf-8")).hexdigest(),
        "trails_section_status": "parsed" if items else "not_listed",
        "trails_extracted": len(items),
        "trails_label_count": len(re.findall(r"Longitud\s*:", section or "")),
        "area_ha_text": area,
        "area_ha": number(re.search(r"[\d.,]+", area).group(0)) if area and re.search(r"\d", area) else None,
        "provinces_text": find_cell(rows, "provincia"),
        "communes_text": find_cell(rows, "comuna"),
        "sectors": [s.strip() for s in re.split(r",\s*|\s+y\s+", sectors.group(1))] if sectors else [],
        "visit_notice": (scrub(visit_notice(html) or "") or "")[:600] or None,
        "access_text": (scrub(find_cell(rows, "accesos") or "") or "")[:600] or None,
        "scientific_names_mentioned": species_mentions(flora_fauna),
    }, items


def apply_review(profiles: list[dict], trails: list[dict], review: dict) -> None:
    """Mark trails reviewed only while the page hash equals the reviewed one."""
    current = {p["park_id"]: p.get("source_sha256_html") for p in profiles}
    for trail in trails:
        entry = review.get("parks", {}).get(trail["park_id"])
        if entry and entry["source_sha256_html"] == current.get(trail["park_id"]):
            trail.update(review_status="agent_reviewed_against_source",
                         reviewed_by=review["reviewer"], reviewed_at=review["reviewed_at"])


def build(index: dict, session, timeout: int, retries: int, delay: float, html_dir: Path | None = None):
    compiled = datetime.now(timezone.utc).isoformat(timespec="seconds")
    profiles, trails = [], []
    for park in index["parks"]:
        profile = {"park_id": park["id"], "park_name": park["name"],
                   "source_url": park["official_profile_url"], "fetched_at": compiled,
                   "source_status": "source_unavailable", "trails_section_status": "not_verified",
                   "trails_extracted": 0, "geometry": None, "error": None}
        cached = html_dir / f'{park["id"]}.html' if html_dir else None
        from_cache = bool(cached and cached.exists())
        try:
            source = official_url(park["official_profile_url"])
            if from_cache:
                html = cached.read_text(encoding="utf-8")
            else:
                html = fetch(session, source, timeout, retries)
                if cached:
                    cached.write_text(html, encoding="utf-8")
            fields, items = profile_fields(park["id"], html, source)
            profile.update(fields)
            trails.extend(items)
        except (ValueError, RuntimeError, requests.RequestException, AttributeError) as e:
            profile["error"] = str(e)[:180]
        profiles.append(profile)
        print(f'{park["id"]}: {profile["source_status"]}, trails={profile["trails_extracted"]}', file=sys.stderr)
        if delay and not from_cache:
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
    parser.add_argument("--html-dir", type=Path, help="Private cache of fetched profiles; never versioned")
    parser.add_argument("--review", type=Path, help="Review manifest keyed by park and page hash")
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
    if args.html_dir:
        args.html_dir.mkdir(parents=True, exist_ok=True)
    out = build(index, requests.Session(), args.timeout, args.retries, args.delay, args.html_dir)
    if args.review and args.review.exists():
        review = json.loads(args.review.read_text(encoding="utf-8"))
        apply_review(out["profiles"]["parks"], out["trails"]["trails"], review)
    args.output.mkdir(parents=True, exist_ok=True)
    for key, filename in (("profiles", "park_profiles_synced.json"), ("trails", "trails_synced.json")):
        target = args.output / filename
        target.write_text(json.dumps(out[key], indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    profiles = out["profiles"]["parks"]
    succeeded = sum(p["source_status"] == "retrieved" for p in profiles)
    found = len(out["trails"]["trails"])
    mismatch = [p["park_id"] for p in profiles if p.get("trails_label_count", 0) != p["trails_extracted"]]
    print(f"Parques consultados: {len(parks)}; páginas recuperadas: {succeeded}; senderos extraídos: {found}")
    if mismatch:
        print("Revisar: 'Longitud:' sin sendero extraído en " + ", ".join(mismatch), file=sys.stderr)
    if succeeded != len(parks):
        raise SystemExit("Incomplete sources; review individual errors before publishing")


if __name__ == "__main__":
    main()
