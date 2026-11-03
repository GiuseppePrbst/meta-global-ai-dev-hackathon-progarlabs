# Wilo Lab: inferencia real de Meta (03-11-2026)

Estado: **la campaña mínima de 4 llamadas se ejecutó con autorización del propietario** el 03-11, a través de la interfaz de Wilo Lab (3002), con el backend en `SERVICE_MODE=demo` (8001) y Meta real. Los resultados están en la sección «Resultados de la campaña real», al final.

Antes de la campaña:

- Se aplicó la migración 004, de forma aditiva, al esquema del ledger del laboratorio. Antes y después había 2803 reservas por USD 65,575, sin filas modificadas.
- Se creó la identidad `wilo-lab-demo`, que empezó en USD 0.

## Configuración que exige el backend (código actual)

| Ruta | `SERVICE_MODE=local` | `SERVICE_MODE=demo` |
| --- | --- | --- |
| `/guide/transcribe`, `/guide/query` y `/guide/ask` | Bearer de `DEMO_TOKENS`, con reserva en el ledger (`VOICE_` y `GUIDE_RESERVATION_UNITS`) | Igual |
| `/identify` con `AI_PROVIDER=meta` | Bearer = **`META_ACCESS_TOKEN`**, una llamada cada `META_MIN_INTERVAL_SECONDS` por proceso y **sin reserva en el ledger** | Bearer de `DEMO_TOKENS`, reserva `identify` (`META_RESERVATION_UNITS`) y la evidencia se guarda en `identifications` (migración 004) |

Los dos modos comparten estos requisitos:

- `MODEL_API_KEY`, que es la clave de Meta y vive solo en el backend.
- `META_ENABLED=true`.
- `DATABASE_URL`.
- `BUDGET_UNITS` mayor que 0.
- `META_TIMEOUT_SECONDS=90`.

`META_ACCESS_TOKEN` no es la clave de Meta. Es un token local que permite usar `/identify` en modo local. El laboratorio lo distingue del token demo: solo envía el token a `/identify` si se marca «Backend en SERVICE_MODE=demo».

**Decisión recomendada:** probar el reconocimiento **en modo demo**. Solo así cada llamada queda reservada y trazable por identidad. En modo local, `/identify` real no deja registro en el ledger.

## Bloqueos para la campaña mínima

1. **Autorización de gasto.** La identidad de evaluación `wilo-voice-lab` está en su tope: USD 4,985 de 5. Hace falta que el propietario autorice un subpresupuesto nuevo (bastaría con USD 1 para una identidad `wilo-lab-demo`) y confirme que los créditos gratuitos siguen vigentes ese día.
2. **Esquema del ledger.** El esquema privado del laboratorio (`sam_api_lab_20261030`) tiene `execution_reservations`, pero **no tiene `identifications`** (migración 004). En modo demo, `/identify` real terminaría la inferencia pagada y luego fallaría con 503 al guardar la evidencia. Antes de la campaña hay que aplicar de forma aditiva `services/api/sql/004_expeditions.up.sql` a ese esquema, con autorización del propietario porque es el ledger real, o bien configurar una base de evidencias separada.
3. **Infraestructura local.** El clúster WSL `bosque-demo` estaba detenido. Se inició el 03-11 con `pg_ctlcluster --skip-systemctl-redirect 18 bosque-demo start`. Debe estar activo durante la prueba.

## Campaña mínima preparada

Son cuatro llamadas con una reserva estimada de unos USD 0,06. Se ejecutan solo después de resolver los bloqueos.

| # | Prueba | Entrada | Esperado |
| --- | --- | --- | --- |
| 1 | Wilo por texto | «¿Qué senderos tiene el Parque Nacional Puyehue?» | `provider: meta`, fuentes `atlas:*` y la advertencia de que no hay apertura verificada |
| 2 | Transcripción | WAV del navegador, que el backend ya acepta (ver `coverage.spec.ts`) | `provider: meta` y transcripción con «Puyehue» |
| 3 | Positivo del catálogo | [Aextoxicon punctatum (53136865463)](https://commons.wikimedia.org/wiki/File:Aextoxicon_punctatum_(53136865463).jpg), CC BY-SA 2.0 | Olivillo aceptado, o abstención justificada; nunca un puntaje inventado |
| 4 | Negativo fuera del catálogo | [Araucaria araucana kz10](https://commons.wikimedia.org/wiki/File:Araucaria_araucana_kz10.jpg), CC BY 4.0, Krzysztof Ziarnek | `out_of_catalog_suspected` o abstención; nunca una de las 8 especies |

Notas sobre las imágenes:

- Se eligieron fuera de `evaluations/biodiversity/frozen-sets.json`, `media-manifest.json` y `botanical/candidate-manifest.json`, para no contaminar los conjuntos congelados. Las fotos del catálogo y casi todas las de *N. dombeyi* en Commons ya están en esos manifiestos.
- El agente las revisó visualmente: son hojas coriáceas elongadas y un cono femenino de araucaria. Eso **no es una validación de especialista**.
- Las imágenes no se versionan: se descargan a una carpeta privada solo para la prueba.

Para cada llamada hay que registrar proveedor, modelo, respuesta, latencia, `correlation_id`, ID de reserva y `reported_usage` del ledger.

## Verificado sin Meta (03-11)

- **WAV del navegador:**
  - estructura RIFF/WAVE, PCM16, mono, 16 kHz;
  - tamaños coherentes, duración real y audio no silencioso;
  - aceptado por `prepare_audio` del backend real (200).
- **Autenticación:** sin token, inválido, válido y renovado. El token nunca aparece en URL, consola ni `localStorage`.
- **Robustez:** cancelación, micrófono denegado, error 502 con reintento manual y backend caído.
- **Correcciones:**
  - el 404 de consola era `/favicon.ico`, ya corregido;
  - el fixture PNG de las pruebas e2e tenía un CRC inválido, ya reemplazado.
- **Móvil:** los recorridos se repiten en el proyecto Playwright `mobile`, con un iPhone 13 emulado en Chromium. Falta probarlo en un dispositivo y con un micrófono físicos.


## Resultados de la campaña real (03-11-2026, identidad `wilo-lab-demo`)

| # | Prueba | Proveedor y modelo | Resultado | Latencia del backend | Reserva | Consumo |
| --- | --- | --- | --- | ---: | ---: | --- |
| 1 | Wilo por texto: «¿Qué senderos tiene el Parque Nacional Puyehue?» | meta · muse-spark-1.3 | ✅ Respuesta con fuentes: CONAF nombra El Indio, La Princesa y Repucura, y advierte que no hay apertura verificada. Cita 3 fuentes `atlas:*`, devuelve las entidades park y trail, y `map.geometry_available=false` | 18,7 s | USD 0,04 | 6.224 tokens de entrada y 2.102 de salida |
| 2 | Transcripción: WAV del navegador, micrófono simulado reproduciendo TTS sintético | meta · muse-voice-transcribe-1.0 | ✅ «Háblame del Parque Nacional Puyehue.», texto exacto | 2,4 s | USD 0,005 | 3,76 s de audio |
| 3 | Positivo: [Aextoxicon punctatum](https://commons.wikimedia.org/wiki/File:Aextoxicon_punctatum_(53136865463).jpg) (olivillo) | meta · muse-spark-1.3, estrategia `verify` | ❌ **Falso positivo.** Aceptó *Eucryphia cordifolia* (ulmo) como «candidata apoyada». Pidió una foto del envés y advirtió que no veía pelos en el envés | 15,4 s | USD 0,03 | 8.585 tokens de entrada y 921 de salida |
| 4 | Negativo: [Araucaria araucana kz10](https://commons.wikimedia.org/wiki/File:Araucaria_araucana_kz10.jpg) | meta · muse-spark-1.3, estrategia `verify` | ✅ `out_of_catalog_suspected` y `not_accepted`, con *Araucaria araucana* como similar fuera del catálogo | 6,3 s | USD 0,03 | 4.372 tokens de entrada y 426 de salida |

- **Costo.** Se reservaron USD 0,105. El costo estimado por tarifa es de unos USD 0,039. No hay gasto verificado, porque Meta no ofrece una API de saldo.
- **Trazabilidad.** Las 4 reservas terminaron en `completed`. Las 2 identificaciones quedaron guardadas en `identifications`, ligadas a la identidad.
- **Lectura.** La voz y la guía funcionaron de punta a punta con Meta real. El reconocimiento rechazó bien la especie fuera del catálogo, pero **confundió olivillo con ulmo**: las dos especies tienen hojas simples, coriáceas y oblongas, y el rasgo decisivo, el envés grisáceo con escamas del olivillo, no se ve en la foto.
- **Límites de la muestra.** Es un solo caso, así que no es una tasa de error. Muestra que una «candidata apoyada» puede ser incorrecta incluso con la estrategia `verify`.
- **Cómo lo presenta la interfaz.** El laboratorio lo muestra como «Aceptada para presentación (no verificada)», con limitaciones y la foto siguiente que se recomienda.
- **Datos privados.** Las capturas y las respuestas completas se guardaron en `D:/data/bosque-vivo/wilo-lab-live/`, fuera de Git.
