# Bosque Vivo Expediciones — informe técnico

Trabajo: 29-10-2026; publicación: 30-10-2026, America/Santiago. Backend implementado y probado con Meta
simulado; no equivale a evaluación botánica, acceso Meta real ni despliegue productivo.
Contratos para José en [API_INTEGRATION](API_INTEGRATION.md),
[VOICE_GUIDE](VOICE_GUIDE.md) y [CAPTURE_DOMAIN](CAPTURE_DOMAIN.md).

## A. Diagnóstico

Se ejecutaron `gh auth status`, `gh api user --jq .login`, `git status --short --branch`,
`git remote -v`, `git fetch origin --prune`, `git log --oneline -10` y
`gh pr view 17 --json state,isDraft,baseRefName,headRefName,mergeable,statusCheckRollup,reviews`.
Cuenta personal `GiuseppePrbst`, identidad local del mismo nombre y correo configurado
confirmado entre correos verificados de la cuenta. No se cambió autoría ni se usó otra cuenta.

Checkout limpio en `feat/backend-meta-consolidation`, HEAD
`7c9c2cec22eef489c08ca1ef243c229a961a268a`. #17 abierto contra main, no draft,
MERGEABLE, sin reviews, tres checks SUCCESS. Se creó `feat/meta-expeditions-gis-ml` desde
ese HEAD. #17 se reconsultó antes de publicar y continuaba abierto, sin cambios remotos.
No se hizo merge, rebase, force push ni cambio de frontend/móvil.

Baseline antes de editar: **108 pruebas Python pasan, 3 omitidas** sin TEST_DATABASE_URL.
Se encontró la base de pruebas existente en PostgreSQL 18/PostGIS 3.6 de WSL, clúster
`18/bosque-demo`, loopback 55439. Se reutilizó solo `bosque_demo_tests_20261029`, con
esquemas temporales sintéticos; no se migró ni alteró `bosque_demo_20261029`.
No se reinstaló infraestructura ni se imprimieron DSN, credenciales o datos privados.

## B. Identificación

`/identify` conserva la foto única y añade hasta dos vistas del mismo ejemplar, tipificadas
opcionalmente. Validación individual de MIME/contenido/dimensiones, límites 10 MiB por
imagen/20 MiB por intento y eliminación de metadata antes del proveedor. Muse usa el
cliente existente, catálogo cerrado, Pydantic/JSON Schema y prompt `botanical-multiview-v3`.
Rasgos observados/faltantes, contradicciones y recomendación enum son campos aditivos.
Los estados previos no cambian; errores de proveedor siguen como HTTP 502 separado.

SAM es opcional sobre primaria, con prompts cortos y parser oficial. Sin máscara/fallo,
se conserva original y estado; `use_segmentation` permite comparación explícita. No se
afirma beneficio de segmentación ni se segmentan silenciosamente las vistas adicionales.
Evidencia textual autenticada se guarda por propietario; fotos no se almacenan.

Se contrastaron hechos morfológicos breves para los ocho taxones con UdeC, SIB/APN y
Fundación R.A. Philippi; [fuentes/derechos](DATASET_LICENSES.md). `source_checked` no
significa revisión humana de campo. Conservación/natividad siguen pendientes; no se
añadió laurel ni otro taxón al catálogo. No hay probabilidades calibradas.

## C. Voz y agente

Adaptador `muse-voice-transcribe-1.0` conforme a documentación oficial consultada; WAV mono
PCM 16 bits a 16/24 kHz, máximo local 60 s/3 MiB, PUSH_TO_TALK, español y keywords.
No audio persistido ni proveedor TTS adicional. Mock no inventa transcripción.

Muse Spark 1.3 puede pedir herramientas de lectura reales del backend con argumentos
validados; una planificación, cuatro llamadas y una generación final, sin historial.
Herramientas: perfiles, comparación, rasgos, referencia de parque, progreso propio y contexto
forestal de captura propia. Rutas/observaciones públicas sin fuente revisada se declaran
unavailable. El modelo no recibe SQL, geometría, UUID de captura ni coordenadas exactas.
Respuesta final selecciona referencias efectivamente consultadas; sin fuentes se abstiene.
Esto comprueba procedencia de las referencias, no verdad de cada frase del LLM.

STT, herramientas y LLM tienen errores diferenciados y sanitizados. Ledger compartido
admite nuevas operaciones, sin reintentos ni reservas reembolsables. Las pruebas españolas,
latencia y uso corresponden a transporte simulado, no a una medición de Meta real.

## D. Expediciones, capturas y colección

Expedición `puyehue` de referencia, sin senderos/acceso vigente verificados ni individuos
localizados. Objetivo educativo: registrar sin dañar; no ranking ni incentivos por consumo.
Migración 004 amplía observations y añade identifications. Capture ID = observation ID,
sin segunda fuente de verdad. No se reenvían fotos al guardar una captura.

Propietario desde credencial; candidato seleccionado debe existir en la identificación
propia almacenada. Se distingue registered/identification_suggested, siempre unverified.
Se rechaza intento de escribir verified, identidad ajena y campos extra. Sin ubicación es
válido; con ella se exige consentimiento, WGS84 y precisión opcional 0–200 m. GPS >50 m
se marca, no certifica presencia ni implica fraude. Fechas con zona y no futuras.

Idempotencia por clave y por identificación, con lock transaccional/índices únicos y prueba
concurrente. Colección paginada privada con totales. Retención de vistas y purga/borrado
explícitos; IDs ajenos no se distinguen de inexistentes. Toda ubicación es privada, incluso
si conservación/sensibilidad del taxón todavía es desconocida. No existe feed público.
Rollback 004 bloquea pérdida de datos; comprobado en PostGIS sintético.

## E. GIS

Se reutilizan ContextStore/PostGIS, geometrías y algoritmos existentes. Capturas comprueban
interior/exterior/borde con ST_Covers únicamente si coinciden referencia BCN 2826, capa y
hash auditados. Sin fuente se declara not_checked; fuera de referencia no impone taxón.
El guía consulta ubicación solo en backend y envía composición predominante/limitaciones
y procedencia. Prueba dedicada confirma que no devuelve coordenadas al modelo.

Worker y estadísticas CHMv2 no cambiaron. El período previamente documentado del tile
2102332230 es 2013-09-16/2018-09-15; no medición 2026 ni crecimiento anual. El guía no
calcula raster nuevo. No se descargaron otra vez fuentes territoriales ni archivos masivos.
Los tests GIS previos continúan cubriendo huecos, multipartes, cobertura, CRS y nodata.

## F. Evaluación

Fotos botánicas etiquetadas/autorizadas: **n=0**, métricas de precisión nulas, manifiesto
existente sin casos nuevos. No se ejecutaron A/B real, BioCLIP, DINOv3 o experimento GIS
adversarial. No se hicieron nuevas llamadas pagadas: no hay presupuesto nuevo/material
permitido confirmado. La autorización histórica de USD 1 no se reutilizó.

Las nuevas pruebas comprueban transporte/protocolo, validación, abstención, herramientas,
referencias, permisos, gasto, concurrencia, retención, eliminación y contratos. No son
mediciones de precisión, WER ni seguridad científica del modelo real.

## G. Investigación privada

Hepta/Fabric/OneLake no se accedieron y ningún material restringido se descargó, procesó,
transfirió o incorporó. No se revisó la tabla privada ni se inventaron columnas/disponibilidad.
No hay resultados privados ni métricas divulgables nuevas.

Inspección local: NVIDIA GTX 1650 SUPER, 4096 MiB VRAM, driver 572.16; PyTorch ausente del
entorno API, disco D con unos 64 GiB libres al consultar. Esto no valida CUDA ni capacidad
de ejecutar SAM local. Licencias/checkpoints/modelos locales, videos y selección de muestra
quedan pendientes de autorización/entorno específico. No se descargaron pesos ni se instaló
ML pesado. P1 no bloquea el backend público.

## H. Seguridad y límites

Identidad antes de parsear cuerpos privados en demo y en nuevas rutas privadas aun local.
Consentimiento externo específico para voz/guía; claves solo backend. Reservas PostgreSQL
previas a decodificación STT/LLM, globales por día UTC, por identidad y concurrencia. Las
reservas VOICE/GUIDE son cero por defecto, por lo que falta de presupuesto falla cerrado.
El operador debe cubrir tres imágenes/SAM o dos generaciones según operación; unidades no
son facturación automática. No se comprobó saldo ni acceso Meta durante esta misión.

Sin contenido personal en ledger/logs; respuestas de proveedor no se exponen. Identidad demo
no es login productivo. Antes de internet: TLS, proxy/límite de cuerpos, operación de tokens,
purga/backup y revisión de reservas monetarias. La coincidencia de referencias no elimina
alucinaciones ni acredita resistencia adversarial del modelo.

## I. Contratos para José

OpenAPI runtime y [20 ejemplos completos](../evaluations/expeditions-contract-examples.json),
todos sintéticos, cubren los 16 casos requeridos más reintento y errores de guía separados.
Comparación estructural contra el código de **7c9c2ce** extraído en carpeta temporal:
cero rutas/campos eliminados y cero campos obligatorios nuevos en modelos existentes.
Se añaden ocho rutas distintas; GET/DELETE comparten `/captures/{capture_id}`.
Las pruebas validan ejemplos y los campos multipart requeridos originales.
Web/móvil no se modificaron. Guía retorna texto narrable y referencias; dispositivo aporta
TTS accesible opcional. Consentimientos, privacidad y taxonomía sugerida son estados de UI.

## J. Validaciones ejecutadas

Desde la raíz, Python 3.12.13/uv; extras dev/raster/data congelados. TEST_DATABASE_URL se
cargó en memoria desde configuración privada existente y apuntó exclusivamente a la base
de pruebas. La suite crea/elimina esquemas con UUID y fixtures inequívocamente sintéticos.

| Comando | Resultado local |
| --- | --- |
| `uv run --project services/api --extra dev --extra raster --extra data --frozen pytest -c services/api/pyproject.toml services -q` | **157 pasan**, ninguna omitida; un aviso upstream Starlette/httpx. Incluye PostGIS real, mocks Meta, migración/rollback, concurrencia y HTTP ASGI |
| `uv run … ruff check services evaluations` | Pasa |
| `uv run … ruff format --check services evaluations` | Pasa |
| `uv run … python -c "import bosque_api.main, bosque_ai.meta, bosque_ai.voice, bosque_ai.guide, bosque_geo.contracts"` | Pasa |
| `uv lock --project services/api --check` | Pasa, 47 paquetes; sin cambios de lock/dependencias |
| `uv pip check --python services/api/.venv/Scripts/python.exe` | 47 dependencias compatibles |
| `npm run lint`; `npm run typecheck`; `npm test`; `npm run build`; `npm run test:e2e` | Pasa con Node 24.19.0; 3 unitarias y 6 Playwright. Primer intento de Vitest con Node 20 falló por styleText; se corrigió seleccionando runtime existente Node 24 |
| `python scripts/check_repository.py`; `python -m unittest discover -s scripts/tests` | Pasa antes del cierre; se repite al preparar publicación |
| `git diff --check` | Pasa |

No hay typechecker Python adicional configurado. Typecheck/build web verifican el extremo
consumidor existente; no se añadieron recorridos visuales de voz/capturas. Docker/Compose
local no ejecutado por ausencia de Docker; se delega su comprobación al CI existente.
No se instalaron dependencias móviles. Gitleaks 8.30.1 pasa sobre staging e historia nueva,
sin hallazgos. CI final se verifica en el [PR #18](https://github.com/GiuseppePrbst/meta-global-ai-dev-hackathon-progarlabs/pull/18/checks).
Pruebas reales STT/tool calling/multivista, audio español y botánica no ejecutadas.

## K. GitHub

Rama `feat/meta-expeditions-gis-ml`, basada en #17; destino inicial
`feat/backend-meta-consolidation`. [PR #18](https://github.com/GiuseppePrbst/meta-global-ai-dev-hackathon-progarlabs/pull/18),
abierto sin merge. Implementación: `3f4e04c`, seguida de cierre documental.
Autoría personal verificada GiuseppePrbst; asistencia registrada. Publicación mediante
credencial Git de la misma sesión personal `gh`, sin cuentas externas ni force push.
Al integrar #17, retarget a main solo tras verificar diff y checks; hasta entonces mantener
dependencia explícita. El estado de [CI del HEAD vigente](https://github.com/GiuseppePrbst/meta-global-ai-dev-hackathon-progarlabs/pull/18/checks)
se comprueba antes de cerrar la misión y se registra también en el PR; no se atribuye
éxito de una corrida anterior al último commit. No hay merge automático.

## L. Próximas cinco acciones

1. Revisar el PR apilado y resolver su dependencia de #17 mediante revisión humana.
2. José integra los contratos de multivista/voz/captura/colección con credencial individual,
   consentimiento, texto accesible y estados de incertidumbre.
3. Confirmar presupuesto nuevo, Standard Mode, acceso/créditos y audio/fotos permitidos;
   ejecutar smoke mínimo y registrar latencia/consumo reales antes de ampliar muestras.
4. Reunir etiquetas humanas y revisar los ocho perfiles; medir A/B, transcripción española,
   respuestas fundamentadas y contexto adversarial sin confundir mocks con ciencia.
5. Operar migración 004 revisada, TLS/proxy, credenciales y purga en un entorno de demo
   controlado; mantener Hepta, video y modelos locales fuera de la ruta crítica.
