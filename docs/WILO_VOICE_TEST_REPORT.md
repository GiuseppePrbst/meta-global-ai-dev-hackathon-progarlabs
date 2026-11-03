# Wilo: informe de pruebas (03-11-2026)

Este informe registra los comandos ejecutados y sus resultados reales. Lo que no se ejecutó se marca así de forma explícita.

## Automáticas (CI y local, sin red ni audio privado)

| Comando | Resultado |
| --- | --- |
| `ruff check` y `ruff format --check` (`services evaluations tools`) | OK |
| `pytest -c services/api/pyproject.toml services` | **343 aprobadas**, 14 omitidas (12 requieren PostGIS y 2 OpenCV) |
| Las mismas con `TEST_DATABASE_URL` sobre una base PostGIS local aislada (`-m integration`) | **12 de 12 aprobadas** |
| `python -m unittest discover -s scripts/tests` (incluye el parser CONAF) | OK |
| `python scripts/check_repository.py` | OK |
| Gitleaks 8.30.1 `--staged` | Sin hallazgos (detalle de cada publicación en el PR) |

Nuevas pruebas, por área:

- **Atlas, en `services/api/tests/test_wilo.py`:**
  - snapshot reproducible e índice de 46 parques;
  - 404 para IDs inexistentes;
  - conflicto de superficie con la cifra oficial vigente;
  - senderos oficiales frente a secundarios, cierre publicado y filtro por sector;
  - mapa con encuadre y sin límite inventado;
  - snapshot desactualizado y búsqueda.
- **Demo:** 13 `demo_ready`; los excluidos y sensibles no son coleccionables; un perfil incompleto baja a `needs_review`.
- **Seguridad de herramientas:**
  - rechazo de SQL, *path traversal*, IDs inventados, campos extra y URI `file://`;
  - resultados acotados;
  - fauna sensible sin coordenadas.
- **Voz:**
  - keywords generadas, de hasta 30 caracteres y como máximo 100;
  - `language_hint` traducido a `languageBias` aceptado (`auto` lo omite y `klingon` da 422);
  - un 429 del proveedor se convierte en 429 con `Retry-After`;
  - WAV corrupto, MP3, más de 3 MiB y más de 60 s.
- **`/guide/ask`:**
  - identidad obligatoria (401);
  - exactamente una entrada;
  - adulto;
  - mock explícito;
  - extremo a extremo con un Meta simulado: audio, herramientas, fuentes, entidades y mapa.
- **WebSocket:**
  - token incorrecto y primer mensaje inválido;
  - mock, cancelación y frame impar;
  - parciales que reemplazan y el final, con un upstream simulado;
  - *handshake* con `accessToken` y keywords;
  - permiso externo obligatorio.
- **Grounding, en `services/botanical-ai/tests/test_wilo_grounding.py`:**
  - afirmaciones citadas;
  - abstención ante cifras inventadas;
  - *prompt injection* en el texto de una herramienta;
  - conversiones de unidades;
  - segunda ronda solo después de una búsqueda.
- **Evaluador, en `services/api/tests/test_wilo_evaluation.py`:**
  - orden de lectura;
  - alineación sin usar el número del archivo, con extras en `pending_review` y retomas;
  - operaciones de edición (S, D, I), WER y CER;
  - clases de términos;
  - el agregado solo puntúa clips alineados, separa idiomas y no contiene transcripciones;
  - los scripts reservan antes de llamar a Meta;
  - no hay medios ni resultados privados versionados.

## Reales (Meta, en el ledger)

| Conjunto | Solicitudes | Resultado |
| --- | ---: | --- |
| Voz sintética (28 frases, 7 condiciones, modos y tiempo real) | 208 | 0 errores. WER 0,061 con keywords y 0,183 sin ellas |
| Sondas de contrato (sin reserva previa; se registraron después) | 9 | Límites de 30 caracteres y 500 keywords; `languageBias` en minúsculas aceptado |
| Voz real, configuración de producción | 79 | 0 errores. WER 0,100 (ES 0,100, EN 0,105) |
| Voz real, comparación pareada | 96 | 4 condiciones × 24 clips, 0 errores |
| Guía sintética A–H y S1–S3 | 12 | 11 `llm_error` por `finish_reason: length`, corregido después. 1 abstención |
| Diagnóstico del guía | 1 | Encontró la causa (`length`) |
| De extremo a extremo con audio real | 18 + 8 repeticiones | 17 de 18 pasan las comprobaciones; 16 de 18 son correctos en lo semántico |

Detalle en [WILO_ASR_REAL_EVALUATION.md](WILO_ASR_REAL_EVALUATION.md) y [WILO_DEMO_SCENARIOS.md](WILO_DEMO_SCENARIOS.md).

## No ejecutado

- WebSocket `/guide/voice/stream` contra Meta a través del backend. El proxy está probado con un upstream simulado, y el tiempo real directo contra Meta (8 frases) sí se probó en el evaluador.
- Modo `DIARIZATION`, porque Meta lo describe como no ajustado para comandos de voz.
- La prueba de la regla del prompt para senderos secundarios y de la entidad parque en 08-ES, porque se alcanzó el tope de USD 5 de la identidad.
- La repetición de la base sintética de escenarios después de corregir `length`.
- Las pruebas con la interfaz de José, que queda fuera de este backend.
- Más hablantes y acentos: hay una sola voz real.
- `test_context_api` en PostGIS con `localhost`: se bloquea porque en WSL `localhost` resuelve a IPv6. Con `127.0.0.1` pasa.
