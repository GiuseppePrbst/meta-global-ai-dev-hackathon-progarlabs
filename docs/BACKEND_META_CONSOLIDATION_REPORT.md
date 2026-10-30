# Consolidación backend GIS/ML y Meta — 29 de octubre de 2026

## A. Diagnóstico

Inicio limpio en `2774c1c`, rama `feat/forest-context-validation`. GitHub autenticado como
GiuseppePrbst; autor/committer GiuseppePrbst y correo personal verificado mediante `user/emails`.
`main` estaba en `4d26eb1`, con #14 móvil; #15 abierto y #16 draft sobre bootstrap.
Main sin protección clásica (404 Branch not protected), sin reglas aplicables y sin
revisiones pendientes obligatorias. Se permiten merge commits. No se eludieron protecciones.
Baseline: 98 pruebas pasan, dos PostGIS omitidas, un aviso upstream Starlette/httpx.

## B. Consolidación autorizada

La autorización explícita del nuevo encargo permite integrar #15 y #16 bajo sus condiciones.
Se auditó el diff sin cambios web/móvil, ascendencia y resultado combinado.

| Operación | Resultado / evidencia |
| --- | --- |
| #15 merge commit | `804c24b2ad2e7a71438f8a019144affc1d0b2ab4`; conserva #14 |
| #15 CI posterior en main | [40983628132](https://github.com/GiuseppePrbst/meta-global-ai-dev-hackathon-progarlabs/actions/runs/40983628132), success |
| #16 base → main | Fundación `a93709c` verificada como ancestro; diff propio de 32 archivos |
| Reconciliación de #16 | `0992458`, merge de main sin conflictos ni reescritura; web/móvil idénticos a main |
| #16 CI combinado | [40983705227](https://github.com/GiuseppePrbst/meta-global-ai-dev-hackathon-progarlabs/actions/runs/40983705227), los tres jobs success |
| #16 merge commit | `95963eeecd7287708142df921a6e1c52b14f62f2` |
| Main consolidado CI | [40983887828](https://github.com/GiuseppePrbst/meta-global-ai-dev-hackathon-progarlabs/actions/runs/40983887828), success |

Se pasó #16 a revisable después de auditarlo y se fusionó después de CI combinado aprobado.
Nueva rama `feat/backend-meta-consolidation` desde main `95963ee`. Bootstrap se conserva.
No force-push, squash, rebase destructivo ni cambios de autoría.

## C. Información científica y procedencia

Fuente de evidencia de esta misión: [recibo estructurado](../evaluations/backend-validation-2026-10-29.json).
Procedencia fuente, derechos y hashes originales siguen en
[QA forestal](../data/public/forest-context-qa-2026-10-27.json),
[taxonomía GBIF](../data/public/taxonomy-gbif-2026-10-27.json) y los manifiestos locales.
No se descargaron otra vez fuentes ya verificadas ni el RAR regional de 945 MB.

Se conservan las ocho especies: nombres aceptados/sinónimos/familia/género contrastados
con GBIF; rasgos, natividad, conservación y revisión humana continúan pendientes cuando
no tienen evidencia. El prompt diferencia explícitamente rasgos pendientes de verificados;
incluye nombres aceptados/sinónimos y procedencia taxonómica del catálogo.
WFO, catálogo chileno y RCE/SIMBIO/SBAP no se presentan como consultados en este incremento.
No se copiaron textos o imágenes de libros/PPTX. Distribuciones MINAGRI/CIREN del mismo
catastro no son validaciones independientes. Hepta no fue accedido ni transferido.

## D. PostGIS real

Usuario autorizó instalar PostgreSQL/PostGIS de pruebas en WSL tras verificar alternativas.
Ubuntu ofrecía PostgreSQL 18; el intento de paquete 16 falló sin instalarlo.
Se instalaron PostgreSQL 18.6 y PostGIS 3.6.2. WSL/systemd rechazó el arranque de la unidad;
se inició el clúster mediante `pg_ctlcluster --skip-systemctl-redirect`.
Clúster separado `18/bosque-demo`, loopback puerto 55439, usuario `bosque_demo`
NOSUPERUSER/NOCREATEDB/NOCREATEROLE. La aplicación nunca usó credenciales administrativas.
Se detuvo el clúster `18/main` creado automáticamente por la instalación.

Bases separadas: `bosque_demo_20261029` para fuentes reales y `bosque_demo_tests_20261029`
para pruebas sintéticas. No se usaron bases de clientes. Secretos de prueba fuera de Git.
Migraciones 001/002/003 aplicadas. Cuatro features válidas en MultiPolygon/SRID 4326:
CONAF/CIREN IDs 23486, 23541, 23631 y BCN objectid 2826; dos capas.
Hashes del bundle/recortes y conteos constan en el recibo, sin publicar sus geometrías.
CIREN declara 3857; BCN .prj 3857 y CPG UTF-8 verificados en la misión anterior.
El SHP MINAGRI anunciado 32718 no se confunde con la distribución REST.

Ingesta del mismo bundle ejecutada dos veces, sin duplicar. HTTP real autenticado en
127.0.0.1:8059: capas, interior, exterior, borde, AOI, hueco y MultiPolygon.
Interior: un match forestal y uno protegido. Exterior: no_coverage. AOI: cobertura por unión
≈250000 m² por fuente. MultiPolygon: cobertura parcial ≈0,891056; borde marcado explícitamente.
No se repararon geometrías ni se infirió ausencia ecológica/legal.

Las primeras pruebas heredaron por error variables demo y luego detectaron fallback de
`search_path` a tablas reales en public tras rollback. Se separaron las bases y se ejecutó
la suite completa nuevamente: 111 pasan, ninguna omitida. No se alteró código para ocultar fallos.

003 añade propietario, precisión declarada y ledger. El rollback bloquea eliminar propietarios
si quedan observaciones privadas; la precisión aditiva se conserva para evitar pérdida de datos.
La eliminación de datos personales es específica por propietario; no una operación global.

## E. Meta AI

Documentación oficial consultada el 29-10: [Chat Completions](https://dev.meta.ai/docs/cookbook/quickstart-chat-completions),
[JSON estructurado](https://dev.meta.ai/docs/cookbook/structured-output),
[parser SAM](https://dev.meta.ai/docs/sam/client-libraries) y
[precios/modos](https://dev.meta.ai/docs/pricing-rate-limits).
Se conserva httpx, Muse Chat Completions con json_schema/Pydantic y SAM Responses SSE con
parser Python oficial fijado en lockfile. Sin segundo cliente, pesos nuevos o reintentos.
Muse limita generación a 1200 tokens. Versiones de paquetes en el recibo.

Usuario autorizó dos llamadas sintéticas, máximo USD 1. La clave del archivo indicado se
cargó solo en memoria/entorno backend, sin imprimir/copiar al repositorio. Un primer HTTP
429 bloqueó todo consumo: una reserva sintética previa ocupaba el ledger. Se cerró como
validation_error sin devolución; se conservaron sus 100 unidades. La reserva de la prueba
real fue 999900 de un límite 1000000. El siguiente intento emitió solo SAM y Muse, sin retry.

SAM 3.1 completed, una imagen; Muse Spark 1.3 completed/insufficient_evidence, cero candidatos.
Total 10650 ms; SAM 2255 ms, Muse 7973 ms. Muse reportó 1086 input / 946 output tokens.
Estimación estándar: USD 0,007878, incluyendo SAM; no es factura, saldo ni cargo observado.
No se consultó un saldo de créditos. Se confirmó aceptación de solicitudes pagadas.
El proceso con la clave fue detenido al terminar las pruebas.

Se agregó después metadata taxonómica al prompt y precisión opcional al contrato; esos cambios
finales tienen pruebas mock/regresión, sin otra llamada pagada. El recibo distingue este límite.

## F. Evaluación botánica

No existe conjunto humano etiquetado/autorizado: n=0, estado not_evaluated y métricas nulas.
El [manifiesto](../evaluations/manifest.json) permanece vacío. Runner A/B operativo con mocks;
no se ejecutaron C/D/E ni se afirma mejora. Valida separación individuo/campaña/bloque/grupo
perceptual, hashes únicos, revisión de duplicados y autorización externa antes de inferencia.
La revisión perceptual es humana declarada; no se instaló detector automático.
Ejecuciones reales separan tipos de foto y requieren grupos. Nuevos contadores de negativos
y falsos positivos no convierten mocks en precisión. El dibujo no es un caso botánico evaluable.

## G. Backend y seguridad de demo

SERVICE_MODE=local conserva desarrollo/mocks y token Meta controlado, exclusivamente loopback.
SERVICE_MODE=demo exige credencial individual revocable antes de multipart/decodificación en
rutas privadas/costosas. Es una allowlist de demo, no login/identidad productiva.
Errores 401/429/503 fallan cerrados; 502 proveedor no se convierte en abstención. Correlation ID
generado por servidor, prompt/modelo, latencias y contadores; sin payloads/proveedor crudo en logs.

Ledger PostgreSQL transaccional con advisory lock compartido entre instancias: límites globales
y por identidad, solicitudes por día UTC, concurrencia, reserva antes de inferencia y registro
de uso por etapa/modelo. Reserva nunca se reembolsa aunque falle/expire. TTL diez minutos
recupera solo concurrencia; supera el máximo de dos llamadas de hasta 120 s cada una.
Unidades configurables; si se usan microUSD, el operador debe fijar una reserva conservadora
para sus modelos/entradas/precios. No es reconciliación automática con facturación ni garantía
monetaria para modelos arbitrarios. Sin DB/migración/presupuesto Meta, respuesta 503.

Observaciones demo: solo propias y no vencidas; heredadas sin dueño quedan ocultas. Eliminar
mediante DELETE propietario; 404 ajenas/inexistentes. Retención visible 30 días configurable;
purga física mediante mantenimiento explícito (no se instaló scheduler). No hay salida pública
de coordenadas personales, por lo que no se presenta generalización como implementada.
Antes de internet: TLS/proxy con límite de cuerpo, gestión segura de identidades y tokens,
operación de purga/backup y revisión de derechos/atributos. CORS no sustituye autenticación.

## H. GIS/CHMv2

Se conserva ventana y hashes originales. Tile 2102332230: seis adquisiciones, 2013-09-16 a
2018-09-15; no vigencia 2026 ni crecimiento anual. Fuente EPSG:3857, análisis ponderado
EPSG:32718, metros, política nodata/ceros ambiguos y fechas existentes.
HTTP real de ambas rutas con proceso spawn aislado: 200. Estadísticas exactas en recibo;
media centro 12,476806640625 m y ponderada 12,476807666423621 m.
Worker termina por timeout efectivo; prueba de bloqueo 60 s se interrumpe a 0,3 s y recupera
cupo. Semáforo padre por proceso más admisión global PostgreSQL en demo. Límites previos
AOI/píxeles/ruta local/hash se conservan y se verifican dentro del proceso aislado.
Datos/ventanas quedan fuera de Git; los recibos históricos no cambiaron.

## I. Contratos para José

[API_INTEGRATION](API_INTEGRATION.md) y OpenAPI runtime son el contrato. Diff estructural:
cero rutas/campos eliminados y cero campos obligatorios nuevos en modelos existentes.
Identification añade correlation_id, prompt_version, usage y stage_usage opcionales.
Observation/Create añade accuracy_m opcional; requiere ubicación y rango 0–200 m.
Única ruta nueva: DELETE /observations/{id}, necesaria para eliminación de datos propios.
Todas las rutas previas permanecen; en demo cambian requisitos de acceso documentados.
Web/móvil no se modificaron. José integra Bearer por identidad, errores, incertidumbre,
privacidad, datos históricos y ausencia de cobertura; nunca convierte contexto en etiqueta.

## J. Validaciones ejecutadas

```powershell
uv run --project services/api --extra dev --extra raster --extra data --frozen pytest -c services/api/pyproject.toml services -q
uv run --project services/api --extra dev --extra raster --extra data --frozen ruff check services evaluations
uv run --project services/api --extra dev --extra raster --extra data --frozen ruff format --check services evaluations
uv lock --project services/api --check
uv pip check --python services/api/.venv/Scripts/python.exe
python scripts/check_repository.py
python -m unittest discover -s scripts/tests
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
npm run typecheck --prefix apps/mobile
```

TEST_DATABASE_URL configurada de forma privada para la suite: 111 aprobadas, un aviso upstream.
Ruff/formato/imports/lock/47 dependencias compatibles. Web: lint/tipos/build, tres unitarias y
seis Playwright aprobadas. Typecheck móvil **falló por dependencias locales ausentes**:
Expo/React Native/tsconfig.base no instalados; no se instalaron ni modificó su implementación.
Python no tiene typechecker adicional configurado. Contrato anterior contrastado estructuralmente.
No se incorporaron dependencias Python nuevas ni cambió uv.lock.

Reproducción real: configurar DATABASE_URL no administrativo, aplicar SQL 001/002/003 con rol
de migración autorizado; configurar demo y lanzar uvicorn loopback 8059. Después:

```powershell
uv run --project services/api --extra raster --extra data --frozen python -m evaluations.backend_validation D:/temp/bosque-context-final-20261027/bundle.json --authorize-test-database --output D:/temp/nuevo-recibo-postgis.json
uv run --project services/api --frozen python -m evaluations.run evaluations/manifest.json --image-root D:/temp --provider mock
# Solo con una NUEVA autorización presupuestaria y evidencia de salida inexistente:
uv run --project services/api --frozen python -m evaluations.meta_backend_smoke --authorize-meta --budget-usd 1 --output D:/temp/nuevo-recibo-meta.json
```

El smoke pagado no se usa en CI. Sus 1200 tokens máximos y dibujo pequeño no sustituyen
políticas de reserva conservadora para otras entradas. CI usa fuentes sintéticas y mocks.

## K. Publicación

Autoría personal verificada. Asistencia declarada; no coautores ficticios. El escáner temporal
anterior había desaparecido: el push de reconciliación ocurrió antes de detectarlo. Se recuperó
Gitleaks 8.30.1 oficial fuera del repo, verificó SHA publicado y escaneó historia reconciliada
sin hallazgos; también pasaron controles CI. Nuevos pushes requieren staged/diff y scanner.
Commits funcionales `0f18f5c` y `4936282`, más cierre documental de trazabilidad, publicados
en `feat/backend-meta-consolidation`. [PR #17](https://github.com/GiuseppePrbst/meta-global-ai-dev-hackathon-progarlabs/pull/17)
abierto contra main, sin merge. [Checks vigentes](https://github.com/GiuseppePrbst/meta-global-ai-dev-hackathon-progarlabs/pull/17/checks)
y conclusión final se registran en el PR, evitando confundir una ejecución previa con su HEAD final.
No se publican archivos de conexión, claves, GeoJSON fuente, raster ni material Hepta.

## L. Cinco acciones para la demo

1. Revisar el nuevo PR y su CI; aprobar o corregir antes de integrarlo.
2. José conecta el modo demo autenticado y sus estados sin tratar no_coverage como ausencia.
3. Operar TLS/proxy, credenciales individuales, purga y reserva monetaria revisada antes de internet.
4. Obtener fotos etiquetadas por personas y permisos externos; congelar grupos y ejecutar A/B.
5. Validar rasgos/conservación y derechos/versiones territoriales con sus responsables científicos.

CI verde prueba software; no acredita producción, precisión botánica ni permisos nuevos.
