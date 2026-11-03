# SAM 3.1 — investigación ampliada, 03-11-2026

Segunda campaña sobre los fallos de la primera
([evaluación inicial](SAM31_BIODIVERSITY_VISUAL_EVALUATION.md)). Los resultados del PR #28
no se reescribieron.

Datos sanitizados en `evaluations/sam31/`:

- `image-results-v2.json`: 454 experimentos de imagen;
- `video-results-v2.json`: 12 videos;
- `mask-metrics.json`: 317 resultados contra referencias de máscara;
- `tracking-metrics-v2.json`;
- `identification-results-v2.json`: 105 identificaciones;
- `scenes-v2.json`: escenas, revisiones de referencias y diagnósticos de Muse.

> **Estado de las referencias.** Las cajas por instancia las anoté yo. Con cada caja, GrabCut
> (OpenCV, sin modelos de Meta) generó una máscara sobre los mismos píxeles que recibió SAM.
> Revisé cada máscara y acepté o rechacé cada instancia (`agent_grabcut_reviewed`). **No son
> referencias de especialista.**

## Referencias de máscara

- 42 escenas preparadas y 24 aceptadas, con 66 instancias en total.
- Rechacé 18 escenas por fugas de GrabCut: cielo, agua o corteza dentro de la máscara.
- Las referencias quedan sesgadas hacia objetos con buen contraste. Por eso las métricas no
  cubren el bosque denso.
- En las escenas parciales, donde no anoté todas las instancias, no se calculan falsos
  positivos ni precisión.

**Métricas de máscara** (mediana por resultado; una instancia cuenta como acertada si su IoU
de máscara es ≥ 0,5):

| Prompt | Resultados | Acertadas | Omitidas | Falsos positivos | IoU de máscara | Boundary F1 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Caja de referencia | 24 | 45 | 6 | 4 | 0,79 | 0,75 |
| Caja + punto central (corrección) | 24 | 45 | 6 | 5 | 0,81 | 0,72 |
| Concepto amplio o específico (v1) | 63 | 67 | 65 | 8 | 0,76 | 0,77 |
| Conceptos nuevos (v2) | 139 | 101 | 189 | 19 | 0,79 | 0,77 |
| Concepto propuesto por Muse | 13 | 16 | 11 | 2 | **0,83** | **0,85** |
| Cajas propuestas por Muse | 13 | 14 | 13 | 14 | 0,69 | 0,64 |
| Punto derivado del centro de la caja | 26 | 15 | 39 | 4 | 0,73 | 0,64 |
| Nombre científico | 7 | 1 | 13 | 0 | — | — |

- Las cajas aportan el objeto y por eso omiten poco.
- Los conceptos tienen que encontrarlo: omiten más, pero sus máscaras son igual de precisas.
- El punto central extra apenas cambia la máscara (IoU de 0,79 a 0,81).
- El concepto de Muse da las máscaras más precisas cuando acierta.

## Helechos: el fallo era del material, no del concepto

Con 17 fotos nuevas de Commons (*Blechnum chilense*, *Lophosoria*, *Dicksonia*,
*Gleichenia*), escenas en las que encontró algo:

| Concepto | Escenas |
| --- | ---: |
| `green plant` | 10/11 |
| `tree fern` | 8/11 |
| `fern` | 7/9 |
| `fern leaf`, `green frond` | 4/11 |
| `frond` | 3/11 |
| `compound leaf` | 1/11 |
| `leaf cluster` | 0/11 |

- **Con referencia:** en *Blechnum* (3 frondas), `fern` y `tree fern` aciertan 3/3 (IoU 0,76)
  y la caja 3/3 (IoU 0,87).
- **En el cañón de la campaña 1:** `fern`, `frond`, `tree fern` y `leaf cluster` siguen
  dando 0. Muse diagnosticó un muro musgoso lejano y su alternativa también dio 0. El video
  largo (25 s) solo encontró regiones con `green plant`.
- **Conclusión:** SAM reconoce frondas individuales en primer plano nítido. Un muro de
  helechos lejano y desenfocado no es una instancia para el modelo.
- **Fallo persistente:** en *Blechnum* en terreno abierto con plantas mezcladas (fern-c2),
  ningún concepto encontró nada y solo la caja funcionó (2/3, IoU 0,56).

## Árboles y bosque denso

| Concepto | Escenas |
| --- | ---: |
| `forest` | 11/18 |
| `tree trunk` | 6/17 |
| `branch` | 2/18 |
| `shrub` | 1/17 |
| `canopy`, `conifer`, `leaves` | 0/18 |

- `forest` devuelve una región grande, no individuos.
- No hay copas individuales en vistas de suelo con ningún concepto. La caja sigue siendo la
  forma de aislar un árbol: IoU 0,60–0,67 en los árboles con referencia, frente a 0,53–0,61
  de `tree`.
- **Troncos:** «curved thick trunk», propuesto por Muse, encontró 4 troncos donde `tree` y
  `tree trunk` fallaron.
- No había material aéreo autorizado nuevo; las vistas aéreas no se reevaluaron.

## Hongos globosos (*Cyttaria*)

Escenas en las que encontró algo, entre 17:

| Concepto | Escenas |
| --- | ---: |
| `cluster of orange spheres` | 11 |
| `fungal fruiting body` | 10 |
| `orange bumpy sphere` | 8 |
| `round fungus` | 8 |
| `mushroom cap` | 7 |
| `orange ball` | 5 |
| `yellow honeycomb sphere` | 3 |

- **Con referencia:** en los racimos donde `mushroom` daba 0, «orange bumpy sphere» y
  «yellow honeycomb sphere» aciertan con IoU 0,70–0,89. En el racimo de 6, casi todos los
  conceptos visuales aciertan 6/6 (IoU ≈ 0,83).
- **Diagnóstico de Muse:**
  - «bumpy orange spheres»: 99 cuerpos en un nudo de tronco;
  - «pale pitted round growths»: 22;
  - «white smooth balls»: 5 (*C. darwinii* pálida).
- **Conclusión:** SAM segmenta bien estas estructuras si se describen por forma y color. El
  nombre taxonómico del grupo no le sirve.

## Aves

| Concepto | Escenas |
| --- | ---: |
| `perched bird` | 16/16 |
| `small bird` | 15/15 |
| `green parrot` | 5/16 |
| `black bird` | 1/16 |

- `bird` sigue siendo la base. Los atributos de color fallan a menudo.
- En la bandada de choroyes Muse propuso `green parrot`: 5 aves, donde `bird` y
  `parrot` daban menos.
- En las 4 bandurrias con referencia, todos los conceptos aciertan 3/4 con 1 falso positivo:
  el cuarto individuo está cortado en el borde.

## Muse como asesor visual

| Experimento | Resultado |
| --- | --- |
| A. Concepto humano frente a Muse | El de Muse tiene más IoU de máscara (0,83 frente a 0,76–0,79) y menos omisiones relativas |
| B. Amplio frente a frase visual | La frase visual gana en *Cyttaria* y troncos; pierde en árboles enteros («tall conifer tree» = 0) |
| C. Muse diagnostica fallos | En **17 de 24 escenas** donde todas las frases previas daban 0, su alternativa encontró objetos. Las 7 sin recuperar son cañón lejano, bosque denso, contraluz y matorral |
| D. Instancia en contexto (región resaltada) | Ver identificación: no mejora frente a la foto completa |
| E. Spark frente a Wonder | Ver identificación |

## Identificación: foto completa, recorte y región resaltada

21 casos: 11 dentro del catálogo y 10 fuera (cachaña, chucao, *C. darwinii*, notro,
*Amanita*, *Fistulina*…).

| Modelo / variante | Taxón correcto dentro del catálogo | Abstención correcta fuera del catálogo |
| --- | ---: | ---: |
| Spark, foto completa | **10/11** | 3/10 |
| Spark, recorte SAM | 9/11 | 4/10 |
| Spark, región resaltada | 9/11 | 3/10 |
| Wonder, foto completa | 7/11 | 7/10 |
| Wonder, región resaltada | 6/11 | **8/10** |

- **SAM no mejora la identificación.** Recortar o resaltar la región no supera a la foto
  completa con Spark: se confirma el resultado de la campaña 1 con más casos.
- **Spark acepta parecidos.** Toma la cachaña por choroy y el chucao por hued-hued en todas
  las variantes.
- **Wonder se abstiene más.** Rechaza bien los parecidos (cachaña y chucao), pero pierde
  *Cyttaria* reales y casos difíciles.
- ***Cyttaria*:** ningún modelo ni variante separa las especies de forma fiable.
- Ninguna combinación es apta para habilitar la identificación de fauna u hongos.

## Video y tracking

**Referencia por frame:** 9 frames anotados del queltehue (GrabCut revisado). Las referencias
de los hongos se rechazaron por inconsistentes entre frames.

| Resultado | Frames acertados | IoU medio | Cambios de ID |
| --- | ---: | ---: | ---: |
| `bird` | 9/9 | 0,894 | 0 |
| Caja en el frame 0 | 9/9 | 0,895 | 0 |
| Caja en el frame 50 (`both`) | 9/9 | 0,894 | 0 |
| `lapwing` | 4/9 | 0,926 | 0 (solo aparece desde el frame 53) |

**Experimentos nuevos:**

- **Corrección en un frame intermedio.**
  - Clip de 10 s: el playero que la caja perdía queda en 99/100 frames con la corrección en
    el frame 80 (antes 73/100 con 2 huecos).
  - Clip de 20 s: con la corrección en el frame 149, ese playero queda en 149/200 con 7
    huecos. El concepto `bird` mantuvo las dos aves en 200/200.
- **Clips más largos:**
  - queltehue a 15 FPS (208 frames): la caja da 1 track limpio; `bird` añade un objeto de
    borde desde el frame 125 (falso positivo visible);
  - hongos 30 s / 300 frames: `mushroom` da 2 tracks completos. `white mushroom` solo aparece
    desde el frame 89.
- **Helechos 25 s:** `frond`, `tree fern` y `leaf cluster` dan 0.
- **Costo:** se factura por frame; un clip de 300 frames ≈ USD 0,06. Los archivos subidos se
  borraron en remoto.

## Costos y créditos

| Concepto | USD |
| --- | ---: |
| Snapshot de créditos gratuitos (Billing, aportado por el propietario el 02-11) | 140,86 |
| Capacidad autorizada para la fase I | 130,00 |
| Margen de seguridad | 10,86 |
| Reservado en la fase I | 11,26 |
| Estimado por tarifa en la fase I | 2,55 |
| Estimado acumulado del ledger | 12,56 |
| Reservas históricas intactas | 49,33 |
| Gasto de pago verificado | null |

- La autorización no permite cargos en tarjeta.
- El crédito restante (≤ USD 129,60) es una cota superior: es el snapshot menos las
  reservas. **No se volvió a consultar el panel de Billing**, porque no hay API de saldo.
- Hubo 301 solicitudes rechazadas por la concurrencia del ledger al subir a 8 hilos. No
  hicieron ninguna llamada a Meta, se archivaron como `.refused-concurrency` y se
  reintentaron. El runner ahora reintenta solo.
- **Privacidad:** solo medios públicos con licencia; nada de Hepta ni de fotos con GPS. Con
  créditos gratuitos, el contenido puede usarse para mejorar productos de Meta.

## Material de Codex

- **Handoff disponible.** Codex fusionó su trabajo de contenidos (PR #29, 03-11-2026) con
  [SAM_MEDIA_HANDOFF.md](SAM_MEDIA_HANDOFF.md).
  - Contenido: 15 escenas sin EXIF (helechos, árboles, vegetación) y 9 clips verticales de
    los videos propios.
  - Sin fauna ni hongos.
- **No se procesó.** El handoff declara que el procesamiento externo en Meta Model API **no
  está confirmado por el titular** e indica no enviar. Ninguna de estas escenas se mandó a
  Meta. La autorización Hepta no las cubre.
- **Siguiente paso.** Cuando el titular lo confirme por escrito, se suman como incremento
  separado con referencias propias y sin tocar los originales ni el manifiesto de Codex
  ([requisitos](SAM31_MEDIA_REQUIREMENTS.md)).
- **Otro trabajo concurrente.** El PR #30 (borrador, `feat/meta-sam-dataset-workers`) modifica
  `lab.py`, `costs.py` y la admisión de la fase I. Este PR añade `CreditAuthorization` en los
  mismos archivos: hay que coordinar cuál se integra primero y reconciliar después.

## Limitaciones

- Referencias del agente, sin especialista, y sesgadas hacia objetos contrastados.
- Una sola corrida por experimento. Muestra de identificación pequeña (21 casos).
- Sin material aéreo nuevo, sin material de Puyehue en video y sin aves en bandada en video.
