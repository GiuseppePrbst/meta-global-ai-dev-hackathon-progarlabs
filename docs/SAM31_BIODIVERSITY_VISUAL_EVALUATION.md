# SAM 3.1 sobre biodiversidad — evaluación visual, 02-11-2026

Campaña real con `sam-3.1` y `muse-spark-1.3` vía Meta Model API (Standard Mode) sobre
plantas, árboles, animales y hongos. Cifras por experimento en:

- [`image-results.json`](../evaluations/sam31/image-results.json);
- [`video-results.json`](../evaluations/sam31/video-results.json);
- [`identification-results.json`](../evaluations/sam31/identification-results.json);
- [`scenes.json`](../evaluations/sam31/scenes.json) (medios, licencias y referencias).

Las máscaras, los medios y las respuestas crudas son privados (`D:/data/bosque-vivo/sam31`).

> **Tres tareas distintas.** SAM detecta y segmenta: devuelve máscaras y cajas por instancia.
> Muse propone una identificación candidata. Bosque Vivo indica el estado de verificación.
> Una máscara con confianza 0,95 **no** es 95 % de certeza taxonómica.

## Fuentes oficiales consultadas (02-11-2026)

[Segmenting](https://dev.meta.ai/docs/sam/segmenting) y
[pricing](https://dev.meta.ai/docs/pricing-rate-limits):

- un concepto por solicitud: las listas con coma, punto y coma o «+» devuelven 0, y «and»
  segmenta un solo concepto;
- cajas y puntos positivos o negativos, hasta 16 objetos; en imagen, solo el frame 0;
- video MP4 o MOV con H.264, H.265 o MPEG-4 y hasta 15.000 frames; no admite VP9 ni WebM;
- `mask_encoding` `one_bit` e `include_confidence: "true"`;
- tarifas: USD 2,50 por 1.000 imágenes y 0,20 por 1.000 frames, con un mínimo de 50 frames.

La documentación no trata la selección por ejemplar ni los nombres no ingleses o científicos:
**no se implementó «buscar todos los parecidos»**.

## Cambios en el laboratorio

- **Conceptos.** La lista fija de 5 conceptos pasa a ser un validador de una sola frase
  nominal corta (`valid_concept`), que rechaza listas, conjunciones y preguntas.
- **Video.** El límite local sube de 10 s y 300 frames a 30 s y 900 frames, todavía muy por
  debajo del de la API. La reserva sigue escalando por frames.
- **Fase H del ledger.** Reasignación auditada de la capacidad no usada de A–G. Reservas por
  modalidad: imagen SAM USD 0,01 (tarifa 0,0025), video hasta USD 0,12 (el doble de la
  tarifa) y Muse USD 0,03.
- **Runners.** `evaluations/sam_showcase.py` contiene la matriz, el asesor Muse y el resumen;
  `sam_identify.py` compara la foto original con el recorte SAM. Ambos reutilizan
  `run_experiment`: parser oficial, ledger, render y borrado remoto.
- **Visor.** Vista `/showcase` de solo lectura, sin rutas POST. Se describe en el
  [informe de demostración](SAM31_VISUAL_SHOWCASE_REPORT.md).

## Corpus

| Dominio | Imágenes | Videos | Origen y licencias |
| --- | ---: | ---: | --- |
| Plantas (flores, helechos, sotobosque) | 14 | 1 (helechos y troncos) | iNaturalist y Commons (CC BY, CC BY-SA); 2 fotogramas CC0 |
| Árboles | 15 | — | iNaturalist y Commons; paisaje de Puyehue (CC BY-SA 4.0) |
| Aves | 16 | 3 (queltehue, queltehues con nido, playeros) | iNaturalist; Commons (CC BY 2.0 y CC BY-SA 4.0) |
| Hongos y líquenes | 17 | 1 (dos hongos bajo la lluvia) | iNaturalist y Commons (CC BY-SA 4.0) |

- **Origen de las imágenes.** Son los originales ya descargados de la campaña del 31-10, sin
  descargas nuevas. Los videos son de Wikimedia Commons, elegidos por su licencia de medio.
- **Fuentes que no estuvieron disponibles:**
  - GBIF devolvió 503 durante toda la campaña;
  - Commons limitó los originales por política de robots; se resolvió con un User-Agent con
    URL de contacto y pausas.
- **Fuera de la demo pública:** el video del queltehue con nido, aunque no revela ubicación,
  por la regla de no dirigir a nidos.
- **Sin material de Puyehue en video.** No hay material Hepta, y ningún video es de Puyehue.

**Referencias.** Revisé visualmente con cuadrícula (`agent_visual_review`, no experto)
24 escenas: cajas de 1 a 7 instancias. En 12 marqué **todas** las instancias objetivo, y
solo esas 12 se usan para medir aciertos, falsos positivos y omisiones. Las métricas son de
**acuerdo de cajas** (IoU de caja ≥ 0,5 entre la caja de la máscara y la de referencia),
no IoU de máscara: no hay máscaras de referencia.

## Matriz de imágenes: 323 llamadas SAM

Por escena:

- 2 conceptos amplios;
- 1 concepto específico o nombre común;
- 1 nombre científico (en 15 escenas);
- caja, punto positivo y punto positivo más negativo (en las 24 escenas anotadas);
- concepto y cajas propuestos por Muse (en 27 escenas).

**Escenas con al menos una máscara, por concepto:**

| Dominio | Amplio 1 | Amplio 2 | Específico | Científico | Concepto de Muse |
| --- | --- | --- | --- | --- | --- |
| Aves | `bird` **16/16** | `animal` 9/16 | 16/16 (`woodpecker`, `parrot`, `ibis`…) | **0/4** | 5/6 |
| Hongos | `mushroom` 6/17 | `fungus` 7/17 | 5/17 | 1/5 (solo *Amanita muscaria*) | 5/6 |
| Plantas | `flower` 9/12 | `plant` 5/12 | 9/14 | 0/3 | 6/9 |
| Árboles | `tree` 11/15 | `tree crown` **0/15** | 9/15 | 0/3 | 2/6 |

Los prompts espaciales siempre devuelven una máscara, porque el usuario elige el objeto:
el «100 %» de las filas espaciales no es una tasa de detección. Su calidad se mide abajo.

**Acuerdo de cajas en las 12 escenas con referencia completa** (aciertos / falsos positivos /
omisiones):

| Prompt | Aves (5 escenas) | Hongos (4) | Planta y árbol (2) | Total |
| --- | --- | --- | --- | --- |
| Conceptos amplios (2 por escena) | 19 / 0 / 3 | 14 / 2 / 18 | 2 / 2 / 2 | 35 / 4 / 23 |
| Concepto específico humano | 11 / 0 / 0 | 1 / 0 / 15 | 2 / 0 / 0 | 14 / 0 / 15 |
| Nombre científico | 0 / 0 / 4 | 1 / 0 / 15 | 0 / 0 / 2 | 1 / 0 / 21 |
| Caja de referencia | 11 / 0 / 0 | 15 / 1 / 1 | 2 / 0 / 0 | **28 / 1 / 1** |
| Punto derivado (centro de caja) | 4 / 2 / 7 | 4 / 0 / 12 | 1 / 1 / 1 | 9 / 3 / 20 |
| Concepto de Muse | — | — | — | **24 / 5 / 5** |
| Cajas de Muse | — | — | — | 17 / 29 / 12 |

IoU medio de las cajas acertadas: 0,80–0,92.

Hallazgos:

1. **Aves.** `bird` encontró las 9 aves de las 5 escenas completas sin falsos positivos,
   incluidas las 4 bandurrias de una orilla. El fallo fue una bandada de choroyes: 8 máscaras
   para unas 13 aves visibles.
2. **Hongos.** Las *Cyttaria* globosas en racimo no responden a `mushroom` ni a `fungus`
   (0/9 en dos escenas).
   - Con el concepto visual que propuso Muse, «orange bumpy sphere», sí: 4/4.
   - «honeycomb yellow sphere» dio 3/5.
   - Con cajas: 8/9.
   - En otra escena, `fungus` segmentó 30 cuerpos sobre un tronco.
   - El *Amanita muscaria* aislado funciona con todo, incluido su nombre científico.
3. **Nombres científicos.** Fallan casi siempre (1/15). Los nombres comunes en inglés y los
   atributos visuales funcionan mejor.
4. **Árboles.** `tree` funciona en vistas a nivel del suelo con árboles aislados (11/15).
   `tree crown` no devolvió nada en ninguna foto de suelo. En bosque denso la caja es la
   herramienta adecuada.
5. **Plantas.** `flower` individualiza inflorescencias: 12 en tineo, 26 en arrayán y 21 en
   *Asteranthera*. `fern` y `fern frond` devolvieron 0 en el material del cañón de
   helechos. `plant` lo segmentó como regiones grandes, no como frondas.
6. **Puntos derivados.** Un punto positivo en el centro geométrico de la caja suele caer en el
   fondo (entre las patas de un ave, entre hongos) y produce máscaras mínimas. Un clic real
   del usuario sobre el organismo es otra cosa: aquí no se probó.
7. **Muse como generador de prompts.**
   - Su concepto superó tanto al concepto específico humano como a los amplios en las escenas
     completas. Su mayor aporte está donde el sustantivo falla (*Cyttaria*).
   - Sus **cajas** son imprecisas (29 falsos positivos) y no deben usarse sin validación.
   - En árboles su concepto rindió peor (2/6), por ejemplo «tall conifer tree» con 0.

**Latencia mediana:**

| Prompt | Mediana |
| --- | ---: |
| Concepto | 5,8 s |
| Caja | 4,9 s |
| Puntos | 6,2 s |

El p95 global es de 19 s. Los experimentos de Muse son más lentos porque incluyen la
espera del asesor.

## Video: 15 experimentos, 100 frames a 10 FPS por clip

| Experimento | Resultado | Frames con máscara | Confianza media | Latencia |
| --- | --- | --- | ---: | ---: |
| Queltehue, `bird` | 1 track en 100/100 frames; un segundo objeto en el borde desde el frame 84 (no verificable) | 100 | 0,94 | 45,9 s |
| Queltehue, `lapwing` | Solo desde el frame 53 | 47 | 0,72 | 28,0 s |
| Queltehue, caja en el frame 0 (`forward`) | 1 track, 100/100 | 100 | 0,97 | 46,6 s |
| Queltehue, caja en el frame 50 (`both`) | 1 track, 100/100 | 100 | 0,97 | 46,6 s |
| Playeros, `bird` a 640 / 960 / 1280 px | 2 tracks completos en cada resolución | 100 | 0,85 / 0,88 / 0,88 | 10,2 / 10,0 / 12,1 s |
| Playeros, 2 cajas | Un ave se pierde: 73/100 frames y 2 huecos; la otra 100/100 | 100 | 0,85 | 15,6 s |
| Queltehues con nido, `bird` | 4 tracks, entradas y salidas del cuadro (privado) | 100 | 0,90 | 22,6 s |
| Hongos, `mushroom` | 2 tracks completos | 100 | 0,95 | 30,1 s |
| Hongos, `parasol mushroom` | 0 máscaras | 0 | — | 7,7 s |
| Hongos, 2 cajas | 2 tracks completos | 100 | 0,95 | 30,7 s |
| Helechos, `fern` | 0 máscaras | 0 | — | 9,1 s |
| Helechos, `plant` | 2 tracks solo en los frames 70–99 | 30 | 0,72 | 22,3 s |
| Helechos, `fallen log` | 6 tracks de troncos | 100 | 0,81 | 15,0 s |

- **Verificación visual.** Inspeccioné frames 0, 50 y 85–99: el queltehue, ambos playeros y
  ambos hongos conservan su ID sobre el mismo individuo.
- **Sin métricas temporales de exactitud.** No hay anotación por frame, así que no se
  calculan IDF1 ni ID switches con referencia. Un ID constante no prueba por sí solo la
  continuidad correcta.
- **Resolución.** En aves pequeñas, subir de 640 a 1280 px no cambió los tracks y apenas
  movió la latencia (10 → 12 s). En Hepta la latencia se triplicaba: en estos clips no.
- **Concepto frente a cajas.** En los playeros, el concepto mantuvo las dos aves y las cajas
  perdieron una. La caja no siempre es mejor en video.
- **Costo.** Cada clip se facturó como 100 frames (USD 0,02). Los 15 archivos subidos se
  borraron en remoto.

## Muse + SAM + catálogo: original frente a recorte SAM

24 llamadas: 12 resultados × 2 variantes. El recorte es la caja de la máscara más un margen
del 20 %. Se usó el pipeline productivo `verify` en flora y el multirreino experimental en
fauna y hongos.

| Caso (etiqueta de plataforma) | Foto completa | Recorte SAM |
| --- | --- | --- |
| Carpintero negro ×2 | Carpintero negro | Carpintero negro |
| Bandurria | Bandurria | Bandurria |
| Choroy (bandada) | Choroy | Choroy |
| Cachaña (fuera del catálogo) | **Choroy (error)** | **Choroy (error)** |
| Chucao (fuera del catálogo) | **Hued-hued (error)** | **Hued-hued (error)** |
| *C. hariotii* ×2 | *C. hariotii* | *C. hariotii* |
| *C. darwinii* (fuera del catálogo) | ***C. hariotii* (error)** | ***C. hariotii* (error)** |
| *C. espinosae* | *C. espinosae* | ***C. hariotii* (cambió)** |
| Mañío lejano | `non_diagnostic_photo` | `non_diagnostic_photo` |
| Notro (fuera del catálogo arbóreo) | `out_of_catalog_suspected` | `out_of_catalog_suspected` |

**Respuesta a Q7.** En esta muestra el recorte SAM no mejoró ninguna identificación y empeoró
una (*C. espinosae*). Los errores con especies parecidas fuera del catálogo se repiten igual:
el recorte no sustituye a la abstención open-set. Muestra pequeña (n = 12), con etiquetas de
plataforma.

## Costos

| Concepto | USD |
| --- | ---: |
| Techo acumulado autorizado | 50,00 |
| Reservado en la fase H | 6,29 |
| Reservado total del ledger | 49,06 |
| Capacidad restante | 0,94 |
| Estimado por tarifa en la fase H | 1,33 |
| Estimado acumulado | 9,97 |
| Facturación verificada | **null** |

Desglose del estimado de la fase H:

- SAM imagen: 323 × 0,0025 ≈ 0,81;
- SAM video: 15 × 0,02 = 0,30;
- asesor Muse: 0,17;
- identificación: 0,09.

No se superó el techo. La capacidad restante no alcanza para otra campaña equivalente.

## Respuestas para Bosque Vivo

| Pregunta | Respuesta medida |
| --- | --- |
| ¿Detecta árboles automáticamente? | En vistas a nivel del suelo y árboles aislados, sí (`tree` 11/15). En bosque denso no individualiza copas con conceptos: hace falta una caja. `tree crown` falló en suelo. Las vistas aéreas solo se probaron el 30-10 (Hepta y Detectree2) y no se repitieron |
| ¿Segmenta hojas, helechos y sotobosque? | Flores, sí y por instancia. `fern` falló en el material probado; `plant` da regiones |
| ¿Varias aves individualizadas? | Sí en grupos pequeños (9/9). En una bandada densa hubo omisiones (8 de ~13) |
| ¿Sigue animales en video? | Sí en los clips probados (100/100 frames, ID estable), sin métricas temporales con referencia |
| ¿Hongos sobre troncos y suelo? | Sí con `mushroom`/`fungus` para hongos de sombrero y racimos sobre tronco (30 cuerpos). Las *Cyttaria* globosas necesitan un concepto visual o cajas |
| ¿Muse ayuda a elegir prompts? | Sí con conceptos (24/5/5 frente a 14/0/15 del humano); no con cajas |
| ¿El recorte SAM mejora la identificación? | No en esta muestra; empeoró un caso |
| ¿Valor para el gemelo digital? | Selección visual en capturas, resaltado didáctico, seguimiento en video y asistencia a la anotación. **No** sirve para inventarios ni abundancia sin metodología validada |

## Limitaciones

- Las referencias son del agente, no de especialistas. Las métricas son de caja, no de máscara.
- No hay anotación por frame en video, por lo que no hay IDF1.
- Los puntos se derivaron de cajas, no de clics reales.
- Pocos clips de video y ninguno de Puyehue.
- El clip de hongos es de una especie no chilena (parecida a *Macrolepiota*) y no es *Cyttaria*.
- Una sola corrida por experimento: no se midió la variabilidad entre llamadas.
