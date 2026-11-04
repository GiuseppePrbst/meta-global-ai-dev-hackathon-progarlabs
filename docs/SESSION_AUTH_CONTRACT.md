# Sesiones temporales: contrato para clientes (04-11-2026)

Contrato para la app oficial (Expo/React Native, José) y para Wilo Lab. El esquema exacto está en el [OpenAPI generado](api/openapi.json) y en `GET /openapi.json`. Este documento explica el flujo y lo que el OpenAPI no expresa.

| Dato | Valor |
| --- | --- |
| URL pública | `https://api-bosquevivo.progarlabs.com` (solo HTTPS, a través de Cloudflare) |
| Tipo de acceso | Beta cerrada por invitación individual. No hay registro abierto |
| Credencial del cliente | Token de sesión `bvs_…`, válido **60 minutos** |
| Encabezado | `Authorization: Bearer bvs_…` |
| Migración | `services/api/sql/005_sessions.up.sql` (aditiva) |

## 1. Flujo

```
operador ── POST /admin/invitations ──▶ invitación bvi_… (se entrega al evaluador una sola vez)
evaluador ── POST /sessions/exchange {invitation} ──▶ { access_token: bvs_…, expires_at, … }
app ── Authorization: Bearer bvs_… ──▶ /guide/*, /identify, /captures/*, /sessions/me …
app ── POST /sessions/refresh (antes de expirar) ──▶ token nuevo; el anterior queda revocado
app ── POST /sessions/logout ──▶ 204; el token deja de servir
```

1. Un operador crea una invitación individual para un seudónimo estable, por ejemplo `beta-07`, con permisos concretos.
2. El evaluador la canjea una sola vez. La invitación vence en 72 h si no se usa, configurable entre 1 y 168 h.
3. El canje devuelve una sesión de 60 min. Mientras siga vigente, la app puede renovarla con `/sessions/refresh`.
4. Toda renovación termina en `access_expires_at`, por defecto 14 días después de crear la invitación. Pasada esa fecha, o si la sesión expira sin renovarse, el usuario necesita una invitación nueva.
5. La identidad no cambia al renovar ni al recibir otra invitación con el mismo seudónimo. Las cuotas se cuentan por identidad, así que **pedir otro token no reinicia el consumo**.

Los tokens son opacos: el cliente no debe interpretarlos. Una futura integración OIDC/OAuth 2.0 con Authorization Code + PKCE reemplazaría solo el paso de canje y seguiría resolviendo la misma identidad del ledger.

## 2. Endpoints

| Método y ruta | Autenticación | Petición | Respuesta |
| --- | --- | --- | --- |
| `POST /sessions/exchange` | Ninguna | `{"invitation": "bvi_…"}` | `201 SessionToken` |
| `GET /sessions/me` | Bearer | — | `200 SessionInfo` |
| `POST /sessions/refresh` | Bearer de sesión | — | `201 SessionToken` |
| `POST /sessions/logout` | Bearer de sesión | — | `204` |
| `POST /admin/invitations` | Solo operador | `{"identity", "scopes", "invitation_hours"?, "access_days"?}` | `201 Invitation` |
| `POST /admin/identities/{identity}/revoke` | Solo operador | — | `200 {sessions_revoked, invitations_revoked}` |

Las rutas `/admin/*` no son para la app: requieren un token estático de operador listado en `ADMIN_IDENTITIES`.

`SessionToken`:

```json
{
  "access_token": "bvs_<43 caracteres>",
  "token_type": "Bearer",
  "expires_in": 3600,
  "expires_at": "2026-11-04T15:00:00Z",
  "access_expires_at": "2026-11-18T14:00:00Z",
  "session_id": "4f5c…",
  "identity": "beta-07",
  "scopes": ["guide", "identify", "transcribe"]
}
```

`SessionInfo` (`GET /sessions/me`) devuelve `identity`, `auth` (`session` u `operator`), `scopes`, `session_id`, `expires_at` y `access_expires_at`.

### Permisos (`scopes`)

Cada permiso corresponde a una operación del ledger:

| Permiso | Rutas |
| --- | --- |
| `guide` | `POST /guide/query` y `POST /guide/ask` con texto |
| `transcribe` | `POST /guide/transcribe`, `WS /guide/voice/stream` y `POST /guide/ask` con audio. `/ask` con audio necesita `guide` + `transcribe` |
| `identify` | `POST /identify` |
| `raster` | `POST /forest/analyze*` |

Las rutas que no gastan funcionan con cualquier sesión: lectura del Atlas, `/captures/*`, `/observations` y `/sessions/*`. Las de solo lectura (`/parks`, `/taxa`, `/species` y `/knowledge`) son públicas.

## 3. Ejemplo (TypeScript, Expo)

```ts
const API = "https://api-bosquevivo.progarlabs.com";

export async function signIn(invitation: string) {
  const r = await fetch(`${API}/sessions/exchange`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ invitation: invitation.trim() }),
  });
  if (r.status === 401) throw new Error("Invitación inválida, usada o vencida");
  if (r.status === 429) throw new Error(`Demasiados intentos; espera ${r.headers.get("Retry-After")} s`);
  if (!r.ok) throw new Error(`Error ${r.status}`);
  return r.json(); // guarda access_token y expires_at en almacenamiento seguro
}

export async function api(path: string, token: string, init: RequestInit = {}) {
  const r = await fetch(`${API}${path}`, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${token}` },
  });
  if (r.status === 401) {
    /* sesión vencida o revocada: borrar el token y volver a pedir invitación */
  }
  return r;
}
```

Renueva la sesión cuando falten unos 5 minutos para `expires_at`, solo si la app está en uso. Si dos renovaciones compiten, una recibe 401: descártala y usa el token que ganó.

## 4. Almacenamiento seguro del token

- **iOS y Android:** guarda `access_token` en `expo-secure-store` (Keychain y Keystore). No lo guardes en `AsyncStorage`, logs, URLs, analítica ni reportes de errores.
- **Web, Expo Web o navegador:** guárdalo en memoria. Como máximo, en `sessionStorage` si el usuario pide recordarlo. Nunca en `localStorage`, cookies legibles ni la URL.
- **Al cerrar sesión:** llama a `/sessions/logout` y borra el token local, aunque la llamada falle.
- **Nunca en la app:**
  - `MODEL_API_KEY`;
  - los `DEMO_TOKENS` de operador;
  - `ORIGIN_AUTH_TOKEN`;
  - URLs `run.app`;
  - variables `EXPO_PUBLIC_*` o `NEXT_PUBLIC_*` con secretos.

  La única variable pública es la URL de la API.

## 5. Errores

Todas las respuestas incluyen `X-Correlation-ID`. Inclúyelo en los reportes de error.

| Código | Causa | Qué debe hacer el cliente |
| --- | --- | --- |
| 401 | Sin token, o token inválido, expirado o revocado. En el canje: invitación inválida, usada, vencida o revocada | Borrar el token y pedir una invitación nueva. No reintentar |
| 403 | La sesión no tiene el permiso de esa operación, o una ruta de operador. Acceso directo a `run.app` | Mostrar que la función no está habilitada para este evaluador |
| 400 | `/sessions/refresh` o `/logout` con una credencial que no es una sesión | Error de integración |
| 422 | Cuerpo inválido o faltan permisos de la petición (`adult_confirmed`, `rights_confirmed` o `external_processing_confirmed`) | Corregir la petición |
| 429 | Límite por identidad (60 peticiones/min, compartido por todas las sesiones del mismo evaluador; el mensaje dice «Límite de solicitudes de la sesión»), intentos de canje fallidos (10 cada 15 min por IP), límite de Cloudflare (60/10 s por IP) o cuota del ledger agotada | Respetar `Retry-After`. Si es cuota, avisar que se agotó el cupo |
| 501 | `/identify` con Meta deshabilitado | Mostrar «reconocimiento no disponible» |
| 502 | Error del proveedor Meta, con respuesta sanitizada | Un reintento manual. Nunca presentarlo como abstención |
| 503 | Meta deshabilitado en Wilo (`Meta no habilitado/configurado`), base de datos no disponible, o presupuesto no configurado | Mostrar «no disponible» y ofrecer el Atlas |

**Reintentos:**

- Lecturas (`GET`): un reintento automático con espera ante error de red, 502 o 503.
- `POST /identify` y `POST /guide/*`: nunca automático. Cada intento que llega al servidor reserva cupo y la reserva no se devuelve. Ofrece un reintento manual al usuario.
- 429: solo después de `Retry-After`.
- 401, 403 y 422: nunca.

## 6. WebSocket `/guide/voice/stream`

- El navegador no puede enviar `Authorization` en un WebSocket. Por eso el token de sesión va en el **primer mensaje**:
  `{"type":"start","token":"bvs_…","adult_confirmed":true,"rights_confirmed":true,"external_processing_confirmed":true,"audio_encoding":"PCM_16KHZ"}`.
- Si el token es inválido, expiró o fue revocado, el servidor responde `{"type":"error","code":"unauthorized"}` y cierra con 1008.
- Si la sesión no tiene `transcribe`, responde `code: "forbidden"` y cierra con 1008.
- El resto del protocolo, con frames PCM16 y eventos `partial` y `final`, está en [WILO_VOICE_API_HANDOFF.md](WILO_VOICE_API_HANDOFF.md).

## 7. Formatos, límites y tiempos

| Operación | Entrada | Tiempo esperado |
| --- | --- | --- |
| `/guide/transcribe` | WAV RIFF mono PCM16 a 16 o 24 kHz, de hasta 60 s y 3 MiB | 2–3 s |
| `/guide/query` y `/guide/ask` | Texto de 1–2000 caracteres o WAV | 20–37 s. Pon el timeout del cliente en ≥ 100 s (el servidor corta a 120 s) |
| `/identify` | JPEG, PNG o WebP, de hasta 10 MiB por foto. Hasta 3 vistas del mismo ejemplar y 20 MiB en total | 6–16 s observados en 2 llamadas reales |
| Atlas | — | Menos de 0,5 s |

**Evidencia insuficiente:**

- Wilo devuelve `insufficient_evidence: true` y `status: "insufficient_evidence"` cuando el Atlas no respalda una respuesta. La interfaz debe mostrarlo como «no sé con certeza», no como un error.
- `/identify` puede abstenerse o marcar `out_of_catalog_suspected`.
- El clasificador solo conoce **8 árboles**, y en la campaña real confundió olivillo con ulmo. Una candidata «apoyada» no es una identificación verificada.

## 8. CORS y clientes nativos

- CORS solo afecta a clientes web. La API permite estos orígenes:
  - `http://localhost:3000`: web local;
  - `http://localhost:3001` y `http://127.0.0.1:3001`: Wilo Lab;
  - `http://localhost:8081`: Expo Web en desarrollo.
- El origen de producción de la app se agregará cuando José lo comunique; no se inventa.
- Las apps nativas de iOS y Android no envían `Origin`, así que CORS no las limita. Para ellas, la autorización es el token de sesión, no CORS.

## 9. Lo que no cubre esta etapa

- No hay registro abierto ni recuperación de cuenta: el acceso es solo por invitación.
- El límite de 60 peticiones/min se cuenta **por identidad estable**, no por sesión: renovar el token o abrir otra sesión no lo reinicia. Desde la migración 006 se guarda en PostgreSQL: es compartido entre instancias y sobrevive a reinicios. El 429 del backend dice «Límite de solicitudes de la identidad» y trae `Retry-After`. En el WebSocket, el mismo límite responde `code: "rate_limited"`.
- Ante ráfagas, la regla de Cloudflare (60 peticiones cada 10 s por IP) suele responder 429 antes que el backend. Se distinguen porque el 429 del backend trae `X-Correlation-ID`.
- Meta sigue deshabilitado hasta que haya una autorización de gasto: ver [META_CLOUD_ACTIVATION.md](META_CLOUD_ACTIVATION.md).

## 10. Consentimientos por petición

| Campo | Cuándo | Efecto si falta |
| --- | --- | --- |
| `adult_confirmed: true` | Siempre en `/guide/*`, `/identify` y el WebSocket | 422 (`permissions` en el WebSocket) |
| `rights_confirmed: true` | Con audio o fotografía | 422 |
| `external_processing_confirmed: true` | Cuando el backend envía audio, texto o imagen a Meta | 422. La interfaz debe pedirlo de forma explícita, sin dejarlo marcado por defecto |

## 11. Cuotas (beta cerrada)

- **Límite HTTP:** 60 peticiones por minuto por identidad, más el límite por IP de Cloudflare.
- **Cuotas económicas:** solo existen con Meta habilitado. La propuesta, aún sin autorizar, está en [META_CLOUD_ACTIVATION.md](META_CLOUD_ACTIVATION.md): 8 peticiones Meta por evaluador y día, USD 0,40 por evaluador en toda la beta y una llamada a la vez.
- **Al agotarse:** el backend responde 429 y la cuota no se recupera al renovar la sesión.
- **Mensaje en la interfaz:** mostrar «cupo agotado», sin reintentos automáticos.
- **Operadores:** `GET /admin/identities/{identity}` (o `scripts/beta_invite.py --status`) muestra invitaciones, sesiones activas y consumo del ledger, sin tokens.
