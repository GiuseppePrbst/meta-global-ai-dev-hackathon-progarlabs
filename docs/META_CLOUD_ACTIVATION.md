# Meta en la API cloud: auditoría, presupuesto propuesto, encendido y apagado (04-11-2026)

**Estado: deshabilitado.** La API cloud corre con `META_ENABLED=false`, `BUDGET_UNITS=0` y `BUDGET_LIFETIME_UNITS=0`.

- Que exista `MODEL_API_KEY` en Secret Manager **no autoriza** gastar.
- Encender Meta requiere una autorización vigente del propietario para una campaña concreta, con un monto en USD.
- Este documento deja todo listo para encenderlo sin cambiar código.

El presupuesto de GCP (CLP 90.000, en `infra/gcp/README.md`) es otro presupuesto y no se mezcla con el gasto de Meta, que se cuenta en USD.

## 1. Auditoría (04-11-2026, sin llamadas a Meta)

| Punto | Resultado |
| --- | --- |
| Secret Manager | `bosque-model-api-key`, `bosque-database-url`, `bosque-demo-tokens` y `bosque-origin-auth-token`: una versión habilitada cada uno. Que la clave Meta sea válida no se comprobó, porque hacerlo requiere una llamada |
| Identidades de operador | Solo `cloud-demo` en `DEMO_TOKENS`, que es también la única en `ADMIN_IDENTITIES`. Su token vive en un archivo privado, fuera de Git |
| Cloud SQL | PostgreSQL 16 y PostGIS 3.6.4 con TLS. Migraciones 001 a 005 aplicadas; el backup a demanda previo a 005 fue correcto |
| Ledger cloud | 0 reservas y 0 identidades con consumo. Es independiente del ledger del laboratorio |
| Restricción de operaciones | `identify`, `raster`, `transcribe` y `guide` |
| Variables de reserva | `META_`, `VOICE_` y `GUIDE_RESERVATION_UNITS` valen 0 (no configuradas). `BUDGET_UNITS`, `BUDGET_LIFETIME_UNITS` y `BUDGET_IDENTITY_UNITS` valen 0 |
| Concurrencia | `BUDGET_CONCURRENCY=1`. Cloud Run tiene `max-instances=1` y concurrencia 4 |
| Ruta de reserva | Una sola transacción con `pg_advisory_xact_lock`. Revisa, en orden: el tope acumulado, el tope por identidad, el conteo diario global y por identidad, el monto diario y la concurrencia. Si algún límite se supera, responde 429 sin insertar |
| Cierre de reserva | `finish` marca `completed`, `provider_error`, `validation_error` o `cancelled`, con el uso reportado. **Las unidades nunca se devuelven**: una petición fallida sigue contando. Si `finish` falla, la reserva queda cobrada y solo expira el cupo de concurrencia |
| Identidad del consumo | La de la invitación, estable entre sesiones (ver [SESSION_AUTH_CONTRACT.md](SESSION_AUTH_CONTRACT.md)). Un token nuevo no reinicia las cuotas, según los tests `test_quota_follows_identity_across_sessions` y `test_global_budget_concurrent_workers_ownership_and_recovery` |
| Permisos | `reserve()` rechaza con 403 cualquier operación fuera de los permisos de la sesión, antes de reservar |
| Orden con Meta apagado | `/identify` devuelve 501, y Wilo y la voz 503. Ocurre **antes** de `reserve()`, así que no se crean reservas |
| Claves en respuestas o logs | Los errores del proveedor se sanitizan. En Cloud Logging no hay tokens, claves ni `Bearer`: se revisó la revisión `00006`. Las identidades aparecen solo como seudónimo SHA-256 truncado |

## 2. Presupuesto Meta propuesto para la beta (requiere autorización)

Las unidades están en **microUSD**: 1.000.000 equivalen a USD 1.

Las reservas por operación son las de la campaña real del 03-11 (4 llamadas):
- reservado: USD 0,105;
- costo estimado por tarifa: unos USD 0,039.

Por eso la reserva queda unas 2,5 veces por encima del costo estimado.

| Variable | Valor propuesto | Equivale a |
| --- | ---: | --- |
| `GUIDE_RESERVATION_UNITS` | 40.000 | USD 0,04 por respuesta de Wilo |
| `VOICE_RESERVATION_UNITS` | 5.000 | USD 0,005 por transcripción (hasta 60 s) |
| `META_RESERVATION_UNITS` | 30.000 | USD 0,03 por identificación |
| `BUDGET_IDENTITY_UNITS` | 400.000 | USD 0,40 por evaluador durante toda la beta: unas 10 respuestas de Wilo o 13 identificaciones |
| `BUDGET_UNITS` | 1.000.000 | USD 1 por día UTC entre todos |
| `BUDGET_LIFETIME_UNITS` | 5.000.000 | **USD 5 de tope total de la beta** |
| `BUDGET_REQUESTS` y `BUDGET_REQUESTS_PER_IDENTITY` | 25 y 8 | Peticiones Meta por día: globales y por evaluador |
| `BUDGET_CONCURRENCY` | 1 | Una llamada Meta a la vez. Un stream de voz ocupa el cupo hasta 60 s |

Con 12 evaluadores a USD 0,40 cada uno se reservan como máximo USD 4,80, dentro del tope de USD 5. El gasto real debería quedar por debajo de lo reservado, pero Meta no expone una API de saldo: **no hay verificación independiente del gasto**.

No se suben estos límites para facilitar las pruebas.

## 3. Encender Meta (solo con autorización vigente)

Requisitos previos:

1. Autorización escrita del propietario, con el monto y el alcance de la campaña.
2. Confirmación de que los créditos de Meta siguen vigentes ese día.
3. La revisión actual con Meta apagado identificada para el rollback: `gcloud run revisions list --service=bosque-vivo-api`.

El comando no necesita cambios de código y crea una revisión nueva. Mantiene `SERVICE_MODE=demo`; nunca uses `local` en el servicio público.

```bash
REGION=southamerica-west1
gcloud run services update bosque-vivo-api --region "$REGION" \
  --account=<owner> --project=nice-carving-513619-t4 --billing-project=nice-carving-513619-t4 \
  '--update-env-vars=^@^META_ENABLED=true@GUIDE_RESERVATION_UNITS=40000@VOICE_RESERVATION_UNITS=5000@META_RESERVATION_UNITS=30000@BUDGET_IDENTITY_UNITS=400000@BUDGET_UNITS=1000000@BUDGET_LIFETIME_UNITS=5000000@BUDGET_REQUESTS=25@BUDGET_REQUESTS_PER_IDENTITY=8'
```

Después, haz **una** llamada mínima por capacidad con una invitación de prueba, y registra modelo, latencia, `correlation_id`, ID de reserva y uso reportado.

## 4. Apagado de emergencia

Elige la opción más rápida según el caso:

1. **Volver a la revisión con Meta apagado** (segundos, sin construir nada): `gcloud run services update-traffic` con `--to-revisions` apuntando a esa revisión al 100 %.
2. **Apagar por variable** (unos 40 s): `--update-env-vars=META_ENABLED=false`.
3. **Cortar a un evaluador:** `POST /admin/identities/{identity}/revoke` con el token de operador. Revoca sus sesiones e invitaciones pendientes.

El ledger nunca se deshabilita ni se borra para resolver errores.

## 5. Pendiente o no verificado

- Validez actual de `MODEL_API_KEY` y saldo de créditos Meta: requieren una llamada pagada.
- Agotamiento de cuota con Meta real. Se probó en PostgreSQL con dobles de prueba, pero no contra Meta.
- Timeout de 120 s del servidor con un proveedor lento real.
