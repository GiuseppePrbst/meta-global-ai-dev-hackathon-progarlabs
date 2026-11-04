# Facebook Login, roles y cuotas por grupo (04-11-2026)

**Estado:**
- **Implementado y probado en código:** backend, migración 008 y la referencia en Wilo Lab.
- **Sin activar en producción:**
  - no existen todavía la app de Meta for Developers ni el proveedor de Firebase;
  - `FIREBASE_PROJECT_ID` está vacío;
  - `BUDGET_COHORTS_ENABLED=false`.

Mientras falten esas piezas, `/sessions/federated/*` responde 501.

## 1. Arquitectura

```
Facebook Login ──► Firebase Authentication ──► ID token (JWT RS256, 1 h)
                                                    │
                         POST /sessions/federated/exchange
                                                    ▼
          Bosque Vivo API: verifica firma, emisor, audiencia, expiración y proveedor
          ─► identidad interna estable ─► rol y cohorte (solo en la base) ─► sesión bvs_ (60 min)
                                                    ▼
                               ledger por identidad, cohorte y tope global ─► Meta Model API
```

- **Separación de responsabilidades:**
  - Facebook dice quién es la persona.
  - Bosque Vivo decide su identidad interna, rol, permisos y cuotas.
  - Meta Model API solo recibe la clave del backend.
- **Lo que el backend no recibe:** el token de acceso de Facebook, ni ninguna clave de Meta Model API.
- **Por qué Facebook Login y no una «Cuenta de Meta» con OAuth:**
  - La Cuenta de Meta unificada, anunciada el 23-04-2026, ordena el inicio de sesión entre las apps de Meta.
  - No encontramos documentación oficial de un OAuth «Log in with Meta» para apps externas.
  - Las cuentas administradas de Meta usan el mismo flujo de tokens que Facebook Login (FAQ de Facebook Login). No se implementó una API hipotética.
  - El login de desarrollador de Meta Model API es otra cosa: es la consola de claves.
- **Por qué Firebase Authentication:**
  - Ya está dentro del proyecto GCP y verifica Facebook por nosotros.
  - Emite un JWT estándar, que el backend valida con las claves públicas de Google (PyJWT 2.15.1). No hay SDK de administración ni un OAuth casero.
  - **Costo:** Identity Platform no cobra hasta 50.000 usuarios activos mensuales en proveedores sociales (Tier 1, página de precios de Firebase). El proyecto ya tiene facturación, así que no hace falta cambiar de plan; sin facturación, el límite sería de 3.000 usuarios activos diarios.
  - **Facturación:** no se cambió nada.

## 2. Contrato

| Método y ruta | Uso | Respuestas clave |
| --- | --- | --- |
| `POST /sessions/federated/exchange` `{id_token}` | Canjea un ID token de Firebase por una sesión `bvs_`. El primer ingreso crea la identidad `public_trial` | 201 `SessionToken`. 401: token inválido, expirado, con otra clave, audiencia o emisor. 403: proveedor no admitido o cuenta suspendida. 429: más de 5 registros nuevos por hora desde una IP. 501: no configurado |
| `POST /sessions/federated/link` `{id_token}` | Con una **sesión de invitación**, asocia la cuenta federada a esa identidad y a su consumo | 204. 409: la cuenta federada ya tiene identidad. 400: la sesión no es de invitación |
| `GET /sessions/me`, `POST /sessions/refresh`, `POST /sessions/logout` | Igual que con invitaciones | Una renovación nunca pasa de 30 días (`FEDERATED_ACCESS_DAYS`). Después hay que volver a canjear el token de Firebase |
| `GET /me/permissions` | Rol, permisos, si es administrador y si la IA está habilitada | — |
| `GET /me/quota` | Plan visible, estado, unidades reservadas, disponibles y uso diario | `status`: `available`, `daily_limit`, `trial_exhausted`, `ai_disabled`, `suspended` o `no_cohort` |
| `DELETE /me` | Elimina observaciones e identificaciones propias y revoca sus sesiones | Se conservan el seudónimo, el hash del UID y el ledger. Así, borrar la cuenta y volver no regala otra cuota |
| `PUT /admin/identities/{id}` | Asigna rol y cohorte, o suspende (solo operadores) | Auditado en `auth_events.detail`, con estado anterior, nuevo y motivo |
| `GET` y `PUT /admin/cohorts[/{cohort}]` | Consumo por cohorte. Mover presupuesto o encender o apagar la IA de un grupo | 422 si la suma de topes supera `BUDGET_LIFETIME_UNITS`, o si un tope queda bajo lo reservado |

- **Identidad interna:** `u-` más 32 caracteres hexadecimales de `SHA-256("<proyecto>:<uid>")`.
  - No se guardan el UID, el correo, el nombre ni la foto.
  - No se usa el correo como clave ni para unir cuentas.
  - Un correo `@progarlabs.com` no da ningún rol.
- **Cuota:** la del ledger, por identidad estable. Un token nuevo, otro dispositivo, una renovación o un cierre de sesión no la renuevan.

## 3. Roles y cohortes (migración 008)

| Rol | Cohorte | Cómo se asigna | Cupo inicial (USD) |
| --- | --- | --- | --- |
| `public_trial` | `public_trial` | Por defecto, en el primer ingreso federado | Bolsa de 60. Tope de 0,30 por identidad, una sola vez. 8 peticiones al día |
| `team_developer` | `team_developer` | `PUT /admin/identities/{id}` con el UID verificado del integrante | Bolsa de 25. Tope de 8 por integrante. 100 al día |
| `internal_qa` | `internal_qa` | Invitaciones BVS e identidades sintéticas | Bolsa de 5. 60 al día |
| `administrator` | La que se asigne explícitamente (por defecto `internal_qa`) | Administrativo | Su consumo se carga a esa bolsa. Ser administrador **no da acceso ilimitado** |

- **Topes cargados:** los valores de la autorización del 04-11-2026, que fueron
  - 60 USD para la bolsa pública, 25 para el equipo y 5 para QA;
  - 10 USD de margen sin asignar;
  - 90 USD de tope global de reservas (`BUDGET_LIFETIME_UNITS=90000000`).
- **IA apagada al inicio:** todas las cohortes empiezan con `ai_enabled=false`.
- **Rol de un nuevo ingreso:** nadie entra con un rol que no sea `public_trial`, porque el cliente no puede pedir un rol.

## 4. Pendiente manual (bloqueos externos)

1. **Meta for Developers** (propietario de la cuenta de ProGarLabs):
   1. Crear la app Bosque Vivo con el caso de uso «Autenticar y solicitar datos a usuarios con Inicio de sesión con Facebook».
   2. Pedir **solo** `public_profile`: el backend no usa `email`. Comprobar en la pantalla de consentimiento real qué permisos solicita el SDK, porque no se verificó.
   3. Completar los datos de la app: política de privacidad, instrucciones o URL de eliminación de datos (sección 6), ícono y categoría.
   4. Agregar en Facebook Login la redirección `https://nice-carving-513619-t4.firebaseapp.com/__/auth/handler`. Si se usa un dominio propio, la de ese dominio.
   5. **Acceso público:** sin roles en la app, solo se puede iniciar sesión con **acceso avanzado** a `public_profile`, y la app debe estar en modo **Live**. Según Meta, el acceso avanzado puede exigir verificación del negocio.
   6. **Verificación:** no se declara habilitado el acceso público hasta probarlo con una cuenta **sin** rol en la app.
2. **Firebase / Identity Platform:**
   1. Agregar Firebase al proyecto, o habilitar Identity Platform.
   2. Activar el proveedor Facebook con el App ID y el **App Secret**. El propietario los introduce en la consola; nunca van al repositorio ni a un chat.
   3. Dominios autorizados: los del frontend de José y el de Wilo Lab.
3. **Cloud Run:** `FIREBASE_PROJECT_ID=nice-carving-513619-t4` y `BUDGET_COHORTS_ENABLED=true`, después de aplicar 008.
4. **Prueba de aceptación:**
   1. Una cuenta de Facebook sin rol inicia sesión y obtiene `public_trial`.
   2. Su cuota se agota y no se renueva.
   3. Se suspende la cuenta y se borra.

## 5. Integración de clientes

### Web (TypeScript, referencia en `apps/experiments/wilo-lab/src/components/FederatedLogin.tsx`)

```ts
import { initializeApp } from "firebase/app";
import { FacebookAuthProvider, getAuth, inMemoryPersistence, setPersistence, signInWithPopup, signOut } from "firebase/auth";

const auth = getAuth(initializeApp({ apiKey, authDomain, projectId })); // configuración pública, no secreta
await setPersistence(auth, inMemoryPersistence);
const { user } = await signInWithPopup(auth, new FacebookAuthProvider()); // sin addScope adicionales
const idToken = await user.getIdToken();
await signOut(auth); // lo que queda es la sesión bvs_ del backend
const session = await fetch(`${API}/sessions/federated/exchange`, {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id_token: idToken }),
}).then((r) => r.json());
```

- **Variables de Wilo Lab:** `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN` y `VITE_FIREBASE_PROJECT_ID`. Sin ellas, el botón «Entrar con Facebook» no aparece.
- **La clave web de Firebase:** identifica el proyecto, no es un secreto, y conviene restringirla por dominio en GCP.
- **En móvil web:** Firebase recomienda `signInWithRedirect` en lugar del popup.

### iOS y Android (Expo)

- **Sin Expo Go:** el SDK de Facebook es nativo. Hace falta un *development build* con `react-native-fbsdk-next` y su *config plugin*, que configuran App ID, Client Token y esquemas de URL.
- **Android, y iOS clásico:** el SDK entrega un token de acceso. Se canjea en Firebase con `signInWithCredential(auth, FacebookAuthProvider.credential(accessToken))` y luego se pide `getIdToken()`.
- **iOS con Limited Login:** el SDK entrega un token de autenticación OIDC, no un token de acceso. Firebase lo acepta con `OAuthProvider("facebook.com")` usando `idToken` y el `rawNonce` sin hash; la guía iOS de Firebase lo llama «Implement Facebook Limited Login».
- **El token `bvs_`:** se guarda en `expo-secure-store` (sección 4 de SESSION_AUTH_CONTRACT). El token de Facebook nunca se guarda.
- **Apple (guía 4.8):** si Facebook crea la cuenta principal, la app iOS debe ofrecer **además** un login equivalente que limite los datos a nombre y correo, permita ocultar el correo y no rastree para publicidad sin consentimiento. Sign in with Apple cumple, y Firebase lo soporta (`apple.com`). Basta con agregar `apple.com` a `FEDERATED_PROVIDERS`; el backend no cambia.
- **Redirecciones y *deep links*:** se registran en la app de Meta (hash de clave de Android y Bundle ID de iOS) y en Firebase. Nunca se incrusta en el bundle un token de operador ni una clave administrativa.

### Errores para la interfaz

| Situación | Señal | Texto sugerido |
| --- | --- | --- |
| Saldo disponible | `/me/quota` `status=available` | Disponible, unos USD X (estimado) |
| Límite diario | `status=daily_limit`, o 429 «Límite global o por identidad alcanzado» | Vuelve mañana |
| Cuota de prueba agotada | `status=trial_exhausted`, o 429 «Límite acumulado de la identidad alcanzado» | Tu prueba gratuita terminó |
| IA deshabilitada | `status=ai_disabled`, o 503 «IA no habilitada para este grupo» o «Meta deshabilitado» | IA temporalmente no disponible |
| Error del proveedor | 502 | Meta no respondió; intenta más tarde. La reserva cuenta |
| Sesión expirada | 401 | Vuelve a entrar con Facebook |
| Permiso denegado o suspendida | 403 | Sin permiso, o cuenta suspendida |

El saldo es una **estimación por reservas** (microUSD reservados antes de llamar a Meta), no un saldo contable. Mostrar «~».

## 6. Privacidad y cumplimiento (antes de abrir al público)

- **Datos del perfil:** solo se pide `public_profile`, y el backend no guarda nombre, foto ni correo. Imagen y audio se tratan con el consentimiento explícito ya vigente (`external_processing_confirmed`) y con la retención actual (`OBSERVATION_RETENTION_DAYS`).
- **Eliminación:** `DELETE /me` borra el contenido propio. Para Meta basta con una **URL de instrucciones** de eliminación en la política de privacidad, porque Meta acepta instrucciones o *callback*. El *callback* firmado (`signed_request` con HMAC-SHA256 del App Secret) queda **pendiente**: usarlo exigiría el App Secret en el backend.
- **Revocar el acceso federado:**
  - la persona puede quitar la app desde su configuración de Facebook;
  - el operador puede suspender con `PUT /admin/identities/{id}` y `suspended=true`.
- **Política de privacidad de ProGarLabs:** **no revisada en esta etapa**. Debe cubrir el login con Facebook, el seudónimo, el ledger, imagen y audio, Meta Model API como encargado, la retención y la eliminación. Requiere revisión del propietario.
- **Términos y territorios:**
  - Antes de abrir hay que revisar los términos de Meta Login y los de Meta Model API (sección 10.1: usuarios mayores de 18 años; ya se exige `adult_confirmed`).
  - La página de precios de Meta Model API no menciona restricciones geográficas, así que la disponibilidad en Chile no está verificada documentalmente.

## 7. Abuso

Un UID identifica una cuenta, no a una persona. Por eso los límites son por capas:

1. Cuota por identidad, de una sola vez.
2. Bolsa pública limitada.
3. Tope global de USD 90 en reservas.
4. Límites diarios por identidad y globales.
5. Concurrencia 1.
6. Límites HTTP persistentes: 60 por minuto por identidad, más 5 registros nuevos por hora por IP.
7. La regla por IP de Cloudflare.
8. Suspensión.
9. Apagado por cohorte (`ai_enabled`) o global (`META_ENABLED=false`).

Las IP se guardan solo como seudónimo SHA-256 truncado.

Firebase App Check (reCAPTCHA Enterprise en web, Play Integrity o App Attest en móvil) puede sumarse después sobre Firebase Auth: no sustituye la autorización del backend y no es necesario para el MVP.
