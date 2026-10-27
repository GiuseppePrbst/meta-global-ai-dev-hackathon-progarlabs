# Bosque Vivo Chile · ProGarLabs

Base de una plataforma de inteligencia botánica y forestal para explorar, comprender y conservar la biodiversidad chilena. Piloto de referencia: Parque Nacional Puyehue y su entorno. Desarrollo para la Meta Global AI Developer Hackathon 2026, Startup Track.

## Estado del bootstrap

Frontend Next.js, API FastAPI y contratos botánicos/geoespaciales en desarrollo inicial. Los ocho taxones son candidatos pendientes de validación; ninguna ficha demuestra presencia de un individuo en el piloto. El identificador de desarrollo es un **mock que se abstiene**: no ejecuta modelos Meta ni ofrece precisión inventada. CHMv2 está preparado como contrato y pipeline pendiente, sin raster descargado.

El alcance implementado, las pruebas realmente ejecutadas y los bloqueos se registran en [el reporte de bootstrap](docs/BOOTSTRAP_REPORT.md). El uso real de herramientas Meta y la admisión del equipo deben verificarse antes de la entrega competitiva.

## Requisitos

- Node.js 24 LTS y npm 11, Python 3.12 y [uv](https://docs.astral.sh/uv/).
- Docker con Compose v2 para PostgreSQL/PostGIS y el stack completo. Sin Docker se pueden ejecutar web y API; las observaciones requieren una base configurada.
- No hacen falta claves de Meta para las pruebas ni para el modo mock.

## Inicio local

Desde la raíz del repositorio:

```powershell
Copy-Item .env.example .env
npm ci
uv venv --python 3.12 .venv
uv pip install --python .venv/Scripts/python.exe -r requirements-dev.lock
```

En Linux/macOS cambia `.venv/Scripts/python.exe` por `.venv/bin/python`. El archivo lock incluye los tres paquetes locales; ejecuta los comandos desde la raíz.

```powershell
# Terminal 1: API, sin DB ni llamadas externas de IA
$env:AI_PROVIDER = 'mock'
.venv/Scripts/python.exe -m uvicorn bosque_api.main:app --reload --port 8000
# Terminal 2: aplicación web
npm run dev
```

Abre [la aplicación](http://localhost:3000), [OpenAPI](http://localhost:8000/docs) y [health](http://localhost:8000/health). Para guardar observaciones, inicia PostgreSQL/PostGIS y proporciona `DATABASE_URL` como se explica en [despliegue](docs/DEPLOYMENT.md).

Con Docker instalado:

```sh
docker compose up --build
```

Compose lee `.env`, inicializa PostGIS y conserva observaciones en un volumen. `docker compose down` conserva ese volumen; no uses `down -v` si necesitas mantener datos. Esta configuración es exclusivamente local y escucha en loopback.

## Verificación

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

```powershell
.venv/Scripts/python.exe -m ruff check services
.venv/Scripts/python.exe -m ruff format --check services
.venv/Scripts/python.exe -m pytest services -q
python scripts/check_repository.py
python -m unittest discover -s scripts/tests
docker compose config --quiet
```

Playwright necesita Chromium (`npx playwright install chromium`). La CI ejecuta estas comprobaciones, un escaneo Gitleaks y pruebas de persistencia con PostGIS. El reporte distingue las comprobaciones locales de las de CI.

## Organización

| Ruta | Responsabilidad |
| --- | --- |
| `apps/web` | Next.js, TypeScript, Tailwind y MapLibre; interfaz y recorridos |
| `services/api` | FastAPI, validación y persistencia PostgreSQL/PostGIS |
| `services/botanical-ai` | Contratos, mock y cliente Meta aislado |
| `services/geospatial` | GeoJSON, fuentes y contrato CHMv2; GIS pesado opcional |
| `data/public`, `data/synthetic` | Catálogo provisional y fixtures explícitos con procedencia |
| `evaluations` | Metodología y evaluación reproducible, sin resultados inventados |
| `docs` | Producto, ciencia, gobernanza, arquitectura y operación |
| `scripts`, `.github` | Controles del repositorio y CI |

No hay un paquete `shared` vacío: OpenAPI es el contrato entre Python y la web. [Arquitectura](docs/ARCHITECTURE.md), [backlog](docs/BACKLOG.md), [roadmap](docs/ROADMAP.md) y [guía de contribución](CONTRIBUTING.md).

## Equipo, derechos y datos

José Schwerter lidera Frontend/UI/UX; Giuseppe Proboste lidera GIS/ML. Fabiana García es cofundadora y responsable empresarial de diseño de producto; **su admisión competitiva no está confirmada**, y cualquier aporte a la entrega requiere revisión de elegibilidad. Los cargos no otorgan ni restringen autoría o permisos Git. [Gobernanza completa](docs/TEAM_AND_GOVERNANCE.md).

Los datos de Hepta Insights y sus derivados son **RESTRICTED**: deben permanecer fuera del repositorio y los worktrees y no se pueden enviar a Meta. Las claves solo viven en backend. [Política de datos](docs/DATA_GOVERNANCE.md), [licencias de fuentes](docs/DATASET_LICENSES.md) y [seguridad](docs/SECURITY.md).

Repositorio público no equivale a licencia abierta de todos sus contenidos. No se concede una licencia de código hasta que ProGarLabs la decida explícitamente; cada dataset conserva sus términos. No se incluyen fotografías ajenas ni datasets restringidos.
