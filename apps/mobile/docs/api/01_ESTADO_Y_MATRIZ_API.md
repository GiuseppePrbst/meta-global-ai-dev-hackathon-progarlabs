# Matriz de endpoints y estado de entrega

API: `https://api-bosquevivo.progarlabs.com`

**Leyenda:** PROD = backend actual; PR42 = código del PR #42 aún sin desplegar; IA apagada = ruta implementada sin inferencia pagada. Para saber qué está activo, comprobar con `/openapi.json` y realizar pruebas autenticadas; en modo demo, una ruta inexistente puede producir un 401 antes del 404.

| Función | Método/ruta | Estado | Token |
| --- | --- | --- | --- |
| Salud | `GET /health` | PROD | No |
| Parques | `GET /parks`, `GET /parks/{id}`, `GET /parks/{id}/trails`, `GET /parks/{id}/map` | PROD | No |
| Senderos | `GET /trails/{id}` | PROD | No |
| Especies | `GET /species`, `GET /species/{id}` | PROD | No |
| Taxones | `GET /taxa`, `GET /taxa/{id}` y rutas relacionadas | PROD | No |
| Knowledge Atlas | `GET /knowledge/status`, `GET /knowledge/search` | PROD | No |
| Expediciones | `GET /expeditions`, `GET /expeditions/{id}` | PROD | Sí en demo |
| Canjear invitación | `POST /sessions/exchange` | PROD | No |
| Sesión actual | `GET /sessions/me` | PROD | BVS |
| Renovar sesión | `POST /sessions/refresh` | PROD | BVS |
| Cerrar sesión | `POST /sessions/logout` | PROD | BVS |
| Conversar con Wilo | `POST /guide/query`, `POST /guide/ask` | PROD, IA apagada (503) | BVS + `guide` |
| Transcribir | `POST /guide/transcribe` | PROD, IA apagada (503) | BVS + `transcribe` |
| Voz en tiempo real | `WS /guide/voice/stream` | PROD, IA apagada | Token en primer mensaje + `transcribe` |
| Identificar una especie | `POST /identify` | PROD, IA apagada (501) | BVS + `identify` |
| Capturas propias | `POST /captures/attempts`, `GET /captures/me`, `DELETE /captures/{id}` | PROD | BVS |
| Facebook / Firebase | `POST /sessions/federated/exchange` | PR42, no disponible en producción | Firebase ID token |
| Vincular identidad de invitación | `POST /sessions/federated/link` | PR42 | BVS de invitación + Firebase ID token |
| Cuota personal | `GET /me/quota` | PR42 | BVS |
| Permisos / rol | `GET /me/permissions` | PR42 | BVS |
| Borrar contenido de cuenta | `DELETE /me` | PR42 | BVS |

## Convenios transversales

- `Authorization: Bearer bvs_...` en llamadas protegidas. Nunca enviar el token de operador a una app distribuida.
- `X-Correlation-ID` ayuda al diagnóstico y se puede mostrar/copiar en pantallas de error. No registrar tokens.
- La expiración de sesión es de 60 minutos; si no se renueva a tiempo, el usuario debe autenticarse otra vez.
- `401` = sin acceso, token inválido, expirado o revocado; `403` = permiso o suspensión; `429` = límite de velocidad o presupuesto; `501` = capacidad no habilitada; `502` = proveedor o herramienta; `503` = temporalmente no disponible. `Retry-After` puede acompañar 429.
- `429` no debe disparar automáticamente otra operación pagada. Respetar el tiempo indicado y requerir acción del usuario para reintentar.
- Las respuestas `mock` no son respuestas reales de Meta; deben etiquetarse.
- No asumir que cualquier parque o sendero está abierto. `opening_status=not_verified` exige advertencia.
- `map.bbox` solo sirve para encuadre. `geometry_available=false` significa que no se deben dibujar rutas ni usar la geometría como límite oficial.

## Tipos recomendados

**No escribir tipos a mano en producción.** Una vez fusionado PR42, descargar el OpenAPI real y generar cliente/tipos con `openapi-typescript` o el generador aprobado por José. `docs/api/openapi.json` de PR42 es una especificación de rama, no la API actualmente desplegada.
