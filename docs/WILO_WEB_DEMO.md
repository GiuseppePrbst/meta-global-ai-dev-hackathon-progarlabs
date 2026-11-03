# Experiencia web de Wilo (rama feat/wilo-demo-muse-wonder)

Implementa la interfaz pendiente de `docs/PROJECT_DELIVERY_STATUS.md` ("Interfaz de Wilo: future")
sin cambiar el backend. José no tenía esta interfaz en desarrollo: sus ramas activas
(`feat/ui-redesign`, `feat(wip)--new-design`) trabajan `apps/mobile`, y el árbol `apps/web`
es idéntico entre `main` y esas ramas. Esta rama solo agrega la ruta `/wilo` y un enlace
de navegación; reutiliza tokens y componentes existentes (`Navigation`, `Icon`, `PageHeading`).

## Endpoints consumidos (sin inventar)

| Uso | Endpoint | Auth |
| --- | --- | --- |
| Transcripcion editable | `POST /guide/transcribe` (WAV PCM16 mono 16/24 kHz) | Bearer demo |
| Pregunta confirmada | `POST /guide/query` (JSON) | Bearer demo |
| Atlas | `GET /parks`, `/parks/{id}`, `/parks/{id}/trails`, `/parks/{id}/map`, `/taxa?demo_only=true`, `/knowledge/status` | Pública |

La clave Meta nunca llega al frontend: solo viaja el token demo de `DEMO_TOKENS`,
en memoria o en `sessionStorage` si el usuario lo pide. La grabación se codifica en el
navegador como WAV PCM16 mono a 16 kHz (Web Audio + remuestreo); nunca se envía WebM/M4A.

## Flujo y estados

`inicial → grabando (≤60 s, cancelar) → transcribiendo → revision (texto editable,
obligatoria por los errores ASR trails→trees, Queulat→Chiloé, Wilo→Willow) →
consultando (contador en segundos, "Consultando Atlas…" y luego "Wilo esta pensando…",
con Cancelar; Spark tardo 20–37 s el 03-11) → respuesta | insuficiente |
error-proveedor | limite (429 + Retry-After, sin reintento automatico) | sin-acceso (401) | cancelado`.

La respuesta muestra texto, badge mock/meta, fuentes, limitaciones, entidades que abren
la ficha del parque, referencias cartograficas y TTS opcional del dispositivo (sin autoplay).
El mapa solo encuadra un `bbox` válido con MapLibre: no dibuja polígonos ni senderos,
y `not_verified` nunca se presenta como abierto.

## Recorridos de demostracion (chips A–D, en mock y en real)

- A: senderos del PN Puyehue → respuesta + ficha territorial con bbox.
- B: senderos de Anticura → lista con `source_status` y procedencia.
- C: coigüe vs ulmo → biodiversidad del catalogo.
- D: pregunta en ingles → transcripcion, respuesta en ingles y fuentes.

## Verificacion (04-11-2026, sin llamadas pagadas a Meta)

- Backend: Ruff OK; `export_openapi.py --check` OK; Pytest Wilo+contrato 56 OK; suite
  completa 344 OK (2 fallos iniciales solo por espacio en C:, verdes con temporales en D:).
- HTTP real en mock: API local + `scripts/frontend_contract_smoke.py` 10/10.
- Web (Node 24): lint, typecheck, Vitest 10/10, build OK (ruta `/wilo`), Playwright 12/12.
- PostGIS y Gitleaks: no ejecutados localmente (sin Docker ni binario); los cubre la CI.

## Limites

Sin despliegue público; la demo real exige backend en modo Meta con ledger y token.
La regla secundaria de 08-ES y la entidad parque de ese caso siguen sin revalidar en vivo.
