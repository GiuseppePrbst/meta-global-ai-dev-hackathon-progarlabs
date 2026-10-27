# Arquitectura y decisiones

## Estructura

| Área | Responsabilidad | Límite |
| --- | --- | --- |
| `apps/web/` | Next.js + TypeScript + Tailwind; navegación, fichas, captura local y MapLibre. | Sin claves Meta; fixtures identificados; no decide verdad taxonómica. |
| `services/api/` | FastAPI + Pydantic: HTTP, configuración, validación, catálogo y persistencia. | Valida toda entrada y expone OpenAPI. |
| `services/botanical-ai/` | Contratos, adaptador mock y cliente Meta desacoplado con timeout/errores. | La disponibilidad documental de modelos no prueba calidad ni acceso real. |
| `services/geospatial/` | GeoJSON, geometrías y contrato/pipeline CHMv2. | Dependencias GIS pesadas separadas del runtime mínimo. |
| `data/public/`, `data/synthetic/` | Registro de fuentes y fixtures pequeños. | No Hepta, imágenes privadas ni rasters globales. |
| `evaluations/` | Casos permitidos, metodología y resultados reproducibles. | Mocks y pruebas unitarias no son métricas del modelo. |

La web consume la API por HTTP. La API coordina catálogo, observaciones y adaptadores; PostgreSQL/PostGIS proporciona la persistencia espacial del entorno Compose. Los módulos IA/GIS permanecen paquetes locales, sin introducir colas, gateways ni microservicios adicionales. No se creó `packages/shared` sin una necesidad real: OpenAPI define el límite entre TypeScript y Python.

## Contratos

- `GET /health`: salud del proceso; `database: not_configured|not_checked` y `ai_provider` describen configuración, sin probar conexión ni inferencia.
- `GET /species`: ocho candidatos, `id`, `scientific_name`, `common_name`, estado taxonómico y procedencia. Una forma binomial válida no demuestra aceptación taxonómica.
- `POST /identify`: multipart `file`, `adult_confirmed`, `rights_confirmed`; JPEG/PNG/WebP de hasta 10 MiB validados en memoria. Mock devuelve `provider: mock` y abstención sin candidatos; Meta sin clave responde 503 y con clave 501 mientras falta el pipeline. Los clientes HTTP aislados no están conectados al endpoint.
- `GET/POST /observations`: PostgreSQL/PostGIS; JSON con `species_id` opcional, `notes` y `location` Point opcional WGS84. Sin configuración/conexión devuelve 503. Validar longitud/latitud y no convertir automáticamente una sugerencia IA en identificación confirmada. La web guarda solo un borrador local: todavía no conecta este flujo de persistencia.
- `GET /forest/sources` expone procedencia/licencia CHMv2; `POST /forest/analyze` acepta `source_id: chmv2` y `area: Polygon`, pero responde 501 sin raster configurado.
- GeoJSON usa orden `[longitud, latitud]`; todo fixture se rotula sintético. Alturas: metros estimados, nodata y procedencia explícitos.

## Decisiones del bootstrap

1. **Monorepo pequeño:** permite trabajar a José en web y a Giuseppe en servicios con un contrato revisable. Reconsiderar separación de repositorios solo si aparecen equipos/ciclos independientes.
2. **API ligera:** Pydantic valida HTTP y el dominio; GIS/ML pesado va en entornos separados. Evita que instalar la API requiera GPU o GDAL completo.
3. **Mock por defecto:** sin credenciales ni datos autorizados no se llama a Meta. El mock permite probar navegación y abstención, nunca simula evidencia científica.
4. **PostGIS en Compose:** prepara geometrías y persistencia sin añadir un servicio de mapas propio. El entorno local no se expone a internet.
5. **Sin raster masivo ni pesos:** el pipeline seleccionará ventanas y recursos versionados tras validar derechos y cobertura.
6. **Licencia del código pendiente de decisión de ProGarLabs:** repositorio público no equivale a licencia permisiva. Las licencias de dependencias/datos conservan sus obligaciones.

Las versiones exactas están en los lockfiles; el frontend inicial usa Next.js 16.4.3, React 19.3.1, Tailwind 4.3.3 y MapLibre 6.16.0. El entorno de referencia usa Node 24 LTS/Python 3.12. PostgreSQL 18/PostGIS 3.6 sigue la [imagen oficial recomendada](https://github.com/postgis/docker-postgis) consultada el 27-10-2026; la [dependencia por healthcheck](https://docs.docker.com/compose/how-tos/startup-order/) evita iniciar API antes de la base lista.

## Evolución y riesgo

Antes de IA real: confirmar modelo/endpoint habilitado, condiciones Standard/Contributor, consentimiento, retirada de EXIF y límites de tamaño; ejecutar pruebas de contrato con mocks y una prueba autorizada. Antes de datos reales: [gobernanza](DATA_GOVERNANCE.md), taxonomía y licencia. Antes de exposición pública: autenticación, retención/borrado, límites de petición, migraciones y backups. No se incluyen predicciones de crecimiento, invasoras ni riesgo eléctrico en la ruta crítica.

Registrar aquí fecha, problema, opción elegida, motivo y criterio para reconsiderar cualquier decisión transversal nueva; una decisión reversible pequeña puede documentarse en el PR.
