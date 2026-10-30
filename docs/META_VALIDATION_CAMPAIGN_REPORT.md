# Campaña de validación Meta — 30-10-2026

Autorización del propietario: techo acumulado **USD 50**, incluido el USD 1 histórico,
e inspección visual directa de medios Hepta por el agente. Medios, máscaras y respuestas
detalladas siguen fuera de Git. Este informe separa resultados reales, exploración con
etiquetas débiles y lo que no se ejecutó.

## 1. Presupuesto y control

- `config_from_private` admite hasta USD 50 **solo** con `research_campaign` privado:
  autorizado 50, histórico declarado 1, topes por fase A 3 / B 7 / C 15 / D 14 / E 10
  (suma 49), 150 solicitudes diarias, reserva de USD 0,05 por llamada y concurrencia 1.
  Sin campaña se mantiene el techo de USD 1. El perfil de producción no cambió.
- Cada fase reserva con identidad propia (`sam-api-lab:<fase>`) y comprueba su tope antes
  del lock. El techo acumulado y la cuota diaria siguen atómicos en el ledger existente.
- Vista de control: CLI `costs`, `/api/costs` y panel del visor. Separa lo autorizado,
  lo reservado, el uso reportado, la estimación por tarifa y la facturación.

| Concepto | USD |
| --- | ---: |
| Autorizado (acumulado) | 50,00 |
| Reservas históricas (intactas) | 1,00 |
| Reservas nuevas: A 0,20 · B 0,15 · C 5,90 · D 0,40 · E 0 | 6,65 |
| **Total reservado** | **7,65** |
| Capacidad de reserva restante | 42,35 |
| Costo estimado por tarifa, campaña nueva | 0,818 |
| Costo estimado acumulado (incluye histórico 0,0405) | 0,858 |
| Facturación verificada | **null**: sin factura ni API de saldo documentada |

Solicitudes del ledger: 143 en total (10 históricas + 133 nuevas). Estados: 129
`completed`, 13 `provider_error` (3 históricas) y 1 `expired`.

Fallidas nuevas: **10**, todas Muse truncado en 1200 tokens: 9 del primer lote A (lote
detenido) y 1 en D. La `expired` quedó en vuelo al detener el lote: el ledger la retuvo,
rechazó con 429 la siguiente solicitud (fallo cerrado) y liberó la concurrencia al expirar.
Files API: 6 subidas en total, 6 DELETE confirmados, 0 pendientes. Tarifas usadas: SAM
USD 2,50/1000 imágenes y 0,20/1000 frames (mínimo 50); Muse USD 1,25 / 4,25 por millón
de tokens.

## 2. SAM sobre fotografía (fase A)

| Exp. | Prompt | Resultado | Referencia del agente (IoU / Dice) |
| --- | --- | --- | --- |
| A0 | Muse propone copas (0–1000 normalizado) | 2 copas, ambas «no separadas»; 7,9 s, 4,7k tokens | — |
| A1 | Caja sobre la copa central | 1 máscara, conf. 0,79, 8,7 % de la imagen | **0,712 / 0,832** |
| A2 | Punto positivo + negativo | 1 máscara, conf. 0,34, mitad derecha | 0,631 / 0,774 |
| A3 | Dos cajas | 2 instancias distintas (conf. 0,79 / 0,61); ID 1 idéntico a A1 | — |

Comparación con el histórico: `tree` dio 0 objetos y `vegetation` una masa del 21,6 % en
otra zona. **El prompt espacial resolvió la falta de detección.** La caja de A1 salió de
Muse y el agente la confirmó visualmente; la de A3 objeto 2 la dibujó el agente. La
referencia la trazó el agente, no un especialista, tras ver la máscara (sesgo posible).

## 3. SAM sobre video (fase B)

`clip-001` 640×360, frame 3 elegido visualmente, `both`, confianza. **B1: primer tracking
positivo**. 44 máscaras; árbol inclinado f0–f14 y copa latifoliada f0–f28, sin huecos ni
cambios de ID en los frames revisados. Cada track termina cuando el árbol sale del cuadro.
B3 con el mismo prompt reescalado: tracks prácticamente iguales (+1 frame en el objeto 1),
coincidencia media IoU 0,79–0,97 respecto a 640 y latencia 16,6 → 28,6 → 51,4 s. No se
hizo B2 porque no hubo pérdida que corregir, ni B4 porque el clip original ya funcionó.
Sin referencias humanas por frame no se informan métricas temporales de exactitud.

## 4. Benchmark aéreo externo (fase D)

Detectree2, 4 teselas de test (CC BY 4.0, Ball et al. 2023):
- Con caja tomada de la referencia: IoU medio **0,742** (0,71–0,81).
- Con el concepto `tree`: máscara en 1/4 teselas, con IoU 0,76 contra otra copa real.

La caja de referencia facilita la tarea: mide delimitación, no detección. Bosque tropical
de Malasia, sin extrapolación a Puyehue.

## 5. Identificación botánica con Muse (fase C) — exploración con etiquetas débiles

Primero se corrigió un **defecto del backend**: `MuseSparkAdapter.identify` usaba
razonamiento por defecto, que consumía el tope de 1200 tokens y truncaba las fotos reales.
Ahora usa `reasoning_effort="minimal"`. Con el cambio, A completó 47/47.

Casos: 35 de catálogo (5 exclusiones del agente sobre 40) y 12 negativos. Etiquetas de
Pl@ntNet/Commons más inspección del agente: **`weakly_labeled_exploration`, no precisión
validada**.

| Exp. | n | Top-1 | Top-3 | Abstención | Negativos con candidato | Errores |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| A foto original | 35 | 0,686 | 0,771 | 7 | 11/12 | 0 |
| D con rasgos documentados | 34 | 0,618 | 0,794 | 7 | 11/12 | 1 |
| B recorte SAM `tree` | 8 | 0,625 | 0,625 | 1 | — | 0 |
| C multivista (mismo individuo) | 5 | 0,8 | 0,8 | 1 | — | 0 |

Hallazgos:
- **Por órgano (A):** hoja 0,83 (n=18), flor 3/3, corteza 0,25 (3/4 abstenciones),
  árbol entero 0,50 (4/8 abstenciones).
- **Por especie (A):** Tepa 0,2 y Lenga 0,4; Mañío 5/5 y Tineo 4/4.
- **Negativos:** casi nunca se abstiene. Asigna el pariente del catálogo:
  - *N. antarctica* → Lenga / C. de Magallanes.
  - *Saxegothaea* y *P. salignus* → Mañío.
  - *N. nitida* → C. de Magallanes.
- **A vs D, pareado (n=34):** solo A acierta 5, solo D 2. Los rasgos del catálogo no
  mejoran el resultado y suman ~1.250 tokens de entrada por caso.
- **¿Aporta SAM?** No en este pipeline. El concepto `tree` no segmentó 5/8 primeros
  planos; en los 3 que segmentó dio el mismo resultado que A, con +17–24 s.
  **Recomendación:** SAM como ayuda visual opcional, no como requisito.
- **No determinismo:** un mismo input (B sin segmentación = foto original) cambió de
  acierto a fallo entre A y B.
- **Multivista:** acierta Tepa, que falló con foto única. Prometedor; n=5.

## 6. Taxonomía (fase independiente del presupuesto)

Ver [BOTANICAL_DATASETS.md](BOTANICAL_DATASETS.md#revisión-taxonómica-y-curaduría--30-10-2026):
- *Weinmannia corymbosa*: eliminada.
- *Betula antarctica*: excluida por conflicto entre fuentes.
- *Calusparassus pumilio*: verificada.
- *N. obliqua*: mismo taxón con distinto género según la fuente.

Corrige alias que afectaban al contexto forestal.

## 7. No ejecutado

Agente por voz (fase F): secundario, y la cuota diaria quedó en 143/150. Contingencia E
sin uso. No hubo anotación de especialista humano, recorrido web/móvil, inferencia local
ni entrenamiento.

## 8. Próximas decisiones

1. Revisión de especialista de las 35 + 12 candidatas para convertirlas en casos validados.
2. Mitigar falsos positivos en negativos: probar instrucciones de abstención explícitas o
   un catálogo ampliado con «fuera del catálogo». Medir con los mismos 12 negativos.
3. Evaluar si conviene subir `max_completion_tokens` (1 truncamiento con `minimal`).
4. Prompt espacial para el recorte (caja del usuario) en vez del concepto `tree`.
5. Referencias humanas por frame en `clip-001` para medir tracking.
