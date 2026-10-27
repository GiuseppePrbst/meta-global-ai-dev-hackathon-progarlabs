# Ejecución y despliegue

El bootstrap prepara desarrollo local y CI. No se ha desplegado a producción. Node 24 LTS, npm 10 o superior, Python 3.12 y uv 0.12.3 son las referencias del proyecto; `package-lock.json` y `services/api/uv.lock` fijan las dependencias. No se requieren claves Meta para arrancar.

## Desarrollo sin Docker

Desde la raíz del repositorio, instalar Node/npm y `uv` compatibles con las versiones documentadas en el README. Crear `.env` a partir de `.env.example`; conservar `AI_PROVIDER=mock` y `DATABASE_URL` vacío si no hay PostgreSQL. La API funcionará, pero observaciones responderá 503 sin base configurada.

```powershell
npm ci
uv sync --project services/api --extra dev --frozen
uv run --project services/api --extra dev --frozen uvicorn bosque_api.main:app --reload --port 8000
```

En otra terminal, desde la raíz:

```powershell
npm run dev
```

Web en `http://localhost:3000`; API en `http://localhost:8000`; OpenAPI interactivo en `http://localhost:8000/docs`. El proceso de salud no comprueba inferencia real ni conecta automáticamente a todos los servicios. Revisar `database` y `ai_provider` en su respuesta: `not_checked` indica configuración existente, no una conexión validada.

Next lee su configuración local desde `apps/web/.env.local`, no desde `.env` raíz. Para cambiar la API local establece allí `NEXT_PUBLIC_API_URL` y reinicia Next. En Compose la variable raíz es un argumento de build; reconstruye la web si cambia. Nunca pongas secretos en una variable `NEXT_PUBLIC_*`. En Linux/macOS copia el ejemplo con `cp .env.example .env`.

```powershell
Invoke-RestMethod http://localhost:8000/health
Invoke-RestMethod http://localhost:8000/species
```

## Docker Compose

```powershell
docker compose config --quiet
docker compose up --build
```

Compose proporciona web, API y PostgreSQL 18/PostGIS 3.6 para desarrollo. El volumen de PostgreSQL 18 se monta en `/var/lib/postgresql`; preservar el volumen para no perder observaciones. No usar `docker compose down --volumes` salvo que se quiera borrar expresamente la base de desarrollo. Consultar el archivo Compose para puertos y healthchecks actuales.

La inicialización SQL está en `services/api/sql/001_init.sql`; se aplica al crear un volumen vacío. No sustituye un sistema de migraciones para una base existente: si cambia el esquema, preparar migración revisada y backup antes de aplicarla. La API acepta una URL PostgreSQL o cadena libpq en `DATABASE_URL`. Compose utiliza `host=db port=5432` y variables estándar `PGDATABASE`, `PGUSER`, `PGPASSWORD` para evitar interpolar la contraseña en una URL; no utilizar credenciales de desarrollo en internet. Para API ejecutada en el host, usa `localhost` y configura una URL con credenciales codificadas o las variables libpq equivalentes.

**Limitación local:** el host de inicialización no tiene Docker CLI disponible. No se declaró una ejecución local de contenedores ni una validación local de Compose; la evidencia posterior de CI se registra en el informe. Una configuración preparada no demuestra que los contenedores hayan arrancado.

## Verificaciones

```powershell
npm run lint
npm run typecheck
npm test
npm run build
uv run --project services/api --extra dev --frozen ruff check services
uv run --project services/api --extra dev --frozen ruff format --check services
uv run --project services/api --extra dev --frozen pytest -c services/api/pyproject.toml services -q
```

Las pruebas Playwright se ejecutan con `npm run test:e2e`, requieren Chromium (`npx playwright install chromium`) y `npm run build` previo; levantan el servidor de producción. El README y el [reporte](BOOTSTRAP_REPORT.md) especifican los comandos realmente ejecutados y las limitaciones. Para PostGIS real, configurar `TEST_DATABASE_URL` con una base de pruebas y seguir la prueba de integración; crea y elimina un esquema UUID propio. No apuntar tests a una base productiva.

## Antes de un despliegue público

Elegir proveedor y presupuesto; añadir HTTPS, autenticación/autorización de observaciones, límites de petición, CORS exacto, gestión de secretos, consentimiento/retención/borrado y backups con prueba de restauración. Ver [SECURITY.md](SECURITY.md). Verificar licencias del mapa base y datasets y no publicar fixtures como terreno real.

Para Meta: configurar la clave solo en backend tras revisar acceso, derechos y términos. La existencia de clientes HTTP no completa el pipeline `/identify`; en esta base el modo Meta sin clave responde 503 y con clave responde 501 mientras falta la integración de dominio. No introducir claves para aparentar que el flujo ya funciona.

Para CHMv2: seleccionar un recurso v2 permitido, verificar cobertura, procesar una ventana pequeña y probar CRS/nodata/unidades antes de habilitar resultados. `/forest/analyze` devuelve 501 sin pipeline raster implementado.

## Release y recuperación

Congelar cambios el 3 de noviembre, revisar PR/checks, etiquetar el commit validado y conservar configuración/manifest sin secretos. Ensayar demo con cuenta/datos permitidos. Ante fallo, regresar a la imagen/commit previamente verificado y restaurar base desde backup probado; evitar cambios de esquema destructivos. El merge y el despliegue final requieren revisión humana y no se ejecutan automáticamente en el bootstrap.
