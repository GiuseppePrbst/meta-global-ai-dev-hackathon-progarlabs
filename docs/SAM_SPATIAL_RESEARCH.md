# SAM 3.1 espacial: diagnóstico, laboratorio y plan de inferencias — 30-10-2026

Continúa [META_SAM_API_RESEARCH.md](META_SAM_API_RESEARCH.md); no reemplaza sus resultados.
**Esta iteración no hizo llamadas pagadas**: el ledger tiene reservado el techo de USD 1.
Todo lo nuevo se probó con datos sintéticos, MockTransport y preparación local con FFmpeg.

## A. Estado inicial verificado

- Cuenta `GiuseppePrbst` (`gh api user`), correo local verificado en GitHub, árbol limpio.
- PR #17 → `main`, #18 → #17, #19 → #18: abiertos, sin merge. HEAD #19 `5912a54`, CI verde
  (run 41057528550: api, web, repository).
- Baseline local antes de editar: `pytest services` **160 pasaron, 11 omitidos** (sin
  `TEST_DATABASE_URL`); `node tools/meta_sam_api_lab/viewer.test.cjs` correcto.
- Raíz privada: ocho resultados. Siete figuran en el informe anterior y uno más
  (`budget_exhausted`, sin `provider-output`) corresponde a un envío desde el visor
  rechazado por el ledger. Los ocho se conservan intactos.

## B. Diagnóstico de la ausencia de árboles y tracks

Se midió solo lo que la evidencia existente permite: geometría declarada y longitud de
las respuestas guardadas, sin abrir ni describir píxeles privados en este contexto.

| Hipótesis | Evidencia | Estado |
| --- | --- | --- |
| H1 concepto insuficiente | Misma foto: `tree` 0, `vegetation` 1 instancia | **Apoyada** para esa foto |
| H2 objeto pequeño | Sin anotaciones de tamaño de copa | No evaluada |
| H3 reducción a 640 px | La foto se envió nativa (4032×2268) y `tree` dio 0 | **No es causa suficiente** en foto; video sin medir |
| H4 frame inicial | Prompts conceptuales no dependen del frame; la caja quedó fijada al frame 0 | Limitación de código **corregida**; efecto sin medir |
| H5 transformación de cajas | El ensayo espacial nunca llegó al proveedor (floats rechazados) | Corrección probada con pruebas sintéticas, no con el proveedor |
| H6 masa vegetal en vez de instancias | Única máscara: 21,6 % de la imagen; caja 39,8 %; raster 1024×882 para caja 2055×1771 | **Apoyada** cualitativamente |
| H7 error nuestro de máscaras | `no_matches`: salida del proveedor de **0 caracteres**; positiva declara `w=4032;h=2268` igual al medio, sin diagnósticos | **Descartada** con la evidencia disponible |
| H8 límite del modelo en aéreas | Compatible con todo lo anterior | Plausible, no confirmada |

Conclusión operativa: con conceptos, SAM no encontró «tree» en este dominio. Con
«vegetation» devuelve una región continua de baja resolución, no copas individuales.
El laboratorio no permitía la palanca documentada para ese caso: cajas y puntos por
objeto en un frame elegido. Esa es la mejora de mayor impacto. Su efecto real sigue
pendiente de una inferencia autorizada (sección H).

## C. Selección espacial implementada

- `lab.spatial_prompt` usa `build_object_prompt`, `PromptObject`, `FramePrompt`,
  `PromptBox` y `PromptPoint` de `meta-sam-parser==0.1.0`, sin gramática propia.
- Cajas: floats → `floor/ceil` a límites semiabiertos del builder. En el cable
  `x2/y2` son inclusivos (`right-1`), exactamente como emite el builder oficial.
- Puntos: `floor`; un punto justo en el borde lejano va al último píxel.
  Los puntos negativos usan el prefijo `-`.
- Coordenadas fuera de `[0, tamaño]` se **rechazan**; nunca se recortan en silencio.
  Una caja de ancho o alto cero se rechaza (`invalid_box`).
- Reglas del proveedor: 1–16 objetos; un ID por objeto en todos sus frames; una caja
  por objeto y frame (`duplicate_frame`). El builder exige IDs únicos. En imagen solo
  frame 0. `backward` exige un primer prompt después del frame 0. Concepto y prompts
  espaciales son mutuamente excluyentes, también en el manifiesto.
- `include_confidence` se envía como cadena `"true"`. La confianza se guarda por máscara
  y se muestra como información del modelo; no es IoU, precisión ni probabilidad.
- `propagation_direction` solo para video; las imágenes ya no lo envían (antes `forward`).
- Video rotado se rechaza: hay que prepararlo con autorotación (`prepare_clip`).
- Validación, prompt y estimación se calculan **antes** de reservar, subir o llamar.
  Vista previa, CLI y envío comparten `plan_request`.

Fuente: [segmentación](https://dev.meta.ai/docs/sam/segmenting) y
[parser](https://dev.meta.ai/docs/sam/client-libraries), consultadas el 30-10-2026.

## D. Video, correcciones y resolución

- Frame de referencia libre. Se registran índice, tiempo `i/fps`, tamaño preparado e IDs.
- Dirección `both` (por defecto), `forward` o `backward`. La estimación de frames sale
  del primer frame con prompt (`frames_processed`) y la tarifa aplica el mínimo de 50.
- Los resultados se indexan por `frame_index`; la prueba sintética emite frames
  descendentes (como `backward`) y verifica posiciones, huecos y confianza.
- Una corrección es un experimento nuevo con `parent_experiment_id`,
  `correction_reason`, `prompt`, `objects`, `model_version`, `parser` y `created_at`.
  El directorio de salida no puede existir: el historial nunca se sobrescribe.
- `prepare_clip(width=640|960|1280)` y `matrix` generan clips del mismo intervalo,
  FPS y duración. Ejecutado localmente sobre el intervalo que recibió las dos
  inferencias reales (inicio 5 s, 5 s, 10 FPS):

| Ancho | Alto | Frames | Bytes | Escala vs 1920×1080 |
| ---: | ---: | ---: | ---: | ---: |
| 640 | 360 | 50 | 2.757.966 | 1/3 |
| 960 | 540 | 50 | 6.639.071 | 1/2 |
| 1280 | 720 | 50 | 11.711.235 | 2/3 |

El clip 640 resultó **byte a byte idéntico (SHA-256)** al usado en las solicitudes
reales, de modo que la preparación es reproducible y la comparación queda controlada.
SAM factura por frame: la resolución no cambia la tarifa, solo el payload y la latencia.
No se afirma mejora por resolución: no se ha medido.

## E. Visualizador

`tools/meta_sam_api_lab/` sigue siendo independiente, solo `127.0.0.1` y sin CDN.

- Tipos: concepto, espacial (caja, punto positivo, punto negativo) y corrección.
- Multiinstancia con IDs y colores estables. Puedes borrar prompts por objeto y frame.
- Frame de referencia para video (búsqueda al centro del frame), dirección y zoom.
- Geometría pura en `geometry.js`: puntero → caja pintada (border, padding,
  `object-fit: contain`) → píxeles del lienzo → medio preparado. `getBoundingClientRect`
  ya incluye escalado CSS y zoom, así que el device pixel ratio no interviene.
- **Vista previa obligatoria** (`/api/preview`): medio, resolución, prompt exacto, IDs,
  frame, cajas y puntos, dirección, frames y costo estimados, y estado del ledger en solo
  lectura. «Enviar a Meta» exige una vista previa idéntica a la solicitud y un ledger
  que admita reserva. Dibujar o previsualizar nunca envía nada.
- Resultado guardado: prompt que lo produjo (separado de la nueva solicitud), línea
  de tiempo por ID, confianza por objeto, frames sin máscara sin rellenar y comparación
  de contornos con otro experimento. Todo es local, sin reinferencia.
- Revisión humana: calidad (correcto, parcial, sobre/subsegmentado, objeto equivocado
  u omitido, fondo confundido, sin detección), notas y polígonos de referencia.
  Se guarda como `review-<UTC>.json` nuevo; `result.json` no cambia.
- Métricas en `metrics.py` (Pillow): IoU, Dice, precisión, recall, cobertura y píxeles
  FP/FN. Video: frames asociados (IoU ≥ 0,5), perdidos, cambios de identidad y
  fragmentos. Un denominador vacío da `null`, nunca 0 ni 1.

## F. Pruebas

| Comando | Resultado |
| --- | --- |
| `pytest services/botanical-ai/tests/test_sam_spatial.py` | 18 pasaron: 640/960/1280/1920, bordes, inválidos, ceros, negativos, multiobjeto, frames, backward, 16 objetos, mezcla concepto, metadata `"true"`, rotación, padre, historial, métricas, vista previa y revisión |
| `node tools/meta_sam_api_lab/viewer.test.cjs` | Geometría (4 resoluciones, zoom, letterbox, insets, escalado) y navegador: arrastre y clic reales sobre lienzo con padding, borde y zoom 1,5×, error ≤ 1 px; vista previa obligatoria; envío idéntico a lo previsualizado; corrección vinculada |

Ninguna prueba usa medios Hepta ni llama a Meta. Los resultados finales están en
[BOTANICAL_EVALUATION.md](BOTANICAL_EVALUATION.md#resultados-de-validación).

## G. Qué no se hizo

No hubo inferencias nuevas, máscaras humanas ni IoU real. No se tocaron `apps/web`,
`apps/mobile` ni contratos públicos. No se instalaron modelos locales.

## H. Campaña pagada propuesta (no ejecutada)

Tarifa Standard consultada: SAM imagen USD 2,50/1.000; video USD 0,20/1.000 frames,
mínimo 50 por solicitud; Muse USD 1,25/4,25 por millón de tokens de entrada/salida.
El ledger reserva USD 0,12 por solicitud (`meta_reservation_units=120000`), no reembolsable.

| # | Solicitud | Condición | Tarifa estimada | Reserva |
| --- | --- | --- | ---: | ---: |
| 1 | Foto ya segmentada, caja sobre una copa + punto negativo, confianza | — | 0,0025 | 0,12 |
| 2 | `clip-001` 640, caja en frame visible, `both`, confianza | — | 0,0100 | 0,12 |
| 3 | Mismo prompt reescalado en 960 y 1280 | Solo si 2 produce máscara | 0,0200 | 0,24 |
| 4 | Muse con una foto botánica `metadata_checked` y etiqueta revisada | Revisión humana previa | ≈ 0,0070 | 0,12 |
| | **Total máximo** | | **≈ 0,04** | **0,60** |

Para ejecutarla hace falta una autorización nueva y verificable de al menos
**USD 0,60 adicionales**. `config_from_private` limita hoy el techo acumulado a USD 1.
Elevarlo requiere un cambio de código revisado que registre la autorización; no se
hizo. Sin reintentos automáticos. El ledger también limita 10 solicitudes diarias por
identidad, y el 30-10 ya registra diez. Sugerencia de orden: 1 → 2 → (3) → 4,
revisando cada resultado antes de seguir.
