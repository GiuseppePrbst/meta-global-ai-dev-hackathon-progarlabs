"""Minimal real-Meta validation campaign (docs/META_CLOUD_ACTIVATION.md, phase F).

Dry run by default: checks the session and prints the plan and its reservations. Paid calls
happen only with --execute, a written authorization reference and --max-usd covering the plan.
Never run in CI. Evidence goes to --out, which must be outside the repository.

    python scripts/meta_beta_campaign.py --token-file <private> --audio q.wav \
        --positive olivillo.jpg --negative araucaria.jpg --out D:/data/bosque-vivo/campaign-01
    # add: --execute --authorization "<owner, date, amount>" --max-usd 0.15
"""

import argparse
import json
import mimetypes
import sys
import time
import urllib.error
import urllib.request
import uuid
from datetime import UTC, datetime
from pathlib import Path

# Reservations from the beta proposal, in USD (units / 1e6). Reserved, not billed.
PLAN = [
    ("A", "Wilo texto: senderos de Puyehue con fuentes del Atlas", 0.04),
    ("B", "Wilo voz: /guide/ask con WAV (transcripción + guía)", 0.005 + 0.04),
    ("C", "Identificación positiva (especie del catálogo)", 0.03),
    ("D", "Identificación negativa (fuera del catálogo; abstención esperada)", 0.03),
]
CONFUSION_NOTE = (
    "Caso E (registro, sin llamada): el 03-11-2026 Muse Spark aceptó Eucryphia cordifolia "
    "(ulmo) para una foto de Aextoxicon punctatum (olivillo). Una candidata apoyada no es una "
    "identificación verificada; un solo caso no estima precisión."
)
QUESTION = "¿Qué senderos tiene el Parque Nacional Puyehue y están abiertos hoy?"


def call(base, token, path, data=None, files=None, method="POST"):
    headers = {
        "Authorization": f"Bearer {token}",
        "User-Agent": "bosque-vivo-campaign/1.0",
    }
    body = None
    if files is not None:
        boundary = uuid.uuid4().hex
        parts = []
        for name, value in data.items():
            parts.append(
                f'--{boundary}\r\nContent-Disposition: form-data; name="{name}"\r\n\r\n'
                f"{value}\r\n".encode()
            )
        for name, path_ in files.items():
            mime = mimetypes.guess_type(path_.name)[0] or "application/octet-stream"
            parts.append(
                f'--{boundary}\r\nContent-Disposition: form-data; name="{name}"; '
                f'filename="{path_.name}"\r\nContent-Type: {mime}\r\n\r\n'.encode()
                + path_.read_bytes()
                + b"\r\n"
            )
        body = b"".join(parts) + f"--{boundary}--\r\n".encode()
        headers["Content-Type"] = f"multipart/form-data; boundary={boundary}"
    elif data is not None:
        body, headers["Content-Type"] = json.dumps(data).encode(), "application/json"
    started = time.perf_counter()
    request = urllib.request.Request(
        base + path, data=body, method=method, headers=headers
    )
    try:
        with urllib.request.urlopen(request, timeout=130) as response:
            status, raw, head = response.status, response.read(), response.headers
    except urllib.error.HTTPError as exc:
        status, raw, head = exc.code, exc.read(), exc.headers
    payload = json.loads(raw or b"{}")
    return (
        status,
        payload,
        head.get("X-Correlation-ID"),
        round(time.perf_counter() - started, 2),
    )


def summarize(case, status, payload):
    """Only what evidence needs: no transcripts of private audio, no images."""
    keys = [
        "provider",
        "model",
        "answer_model",
        "transcription_model",
        "status",
        "insufficient_evidence",
        "catalog_assessment",
        "acceptance",
        "accepted_species_id",
        "limitations",
        "prompt_version",
        "knowledge_version",
    ]
    out = {k: payload[k] for k in keys if k in payload}
    if "sources" in payload:
        out["sources"] = [
            s.get("id") if isinstance(s, dict) else s for s in payload["sources"]
        ]
    if "candidates" in payload:
        out["candidates"] = [c.get("species_id") for c in payload["candidates"]]
    if case in ("A", "B") and "answer" in payload:
        out["mentions_open_trail_claim"] = "abierto" in payload["answer"].lower() and (
            "no verific" not in payload["answer"].lower()
        )
    if status >= 400:
        out["error"] = payload.get("detail")
    return out


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--base", default="https://api-bosquevivo.progarlabs.com")
    p.add_argument(
        "--token-file", type=Path, required=True, help="sesión bvs_ en archivo privado"
    )
    p.add_argument("--audio", type=Path, required=True)
    p.add_argument("--positive", type=Path, required=True)
    p.add_argument("--negative", type=Path, required=True)
    p.add_argument("--out", type=Path, required=True)
    p.add_argument("--execute", action="store_true")
    p.add_argument("--authorization", default="")
    p.add_argument("--max-usd", type=float, default=0.0)
    a = p.parse_args()
    repo = Path(__file__).resolve().parents[1]
    if a.out.resolve().is_relative_to(repo):
        sys.exit("--out debe estar fuera del repositorio")
    for f in (a.audio, a.positive, a.negative):
        if not f.is_file():
            sys.exit(f"No existe {f}")
    token = a.token_file.read_text().strip()
    status, me, _, _ = call(a.base, token, "/sessions/me", method="GET")
    if status != 200 or me.get("auth") != "session":
        sys.exit(
            f"Sesión no válida ({status}); usa una sesión de evaluador, no un token de operador"
        )
    missing = {"guide", "transcribe", "identify"} - set(me.get("scopes") or [])
    total = round(sum(usd for *_, usd in PLAN), 3)
    print(
        f"Identidad {me['identity']}; permisos faltantes: {sorted(missing) or 'ninguno'}"
    )
    for case, label, usd in PLAN:
        print(f"  {case}. {label}: reserva USD {usd:.3f}")
    print(f"  Total reservado: USD {total}. {CONFUSION_NOTE}")
    if not a.execute:
        print(
            "Simulación: no se llamó a Meta. Agrega --execute, --authorization y --max-usd."
        )
        return
    if missing or not a.authorization.strip() or a.max_usd < total:
        sys.exit(
            "Falta permiso, referencia de autorización o --max-usd >= total reservado"
        )
    consent = {"adult_confirmed": "true", "rights_confirmed": "true"}
    voice = {**consent, "external_processing_confirmed": "true", "language_hint": "es"}
    runs = {
        "A": lambda: call(
            a.base,
            token,
            "/guide/query",
            {
                "question": QUESTION,
                "adult_confirmed": True,
                "external_processing_confirmed": True,
            },
        ),
        "B": lambda: call(a.base, token, "/guide/ask", voice, {"file": a.audio}),
        "C": lambda: call(a.base, token, "/identify", consent, {"file": a.positive}),
        "D": lambda: call(a.base, token, "/identify", consent, {"file": a.negative}),
    }
    evidence = {
        "campaign_started_at": datetime.now(UTC).isoformat(),
        "authorization": a.authorization,
        "identity": me["identity"],
        "reserved_usd_planned": total,
        "confusion_case": CONFUSION_NOTE,
        "cases": [],
    }
    for case, label, usd in PLAN:
        status, payload, correlation, seconds = runs[case]()
        evidence["cases"].append(
            {
                "case": case,
                "operation": label,
                "http_status": status,
                "correlation_id": correlation,
                "latency_s": seconds,
                "reservation_usd": usd,
                "result": summarize(case, status, payload),
                "classification": "pendiente de revisión humana",
            }
        )
        print(f"{case}: HTTP {status} correlation={correlation} {seconds}s")
        if status in (401, 403, 429, 503):
            print("Detenido: acceso, cuota o servicio; no se continúa la campaña.")
            break
    a.out.mkdir(parents=True, exist_ok=True)
    target = a.out / f"campaign-{datetime.now(UTC):%Y%m%dT%H%M%SZ}.json"
    target.write_text(
        json.dumps(evidence, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    print(
        f"Evidencia: {target}. Uso reportado: scripts/beta_invite.py --status {me['identity']}"
    )


if __name__ == "__main__":
    main()
