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

## Fundación GIS/ML

El pipeline Meta ya está integrado; las referencias anteriores a 501 con clave son el
estado histórico del bootstrap. Activación local explícita y contratos aditivos en
[API_INTEGRATION](../../docs/API_INTEGRATION.md). AI_PROVIDER=mock sigue siendo el valor inicial.
Meta local exige META_ENABLED, MODEL_API_KEY, META_ACCESS_TOKEN y derechos de imagen. SAM_ENABLED
activa segmentación opcional. No colocar tokens en NEXT_PUBLIC_. No persistir fotos.

FOREST_MANIFEST apunta a un manifiesto revisado externo. Para soporte raster:
`uv sync --project services/api --extra dev --extra raster --frozen`. Sin extra/manifiesto
forestal, la identificación y el catálogo siguen funcionando. El contenedor base no incluye
GIS pesado; habilitar el extra en una imagen controlada antes de configurar raster en Docker.

## Demo restringida y migraciones vigentes

SERVICE_MODE=demo usa DEMO_TOKENS (objeto JSON privado identidad→credencial) antes de
multipart/decodificación y no usa el token Meta compartido como identidad. Configurar claves
solo en entorno backend. Aplicar SQL 001/002/003 a una base autorizada; CREATE EXTENSION
PostGIS requiere un rol de migración, no elevar el rol de aplicación.
BUDGET_REQUESTS/por identidad son diarios UTC; BUDGET_CONCURRENCY es compartido por PostgreSQL.
BUDGET_UNITS y META_RESERVATION_UNITS deben fijarse explícitamente; cero bloquea Meta demo.
La reserva conservadora cubre SAM+Muse, nunca se devuelve y no es una factura automática.
Revisar precios/modelos/entradas antes de mapear unidades a microUSD. Expiración de diez
minutos recupera concurrencia, no gasto. DB/ledger ausentes fallan cerrados.

En demo observaciones son privadas por identidad, precisión opcional 0–200 m y retención
visible configurable de 30 días; DELETE elimina solo las propias. Purga física explícita:

```powershell
uv run --project services/api --frozen python -c "from bosque_api.config import Settings; from bosque_api.database import ObservationStore; c=Settings(); print(ObservationStore(c.database_url.get_secret_value()).purge_expired(c.observation_retention_days))"
```

Ejecutar esa tarea en mantenimiento autorizado; no se instala un scheduler. 003.down bloquea
quitar propiedad con observaciones privadas pendientes; precisión aditiva se conserva.
Raster usa proceso spawn con RASTER_TIMEOUT_SECONDS; fuentes/configuración fuera de requests.
Mantener servicio en loopback/red controlada. Credenciales demo no son identidad productiva:
antes de internet faltan operación TLS/proxy/límite de cuerpo y gestión segura de credenciales.
Detalle y evidencia: [consolidación](../../docs/BACKEND_META_CONSOLIDATION_REPORT.md).

## Expediciones y voz

Aplicar migraciones 001–004 antes de usar evidencia personal/capturas. SQL 004 es aditivo
y su rollback bloquea pérdida de información. Para voz Meta configurar reservas positivas
VOICE_RESERVATION_UNITS y GUIDE_RESERVATION_UNITS en el ledger existente; por defecto cero.
Incluso en local las nuevas rutas privadas necesitan DEMO_TOKENS individuales.
No hay dependencias nuevas. [Contratos](../../docs/API_INTEGRATION.md),
[voz](../../docs/VOICE_GUIDE.md), [capturas/purga](../../docs/CAPTURE_DOMAIN.md) y
[pruebas/límites](../../docs/META_EXPEDITIONS_REPORT.md). Mock no inventa transcripciones.
