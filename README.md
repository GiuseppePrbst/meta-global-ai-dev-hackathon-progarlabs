# Bosque Vivo Chile · ProGarLabs

Base de una plataforma de inteligencia botánica y forestal para explorar, comprender y conservar la biodiversidad chilena. Piloto de referencia: Parque Nacional Puyehue y su entorno. Desarrollo para la Meta Global AI Developer Hackathon 2026, Startup Track.

## Estado del bootstrap

Frontend Next.js y API FastAPI sobre el bootstrap existente. La fundación GIS/ML añade
taxonomía GBIF trazable para ocho especies, Muse estructurado y SAM opcional, evaluación
reproducible y estadísticas CHMv2 con raster sintético y una ventana real pequeña. El mock
sigue disponible sin claves y se abstiene. Las pruebas reales Meta usan un dibujo sintético;
no hay precisión botánica medida. Rasgos y validación humana siguen pendientes.

Estado vigente: [reporte GIS/ML](docs/GIS_ML_REPORT.md), [contratos para José](docs/API_INTEGRATION.md).

El alcance implementado, las pruebas realmente ejecutadas y los bloqueos se registran en [el reporte de bootstrap](docs/BOOTSTRAP_REPORT.md). El uso real de herramientas Meta y la admisión del equipo deben verificarse antes de la entrega competitiva.

## Requisitos

- Node.js 24 LTS y npm 10 o superior, Python 3.12 y [uv](https://docs.astral.sh/uv/).
- Docker con Compose v2 para PostgreSQL/PostGIS y el stack completo. Sin Docker se pueden ejecutar web y API; las observaciones requieren una base configurada.
- No hacen falta claves de Meta para las pruebas ni para el modo mock.

## Inicio local

Desde la raíz del repositorio:

```powershell
Copy-Item .env.example .env
npm ci
uv sync --project services/api --extra dev --frozen
```

En una shell Linux/macOS usa `cp .env.example .env` en lugar de `Copy-Item`; los comandos npm/uv son iguales. `services/api/uv.lock` fija los tres paquetes locales y sus dependencias; ejecuta los comandos desde la raíz.

```powershell
# Terminal 1: API, sin DB ni llamadas externas de IA
uv run --project services/api --extra dev --frozen uvicorn bosque_api.main:app --reload --port 8000
# Terminal 2: aplicación web
npm run dev
```

Abre [la aplicación](http://localhost:3000), [OpenAPI](http://localhost:8000/docs) y [health](http://localhost:8000/health). Para guardar observaciones, inicia PostgreSQL/PostGIS y proporciona `DATABASE_URL` como se explica en [despliegue](docs/DEPLOYMENT.md).

La web usa `http://localhost:8000` por defecto. Para otra URL en desarrollo crea `apps/web/.env.local` con `NEXT_PUBLIC_API_URL=...` y reinicia Next. La `.env` raíz configura API/Compose; Next no la lee desde el workspace. Las variables `NEXT_PUBLIC_*` son públicas y se fijan durante el build.

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
uv run --project services/api --extra dev --frozen ruff check services
uv run --project services/api --extra dev --frozen ruff format --check services
uv run --project services/api --extra dev --frozen pytest -c services/api/pyproject.toml services -q
python scripts/check_repository.py
python -m unittest discover -s scripts/tests
docker compose config --quiet
```

Playwright necesita Chromium (`npx playwright install chromium`) y el build previo: prueba el servidor de producción. La CI ejecuta estas comprobaciones, un escaneo Gitleaks y pruebas de persistencia con PostGIS. El reporte distingue las comprobaciones locales de las de CI.

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
