# Evaluación multirreino con Meta AI — 31-10-2026

Campaña real con Meta Model API (Standard Mode) sobre conjuntos **nuevos y congelados** de
flora, fauna y hongos. Resultados por paso y por caso en
[`multikingdom-results.json`](../evaluations/biodiversity/multikingdom-results.json).
Conjuntos en [`frozen-sets.json`](../evaluations/biodiversity/frozen-sets.json), con hash
`72433771aed4bec1543587fcb6f0255ba7417cb0f063a58824548367f60f3984`, versionado en el commit
`5fa4f2b` **antes** de cualquier llamada de test.

> **Estado de las etiquetas:** etiqueta de plataforma (iNaturalist research grade, Pl@ntNet,
> Commons) más inspección visual del agente. **No hay revisión de especialista.** Las cifras
> son exploratorias, no exactitud científica certificada. Los resultados del PR #22
> (verify-v2: 3/37 negativos aceptados, 8/19 positivos) no se modificaron.

## Diseño

- **Independencia.** Se excluyeron todas las imágenes, observaciones, grupos y duplicados
  perceptuales (dHash ≤ 6) usados el 30-10 para elegir `verify`. Una observación de
  iNaturalist equivale a un individuo.
  - Desarrollo y test se separan por grupo: observación, fotógrafo y fecha, y duplicados
    exactos o perceptuales. Ningún grupo está en ambas particiones (comprobado al congelar).
  - Como máximo dos primeras vistas por fotógrafo y taxón.
- **Curaduría.** Revisé visualmente 642 miniaturas en hojas de contacto y excluí 38. Motivos:
  - carteles o etiquetas con nombre;
  - collages y vistas duplicadas;
  - organismo no visible;
  - huellas;
  - etiquetas dudosas;
  - un objeto artesanal.

  Las fotos difíciles (lejanas, nocturnas, de cámara trampa o con agallas sin cuerpo
  fructífero) se conservaron para medir la abstención.
- **Negativos por panel.**
  - Difíciles: especies parecidas fuera del catálogo.
  - Generales: otros organismos del mismo reino.
  - Entre reinos: 10 fotos de catálogo de los otros paneles.
  - Ambientales: 8 fotos de Commons de Puyehue con líquenes, una enredadera, corteza, un
    edificio y paisajes.
- **Pipelines.**
  - Flora: el pipeline productivo (`/identify`).
  - Fauna y hongos: `bosque_ai.multikingdom`, separado y no conectado a `/identify`, con el
    mismo esquema open-set y la misma regla de aceptación que la etapa 1 de `verify`.
- **Orden.**
  1. Smoke de 6 casos por reino.
  2. Desarrollo de fauna y hongos con dos estrategias.
  3. Test congelado una sola vez por estrategia.

  No hubo cambios de prompt después de ver resultados de test.
- **Métricas**, todas con intervalo de Wilson al 95 %:
  - correctos aceptados;
  - cobertura;
  - riesgo selectivo;
  - negativos falsamente aceptados.

  Comparaciones pareadas por caso (`open_set_eval.paired`). Las observaciones son
  independientes por construcción. Las fotos de un mismo fotógrafo pueden estar
  correlacionadas, por eso **no** se afirma significación estadística.

## Volumen

996 casos ejecutados con Muse en la fase G del ledger: 18 de smoke, 124 de desarrollo y 854
de test. `verify` añade una segunda llamada cuando acepta. Hubo 4 errores de proveedor,
todos en flora, y ningún truncamiento detectado.

| Panel | Test | Positivos | Negativos (difíciles / generales / entre reinos y ambientales) |
| --- | ---: | ---: | --- |
| Flora | 149 | 101 | 24 / 6 / 18 |
| Fauna | 134 | 76 | 26 / 14 / 18 |
| Hongos | 64 | 29 | 8 / 9 / 18 |

## Flora: comparación con `verify-v2` en un conjunto nuevo

| Estrategia | n | Correctos aceptados en positivos | Negativos aceptados | Riesgo selectivo | Costo estimado / caso |
| --- | ---: | --- | --- | --- | ---: |
| A. Baseline | 149 | 67/101 (0,57–0,75) | **23/48** (0,34–0,62); difíciles 21/24 | 9/76 | USD 0,0052 |
| B. `verify-v2` (producción) | 149 | 45/100 (0,36–0,55) | **8/48** (0,09–0,30); difíciles 7/24 | 3/48 | USD 0,0074 |
| C. `verify` con rasgos del catálogo | 60 (subconjunto fijo) | 15/35 | 3/23 | 3/18 | USD 0,0089 |
| D. Multivista (`verify`, 1 frente a 2 vistas) | 30 × 2 | 1 vista: 16/30; 2 vistas: 14/30 | — | 0 erróneas con 2 vistas | USD 0,0083 |

Entre paréntesis, el IC Wilson al 95 %.

- **Se confirma el patrón del PR #22 con datos nuevos.** `verify` reduce los negativos
  aceptados de 23/48 a 8/48, a cambio de cobertura en positivos (67 → 45 correctos
  aceptados). Comparación pareada (n = 149): solo A acierta en 24 casos y solo B en 17.
  Ambientales: 0/8 aceptados con las dos estrategias.
- **Por especie (B):** tineo 13/13, olivillo 8/13, mañío 9/15, ulmo 4/8, coigüe de
  Magallanes 5/13, lenga 4/14, tepa 2/13 y coigüe 0/11.
  - Los 11 casos de test del coigüe eran árboles enteros y paisajes de Commons. `verify` los
    marcó `non_diagnostic_photo`: es una abstención correcta y un sesgo de composición del
    conjunto, no una medida con hojas.
- **Errores de B:** 8 negativos aceptados (*N. nitida* 3, *Caldcluvia* 2, *N. obliqua* 1,
  *Saxegothaea* 1, *Gevuina* 1) y 3 confusiones entre especies del catálogo (coigüe ↔
  coigüe de Magallanes, tepa → tineo).
- **C frente a B (n = 60):** solo C acierta en 5 casos y solo B en 2. Recuperar rasgos
  del catálogo no cambia la conclusión y cuesta un 20 % más.
- **D, multivista:** la segunda vista del mismo individuo recupera 4 aciertos y pierde 6.
  Añade 3 abstenciones netas y 0,4 s de latencia mediana, sin aceptaciones erróneas. Con
  n = 30 no mejora; sigue opcional, y la tercera vista no se probó.

## Fauna: primera evaluación real

| Estrategia | n | Correctos aceptados | Negativos difíciles aceptados | Generales y entre reinos aceptados | Riesgo selectivo |
| --- | ---: | --- | --- | --- | --- |
| A. Candidatos con abstención | 134 | **68/76** (0,81–0,95) | **15/26** (0,39–0,74) | 0/32 | 0/68 |
| B. Conocimiento: rasgos secundarios y comparadores | 134 | 58/76 (0,66–0,84) | 8/26 (0,17–0,50) | 0/32 | 0/58 |
| Muse Wonder 1.0 con B, subconjunto fijo | 40 | 13/19 | 1/21 negativos | — | 0/13 |
| Spark con B, mismo subconjunto | 40 | 15/19 | 2/21 negativos | — | 0/15 |

- **No hay confusiones entre especies del catálogo:** riesgo selectivo 0. Las falsas
  aceptaciones vienen de las especies parecidas fuera del catálogo:
  - A: cachaña → choroy 3, chucao → hued-hued 4, *P. castaneus* → hued-hued 4 y
    *T. caudatus* → bandurria 4;
  - B: 1, 0, 3 y 3 respectivamente, más 1 *Cistothorus* → chercán.
- **Mamíferos, aves comunes y paisajes:** nunca se aceptaron como una especie del catálogo.
- **Por especie (A / B):** carpintero negro 16/16 y 16/16, bandurria 17/17 y 17/17,
  chercán 10/12 y 10/12, hued-hued 12/16 y 12/16, choroy 13/15 y **3/15**. Con los rasgos
  secundarios el modelo se abstiene ante casi todos los choroyes.
- **Comparación pareada A frente a B (n = 134):** solo A acierta en 12 casos y solo B en 9.
  No hay una estrategia dominante: A tiene más cobertura y B rechaza más parecidos.
- **Spark frente a Wonder (n = 40):** solo Spark acierta en 3 casos y solo Wonder en 2.
  Wonder (preview) cuesta unas 3,2 veces más por caso (USD 0,017 frente a 0,0053) y tiene
  más latencia (5,2 frente a 3,7 s). **No se cambia de modelo.**

## Hongos: disponibilidad real e incertidumbre

| Estrategia | n | Correctos aceptados | Aceptaciones erróneas | Negativos aceptados | Riesgo selectivo |
| --- | ---: | --- | --- | --- | --- |
| A. Candidatos | 64 | 9/29 | espinosae → hariotii 10 | *C. darwinii* 8/8; generales y ambientales 0/17 | **10/19** (0,32–0,73) |
| B. Conocimiento | 64 | 14/29 | hariotii → espinosae 6 | *C. darwinii* 3/8; *Aleurodiscus* 1 | 6/20 |

El modelo distingue un hongo de otros organismos: ningún negativo general, ambiental o
entre reinos se aceptó con A. **No separa las especies de *Cyttaria*.** El riesgo selectivo
es de 30 % a 53 %, y cambiar de estrategia invierte el error, de espinosae → hariotii a
hariotii → espinosae. Nunca se pidió ni se ofreció información de consumo.

## Decisión de capacidades (en `/taxa`)

Criterio preliminar de nivel 2 (`recognition_candidate`), **fijado después de ver el test y
por eso provisional** hasta confirmarlo en un segundo conjunto independiente:

- al menos 8 positivos de test;
- al menos 50 % de correctos aceptados;
- como máximo 1 aceptación errónea hacia el taxón (negativo u otra especie del catálogo),
  en cada estrategia evaluada.

El nivel 3 exige revisión de especialista y aprobación del responsable funcional: **ningún
taxón lo tiene.**

| Nivel | Taxones |
| --- | --- |
| 2, candidato bajo feature flag | Olivillo, ulmo y mañío (`verify`). Carpintero negro y chercán (pipeline experimental sin endpoint) |
| 1, experimental | Tineo, tepa, coigüe, coigüe de Magallanes, lenga, hued-hued, choroy, bandurria, *C. hariotii* y *C. espinosae* |
| 0, restringido por política | Güiña, puma y monito del monte |
| 0, solo ficha | *Boletus chilensis* y *Amanita gayana* |

`verify-v2` sigue siendo la estrategia productiva de `/identify`. No hay endpoint de fauna
ni de hongos. Una captura sin identificación aceptada se guarda sin `species_id`.

## SAM y Wilo

- **SAM.** No se repitió. No había una hipótesis nueva que lo justificara: el mismo motivo
  del 30-10 sigue vigente y las fotos multiorganismo del conjunto fueron muy pocas. Sigue
  como ayuda visual opcional.
- **Wilo.** Ahora consulta `get_taxon_profile` y `get_taxon_conservation`, con tests. No se
  hizo una evaluación de preguntas por voz con Meta.

## Costos

| Concepto | USD |
| --- | ---: |
| Techo acumulado autorizado | 50,00 |
| Reservado total del ledger, histórico incluido | 42,77 |
| Reservado en esta campaña (fase G) | 27,92 |
| Capacidad de reserva restante | 7,23 |
| Costo estimado por tarifa de esta campaña | 6,21 |
| Costo estimado acumulado del ledger | 8,65 |
| Facturación verificada | **null**: Meta no documenta una API de saldo |

- **Reservas por modalidad:**
  - flora USD 0,03 por caso (`verify` puede hacer dos llamadas);
  - fauna y hongos USD 0,02;
  - Muse Wonder USD 0,08.
- **Reasignaciones auditadas en la configuración privada:** C → G 9, B → G 6, F → G 12,5 y
  A → G 1. El total de las fases no cambió (49 + 1 histórico).
- El tope diario interno de 150 solicitudes sigue desactivado. No se usó Contributor Mode
  ni se cambiaron métodos de pago.

## Limitaciones

- Las etiquetas son débiles y no hay especialista. Algunas fotos de iNaturalist research
  grade pueden estar mal identificadas.
- Hay pocos positivos por especie (8 a 17). Los IC son amplios, por lo que las diferencias
  entre estrategias no son concluyentes.
- La composición del conjunto pesa en los resultados (coigüe). No se estratificó por órgano
  porque iNaturalist no lo declara.
- Los criterios de nivel 2 se definieron después del test.
- El conjunto de desarrollo de hongos tenía solo 12 casos.
