# Demostración pública sin registro (04-11-2026)

Bosque Vivo puede atender a usuarios adultos de territorios permitidos, desde cualquier plataforma, **sin cuenta**. Esta guía es para José, evaluadores y cualquier cliente que consuma la API.

**Para usar la demostración no hace falta:** cuenta de Facebook, Firebase, invitación, clave de Meta, clave de ProGarLabs ni registro previo.

**Consulta siempre `GET /demo/status`.** Si `status` no es `active`, las rutas de IA no están abiertas. El modo público empieza apagado (`PUBLIC_DEMO_ENABLED=false`).

## Caducidad

La IA de la campaña termina el **2026-11-10T05:00:00Z**, es decir, el 10-11-2026 a las 00:00 en Nueva York y a las 02:00 en Chile continental.

- Desde ese instante, toda operación de IA responde `410 Gone`, **también con sesión o token de operador**. No hay que reintentar.
- El Atlas sigue disponible.
- La fecha vive en PostgreSQL (`campaign_state`). Una migración limita su valor máximo, así que extenderla requiere una decisión nueva del propietario y una migración nueva.

## Operaciones

| Público, sin token | Sigue privado |
| --- | --- |
| `GET /health`, `/demo/status`, `/species*`, `/taxa*`, `/parks*`, `/trails/*`, `/knowledge/*`, `/media/*` | `/admin/*`, `/sessions/*` (salvo los canjes), `/me*` |
| `POST /guide/query`, `/guide/ask`, `/guide/transcribe`, `/identify` | `/captures/*`, `/identifications/*`, `/observations*` |
| `WS /guide/voice/stream` | `/layers`, `/context/*`, `/forest/*` |

- No existe un endpoint genérico de modelos. El cliente no elige modelo, prompt de sistema, herramientas ni parámetros de generación. Los términos de Meta prohíben ofrecer el servicio como gateway o proxy (sección 10.1).
- Las sesiones `bvs_` siguen funcionando igual. Enviar `Authorization` usa esa sesión y su cuota.
- Los resultados anónimos no se guardan: `/identify` no crea identificaciones ni observaciones.

## Ejemplos

Cambia `$API` por `https://api-bosquevivo.progarlabs.com`.

### Estado

```bash
curl -s "$API/demo/status"
```

```json
{
  "public_demo_enabled": true,
  "status": "active",
  "expires_at": "2026-11-10T05:00:00Z",
  "seconds_remaining": 412800,
  "features": ["guide", "transcribe", "identify", "voice"],
  "budget_status": "available",
  "territory_eligible": true,
  "notice": "Solo para mayores de 18 años. ..."
}
```

Estados: `active`, `expired`, `budget_exhausted`, `temporarily_disabled` y `provider_unavailable`.

`features` lista lo abierto en ese momento: puede abrirse Wilo por texto sin abrir audio o fotos.

### Wilo por texto

```bash
curl -s "$API/guide/query" -H "Content-Type: application/json" \
  -d '{"question":"¿Qué senderos tiene Puyehue?","adult_confirmed":true,"external_processing_confirmed":true}'
```

### Transcripción

```bash
curl -s "$API/guide/transcribe" -F file=@pregunta.wav -F adult_confirmed=true \
  -F rights_confirmed=true -F external_processing_confirmed=true -F language_hint=es
```

### Foto

```bash
curl -s "$API/identify" -F file=@hoja.jpg -F adult_confirmed=true -F rights_confirmed=true
```

### WebSocket de voz (TypeScript)

El mensaje `start` no lleva `token`. Con sesión, se agrega `token` como antes.

```ts
const ws = new WebSocket("wss://api-bosquevivo.progarlabs.com/guide/voice/stream");
ws.onopen = () => ws.send(JSON.stringify({
  type: "start", adult_confirmed: true, rights_confirmed: true,
  external_processing_confirmed: true, language_hint: "es", answer: true,
}));
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.type === "ready") { /* enviar PCM 16 bits mono en binario, luego {type:"stop"} */ }
  if (message.type === "error" && message.code === "expired") { /* mostrar fin de campaña */ }
};
```

Códigos nuevos del WebSocket:
- `expired`: la campaña terminó, también si ocurre a mitad del stream;
- `forbidden`: territorio, función u origen no verificable.

Un stream cancelado no consume más que su reserva, que queda como `cancelled`.

## Consentimientos

| Campo | Cuándo | Si falta |
| --- | --- | --- |
| `adult_confirmed: true` | Siempre | 422 |
| `external_processing_confirmed: true` | Wilo y audio (el texto, audio o la foto van a Meta) | 422 |
| `rights_confirmed: true` | Audio y fotos | 422 |

Estas declaraciones debe hacerlas la persona. La interfaz debe pedirlas de forma explícita, sin dejarlas marcadas por defecto.

**No envíes datos personales ni confidenciales.** Mientras la campaña use créditos promocionales, Meta avisa que el contenido puede usarse para mejorar sus productos.

## Límites

| Límite | Valor |
| --- | --- |
| IA por dirección IP | 2 por minuto y 20 por día UTC |
| Concurrencia | 1 operación Meta a la vez en toda la API |
| Texto | 2.000 caracteres |
| Audio | 3 MiB y 60 s; WAV |
| Foto | Una, 10 MiB, JPEG, PNG o WebP. Se reduce a 1.568 px de lado mayor. Sin SAM |
| Presupuesto | USD 90 en reservas acumuladas, compartidos por usuarios públicos, equipo y QA |

- `/guide/ask` con audio usa dos operaciones: transcripción y respuesta.
- Varias personas detrás de una misma IP (una universidad, una red móvil con CGNAT) **comparten** estos límites.
- Una reserva no se devuelve si el proveedor falla.

## Errores

| Código | Significado | Qué hacer |
| --- | --- | --- |
| 400, 422 | Entrada o consentimiento inválido | Corregir |
| 403 | Territorio no permitido o no verificable, función cerrada o permisos | No reintentar |
| 413, 415 | Archivo demasiado grande o formato no admitido | Corregir |
| 429 | Frecuencia, concurrencia o presupuesto | Si trae `Retry-After`, esperar ese tiempo. Si no, consultar `/demo/status` |
| 410 | Campaña terminada | **No reintentar** |
| 502 | Error de Meta | Intentar más tarde: consume otra reserva |
| 503 | IA apagada o infraestructura no disponible | Consultar `/demo/status` |

## Territorios

Se usa la política de uso geográfico de Meta (actualizada el 12-10-2026) con el país que informa Cloudflare.

- **Bloqueados:** los territorios restringidos de esa política y **Ucrania completa**, porque Cloudflare no distingue Crimea, Donetsk ni Luhansk.
- **País desconocido o Tor:** se rechaza.
- **La política no publica una lista de países habilitados:** un país no bloqueado aquí no es una garantía de Meta.

## Plataformas y CORS

Con el modo público activo, `Access-Control-Allow-Origin: *`, sin credenciales CORS. La autenticación usa `Authorization`, nunca cookies. Cubre web, React y Next.js, Expo y React Native, Android, iOS, Flutter, escritorio y línea de comandos.

CORS no es autenticación ni control de gasto. Eso lo hacen el ledger y los límites.

Los clientes nunca reciben `MODEL_API_KEY`, `ORIGIN_AUTH_TOKEN`, credenciales de operador ni secretos de Firebase.

## Seudónimo anónimo

- Es `anon-` más 24 caracteres de un HMAC-SHA256 de la IP verificada, con una clave de Secret Manager.
- En IPv6 se usa el prefijo /64, porque un solo cliente controla ese bloque completo.
- La IP no se guarda en claro. El seudónimo sí queda en el ledger, junto al consumo.
- Lo genera el servidor. Ningún identificador enviado por el cliente lo cambia.
- No da acceso a rutas privadas ni permisos administrativos.
