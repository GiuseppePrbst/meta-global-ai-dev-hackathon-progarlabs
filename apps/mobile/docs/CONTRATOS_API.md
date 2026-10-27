# Contratos con la API

Versión 27-10-2026, contra `services/api` 0.1.0. **Los contratos son una propuesta y pueden cambiar.** La fuente de verdad es el OpenAPI de FastAPI; este documento describe cómo los consume la app y qué brechas encontró. Toda propuesta debe acordarse con Giuseppe y probarse en ambos extremos antes de implementarse.

## Generación de tipos

1. Exportar el OpenAPI sin levantar el servidor, desde la raíz:
   `uv run --project services/api --frozen python -c "import json; from bosque_api.main import app; print(json.dumps(app.openapi()))" > apps/mobile/openapi.json`
2. Generar tipos con `openapi-typescript` hacia `apps/mobile/src/api/schema.gen.ts` y versionarlos.
3. CI regenera ambos archivos y falla si hay diferencias (`git diff --exit-code`), de modo que un cambio de contrato en la API rompe la app de forma visible.

## Endpoints consumidos

| Endpoint | Uso en la app | Tipo de dominio | Notas |
| --- | --- | --- | --- |
| `GET /health` | Diagnóstico en «Acerca de»: `ai_provider` y `database` | — | `not_checked` indica configuración, no conexión verificada. |
| `GET /species` | Catálogo; se persiste en caché | Especie | Ocho entradas, todas `provisional`, con `provenance`. |
| `GET /species/{id}` | Ficha | Especie | 404 si no existe. La ficha hoy no tiene contenido descriptivo (P-05). |
| `POST /identify` | Identificación | Identificación, Candidato, Abstención | Multipart: `file` (JPEG recodificado), `adult_confirmed`, `rights_confirmed`. Máx. 10 MiB. El mock devuelve `insufficient_evidence` sin candidatos ni modelo. |
| `GET /observations?limit=` | Atlas | Observación | Devuelve las de todas las personas, máx. 100, sin filtro espacial (P-04). |
| `POST /observations` | Envío de borrador | Observación | `species_id` opcional del catálogo, `notes` ≤ 2000, `location` Point WGS84 `[longitud, latitud]` opcional. Responde `verification_status: unverified`. |
| `GET /forest/sources` | Panel Bosque | — | CHMv2 con `status: not_configured` e `interpretation`. |
| `POST /forest/analyze` | No se usa en la demo | — | Responde 501; solo estadísticas de un polígono. |

## Reglas de mapeo

- `Identification.status = candidates` → lista de Candidatos (máx. 3) con su `evidence`; el orden no se presenta como probabilidad ni porcentaje.
- `provider = mock` → estado «Modo demostración», aunque el estado sea abstención.
- Un `species_id` de candidato que no está en el catálogo en caché se muestra como desconocido; no se descarta en silencio.
- Las coordenadas se manejan siempre como `[longitud, latitud]`.

## Brechas y propuestas

Todas están en estado **propuesta**, ninguna implementada.

| ID | Brecha | Propuesta | Prioridad móvil |
| --- | --- | --- | --- |
| P-01 | No hay forma de dibujar la altura de copa | Teselas `raster-dem` (Terrarium o Terrain-RGB) de la superficie terreno + altura de copa para la ventana validada de Puyehue, p. ej. `GET /forest/tiles/{z}/{x}/{y}.png`, compuestas en backend con CRS alineado. La app detecta 404/501 y oculta la capa. | P2 |
| P-02 | `ForestSource` no describe cómo leer la capa | Agregar fecha de producto, rango en metros, valor nodata, fuente de elevación usada, codificación y factor de exageración recomendado. | P2 |
| P-03 | No se puede refrescar una observación propia | `GET /observations/{id}` para que Registro muestre el estado actual. | P1 |
| P-04 | El Atlas recibe máx. 100 observaciones sin filtro | Parámetro `bbox` y paginación por cursor. | P1 |
| P-05 | La ficha solo tiene nombres y procedencia | Contenido autorizado: rasgos, descripción, fotografías con licencia y fuentes (depende de BV-04). | P1 |
| P-06 | Reenvíos pueden duplicar observaciones | Cabecera `Idempotency-Key` (UUID generado al crear el borrador) en `POST /observations`. Necesaria para el Stretch 1. | Stretch 1 |
| P-07 | Los errores son texto libre o listas de Pydantic | Cuerpo de error estable con código máquina (p. ej. `{"code": "image_too_large", "detail": "..."}`) para no depender de frases. | P1 |
| P-08 | Sin autenticación | Lo define BV-09; la app reserva el punto de inyección de credenciales. | Antes de exponer la API |
| P-09 | Sin vínculo entre identificación y observación | Opcional: que la observación registre si la especie fue elegida a partir de un candidato y de qué proveedor/modelo, sin guardar la foto. | P2 |
| P-10 | Preguntas sobre una especie (voz/texto) | Ver [interacción por voz](OPCIONAL_INTERACCION_POR_VOZ.md). | Fuera de la demo |

Los clientes nativos no envían `Origin`, así que CORS no aplica a la app; sí aplica a cualquier petición hecha dentro del WebView del mapa, por eso el mapa no hace peticiones propias.
