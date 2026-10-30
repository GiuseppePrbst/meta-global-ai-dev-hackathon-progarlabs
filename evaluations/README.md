# Evaluación reproducible GIS/ML

No hay fotos botánicas etiquetadas autorizadas para envío externo. manifest.json está
vacío de forma explícita; no representa una evaluación ejecutada ni precisión cero.
La evidencia meta-access-2026-10-27.json corresponde a un dibujo sintético negativo: Muse
se abstuvo y SAM decodificó una máscara. No son métricas de clasificación.

## Comandos desde raíz

```powershell
uv sync --project services/api --extra dev --extra raster --frozen
uv run --project services/api --extra dev --frozen python evaluations/run.py evaluations/manifest.json --image-root data/synthetic
uv run --project services/api --extra dev --frozen python evaluations/meta_smoke.py --key-file RUTA_LOCAL_FUERA_DE_GIT --authorize-meta
```

El smoke genera exactamente la imagen sintética documentada, realiza hasta dos llamadas
y no guarda fotografías, claves ni máscaras. El archivo de evidencia original también registra
un intento mínimo textual cuyo registro falló; no se repitió esa solicitud. Cada ejecución
live nueva consume créditos. Sin clave, usa pytest con MockTransport.

Para evaluación con fotos permitidas crear un manifest privado fuera de Git y definir
MODEL_API_KEY en el proceso. El runner no lee el archivo privado de claves automáticamente:

```powershell
uv run --project services/api --extra dev --frozen python evaluations/run.py RUTA_MANIFEST_PRIVADO --image-root CARPETA_AUTORIZADA --provider meta --experiment A --authorize-meta
uv run --project services/api --extra dev --frozen python evaluations/run.py RUTA_MANIFEST_PRIVADO --image-root CARPETA_AUTORIZADA --provider meta --experiment B --authorize-meta
```

A: imagen normalizada sin metadatos. B: SAM + máscara del objeto de mayor raster + Muse;
si SAM falla o no detecta, conserva imagen original y registra segmentation_status.
No agregar resultados A/B en una sola métrica. Revisar por separado fallback de segmentación.
No se ha ejecutado la comparación científica A/B. DINOv3 no se instaló.

## Manifiesto por caso

EvaluationCase en bosque_ai.evaluation define el esquema Pydantic. Campos obligatorios:
case_id, species_id (puede ser null para negativos), file relativo a raíz permitida,
sha256, license, source, authorized=true para proceso local, photo_type, reviewer,
individual_id, partition (development/test), validation_status (validated/synthetic/pending).
external_processing_authorized=false por defecto; requiere true para Meta, además de la
bandera de corrida. Permiso local de Hepta no satisface ese requisito. No añadir fotos,
rutas privadas ni enlaces firmados al manifest público. No ejecutar casos pending.

Se validan todos los hashes/derechos antes de realizar llamadas; máximo 20 casos, sin
reintentos y con pausa de consumo. Se rechazan IDs duplicados, contenido repetido y
individuos compartidos entre particiones. La revisión humana es necesaria para etiquetas
y para detectar fotografías distintas del mismo individuo; el hash no detecta casi duplicados.

## Métricas y límites

Top-1/Top-3 y clasificación errónea usan casos etiquetados validados ejecutados; errores
del proveedor y abstenciones son no aciertos. Abstención y errores de proveedor incluyen
todas las entradas ejecutadas. Separar fuera de catálogo/negativos de especies etiquetadas.
Mocks devuelven precisión null. Guardar JSON privado con resultados, versión de código,
manifest/hash, modelo y entorno antes de publicar métricas autorizadas.

Se registran latencias de modelo/segmentación y del bucle de inferencia; la normalización
se valida antes del bucle y no se incluye en total_latency_ms. No llamarlo tiempo extremo
a extremo de usuario. Sin muestra adecuada no calcular generalizaciones ni calibración.

Raster: chmv2_window.py realiza únicamente una ventana fija 64x64 por HTTP Range y deja
el GeoTIFF/manifiesto fuera de Git. Ver docs/GIS_ML_REPORT.md y evidencia pública en data/public.

Consolidación 29-10: `backend_validation.py` reingesta el bundle local verificado y consulta
HTTP con PostGIS no administrativo/loopback; `meta_backend_smoke.py` valida un solo pipeline
SAM+Muse sobre dibujo, con autorización presupuestaria específica y evidencia de salida nueva.
No se ejecutan en CI contra datos/proveedores reales. Recibo publicable, sin fuente binaria:
[backend-validation-2026-10-29](backend-validation-2026-10-29.json).

El manifiesto vacío retorna not_evaluated sin crear cliente externo. Evaluación real exige
campaign_id, spatial_block, perceptual_group y perceptual_duplicates_reviewed, además de
individual_id/hash/etiqueta/derechos. Son grupos y revisión humana, no detección automática
de casi duplicados. Separar tipos de fotografía en ejecuciones independientes. n=0 sigue vigente.
