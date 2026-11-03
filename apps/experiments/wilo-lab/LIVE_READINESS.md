# Wilo Lab: preparación para inferencia real de Meta (03-11-2026)

Estado: **bloqueado antes de cualquier gasto.** Este documento lista qué falta, sin rodeos. Ninguna prueba de este incremento llamó a Meta. El ledger tiene USD 65,575 reservados, ninguna reserva abierta y ningún movimiento posterior a la campaña Wilo del 03-11.

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
