# Preparación de la entrega: hackathon 2026

> **Documento histórico.** Puede describir un estado anterior. El estado final está en [submission/JUDGE_QUICKSTART.md](submission/JUDGE_QUICKSTART.md).

**Commit de entrega.** Es el merge del PR de consolidación en `main`, con la etiqueta **`hackathon-2026-submission`**. El SHA exacto está en la etiqueta (`git rev-parse hackathon-2026-submission`) y en el reporte final del PR. Validación: 03/04-11-2026.

## Integración

| PR | Contenido | Estado | Commit en `main` | CI de `main` |
| --- | --- | --- | --- | --- |
| #32 | CONAF: 46 fichas, 190 senderos revisados, parser e importador | Fusionado | `fbd17b9` | ✅ run 41661401876: web, api y repository |
| #33 | Wilo, Knowledge Atlas, elegibilidad y evaluaciones de voz | Fusionado | `a30e6d3` | ✅ run 41662265687: web, api y repository |
| Consolidación | OpenAPI generado, handoff, mapa, inventario, README y docs vigentes | Este PR | Etiqueta de entrega | Ver el PR |
| #30 | Workers de investigación SAM (Codex) | **Abierto, en borrador, sin fusionar** | — | Su CI pasa, pero el propio PR declara «No fusionar» |

**Por qué #30 queda fuera.** El PR declara pendientes sus pruebas integrales de timeout, 429 y 503 por etapa, además de reintentos seguros, SSE, descarga, cleanup y evidencia financiera vigente. Fusionarlo pondría controles financieros sin verificar en `main`.

Revisé la compatibilidad con lo ya integrado:

- Sus reglas de fase I solo afectan a las identidades `sam-api-lab` y `sam-api-lab:I`, así que no bloquean las reservas de Wilo.
- `finish()` responde 409 ante una doble finalización, y Wilo finaliza una sola vez.
- El endurecimiento de `/media/` ya se adoptó en `main` (`/parks`, `/taxa` y `/media/` exactos), por lo que su conflicto con `main.py` será trivial.

## Funcionalidades

| Estado | Funcionalidades |
| --- | --- |
| Integradas y validadas | Wilo (voz real en ES/EN y guía de punta a punta), Atlas de parques y senderos, conservación regional, identificación de conjunto abierto, capturas (PostGIS) y contexto forestal (PostGIS) |
| Integradas, solo con pruebas simuladas | Proxy `WS /guide/voice/stream`, recursos de mapa, elegibilidad de demo y expediciones |
| Experimentales | SAM 3.1 en imagen y video (laboratorio), CHMv2 y Muse Spark multirreino |
| Bloqueadas o futuras | Workers (#30), interfaz de Wilo, conexión de la app móvil a la API, geometrías de senderos con licencia, apertura en vivo y despliegue público |

El detalle está en [PROJECT_DELIVERY_STATUS.md](PROJECT_DELIVERY_STATUS.md).

## Validación ejecutada

| Comprobación | Resultado |
| --- | --- |
| Ruff check y format (`services evaluations tools`) | OK |
| Pytest completo (rama de consolidación) | Ver la sección «Evidencia final» del PR |
| PostGIS, integración (`-m integration`) | 12/12 sobre la base local aislada, después de #33 |
| Contrato OpenAPI y ejemplos (`export_openapi.py --check`, `test_openapi_contract.py`) | OK: 35 rutas y 13 ejemplos generados, más 1 respuesta real observada y validada |
| Recorrido de consumo externo (`frontend_contract_smoke.py`, uvicorn en mock) | 10/10 |
| Web: lint, typecheck, Vitest, build y Playwright | CI `web` en verde en `fbd17b9` y `a30e6d3` |
| `check_repository` y enlaces Markdown | OK |
| Gitleaks | Sin hallazgos en cada publicación |
| Llamadas a Meta en esta consolidación | **Ninguna** |

## Comandos de arranque

```bash
cp .env.example .env
```

```bash
npm ci && uv sync --project services/api --extra dev --frozen
```

```bash
uv run --project services/api --extra dev --frozen uvicorn bosque_api.main:app --port 8000
```

```bash
npm run dev
```

## Dependencias externas

| Dependencia | Uso |
| --- | --- |
| Meta Model API | Muse Spark 1.3, Muse Voice Transcribe 1.0 y SAM 3.1. Opcional: el mock funciona sin ella |
| PostgreSQL/PostGIS | Capturas, contexto y ledger |
| Nada externo | Atlas y catálogo. Funcionan sin red |

## Plan de demostración

Seguir el [guion vigente](DEMO_SCRIPT.md). Si no hay Meta o red, el Atlas y los taxones funcionan desde el snapshot, y para Wilo se muestra la respuesta observada.

## Datos

- 46 parques, 199 registros de sendero (190 oficiales revisados), 33 encuadres y 20 taxones.
- `knowledge_version` en `GET /knowledge/status`.
- Evaluaciones agregadas en `evaluations/wilo/` y `evaluations/sam31/`.

## Seguridad y privacidad

- **Material privado.** No hay grabaciones, transcripciones por clip, medios Hepta, claves ni DSN en Git. Un test impide versionar medios.
- **Credenciales.** La credencial local del ledger, que llegó a imprimirse en una sesión, se rotó el 03-11; el valor anterior no aparece en Git.
- **Fauna sensible.** No se publican coordenadas.
- **Geometrías.** No hay geometrías sin licencia: los polígonos BCN no se redistribuyen.

## Riesgos que afectan la demo

1. Wilo tarda 20–37 s en responder: hay que mostrar un estado de espera y narrar mientras tanto.
2. Errores de ASR con algunos topónimos y palabras («Queulat», «trails»): la UI debe permitir corregir la transcripción.
3. La interfaz de Wilo aún no existe en la web. Por ahora la demo se hace por la API o `/docs`.
4. La regla de senderos secundarios (caso 08-ES) está corregida, pero no se revalidó en vivo.

## Responsables

- **Frontend e integración UI:** José Schwerter.
- **GIS/ML, backend y datos:** Giuseppe Proboste.
- **Workers de investigación (#30):** Codex, bajo la supervisión de Giuseppe.

## Checklist

- [x] #32 fusionado (`fbd17b9`)
- [x] #33 fusionado (`a30e6d3`)
- [ ] #30 fusionado: **no**, porque sus P0 no están verificados
- [x] README actualizado
- [x] Mapa de integración
- [x] Contratos de frontend consolidados
- [x] OpenAPI verificado en CI
- [x] Wilo, Atlas y biodiversidad documentados
- [x] Fuentes y licencias registradas ([SOURCES](SOURCES.md), [DATASET_LICENSES](DATASET_LICENSES.md))
- [x] Tests conjuntos sobre el mismo código: ver «Evidencia final» del PR
- [x] Sin secretos ni datos privados en Git
- [x] Enlaces Markdown válidos (`check_repository`)
- [x] Demo reproducible en mock
- [ ] Despliegue público: no existe
- [ ] Interfaz de Wilo: pendiente
