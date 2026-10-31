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

## E. Comparación (observada, Meta real, `muse-spark-1.3`, `reasoning_effort=minimal`)

Datos completos en [`open-set-campaign-2026-10-30.json`](../evaluations/botanical/open-set-campaign-2026-10-30.json).
k/n con IC95 de Wilson. «Correcto» significa aceptar la especie correcta en un positivo
o no aceptar ninguna especie en un negativo.

**Desarrollo** (35 positivos y 12 negativos; se usó para diseñar y elegir):

| Estrategia | Correctos aceptados | Cobertura | Riesgo selectivo | Abstención innecesaria | Negativos con propuesta | **Negativos aceptados** |
| --- | --- | --- | --- | --- | --- | --- |
| A baseline (histórico) | 24/35 | 28/35 | 4/28 | 0/35 | 11/12 | **11/12** |
| B abstain (etapa 1 de D) | 19/35 | 19/35 | 0/19 | 5/35 | 8/12 | 7/12 |
| C comparators | 13/35 | 15/35 | 2/15 | 7/35 | 7/12 | 3/12 |
| D verify-v1 | 10/35 | 10/35 | 0/10 | 14/35 | 8/12 | 0/12 |
| D′ verify-v2 (solo la contradicción rechaza) | 14/35 | 14/35 | 0/14 | 10/35 | 8/12 | 3/12 |

- C empeora los positivos: el Top-1 propuesto baja de 24/35 a 20/35, porque los
  comparadores en el prompt hacen dudar de especies correctas.
- D′ se calculó exactamente sobre los veredictos ya registrados, sin llamadas nuevas.
- Criterio fijado antes de la evaluación independiente: ≤ 3/12 negativos aceptados; luego
  más correctos aceptados; luego costo. Elegida **verify-v2**, congelada en el commit
  `0283441` antes de ejecutar el conjunto de 56 casos.

**Evaluación independiente congelada** (19 positivos, 22 negativos difíciles y 15 generales):

| Métrica | Baseline | verify-v2 |
| --- | --- | --- |
| Negativos aceptados (falsa identificación) | 25/37 [0,51–0,80] | **3/37 [0,03–0,21]** |
| — difíciles | 19/22 | 2/22 |
| — generales | 6/15 | 1/15 |
| Negativos marcados como fuera del catálogo | 0/37 | 23/37 |
| Correctos aceptados en positivos | 10/19 [0,32–0,73] | 8/19 [0,23–0,64] |
| Cobertura en positivos | 12/19 | 8/19 |
| Riesgo selectivo | 2/12 | **0/8** |
| Top-1 / Top-3 propuesto | 10/19 / 11/19 | 11/19 / 12/19 |
| Errores de proveedor | 0/56 | 0/56 |
| Latencia mediana | 6,7 s | 7,7 s |
| Tokens entrada/salida | 118.211 / 38.432 | 167.626 / 46.398 (19 verificaciones) |
| Costo estimado (tarifa) | USD 0,311 | USD 0,407 (+31 %) |

- **Comparación pareada** de resultado correcto (n=56): ambas aciertan 19, solo baseline 3,
  **solo verify-v2 23**, ambas fallan 11. McNemar exacto p ≈ 8,8·10⁻⁵.
- **Negativos aún aceptados por verify-v2:** *Saxegothaea* → mañío, *Prumnopitys* → mañío,
  *Gevuina* → tineo. Las podocarpáceas siguen siendo el punto débil.
- **Positivos perdidos frente al baseline:** un ulmo (marcado fuera del catálogo) y una
  lenga (contradicción). Los positivos no diagnósticos (fotos `unknown` o lejanas)
  abstienen en ambas estrategias.
- **Recomendación:** `IDENTIFY_STRATEGY=verify`, que pasa a ser el valor por defecto;
  `baseline` sigue disponible.

## F. Multivista (observada; mismos 5 individuos, 14 combinaciones)

| Vistas | verify-v2 correctos aceptados | Baseline | Tokens de entrada medios (verify) | Latencia mediana (verify) |
| --- | --- | --- | --- | --- |
| 1 | 1/5 | 1/5 | 1.958 | 6,1 s |
| 2 | **3/5** | 3/5 | 4.181 | 9,3 s |
| 3 | **0/4** | 3/4 | 4.074 | 8,1 s |

- Una segunda foto del mismo ejemplar ayuda en ambas estrategias. Con verify-v2, la
  **tercera vista provocó abstención** en los 4 casos: insuficiente o fuera del catálogo.
- Hipótesis no probada: más vistas aumentan la probabilidad de que la verificación
  estricta encuentre un rasgo «contradictorio».
- La recomendación de foto (`recommended_next_photo`) fue específica: envés o hoja completa.
- El baseline tuvo 1 truncamiento con 2 imágenes.
- Con n=5 no hay conclusión estadística. **Recomendación provisional:** pedir como máximo
  una foto adicional y evaluar 3 vistas antes de recomendarlas.

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

- **Cuota diaria:** por decisión del propietario, el contador interno de 150 solicitudes
  diarias (control propio, no de Meta, que documenta 3.000 RPM) queda **desactivado solo
  en el perfil de investigación** (`daily_requests: null`). Producción lo mantiene. Siguen
  activos el techo acumulado de USD 50, el ledger, la identidad, la concurrencia (4) y el
  tope por fase, este último ahora atómico dentro del lock del ledger.
- **Reasignación trazable:** USD 10 de la fase D (usada 0,40 de 14) a la F; el total se
  mantiene en 49 + 1 histórico.
- **Ledger tras la campaña** (sin facturación verificada; el panel del propietario muestra
  gasto 0 con créditos gratuitos):

| Concepto | USD |
| --- | ---: |
| Autorizado | 50,00 |
| Reservado total (histórico 1,00) | 14,85 |
| Fase F (este sprint), reservado / estimado | 7,20 / 1,574 |
| Estimado acumulado por tarifa | 2,433 |
| Capacidad restante | 35,15 |

- **Solicitudes de la fase F:** 240, con 239 `completed` y 1 `provider_error` (truncamiento
  baseline multivista). Reutilización de etapa 1: 6 casos (no se pagó dos veces). Errores
  429 del proveedor: ninguno. El backoff con `Retry-After` está implementado y probado.
- **Privacidad:** solo fotos botánicas públicas con licencia. El aviso de Billing sobre uso
  de contenido con créditos gratuitos no figura en la página oficial de precios, que afirma
  que Standard no entrena con el contenido. Al no poder confirmarlo, **no se envió material
  Hepta nuevo**; esa línea queda separada hasta verificarlo.

## K. Validaciones

- 247 pruebas Python correctas y 12 omitidas, entre ellas la de reservas concurrentes con
  cuota diaria desactivada, que corre en CI con PostgreSQL aislado. No se ejecutó DDL en
  el servidor del ledger.
- Ruff correcto.
- Tests nuevos:
  - Perfil de investigación sin contador diario y perfil normal con él.
  - Tope por fase atómico con 8 hilos.
  - Reasignación sin cambiar el total.
  - 429/500/503 reintentables con `Retry-After` y 400/413 permanentes.
  - Backoff, reanudación sin duplicados y reutilización de la etapa 1.
  - `/identify` de punta a punta con `verify` por defecto.

## L. Git

Rama `feat/botanical-open-set-recognition` desde `main` (`e1b01e6`), con commits
Conventional de `GiuseppePrbst`.
- Conjunto independiente congelado: `ee7e76a`.
- Selección y congelación de la estrategia: `0283441`, anterior a la evaluación de 56 casos.
- Perfil sin contador diario: `87a650a`.

PR #22 abierto contra `main`, **sin merge**.

## M. Próximas cinco acciones

1. Revisión de especialista de los 47 + 56 casos para pasar de exploración a evaluación
   validada.
2. Que José consuma `acceptance`, `exploratory_candidates` y `catalog_assessment`.
3. Mejorar las podocarpáceas: rasgos del envés y bandas estomáticas con fuente chilena.
   Medir de nuevo solo con un conjunto independiente nuevo.
4. Multivista con más individuos; decidir si 3 vistas valen la pena con verify.
5. Caja de usuario + SAM frente a la foto original, como prueba controlada.

