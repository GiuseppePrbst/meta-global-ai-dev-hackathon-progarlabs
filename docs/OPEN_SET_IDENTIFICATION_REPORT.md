# Identificación de conjunto abierto — reporte, 30-10-2026

Este reporte separa resultados observados, simulaciones (mocks y tests) e hipótesis.
Todas las etiquetas botánicas son de plataforma más revisión visual del agente; no hubo
especialista independiente. Ningún valor aquí es precisión científica validada.

## A. GitHub y consolidación

Estado inicial verificado: cuenta `GiuseppePrbst` con correo verificado y árbol limpio.
#17–#21 abiertos, `MERGEABLE`/`CLEAN`, con CI verde en sus HEAD (último run #21:
41075557548). `main` no tenía protección ni rulesets, por lo que GitHub no exigía revisión.
Igualmente se revisaron commits, archivos, secretos, datos Hepta y `apps/` (sin cambios
en la pila).

| PR | Merge commit en `main` | Árbol de `main` tras el merge |
| --- | --- | --- |
| #17 | `9c01961` | Idéntico al HEAD `7c9c2ce` |
| #18 | `60b4fc0` | Idéntico al HEAD `7e878b7` |
| #19 | `2040345` | Idéntico al HEAD `5912a54` |
| #20 | `f04d9b4` | Idéntico al HEAD `a97a84a` |
| #21 | `e1b01e6` | Idéntico al HEAD `7d37948` |

Merge commits sin `--admin` ni `--delete-branch`. Antes de cada merge se cambió la base a
`main` y se comprobó que el PR mostraba solo sus commits propios: 2, 1, 5 y 10. Sin
conflictos. Como cada árbol resultante es igual al HEAD ya validado, la CI de cada PR
aplica al estado integrado. CI de `main` en `e1b01e6`: run 41078051117 **success**; los
runs intermedios fueron cancelados por `concurrency`. Verificación local en `main`:
209 pruebas Python, ruff, lint/typecheck/test/build web, **Playwright 6/6**, visor y
`check_repository` correctos.

## B. Diagnóstico ML

Línea base congelada: resultados históricos del experimento A del 30-10 sobre el conjunto
de desarrollo (35 positivos y 12 negativos):

| Métrica | k/n | IC95 Wilson |
| --- | --- | --- |
| Correcto aceptado en positivos | 24/35 | 0,52–0,81 |
| Cobertura en positivos | 28/35 | 0,64–0,90 |
| Riesgo selectivo | 4/28 | 0,06–0,31 |
| Negativos con candidato aceptado | **11/12** | 0,65–0,99 |
| Negativos marcados como fuera del catálogo | 0/12 | 0–0,24 |

Riesgo: el modelo asigna el pariente del catálogo (ñirre → lenga, *Saxegothaea* y
*P. salignus* → mañío, *N. nitida* → coigüe de Magallanes).

## C. Estrategias implementadas

| ID | Estrategia | Implementación | Costo adicional |
| --- | --- | --- | --- |
| A | `baseline` | Prompt y esquema de #21, sin cambios | — |
| B | `abstain` | Reglas de conjunto abierto; `catalog_assessment` en el esquema | Prompt ~+150 tokens; tope de 1600 |
| C | `comparators` | B + 6 comparadores con rasgos y fuente | Prompt ~+500 tokens |
| D | `verify` | B, y segunda llamada solo si hay candidato aceptado, con comparadores pertinentes | Una llamada más por candidato aceptado |
| E | Aceptación selectiva | Regla determinista aplicada a B, C y D | Ninguno |

Estados: `supported_candidate`, `insufficient_evidence`, `out_of_catalog_suspected`,
`non_diagnostic_photo`; `not_assessed` para el baseline. El error de proveedor sigue
siendo HTTP 502, separado de la abstención. «Aceptado» significa presentable, no
verificado. Contratos en
[API_INTEGRATION.md](API_INTEGRATION.md#identificación-de-conjunto-abierto--contrato-para-josé-30-10-2026).

Smoke test real de B (6 llamadas, desarrollo): 2 positivos aceptados correctamente, 1
foto no diagnóstica detectada y **los 3 negativos difíciles aceptados** (2 ñirre → lenga,
1 *Saxegothaea* → mañío). La instrucción de abstención por sí sola no basta.

## D. Datos

- **Desarrollo:** los 47 casos del 30-10 (35 positivos, 12 negativos) y 5 observaciones
  multivista.
- **Evaluación independiente congelada:** 56 casos (19 positivos, 22 negativos difíciles,
  15 generales). Hash `9e82f0d7…`, commit `ee7e76a`, anterior a cualquier ejecución sobre él.
- **Controles de fuga:** observación, grupo de individuo, autor y fecha en Commons, imagen
  y dHash ≤ 6 contra todas las imágenes de desarrollo. 0 casi duplicados.
- **Etiquetas:** `platform_label` + `agent_visual_review` (5 exclusiones). Sin
  `human_reviewed` ni `expert_reviewed`.

Detalle en [BOTANICAL_DATASETS.md](BOTANICAL_DATASETS.md).

## E. Comparación

Pendiente: se ejecuta tras el reinicio legítimo de la cuota diaria del ledger (00:00 UTC).
El 30-10 se alcanzaron 143 de 150 solicitudes y no se elevó ni reinició la cuota.

## F. Multivista

Pendiente, con el mismo motivo. Protocolo: 1, 2 y 3 vistas del mismo individuo,
comparadas de forma pareada.

## G. SAM

Se mantiene opcional. No se gastó en SAM en este incremento: no había hipótesis nueva.
Evidencia previa: el concepto `tree` no ayudó a identificar (5/8 sin segmentación, +17–24 s).
La caja de usuario queda como experimento futuro y como tarea distinta de la detección
automática.

## H. Taxonomía

Se conservan las correcciones de #21 (`synonym_review`). Comparadores con fuente:
Fundación Philippi para ñirre, coigüe de Chiloé, laurel, *Saxegothaea*, *P. salignus* y
lleuque, más conifers.org, RHS, Reforestemos/Looser 1949 y Trees and Shrubs Online. Una
discrepancia queda abierta: Trees and Shrubs Online trata *Laurelia serrata* dentro de
*L. sempervirens*, mientras el catálogo la lista como sinónimo de tepa (aceptado por COL XR).

## I. API

Compatible hacia atrás. OpenAPI documenta los campos nuevos (test). Hay 8 ejemplos para José.

## J. Seguridad y presupuesto

- **Autorización:** se mantiene la inspección visual del agente.
- **Publicación:** solo metadatos de fotos de terceros con licencia; ningún medio Hepta.
- **Presupuesto:** fase F con subtope de USD 10, tomado de la contingencia E. La reserva
  por llamada bajó de 0,05 a 0,03, que cubre el peor caso observado (~0,022 con 3
  imágenes). El techo global sigue en USD 50 y la concurrencia en 1.

## K. Validaciones

236 pruebas Python correctas y 11 omitidas, que requieren un PostgreSQL de pruebas
aislado; no se ejecutó DDL en el servidor del ledger. Ruff correcto.

## L. Git

Rama `feat/botanical-open-set-recognition` desde `main` (`e1b01e6`). PR #22 abierto sin merge.
