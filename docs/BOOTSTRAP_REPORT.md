# Reporte de inicialización · Bosque Vivo Chile

Fecha: 27 de octubre de 2026, America/Santiago. Este reporte distingue el bootstrap ejecutado de las funcionalidades futuras. La revisión humana del PR y el uso real de Meta siguen siendo requisitos posteriores.

## A. Diagnóstico inicial

- El directorio contenía únicamente `.git`: rama `main` sin commits, `origin` correcto, ningún archivo de trabajo y ningún ref remoto. Se conservó esa configuración; no se eliminó contenido ni se reescribió historia.
- GitHub confirmó repositorio público `GiuseppePrbst/meta-global-ai-dev-hackathon-progarlabs` y cuenta activa personal `GiuseppePrbst` mediante `gh auth status`, `gh api user --jq .login`, `gh repo view` y `git ls-remote`.
- La identidad local era `GiuseppePrbst`. Inicialmente faltaba permiso para verificar correos: se detuvieron las escrituras Git. El usuario completó `gh auth refresh -h github.com -s user:email`; la API confirmó que el correo configurado pertenece a la cuenta y está verificado. Autor y committer se comprobaron antes del commit raíz. No se añadieron autores de agentes/bots ni se cambió la identidad.
- Herramientas detectadas: Git 2.54.0.windows.1, GitHub CLI 2.96.0, npm 10.2.4, Python predeterminado 3.14.2 y uv 0.12.3. El Node predeterminado 20.11.1 es insuficiente para las herramientas de pruebas actuales; se utilizó el runtime Node 24.19.0 disponible en el equipo. Python del proyecto: 3.12. Docker/Compose no están instalados localmente.
- Fuentes oficiales y límites de verificación: [SOURCES.md](SOURCES.md). No se tomaron credenciales del repositorio ni se descargaron datos restringidos.

## B. Implementación ejecutada

- `apps/web`: cinco rutas Next.js/TypeScript/Tailwind (inicio, atlas, especies, identificar, proyecto), componentes reutilizables, navegación responsive, estados de carga/vacío/error, MapLibre con atribución OSM, búsqueda de especies y fotografía local con consentimiento. El borrador guardado es texto local recuperable, sin foto ni coordenadas.
- `services/api`: FastAPI/Pydantic, OpenAPI, catálogo de ocho taxones provisionales, detalle de especie, validación de imagen y consentimiento, identificación mock explícita, persistencia de observaciones PostgreSQL/PostGIS y contratos forestales. Sin DB se devuelve 503; análisis sin raster devuelve 501.
- `services/botanical-ai`: transporte Meta aislado, timeout, errores sanitizados y adaptadores Muse/SAM probados con mocks. El endpoint de aplicación no envía imágenes a Meta: con proveedor real configurado devuelve 501 hasta validar el pipeline.
- `services/geospatial`: Point/Polygon WGS84, validación de geometrías, metadatos CHMv2, proveedor aún no configurado y pipeline raster documentado. Dependencias GIS pesadas opcionales.
- `data/public`, `data/synthetic`, `evaluations`: procedencia del catálogo, fixture inequívocamente sintético y protocolo de evaluación; sin fotografías externas, rasters, pesos ni métricas de modelos.
- README, AGENTS, CONTRIBUTING, gobernanza, arquitectura, roadmap del 27 de octubre al 4 de noviembre, backlog E01–E11 y ocho documentos de producto. `.env.example`, Compose, Dockerfiles, lockfiles, plantillas de issue/PR y CI con permisos mínimos y acciones fijadas por SHA.

## C. Validaciones

Los comandos se ejecutan desde la raíz. `uv run` usa `--project services/api --extra dev --frozen`. Para web se usó Node 24 explícitamente con el CLI npm disponible, evitando el shim local que inicia Node 20.

| Comando / comprobación | Resultado y evidencia | Límite |
| --- | --- | --- |
| `gh auth status`; `gh api user`; `gh api user/emails` | Cuenta autorizada y correo local verificado | No acredita admisión al evento. |
| `git ls-remote origin`; `git var GIT_AUTHOR_IDENT`; `git var GIT_COMMITTER_IDENT` | Remoto vacío antes del commit raíz; identidad personal correcta | Se revalida antes de publicar. |
| `uv lock --project services/api --check` | Lock consistente, resolución de 37 paquetes | GIS pesado no instalado. |
| `uv run … ruff check services`; `uv run … ruff format --check services` | Pasan | No sustituyen pruebas de modelos. |
| `uv run … python -c "import bosque_api.main, bosque_ai.meta, bosque_geo.contracts"`; `uv pip check --python services/api/.venv/Scripts/python.exe` | Imports y dependencias compatibles | Runtime Python 3.12.13; en Linux el intérprete está en `.venv/bin/python`. |
| `uv run … pytest -c services/api/pyproject.toml services -q` | **50 pasan, una omitida** (PostGIS sin `TEST_DATABASE_URL`), un aviso upstream de Starlette/httpx TestClient | No prueba inferencia ni raster. |
| API real con Uvicorn + cliente HTTP y PNG sintético generado en memoria | `/health` 200, `/species` ocho provisionales, `/identify` 200 `insufficient_evidence`/mock sin candidatos, `/observations` 503 sinDB, `/forest/analyze` 501 sin raster, `/openapi.json` 200 | No es una prueba Meta ni una evaluación botánica. |
| `npm run lint`; `npm run typecheck`; `npm test`; `npm run build` | Lint/typecheck/build pasan; **tres pruebas unitarias** pasan; `npm install` auditó sin vulnerabilidades reportadas | Node 24.19.0, npm 10.2.4. |
| `npm run test:e2e` | **Seis recorridos pasan**, tres por escritorio/móvil, incluida recuperación del borrador tras recargar | Chromium; no prueba Safari, dispositivos físicos ni Meta real. |
| `python -m unittest discover -s scripts/tests` | Pasa prueba de límites de publicación con subcasos permitidos/prohibidos | No detecta todas las formas posibles de datos privados. |
| `python scripts/check_repository.py` | Pasan estructura (**34 archivos requeridos**), enlaces Markdown y rutas publicables | No valida por sí solo licencias externas. |
| `gitleaks git --pre-commit --staged --redact --no-banner` | Sin secretos detectados en los commits preparados; CLI 8.30.1 con SHA-256 contrastado contra checksums del release oficial | El escáner no constituye una garantía absoluta. |
| `docker compose config --quiet`; build/runtime Compose | No ejecutados localmente: Docker ausente | La CI prepara configuración, build de imágenes y prueba PostGIS. |

La CI `.github/workflows/ci.yml` ejecuta web (incluido Playwright desktop/móvil), API con PostGIS, imports y health HTTP, estructura/enlaces, Compose y Gitleaks. Su estado remoto se documentará cuando exista el PR; no se atribuye éxito a un workflow aún no ejecutado.

## D. Git y GitHub

- `main` real publicada: commit raíz `a140f04` (`chore: establish Bosque Vivo project governance`), autor/committer personal `GiuseppePrbst` con correo verificado. El SHA remoto se comprobó después del push.
- Rama de desarrollo: `chore/project-bootstrap`, creada después del commit raíz.
- API/GIS/IA y datos iniciales: `a3f0915` (`feat: bootstrap botanical API and GIS AI contracts`). Los siguientes commits de web, documentación e infraestructura se consultan con `git log main..HEAD --oneline`.
- Publicación de la rama y PR: en preparación al redactar esta versión; se actualizará con URL y verificaciones efectivas antes de la entrega.
- No merge automático, force push ni cambios destructivos. Los pushes usan el helper de credenciales de la sesión personal de `gh`, sin una herramienta autenticada como otra persona.
- Se crearon y comprobaron **11 issues** E01–E11 con todos los campos de aceptación del backlog, sin asignar cuentas no verificadas y revisando duplicados antes de crear. Enlaces en [BACKLOG.md](BACKLOG.md).

## E. Arquitectura

Web → HTTP/OpenAPI → FastAPI → catálogo y PostgreSQL/PostGIS. Los paquetes ligeros IA/GIS aíslan transporte, contratos y validación. `package-lock.json` y `services/api/uv.lock` fijan dependencias; no se creó `packages/shared` vacío ni nuevos servicios de red para lógica que puede permanecer local. Compose usa PostgreSQL 18/PostGIS 3.6 y volumen `/var/lib/postgresql`.

La integración Meta real, las máscaras SAM interpretadas, la taxonomía aceptada, los registros de campo y el raster CHMv2 aún están pendientes. El mapa es contexto de referencia, sin inventar límites oficiales, rutas o individuos. CHMv2 representa alturas estimadas, nunca crecimiento anual. Detalles y contratos: [ARCHITECTURE.md](ARCHITECTURE.md), OpenAPI y README de los servicios.

## F. Equipo

- **José Schwerter:** Frontend/UI/UX, web, componentes, accesibilidad, captura, MapLibre y pruebas de interfaz. Puede trabajar desde `apps/web` sobre el contrato actual.
- **Fabiana García:** cofundadora y Product Designer, visión, discovery, públicos, prioridades y estrategia empresarial. No se declara admitida ni se le atribuyen aportes competitivos; cualquier integración de su trabajo a la entrega requiere aclaración de elegibilidad.
- **Giuseppe Proboste:** GIS/ML, IA Meta, datos, taxonomía, PostGIS, CHMv2 y evaluación científica. Puede trabajar en `services`, `data` y `evaluations` en paralelo a José.
- Interfaces y RACI: [TEAM_AND_GOVERNANCE.md](TEAM_AND_GOVERNANCE.md). Las decisiones funcionales, la admisión competitiva y la autoría/permisos Git son dimensiones independientes.

## G. Siguientes cinco tareas

1. Revisar el PR y los checks; integrar mediante revisión humana cuando proceda.
2. Confirmar admisiones, representante, reglas finales del Startup Track, derechos y licencia del código/datos propios. La fuente accesible no confirma todas las reglas del encargo.
3. Giuseppe valida los ocho taxones y reúne fotografías autorizadas con etiquetas independientes y manifiesto de licencias.
4. En paralelo: José refina fichas/captura/atlas y sus estados sobre el contrato; Giuseppe valida acceso real Muse/SAM, interpreta salidas, elimina EXIF y conecta el pipeline con abstención y evaluación.
5. Giuseppe valida una ventana CHMv2 y observaciones PostGIS; José integra resultados y procedencia en el atlas, acordando cualquier cambio de API antes de aplicarlo.

## H. Riesgos y límites

- Bootstrap ejecutable no equivale a entrega competitiva terminada: faltan uso real elegible de Meta, evaluación botánica, despliegue público, video y envío oficial.
- Las API de observaciones son de desarrollo, sin autenticación/retención/borrado de producción. Mantener puertos en loopback; no exponerlas directamente a internet.
- No se dispone de Docker local ni se ha realizado inferencia real. El Node predeterminado del equipo requiere actualización a la versión documentada para usar los comandos habituales sin seleccionar el runtime explícito.
- Taxonomía, cobertura/error local CHMv2 y licencia de recursos aún no incorporados requieren validación. La licencia de código y datos originales queda pendiente de decisión de ProGarLabs; no se otorgó CC0 sin autorización.
- Hepta y derivados permanecen RESTRICTED y fuera del repositorio/worktrees; sin autorización para descarga, API externa, entrenamiento o publicación.
- Fabiana no tiene admisión confirmada; tampoco se deduce la de otros integrantes por tener acceso Git. Revisar reglas vigentes y el formulario autenticado antes del cierre oficial, 4 de noviembre 21:00 ET (23:00 Santiago).
