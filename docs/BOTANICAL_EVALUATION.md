# Evaluación botánica y visual — protocolo, 30-10-2026

Marco de evaluación para tres líneas que **no comparten métricas**:

1. Identificación botánica desde fotos de terreno (Muse Spark).
2. Segmentación aérea de copas (SAM 3.1 con prompts espaciales).
3. Seguimiento en video (SAM 3.1, identidad por `frame_index`).

Estado: herramientas implementadas y probadas con datos sintéticos. **n = 0 casos
evaluados con modelo real** en esta iteración: no hay presupuesto nuevo ni etiquetas
revisadas por ProGarLabs. No se calcula precisión a partir de mocks.

## 1. Identificación botánica

### Experimentos

| ID | Entrada | Implementación | Estado |
| --- | --- | --- | --- |
| A | Foto original normalizada | `evaluations/run.py --experiment A` | Implementado; no ejecutado con datos revisados |
| B | Recorte por máscara SAM | `run.py --experiment B` (fallback documentado) | Implementado; no ejecutado |
| C | Multivista del mismo ejemplar | `MuseSparkAdapter.identify(additional_images=…)`, máx. 3 | Implementado en backend; sin casos |
| D | Evidencia documentada del catálogo | Parámetro `knowledge` del mismo adaptador | Implementado; rasgos `pending` no cuentan como verificados |
| E | Contexto GIS posterior | Protocolo: GIS solo después de la decisión visual | Pendiente |
| F | Contexto GIS permutado | Protocolo: mismo caso con contexto de otro polígono, para medir sesgo | Pendiente |

No se creó un segundo pipeline de clasificación. Las imágenes de referencia de otras
plantas **no** se envían como `additional_images`: ese contrato supone vistas del mismo
individuo. Una comparación contra ejemplos de terceros necesitaría un protocolo propio
y documentado, con IDs de referencia separados. No se implementó.

### Métricas

`bosque_ai.evaluation.summarize` (existente) calcula Top-1, Top-3, error de clasificación,
abstención, error de proveedor, falsos positivos en negativos validados y latencias, con
denominadores explícitos. Esta iteración añade `by_photo_type`: los mismos indicadores
por órgano fotografiado, cada uno con su propio denominador. Los porcentajes no son
probabilidades calibradas. Mock → `not_evaluated`.

### Casos y particiones

El registro [BOTANICAL_DATASETS.md](BOTANICAL_DATASETS.md) produce candidatas con licencia
por medio, órgano informado por la fuente y `individual_group`. Para convertir una
candidata en `EvaluationCase` faltan pasos humanos que no se hicieron: revisión de la
etiqueta por ProGarLabs (`validated`), descarga del original con SHA-256 propio,
`reviewer`, `perceptual_duplicates_reviewed` y una autorización de procesamiento externo
coherente con la licencia. `validate_cases` ya rechaza fugas entre particiones por
individuo, campaña, bloque y grupo perceptual.

### Especies difíciles y negativos

Los negativos miden falsos positivos y abstención. **No** se añaden al catálogo jugable
de ocho especies. Los nombres se resolvieron en COL XR (claves en
`evaluations/botanical/source-inventory.json`). Los rasgos diferenciadores **no** se
redactan aquí sin fuente citada. Las fichas `source_checked` de `species.json` cubren
solo las ocho especies del catálogo.

| Especie del catálogo | Negativos propuestos | Estado de rasgos diferenciadores |
| --- | --- | --- |
| Nothofagus dombeyi | N. nitida; N. obliqua (sinónimo en COL XR de Lophozonia obliqua); además N. betuloides y N. pumilio del propio catálogo | Pendiente de fuente botánica revisada |
| Laureliopsis philippiana | Laurelia sempervirens | Pendiente de fuente |
| Nothofagus pumilio | N. antarctica | Pendiente de fuente |
| Podocarpus nubigenus | Saxegothaea conspicua, Podocarpus salignus, Prumnopitys andina | Pendiente de fuente |
| Aextoxicon punctatum | Sin propuesta: no se encontró una lista de especies confundibles con fuente | Pendiente |

Prueba de abstención: un caso negativo validado con cualquier candidato del catálogo
cuenta como falso positivo (`false_positives`). La IA no está obligada a elegir una de
las ocho: el contrato permite `candidates=[]`.

## 2. Segmentación aérea

El dataset botánico de hojas y corteza no sirve para medir copas desde dron. Se proponen
benchmarks externos, solo con recortes pequeños (3–5) para una prueba inicial:

| Benchmark | Anotación | Licencia declarada | Dominio | Uso |
| --- | --- | --- | --- | --- |
| [CanopyRS/Detectree2](https://huggingface.co/datasets/CanopyRS/Detectree2) | Polígonos de copa + cajas; 642 teselas 1000×1000, 4 bandas | CC BY 4.0 (tarjeta HF); cita Ball et al. 2023, Zenodo 10.5281/zenodo.8136161 | Bosque tropical, Malasia, ~0,1 m/px (inferido de metadatos) | IoU/Dice de máscaras con caja GT como prompt |
| [NeonTreeEvaluation](https://github.com/weecology/NeonTreeEvaluation) | **Solo cajas** RGB (30.975 árboles, 22 sitios NEON) | Repositorio CC0-1.0; imágenes en Zenodo 5914554, revisar por archivo | EE. UU. | Detección (IoU de caja, recall@0,5); no IoU de máscara |
| UAVid | Semántica urbana/vegetación | CC BY-NC-SA | Urbano | **Excluido** para uso comercial |

Protocolo: (1) verificar la licencia del archivo concreto y anotarla en el registro;
(2) caja GT → `spatial_prompt` → SAM; (3) `metrics.mask_metrics` contra el polígono GT
rasterizado. Para NEON, comparar la caja de la máscara contra la caja GT. El dominio
(tropical/EE. UU. frente a bosque valdiviano) limita la transferencia: un buen resultado
allí no demuestra rendimiento en Puyehue. No ejecutado: requiere presupuesto (USD 0,0025
por imagen, más la reserva del ledger).

Hepta: las 12 + 6 fotos privadas no tienen máscaras humanas. El visor permite crear
polígonos privados (`review-*.json`) y calcula IoU/Dice solo cuando existen.

## 3. Seguimiento en video

Métricas de `metrics.track_metrics` con referencias humanas por frame: frames
asociados (IoU ≥ 0,5), perdidos, cambios de identidad y fragmentos. Los frames sin
máscara del modelo se muestran vacíos; nunca se interpolan. Sin referencias humanas no se
informan. Estado real actual: dos solicitudes conceptuales con cero tracks.

## Conjuntos separados

Copas (Detectree2), detección de árboles (NEON), vegetación semántica (sin dataset
admitido), tracking (Hepta privado, sin referencias) y especies (registro botánico).
Sus métricas no se agregan entre sí.

## Resultados de validación

Comandos ejecutados localmente el 30-10-2026 (sin llamadas a Meta). Node 24.14.0, como exige
`engines`; el Node 20.11.1 del PATH del sistema falla en vitest (`util.styleText`).

| Comando | Resultado |
| --- | --- |
| Baseline previo: `pytest -c services/api/pyproject.toml services -q` | 160 pasaron, 11 omitidos |
| Mismo comando tras los cambios (prefijo uv con extras dev/raster/data) | **196 pasaron, 11 omitidos** (los 11 requieren `TEST_DATABASE_URL`; no hay PostgreSQL de pruebas en esta sesión) |
| `ruff check` y `ruff format --check` sobre `services evaluations tools` | Correctos (64 archivos) |
| Import smoke `bosque_api.main, bosque_ai.meta, bosque_geo.contracts` | Correcto |
| `node tools/meta_sam_api_lab/viewer.test.cjs` | Correcto: geometría + navegador sintético |
| `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` | Correctos; 3 tests web |
| `python scripts/check_repository.py`, `python -m unittest discover -s scripts/tests` | Correctos (34 archivos requeridos) |
| `npm run test:e2e` | No ejecutado: los recorridos de `apps/web` no cambiaron |
| `docker compose config/build`, Gitleaks | No disponibles localmente; se ejecutan en CI |

## Resultados de la campaña del 30-10-2026

Primera ejecución real (Muse 1.3, `reasoning_effort=minimal`) sobre fotos con licencia.
Estado: **`weakly_labeled_exploration`**. Las etiquetas son de plataforma, con inspección
visual del agente y sin especialista: los valores son concordancia, no precisión validada.

| Exp. | n | Top-1 | Top-3 | Abstención | Negativos con candidato |
| --- | ---: | ---: | ---: | ---: | ---: |
| A | 35 | 0,686 | 0,771 | 7 | 11/12 |
| D | 34 | 0,618 | 0,794 | 7 | 11/12 |
| B | 8 | 0,625 | 0,625 | 1 | — |
| C | 5 | 0,8 | 0,8 | 1 | — |

E y F (contexto GIS posterior y permutado) siguen pendientes. Casos, licencias y
candidatos en [`muse-campaign-2026-10-30.json`](../evaluations/botanical/muse-campaign-2026-10-30.json).
Análisis completo en [META_VALIDATION_CAMPAIGN_REPORT.md](META_VALIDATION_CAMPAIGN_REPORT.md).

## Conjunto abierto — resultados del 30-10-2026

Exploración con etiquetas débiles (plataforma + revisión del agente). Detalle en
[OPEN_SET_IDENTIFICATION_REPORT.md](OPEN_SET_IDENTIFICATION_REPORT.md).

- **Desarrollo:** el baseline acepta 11/12 negativos; `verify-v2` acepta 3/12 con 14/35
  correctos aceptados y riesgo selectivo 0/14.
- **Evaluación independiente congelada (56 casos):** negativos aceptados 25/37 → **3/37**;
  correctos aceptados en positivos 10/19 → 8/19; riesgo selectivo 2/12 → 0/8. Pareada:
  23 casos mejoran y 3 empeoran (McNemar exacto p ≈ 8,8·10⁻⁵).
- **Multivista:** 2 vistas ayudan (1/5 → 3/5); con `verify-v2`, 3 vistas abstienen (0/4).
  n=5, sin conclusión estadística.
- Las podocarpáceas siguen siendo la confusión residual.
