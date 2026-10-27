# Fundación GIS/ML · 27 de octubre de 2026

## A. Estado inicial y rama

Base `d15d1aa44352a65f434108f84770afffdf8a272a`. PR #12 consultado: abierto,
fusionable, tres checks SUCCESS, sin revisiones. No se fusionó ni modificó bootstrap.
Rama `feat/gis-ml-foundation` desde `origin/chore/project-bootstrap`; main todavía
no contiene los servicios. El PR de esta misión depende de #12 y usa bootstrap como base.

Baseline antes de editar: `pytest` 50 pasan, 1 omitida; Ruff y formato pasan.
Se leyeron AGENTS, README, arquitectura, evaluación, gobernanza, licencias, backlog,
contribuciones, reporte bootstrap, los tres módulos y las issues #4–#8.

## B–C. Implementación y catálogo

Los ocho IDs públicos y campos anteriores permanecen. Se añaden nombre aceptado,
sinónimos, familia, género y taxonomía con fuente, versión/fecha, licencia y estado
`source_checked`. GBIF Backbone devuelve EXACT/ACCEPTED para los ocho nombres:

| Nombre | GBIF ID |
| --- | --- |
| Nothofagus dombeyi | 2874895 |
| Eucryphia cordifolia | 3920287 |
| Aextoxicon punctatum | 4195638 |
| Weinmannia trichosperma | 3613680 |
| Laureliopsis philippiana | 3783047 |
| Podocarpus nubigenus | 5285976 |
| Nothofagus betuloides | 2874949 |
| Nothofagus pumilio | 2874907 |

[Snapshot de consultas y sinónimos](../data/public/taxonomy-gbif-2026-10-27.json),
SHA-256 `408dcfea9f72b4f67e976b1b29900b3d5811e95bd132c02a4aa77e1217b9ab99`.
Fuente: GBIF Secretariat, Backbone Taxonomy, DOI 10.15468/39omei, CC BY 4.0.
Snapshot API del 27-10-2026; no se afirma que sea una nueva edición del Backbone.

`taxonomic_status: provisional` y procedencia histórica se conservan para compatibilidad;
la aceptación en GBIF va en `taxonomy.status`. Rasgos morfológicos, nombres comunes del
bootstrap, condición nativa/endémica y conservación requieren revisión botánica independiente.
`morphology: []`, `native_status: pending`, conservación nula. No se inventan fichas completas,
presencia local ni validación humana. WFO/MMA no se presentan como contrastados por taxón.

## D. Meta

Se reutiliza MetaResponsesClient: Muse utiliza Chat Completions con JSON Schema según
documentación oficial; SAM mantiene Responses/SSE. Pydantic valida candidatos y rechaza
IDs desconocidos/duplicados, texto inválido o respuestas incompletas. No hay porcentajes.
Errores devuelven 502, sin transformarlos en abstención. Timeout total, sin reintentos.

Las imágenes se verifican, orientan y re-encodean en memoria sin EXIF/metadatos. Máximo
10 MiB, 16 millones de píxeles, 8192 por lado; no animación. El flujo real exige mayoría
de edad, derechos, habilitación explícita, bearer token backend y límite temporal por proceso.
SAM es opcional: error/no matches conserva la imagen preparada. Una máscara válida selecciona
el objeto de mayor raster, sobre fondo negro, antes de Muse; no clasifica especies.
Se utiliza `meta-sam-parser==0.1.0`, parser oficial sin dependencias de ML.

La clave proporcionada por el usuario se leyó fuera de Git, solo en memoria.
[Evidencia real sanitizada](../evaluations/meta-access-2026-10-27.json):

- Llamada mínima textual realizada. Se recibió HTTP, pero falló su serialización local;
  no se repitió y no se atribuyen estado/consumo que no quedaron registrados.
- Muse `muse-spark-1.3`: HTTP 200, 5424,66 ms en adaptador, abstención correcta frente a
  dibujo geométrico sintético. 257 tokens de entrada, 1305 de salida, 1562 totales;
  1063 tokens de razonamiento incluidos en la salida. Ningún candidato propuesto.
- SAM `sam-3.1`: HTTP 200, 2916,51 ms de transporte, una máscara 99 × 109 decodificada
  por el parser oficial para imagen de 128 × 128. No se guarda máscara ni imagen.
- Acceso pagado/créditos efectivamente habilitado para esas solicitudes. El saldo no se
  consultó; consumo SAM e importe monetario no reportados en la evidencia disponible.

Esto prueba acceso e integración sobre un sintético; no mide exactitud botánica ni demuestra
el experimento B completo con fotos etiquetadas. Las pruebas automáticas usan MockTransport.

## E. GIS y CHMv2

Proveedor local opcional con manifiesto Pydantic, SHA-256 y fuente revisada. Sin rutas remotas
en solicitudes HTTP. Límites: archivo local 64 MiB, polígono 1 km², 100000 píxeles,
una lectura simultánea por proceso; plazo cooperativo 10 s entre etapas. No puede interrumpir
una operación de disco bloqueada: requiere aislamiento de proceso antes de exposición pública.
Geometrías válidas WGS84 `[lon,lat]`; consulta local, no antimeridiano. Se preserva PostGIS.

Prueba sintética temporal: 2 × 2, EPSG:3857, valores `[0,10;20,nodata]`, nodata -9999.
Tres píxeles válidos, mínimo 0, máximo 20, media 10 m; recorte, transformación WGS84,
sin intersección, solo nodata, límites y hash probados. Cero válido se conserva.

Ventana real: [evidencia](../data/public/chmv2-window-2026-10-27.json).
64 × 64 de COG `2102332230.tif`, por HTTP Range, sin descargar el tile de 315856463 bytes.
Referencia central del encuadre existente del atlas; no representa individuo ni límite oficial.
Archivo pequeño y manifiesto quedan fuera del repositorio.

| Propiedad | Valor observado |
| --- | --- |
| Fuente | Meta/WRI CHMv2 ml3, repackaging Taylor Geospatial / Source Cooperative |
| CRS / resolución | EPSG:3857 / 1,1943285669558747 unidades del CRS por píxel |
| Codificación / escala / offset | uint8, metros / 1 / 0 |
| Nodata declarado | Ninguno; documentación advierte ceros ambiguos |
| Política de ceros | Excluir ceros ambiguos; esta ventana no tuvo ceros |
| Píxeles válidos | 4096 |
| Altura mínima / media / máxima | 4 / 12,476806640625 / 25 m |
| Área consultada / efectiva | 3356,4063605070114 / 3356,4063605070114 m² |
| Ventana SHA-256 | 0d71e4505aac9a05ff6e2c78157c356f3dd111724a8d4fa75097606465c7da1f |

La resolución es Web Mercator, no una distancia constante de terreno. Periodo global de la
colección: 2005-03-15/2020-08-31; adquisición del tile y exactitud local pendientes.
La API configurada devolvió 200 y fuente `ready` con ese manifiesto. Altura estimada,
no crecimiento anual. No se empleó Hepta en este procesamiento.

Reproducción (usar una carpeta nueva fuera de Git):

```powershell
uv sync --project services/api --extra dev --extra raster --frozen
uv run --project services/api --extra dev --extra raster --frozen python evaluations/chmv2_window.py --output D:/temp/bosque-chmv2-new-run
$env:FOREST_MANIFEST='D:/temp/bosque-chmv2-new-run/manifest.json'
uv run --project services/api --extra raster --frozen uvicorn bosque_api.main:app --host 127.0.0.1 --port 8000
```

## F. Contratos para José

OpenAPI generado por FastAPI sigue como fuente de verdad. Los siete endpoints conservan
rutas, campos anteriores y métodos; [contratos y ejemplos](API_INTEGRATION.md).
Campos nuevos son aditivos. La web no se editó. Sin credenciales levanta catálogo/mock;
sin GIS extra o raster solo falla la operación forestal. Observaciones con especie nula
siguen permitidas. Observaciones continúan siendo API local sin política pública de acceso.

## G. Evaluación

Runner A/B, manifiesto tipado, hash, derechos locales y externos separados, etiqueta,
revisor, partición e individuo. Detecta duplicados y fuga entre particiones. Métricas con
denominadores explícitos; mocks dan Top-1/Top-3 nulos. Fallos y abstenciones cuentan como
no aciertos en el denominador etiquetado. Máximo 20 casos; no reintentos.
Instrucciones en [evaluations](../evaluations/README.md).

Dataset botánico etiquetado autorizado: **cero casos**. No hay Top-1/Top-3 científicos ni
comparación A/B ejecutada; solo prueba real negativa sintética y pruebas del software.
DINOv3, calibración e inferencia local sobre fotografías privadas no ejecutados.

## H. Validaciones

Desde raíz, `uv run --project services/api --extra dev --extra raster --frozen`:

- `pytest -c services/api/pyproject.toml services -q`: 77 pasan, 1 omitida por ausencia de
  TEST_DATABASE_URL. Aviso upstream Starlette/httpx. Resultado final/CI se registra en el PR.
- `ruff check services evaluations`, `ruff format --check services evaluations`, imports,
  lock, `uv pip check` y controles de repositorio: pasan. Gitleaks staged/historia sin hallazgos.
  El escaneo de todo el directorio señaló UUID públicos GBIF (eliminados del extracto por
  innecesarios), claves efímeras de caché Next y fixtures de NumPy no versionados; no se
  introdujeron excepciones al escáner.
- Node 24.19: lint, typecheck, 3 tests web y build pasan. Primer build falló EBUSY por
  servidor local previo; se detuvo únicamente ese servidor y el segundo build pasó.
- Playwright: seis recorridos pasan, desktop/móvil. PostGIS de CI y builds Docker: consultar
  resultado del nuevo PR; Docker
  y PostGIS no están disponibles localmente. No trasladar resultados de #12 a este diff.
- Muse/SAM y ventana real: evidencia enlazada arriba. No se confunden con tests de CI.

## I. Git

Cuenta `GiuseppePrbst`, correo local verificado mediante `gh api user/emails`, autoría humana
conservada. Asistencia del agente declarada en contribuciones. Conventional Commit(s), push
normal y PR hacia bootstrap; sin force push ni merge. URLs, SHA y CI finales en el PR.
Tras merge humano de #12: cambiar base a main y comprobar que el diff conserve solo esta misión.

## J. Coordinación y próximas cinco acciones

José puede integrar ahora catálogo ampliado, abstención/errores y estadísticas forestales
con los ejemplos, manteniendo claves en backend. Necesita incorporar estados y candidatos
en UI, no publicar un token compartido en Next. Producto debe validar permisos de imágenes,
licencia propia, admisiones y el significado de las fichas aún provisionales.

1. Revisar #12 y este PR, sin merge automático; retarget después del bootstrap.
2. Revisión botánica humana de rasgos, nombres comunes, natividad y conservación.
3. Reunir fotos con permiso externo y etiquetas independientes; ejecutar A/B y revisar errores.
4. Verificar adquisición del tile, calidad local CHMv2 y despliegue con controles compartidos.
5. José integra estados/datos; producto confirma elegibilidad y evidencia de entrega.

Durante la sesión el usuario autorizó uso local de fotos restringidas, sin publicación.
Se confirmó lectura de esquema por OneLake con sesión Azure existente. No se descargaron
fotografías ni se enviaron a Meta; metadatos privados permanecen fuera de Git. El permiso
local no se extiende a publicación, entrenamiento ni procesamiento por terceros.

CI inicial detectó un checksum calculado sobre CRLF local mientras Git conserva LF.
Se normalizó el snapshot a bytes LF y se corrigió el hash al del blob publicado;
los registros taxonómicos no cambiaron. Esa primera corrida pasó las otras 77 pruebas,
incluida PostGIS; el PR registra la corrida final del arreglo.
