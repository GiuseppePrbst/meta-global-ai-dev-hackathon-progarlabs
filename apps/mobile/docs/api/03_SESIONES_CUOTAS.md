# Sesiones BVS, roles y cuotas

## Sesión actual (en producción)

**Canje de invitación:** `POST /sessions/exchange` con `{"invitation":"bvi_..."}` devuelve `201` y campos `access_token`, `token_type`, `expires_in`, `expires_at`, `access_expires_at`, `session_id`, `identity`, `scopes`.

- El token `bvs_...` dura ~60 minutos. `POST /sessions/refresh` lo rota y revoca el anterior.
- `GET /sessions/me` entrega la identidad, autenticación, permisos y vencimiento.
- `POST /sessions/logout` revoca la sesión; borrar también el token del dispositivo aunque la petición falle.
- La invitación es de un solo uso; no almacenar el texto de invitación después del canje.
- Si la renovación compite con otra renovación, solo una tendrá éxito: usar un control de concurrencia de refresco en el cliente.
- Un token estático de operador **no** es un token para la app y no debe incluirse en código frontend.

## Sistema futuro (PR #42, aún no desplegado)

**Roles backend:** `public_trial`, `team_developer`, `internal_qa`, `administrator`.

**Asignación:** la persona autenticada por Facebook recibe `public_trial` inicialmente. El equipo solo recibe rol superior mediante asignación administrativa. Una dirección de email determinada no es prueba suficiente. La app no envía `role`, `cohort` ni `identity` para elegir su presupuesto.

| Grupo | Bolsa total | Límite por identidad | Estado inicial |
| --- | ---: | ---: | --- |
| Público | USD 60 | USD 0,30 de prueba única | IA apagada |
| Equipo | USD 25 | USD 8 por integrante | IA apagada |
| QA | USD 5 | USD 5 según identidad | IA apagada |
| Margen no asignado | USD 10 | No usable | Retenido |

Autorización humana total: USD 100; máximo inicial de reservas: USD 90. Los valores son **reservas presupuestarias**, no dinero directamente visible ni garantía de costo facturado. Las cuotas solo son funcionales después de migración 008 y activación de cohortes por backend.

### `GET /me/quota` (PR #42)

Campos de respuesta observados en OpenAPI del PR:

- `identity: string`
- `plan: string | null`
- `status`: `available | daily_limit | trial_exhausted | ai_disabled | suspended | no_cohort`
- `features: ('guide'|'transcribe'|'identify'|'raster')[]`
- `units_limit: number | null` (microUSD)
- `units_reserved: number` (microUSD)
- `units_available: number | null` (microUSD)
- `daily_requests_limit: number | null`
- `daily_requests_used: number`
- `reason: string | null`

Para mostrar un monto, usar `unidades / 1_000_000` y rotularlo como **estimación basada en reservas** (`~USD`). No confiar en cálculos del frontend para admitir gastos.

### `GET /me/permissions` (PR #42)

Campos: `identity`, `role`, `scopes`, `administrator`, `ai_enabled`.

- La UI puede ocultar/deshabilitar funciones sin permiso, pero **solo el backend decide** si se autoriza la operación.
- `ai_enabled=false`: mostrar «IA temporalmente no disponible»; permitir Atlas público.
- `status=trial_exhausted`: mostrar «Tu prueba gratuita terminó»; no generar nueva identidad para solicitar saldo.
- `status=daily_limit`: mostrar «Has alcanzado el límite diario».

## Matriz de errores para frontend

| Código | Caso | Comportamiento recomendado |
| --- | --- | --- |
| 401 | Falta token, expiró, fue revocado o invitación inválida | Borrar sesión / pedir nuevo login; sin reintento automático |
| 403 | Scope incorrecto o cuenta suspendida | Explicar falta de permiso; no reintentar |
| 422 | Campos/consentimiento/archivo inválido | Solicitar corrección de datos |
| 429 | Rate limit o presupuesto agotado | Mostrar `Retry-After` si existe; no reintentar operaciones de IA automáticamente |
| 501 | Reconocimiento Meta deshabilitado o login federado aún no configurado | Mostrar indisponibilidad, sin simular éxito |
| 502 | Error proveedor/herramienta | Mostrar error recuperable, reintento manual |
| 503 | Wilo apagado, ledger o persistencia temporalmente no disponibles | Ofrecer modo Atlas / entrada de texto |

No olvidar capturar `X-Correlation-ID` en errores para soporte. Nunca registrar Bearer tokens ni cuerpos de audio o imagen.

## Almacenamiento del token

- Web: mantener en memoria; si es requisito explícito de UX, usar `sessionStorage` (nunca `localStorage`).
- iOS/Android: `expo-secure-store` o alternativa equivalente con almacenamiento seguro.
- El backend renueva/revoca; cerrar la app no cancela automáticamente una sesión.
- El token obtenido tras renovar sustituye al anterior, que deja de ser válido.
