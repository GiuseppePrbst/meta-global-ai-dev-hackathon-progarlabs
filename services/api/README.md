# API local

FastAPI/Pydantic para contratos botánicos, abstención mock y observaciones en PostGIS.
`botanical-ai` y `geospatial` son bibliotecas internas (imports `bosque_ai` y `bosque_geo`), no servicios adicionales.

Desde la raíz del repositorio, con Python 3.12 y uv 0.12.3:

```powershell
uv sync --project services/api --extra dev --frozen
uv run --project services/api --extra dev --frozen uvicorn bosque_api.main:app --reload
```

Abrir <http://localhost:8000/docs>. `.env` se lee desde el directorio de ejecución;
ejecutar desde la raíz para usar el ejemplo raíz. Las variables existentes del proceso tienen prioridad.

| Variable | Valor inicial | Uso |
| --- | --- | --- |
| `DATABASE_URL` | vacío | PostgreSQL con PostGIS; nunca se registra el DSN |
| `AI_PROVIDER` | `mock` | `meta` mantiene el endpoint bloqueado hasta validar el pipeline |
| `MODEL_API_KEY` | vacío | Solo backend; el bootstrap nunca llama al proveedor |
| `META_TIMEOUT_SECONDS` | `30` | Límite validado de configuración para futura integración (el pipeline aún no está conectado) |
| `CORS_ORIGINS` | `["http://localhost:3000"]` | Lista JSON de orígenes permitidos |

## Contratos

| Endpoint | Estado real |
| --- | --- |
| `GET /health` | Estado del proceso. `database: not_checked` significa que existe configuración, no que la conexión funcione |
| `GET /species` y `GET /species/{id}` | Ocho nombres candidatos con procedencia y taxonomía provisional; detalle desconocido devuelve 404 |
| `POST /identify` | Multipart `file`, `adult_confirmed`, `rights_confirmed`. JPEG/PNG/WebP válidos, hasta 10 MiB. Mock responde abstención explícita, sin especie ni puntuación |
| `GET /observations?limit=100` | Lee como máximo 100 observaciones de PostGIS; 503 cuando falta configuración o conexión |
| `POST /observations` | JSON `species_id` opcional del catálogo, `notes` hasta 2000 caracteres, `location` opcional GeoJSON Point `[longitud, latitud]`; devuelve 201 y UUID |
| `GET /forest/sources` | Procedencia CHMv2, licencia CC BY 4.0 y estado `not_configured` |
| `POST /forest/analyze` | JSON `source_id: chmv2`, `area: Polygon` válido; devuelve 501 explícito |

`AI_PROVIDER=meta` sin clave devuelve 503; con clave devuelve 501. No hay una ruta que
envíe imágenes a Meta todavía. Imágenes se validan en memoria y no se guardan, registran ni reenvían.
La carga HTTP debe limitarse también en el proxy antes de exponer un servicio público.

## Persistencia

Docker Compose instala `sql/001_init.sql` en una base nueva. No borres volúmenes para
aplicar cambios futuros: usa migraciones revisadas. La tabla usa `geometry(Point,4326)`
e índice GiST; las consultas usan parámetros. SQL de inicialización es idempotente,
pero no pretende migrar una tabla antigua.

Sin base de datos, catálogo y mock funcionan y las operaciones de persistencia fallan
de forma explícita. El servidor es una herramienta de desarrollo local sin autenticación:
no publicar las rutas de observaciones antes de incorporar control de acceso, consentimiento,
protección de ubicaciones sensibles, retención y límites de solicitudes.

## Verificación

```powershell
uv run --project services/api --extra dev --frozen ruff check services
uv run --project services/api --extra dev --frozen ruff format --check services
uv run --project services/api --extra dev --frozen pytest -c services/api/pyproject.toml services -q
uv run --project services/api --extra dev --frozen python -c "import bosque_api.main, bosque_ai.meta, bosque_geo.contracts"
```

`TEST_DATABASE_URL` activa el test de integración. Usa una base de pruebas: crea un
esquema con UUID, realiza la prueba y elimina solo ese esquema. Sin esta variable
la prueba se marca como omitida. No se requieren claves Meta ni datos externos.

Versiones directas y transitivas están en `uv.lock`. Se verificó compatibilidad de
metadatos Python 3.12 con PyPI el 27-10-2026; las versiones opcionales GIS no forman
parte del entorno base ni se presentan como instaladas o probadas.

Fuentes de implementación: [FastAPI Docker](https://fastapi.tiangolo.com/deployment/docker/),
[settings](https://fastapi.tiangolo.com/advanced/settings/),
[Psycopg parámetros SQL](https://www.psycopg.org/psycopg3/docs/basic/params.html).
