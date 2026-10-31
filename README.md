# Bosque Vivo Chile · ProGarLabs

Bosque Vivo Chile es una plataforma de exploración, aprendizaje y colección de biodiversidad que construye una representación digital verificable —un gemelo digital— de los ecosistemas de los parques nacionales de Chile. Abarca flora, fauna y hongos, y comienza en el **Parque Nacional Puyehue** (sector Anticura). Desarrollo para la Meta Global AI Developer Hackathon 2026, Startup Track.

## Definición vigente (31-10-2026)

| Documento | Contenido |
| --- | --- |
| [Visión de producto y gemelo digital](docs/PRODUCT_VISION_ECOSYSTEM.md) | Visión, flora, fauna y Fungi, cinco pantallas, aventura, Wilo, MVP frente a futuro |
| [Piloto Parque Nacional Puyehue](docs/PILOT_PUYEHUE.md) | Fuentes oficiales, Anticura, especies documentadas, reglas, primera expedición |
| [Nómina RCE 2026](docs/RCE_CONSERVATION_2026.md) | Archivo oficial MMA, hash, ámbitos regionales, plan de importación |
| [Modelo de datos del gemelo digital](docs/ECOSYSTEM_DATA_MODEL.md) | Entidades, tipos de evidencia, privacidad, APIs futuras |
| [Roadmap](docs/ROADMAP.md) | P0 MVP, P1 territorial, P2 nacional, P3 avanzado |
| [Contratos para José](docs/API_INTEGRATION.md) | Qué está implementado hoy y qué depende de trabajo backend |

**Implementado hoy:**

- catálogo e identificación de **ocho especies arbóreas**, con la estrategia de conjunto
  abierto `verify` y abstención;
- capturas y colección privadas;
- expedición de referencia;
- contexto GIS y CHMv2;
- guía con herramientas.

Fauna, hongos, catálogo multirreino, conservación RCE consultable y senderos son
**propuestas** (P1). El gemelo digital no es una simulación en tiempo real.

## Estado técnico

Web Next.js, app móvil Expo (PR #23) y API FastAPI con PostGIS. Componentes de IA y datos:

- **Muse Spark 1.3.** Identifica las ocho especies con la estrategia `verify` (dos etapas,
  abstención), predeterminada en `/identify` desde el PR #22. En un conjunto independiente
  congelado de 56 casos con etiquetas débiles, los negativos aceptados bajaron de 25/37 a
  3/37 y los aciertos aceptados de 10/19 a 8/19. Es exploración, **no precisión botánica
  certificada**: falta la revisión de un especialista
  ([informe](docs/OPEN_SET_IDENTIFICATION_REPORT.md)).
- **SAM 3.1.** Herramienta opcional de selección visual: máscara real de imagen y primer
  tracking positivo en video privado, sin métricas temporales por falta de referencias
  humanas ([campaña](docs/META_VALIDATION_CAMPAIGN_REPORT.md)). La segmentación no prueba
  la especie.
- **CHMv2.** Estadísticas de altura estimada sobre una ventana real pequeña; no mide
  crecimiento.
- **Modo mock.** Sigue disponible sin claves y se abstiene.

Historial: [reporte GIS/ML](docs/GIS_ML_REPORT.md), [consolidación backend](docs/BACKEND_META_CONSOLIDATION_REPORT.md).

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
| `apps/mobile` | Expo/React Native; pestañas Atlas, Identificar, Observaciones y Especies |
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

Los datos de Hepta Insights y sus derivados son **RESTRICTED**: deben permanecer fuera del repositorio y los worktrees. La misión privada del 30-10-2026 tiene autorización específica para procesar fotos/videos seleccionados mediante Meta Standard Mode, sin publicación; no amplía otros usos. Las claves solo viven en backend. [Política de datos](docs/DATA_GOVERNANCE.md), [licencias de fuentes](docs/DATASET_LICENSES.md) y [seguridad](docs/SECURITY.md).

Repositorio público no equivale a licencia abierta de todos sus contenidos. No se concede una licencia de código hasta que ProGarLabs la decida explícitamente; cada dataset conserva sus términos. No se incluyen fotografías ajenas ni datasets restringidos.

Incremento de contexto: [QA forestal real, PostGIS y ponderación temporal CHMv2](docs/FOREST_CONTEXT_REPORT.md).

Investigación privada: [SAM 3.1 mediante Meta API](docs/META_SAM_API_RESEARCH.md),
[ejecución del laboratorio](tools/meta_sam_api_lab/README.md). El primer informe (30-10-2026)
registró dos solicitudes de video sin coincidencias; la campaña posterior logró el primer
tracking positivo con prompt espacial ([campaña](docs/META_VALIDATION_CAMPAIGN_REPORT.md)).

Prompts espaciales, correcciones y resolución: [investigación SAM espacial](docs/SAM_SPATIAL_RESEARCH.md),
sin inferencias nuevas pagadas. Fuentes botánicas de las ocho especies y crosswalk GBIF/COL XR:
[datasets](docs/BOTANICAL_DATASETS.md); protocolo y métricas: [evaluación](docs/BOTANICAL_EVALUATION.md).
