# Incorporación de evaluadores a la beta cerrada (04-11-2026)

Este procedimiento es repetible para crear, entregar, seguir y revocar el acceso de evaluadores. El contrato técnico está en [SESSION_AUTH_CONTRACT.md](SESSION_AUTH_CONTRACT.md); el gasto, en [META_CLOUD_ACTIVATION.md](META_CLOUD_ACTIVATION.md).

**No se crean invitaciones para personas reales sin la lista autorizada por el propietario.** Las pruebas usan identidades sintéticas con prefijo `ext-`, que se revocan al terminar.

## 1. Antes de invitar

- La lista autorizada de evaluadores la confirma por escrito el propietario. Indica cuántos evaluadores son, para qué capacidades, y desde y hasta cuándo.
- El operador tiene el token `cloud-demo` en `D:/restricted-data/bosque-vivo/cloud/`, fuera de Git. Nunca se copia a la app, a chats ni a planillas.
- Con Meta apagado, Wilo y la identificación responden «no disponible» (503 y 501). El evaluador puede probar el acceso y el Atlas, pero no la IA.

## 2. Asignar un seudónimo

| Campo | Regla |
| --- | --- |
| Identidad | Seudónimo estable `beta-NN`, con minúsculas, números y guiones (de 3 a 41 caracteres). **Nunca** nombre, correo ni teléfono |
| Correspondencia seudónimo → persona | Solo en el registro privado del propietario, fuera del repositorio |
| Permisos | `guide` (Wilo por texto), `transcribe` (voz) e `identify` (foto). Dar solo los necesarios |
| Vigencia | La invitación vence a las 72 h si no se canjea (`invitation_hours`, de 1 a 168). El acceso dura 14 días (`access_days`, de 1 a 60) |
| Cuota | La de la identidad. Con Meta, la propuesta es 8 peticiones al día y USD 0,40 en toda la beta. Una invitación nueva para el mismo seudónimo **no** suma cuota |

## 3. Crear y entregar

```bash
python scripts/beta_invite.py beta-07 guide,transcribe,identify < D:/restricted-data/bosque-vivo/cloud/demo-token-cloud-demo
```

- La respuesta muestra la invitación `bvi_…` **una sola vez**. El backend guarda solo su hash.
- Entregarla por un canal privado y directo, sin copiarla en planillas, tickets ni el repositorio.
- El evaluador la canjea en la app o en Wilo Lab. Eso crea una sesión de 60 minutos que se puede renovar dentro de los 14 días.

## 4. Seguimiento

```bash
python scripts/beta_invite.py --status beta-07 < D:/restricted-data/bosque-vivo/cloud/demo-token-cloud-demo
```

La respuesta no contiene tokens. Muestra:

- cada invitación con su estado (`pending`, `redeemed`, `expired` o `revoked`), su fecha de creación y sus vencimientos;
- las sesiones activas y el vencimiento de la última;
- las unidades reservadas en el ledger, las reservas por estado y el tope por identidad.

Para una planilla de control basta con estos campos: seudónimo, permisos, fecha de invitación, vencimiento, estado de canje, estado de sesión, consumo y revocación. Nunca se copian tokens.

## 5. Revocar

```bash
python scripts/beta_invite.py --revoke beta-07 < D:/restricted-data/bosque-vivo/cloud/demo-token-cloud-demo
```

- Revoca al instante todas las sesiones y las invitaciones pendientes del seudónimo.
- El ledger y la auditoría (`auth_events`) se conservan.
- Para restituir el acceso, se crea una invitación nueva con el mismo seudónimo; el consumo acumulado se mantiene.

## 6. Validación del procedimiento (sin personas reales)

| Paso | Cómo se verificó |
| --- | --- |
| `POST /admin/invitations`, canje, `/sessions/me`, `/refresh`, `/logout` y revocación | Desde el dominio público el 04-11 (revisión `00008-goc`), con identidades `ext-*` revocadas al final |
| Estados y consumo por identidad | `test_operator_identity_status_shows_states_and_consumption_without_tokens` (PostgreSQL) |
| Identidad estable en el ledger | `test_quota_concurrency_provider_errors_renewal_and_revocation` y `test_quota_follows_identity_across_sessions` |
| Navegador | Wilo Lab: canje, renovación, cierre y errores (`e2e/sessions.spec.ts`, escritorio y móvil, en la CI) |
