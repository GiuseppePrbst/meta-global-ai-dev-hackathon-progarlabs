# Wilo: evaluación real de Muse Voice Transcribe 1.0 (03-11-2026)

Todas las cifras provienen de solicitudes reales a `muse-voice-transcribe-1.0`, registradas en el ledger compartido bajo la identidad `wilo-voice-lab`. Se mantienen dos conjuntos que nunca se mezclan en una sola cifra:

- **A. Base sintética.** 28 frases TTS (voces Windows Helena es-ES y Sabina es-MX), en [`asr-summary.json`](../evaluations/wilo/asr-summary.json).
- **B. Grabaciones reales bilingües.** 79 clips de un hablante, en [`asr-real-summary.json`](../evaluations/wilo/asr-real-summary.json). **Es el conjunto principal.**

Los audios, las transcripciones por clip y la hoja de alineación quedan en `D:/data/bosque-vivo/wilo-voice-evaluation/`, fuera de Git. En el repositorio solo hay agregados.

## Contrato real verificado

| Aspecto | Documentación (dev.meta.ai, 03-11) | Observado en la API real |
| --- | --- | --- |
| Archivo | `POST /v1/asr/transcribe`, multipart `request` + `audio`, WAV mono PCM16 a 16/24 kHz, hasta 10 min y 32 MB | Funciona. La respuesta trae `sessionId`, `transcript`, `audioDurationMs` y `turns` |
| `languageBias` | Nombres de idioma (ejemplo `"English"`), sin lista cerrada | Aceptados `["Spanish"]`, `["spanish"]`, `["English"]` y `["Spanish", "English"]`. Wilo usa `auto`, que omite el campo |
| `keywords` | Sin límites publicados | **Máximo 30 caracteres por término** (400: «ASR keyword N exceeds the maximum length of 30 characters») y **máximo 500 términos** (400: «Too many ASR keywords: received 600, maximum is 500») |
| Tiempo real | `wss://…/asr/realtime`; autenticación en el primer frame con `authorization.accessToken` | Funciona con `PCM_16KHZ`, `PUSH_TO_TALK` y `CUMULATIVE` |
| Tarifa | USD 0,18 por hora de audio, por segundo completo | Sin cambio el 03-11 |

Wilo envía como máximo 100 keywords, todas de 30 caracteres o menos y generadas desde el Atlas (`voice_keywords()`). Con 300 keywords, un clip duplicó una palabra («Anticura? Anticura?»), así que no se subió el tope. Estos límites son lo observado en esta API el 03-11, no una garantía publicada por el proveedor.

## A. Base sintética (TTS)

28 frases × 7 condiciones, más 4 de modo y 8 en tiempo real: **208 solicitudes, 743 s de audio, USD 0,037 por tarifa, 0 errores.**

| Condición | WER | CER | Términos (sin tildes) | Latencia P50 |
| --- | ---: | ---: | ---: | ---: |
| Helena, keywords + español | **0,061** | 0,046 | **95,8 %** | 1,8 s |
| Helena, sin keywords + español | 0,183 | 0,076 | 62,5 % | 1,8 s |
| Helena, keywords, sin sesgo | 0,070 | 0,036 | 91,7 % | 1,8 s |
| Helena, sin keywords ni sesgo | 0,170 | 0,070 | 58,3 % | 1,8 s |
| Sabina (es-MX), keywords + español | 0,086 | 0,058 | 87,5 % | 1,8 s |
| Ruido a 10 dB SNR, keywords | 0,063 | 0,041 | 89,6 % | 1,9 s |
| Ruido a 10 dB SNR, sin keywords | 0,223 | 0,089 | 52,1 % | 1,7 s |
| Tiempo real, keywords (8 frases) | 0,021 | 0,000 | 92,9 % | 1.ª parcial a 1,3 s; final 0,19 s tras `endStream` |

En el archivo, `ENDPOINTING` separó dos preguntas en 2 turnos, mientras que `PUSH_TO_TALK` devuelve `turns: []`. Para la app se mantiene `PUSH_TO_TALK`.

## B. Grabaciones reales (79 clips)

### Inventario y alineación

| Paso | Resultado |
| --- | --- |
| Recibidos | 79 M4A originales y 79 WAV (16 kHz, mono, PCM16); 459,5 s en total |
| `verify_package.py` del paquete | PASS: conteo 1:1, SHA-256, formato, duración en (0, 60] s y tamaño ≤ 3 MiB |
| `prepare_audio` del backend | 79/79 aceptados, sin reconversión |
| Permiso de envío externo | Aprobado por el propietario en el chat el 03-11 para los 79 clips: voces propias o con consentimiento, y aceptación de los términos de créditos gratuitos |
| Alineados al guion | **71 clips**, que cubren las 70 líneas del banco (1 retoma) |
| `pending_review` | **8 clips** espontáneos (A006–A013) sin texto de guion. No se puntúan; se usan solo de extremo a extremo |

**Método de referencia.** El propietario informó el orden de lectura: banco español 01–26, pruebas difíciles 27–38, adversariales 39–44 y banco inglés 01–26. La transcripción de Muse se usa **solo para elegir la línea del guion** en una ventana monotónica. La referencia puntuada es siempre el texto del guion, nunca la salida de Muse.

Con similitud menor que 0,5, o con un empate, el clip queda `pending_review`. No hubo una transcripción literal independiente, así que las muletillas o desviaciones reales del hablante cuentan como error y la WER es una cota pesimista. Hay un solo hablante, lo que impide generalizar. Las referencias tienen el estado `script_aligned`, no `verified`.

### Resultados con la configuración de producción (keywords + idioma automático)

| Idioma | Clips | WER | WER con tildes | CER | Científicos | Parques/sectores | Nombres comunes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Español | 36 | 0,100 | 0,145 | 0,062 | 5/5 | 11/12 | 21/22 |
| Inglés | 33 | 0,105 | 0,124 | 0,077 | 4/4 | 12/13 | 15/17 |
| Mixto | 2 | 0,000 | 0,154 | 0,000 | — | 1/1 | 3/3 |
| **Total** | **71** | **0,100** | — | **0,067** | **9/9** | 92 % | 93 % |

Errores en total: 31 sustituciones, 7 omisiones y 35 inserciones. La mayoría de las inserciones son palabras repetidas o muletillas reales («muéstrame muéstrame»). La latencia fue P50 2,2 s y P95 3,7 s, con 79/79 solicitudes sin error.

### Comparación pareada (24 clips: los 12 difíciles 27–38 y 01, 07, 08, 10, 17 y 20 en ES y EN)

| Configuración | WER | CER | Científicos | Parques | Fallos de «Wilo» |
| --- | ---: | ---: | ---: | ---: | ---: |
| Sin keywords, automático | 0,145 | 0,076 | **2/5** | 71 % | **11/11** (p. ej. «Willow»); nombres comunes 27 % |
| Keywords, automático (producción) | 0,085 | 0,064 | 5/5 | 100 % | 0 |
| Keywords + `Spanish` | 0,063 | 0,044 | 5/5 | 93 % | 0 |
| Keywords + `English` | 0,087 | 0,041 | 5/5 | 100 % | 0 |
| Keywords + `Spanish, English` | 0,064 | 0,041 | 5/5 | 86 % | 0 |

Lectura de la comparación:

- **Las keywords son la mejora decisiva.** Sin ellas fallan «Wilo» (11 de 11), «Coigüe» (6), «Conguillío», *Nothofagus pumilio*, *N. dombeyi*, *Laureliopsis philippiana*, Queulat y Puyehue.
- El sesgo de idioma sube o baja la WER en unas centésimas, pero en 24 clips de un solo hablante esa diferencia no es concluyente.
- Forzar `Spanish` no estropeó el inglés en esta muestra. Aun así, Wilo usa `auto` por defecto y deja `language_hint` para cuando la app conoce el idioma.

### Errores de nombres

| Términos | Clips afectados |
| --- | --- |
| Queulat | 2 |
| Llao-llao (ASR lo escribe «Llaollao») | 2 |
| huet-huet | 1 |

En la pasada de extremo a extremo aparecieron otros fallos:

- «Magellanic» → «magic»;
- «exact» → «Aextoxicon», un sesgo excesivo de las keywords;
- «trails» → «trees»;
- «Queulat» → «Chiloé».

## Costo y ledger

- **Voz.** 1.974 s procesados en todas las solicitudes de voz de Wilo (incluidas las de extremo a extremo), es decir, unos USD 0,10 según la tarifa.
- **Spark (guía).** 250 k tokens de entrada y 76 k de salida, unos USD 0,63.
- **Ledger.** La identidad tiene USD 4,985 reservados de su tope de USD 5. No queda ninguna reserva en estado `reserved`.
- **Gasto verificado.** No hay evidencia de facturación; Meta no ofrece una API de saldo. El propietario confirmó créditos gratuitos vigentes el 03-11.

**Sondas directas.** Nueve solicitudes de contrato y de límites de keywords (unos 36 s de audio) se enviaron **sin reserva previa**. Se registraron después con una única fila `wilo-asr-probe`, marcada como «registro posterior». Ese registro **no las protegió antes del envío**.

Desde entonces, todas las llamadas pasan por `transcribe()` o `realtime()`, que reservan antes de llamar, o por la API, que también reserva. La prueba `test_evaluation_scripts_reserve_before_any_meta_call` impide reintroducir llamadas HTTP directas en los scripts de evaluación.

**Esquema del ledger.** El ledger del laboratorio solo admitía `identify|raster`. Se aplicó únicamente la ampliación de la restricción de la migración 004 (`transcribe`, `guide`), sin tocar filas: el conteo y la suma se verificaron antes y después.

## Reproducir

```bash
uv run --project services/api python evaluations/wilo_asr.py run --config <privado>
```

```bash
uv run --project services/api python evaluations/wilo_asr.py real --config <privado> --clips A006 A084
```

```bash
uv run --project services/api python evaluations/wilo_asr.py real --config <privado>
```

```bash
uv run --project services/api python evaluations/wilo_asr.py align
```

```bash
uv run --project services/api python evaluations/wilo_asr.py real --config <privado> --condition kw_es --clips <...>
```

```bash
uv run --project services/api python evaluations/wilo_asr.py real-summary
```

El primer comando corre la base sintética. Los demás procesan el conjunto real: piloto, todos los clips, alineación, pares comparados y agregado. Una pareja (clip, condición) ya ejecutada nunca se reenvía, y no hay reintentos automáticos ante un timeout o un error.
