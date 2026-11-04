# Facebook Login + Firebase Authentication — integración para web y Expo

**Estado al 04-11-2026:** diseño e implementación en PR #42, no fusionados ni activos en Cloud Run. La aplicación Facebook de Meta Developers y el proveedor Facebook de Firebase no se han creado/configurado. Es normal que todavía no exista un inicio de sesión público funcional.

## Flujo previsto

1. El usuario pulsa **Entrar con Facebook**.
2. El SDK oficial completa el acceso con Facebook y Firebase Authentication autentica al usuario.
3. El cliente obtiene un **Firebase ID token** (no un token Meta Model API).
4. Envía `POST /sessions/federated/exchange` con JSON `{"id_token":"<JWT de Firebase>"}`.
5. FastAPI verifica firma, emisor, audiencia, expiración y proveedor. Devuelve `201 SessionToken` (`bvs_...`), vinculado a una identidad interna estable.
6. El cliente utiliza exclusivamente `Authorization: Bearer bvs_...` para acceder a la API y consulta `/me/permissions` y `/me/quota`.
7. Al expirar el BVS, inicia sesión federada de nuevo o renueva mientras el BVS siga vigente. La cuota **no se reinicia**.

### Rutas nuevas (PR42)

- `POST /sessions/federated/exchange`: `201` sesión BVS; `401` Firebase token inválido; `403` proveedor no admitido/suspensión; `429` demasiadas altas; `501` backend no configurado una vez desplegado.
- `POST /sessions/federated/link`: asocia el proveedor a una identidad previa obtenida con invitación, preservando historial y presupuesto; no enlazar cuentas solo por email.
- `GET /me/quota`, `GET /me/permissions`, `DELETE /me`: requieren BVS.

## Configuración pendiente (coordinación con Giuseppe/Fabiana)

**Meta for Developers**
- Crear la aplicación Bosque Vivo con Facebook Login.
- Configurar App ID, App Secret (el Secret **no** se entrega a José ni se coloca en Git), permisos mínimos y URLs de privacidad/eliminación.
- Registrar la redirección exacta de Firebase, normalmente `https://nice-carving-513619-t4.firebaseapp.com/__/auth/handler` si ese es el `authDomain` efectivo; confirmar en consola.
- Comprobar permisos, modo Live y disponibilidad para un Facebook externo sin rol en la aplicación.

**Firebase / GCP**
- Incorporar Firebase Authentication al proyecto `nice-carving-513619-t4` si aún no está incorporado.
- Habilitar proveedor Facebook con App ID y App Secret en consola.
- Configurar dominios de frontend realmente utilizados y `authDomain` real.
- Activar `FIREBASE_PROJECT_ID` y cohortes en Cloud Run solamente tras desplegar migración 008 y superar pruebas.

**José**
- Solicitar al equipo el `firebaseConfig` **público** (apiKey, authDomain, projectId y appId si aplica), el Facebook App ID público y la URL web de producción.
- Nunca pedir App Secret ni claves administrativas.
- Implementar botón con bandera `FACEBOOK_LOGIN_ENABLED=false` mientras la configuración/PR no estén listos.

## Web

Consultar `ejemplos/facebook-login-web.ts`. Usa Firebase JS SDK, `FacebookAuthProvider` y `signInWithPopup` como referencia para escritorio. Para web móvil, evaluar el flujo oficial de redirección. No persistir el Firebase token ni incluirlo en URLs o logs. El cliente BVS controla la sesión de Bosque Vivo.

## iOS y Android con Expo

- Expo Go no admite el SDK nativo de Facebook. Se requiere **development build** con configuración adecuada de `react-native-fbsdk-next` o el método recomendado por el proyecto.
- Configurar identificadores y deep links de ambas plataformas en Meta y Firebase; nunca usar claves de servidor en el bundle.
- iOS Limited Login puede devolver un **ID token OIDC** en lugar de un access token; el mecanismo de canje con Firebase no es idéntico al flujo clásico. Seguir la guía oficial de Firebase y no asumir que siempre llega `accessToken`.
- Para publicar en iOS, revisar la directriz 4.8 de Apple y proporcionar una alternativa equivalente, frecuentemente Sign in with Apple.
- Guardar el BVS en `expo-secure-store` (Keychain/Keystore). Para web, memoria y, si se acuerda, solo `sessionStorage`.
- Solicitar consentimiento de uso de audio e imágenes antes del procesamiento externo.

## Privacidad

La API no almacena nombre, email ni foto de Facebook; usa una identidad interna seudónima. Antes de usuarios públicos deben revisarse política de privacidad y proceso de eliminación de cuenta. `DELETE /me` en PR42 borra contenido personal asociado y revoca sesiones, pero retiene los datos mínimos del ledger/identidad para evitar regenerar una cuota de prueba; el aviso al usuario debe explicarlo.

## Documentación oficial

- Firebase, Facebook Login web: https://firebase.google.com/docs/auth/web/facebook-login
- Firebase, Facebook Login en Apple: https://firebase.google.com/docs/auth/ios/facebook-login
- Expo, autenticación Facebook: https://docs.expo.dev/guides/facebook-authentication/
- Expo, autenticación general: https://docs.expo.dev/develop/authentication/
- Contrato de repo: `docs/FEDERATED_LOGIN.md` en PR42 (ver referencias).
