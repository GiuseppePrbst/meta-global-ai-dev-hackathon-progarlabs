# Meta en la API cloud: auditoría, presupuesto propuesto, encendido y apagado (04-11-2026)

**Estado (04-11-2026): habilitado solo para `team_developer`.** `META_ENABLED=true`, y cada cohorte decide con `ai_enabled`: `internal_qa` en pausa tras su campaña y `public_trial` apagada. Registro en la sección 7.

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
| Cierre de reserva | `finish` marca `completed`, `provider_error`, `validation_error` o `cancelled` (este último desde la migración 007), con el uso reportado. **Las unidades nunca se devuelven**: una petición fallida sigue contando. Si `finish` falla, la reserva queda cobrada y solo expira el cupo de concurrencia |
| Identidad del consumo | La de la invitación, estable entre sesiones (ver [SESSION_AUTH_CONTRACT.md](SESSION_AUTH_CONTRACT.md)). Un token nuevo no reinicia las cuotas, según los tests `test_quota_follows_identity_across_sessions` y `test_global_budget_concurrent_workers_ownership_and_recovery` |
| Permisos | `reserve()` rechaza con 403 cualquier operación fuera de los permisos de la sesión, antes de reservar |
| Orden con Meta apagado | `/identify` devuelve 501, y Wilo y la voz 503. Ocurre **antes** de `reserve()`, así que no se crean reservas |
| Claves en respuestas o logs | Los errores del proveedor se sanitizan. En Cloud Logging no hay tokens, claves ni `Bearer`: se revisó la revisión `00006`. Las identidades aparecen solo como seudónimo SHA-256 truncado |

## 2. Presupuesto autorizado (04-11-2026)

**Autorización:**
- el propietario aprobó hasta **USD 100 de gasto real acumulado** en Meta Model API para esta etapa;
- de los unos USD 120 de crédito restante que informa, quedan USD 20 fuera de la campaña;
- no autoriza agregar fondos, medios de pago ni cambios de facturación.

Las unidades están en **microUSD**: 1.000.000 equivalen a USD 1.

| Bolsa (migración 008) | Tope | Por identidad | Peticiones por día e identidad |
| --- | ---: | ---: | ---: |
| `public_trial` | USD 60 | USD 0,30, una sola vez | 8 |
| `team_developer` | USD 25 | USD 8 | 100 |
| `internal_qa` | USD 5 | USD 5 | 60 |
| Margen no asignado | USD 10 | — | — |
| **Tope de reservas** (`BUDGET_LIFETIME_UNITS`) | **USD 90** | — | — |

El margen de USD 10 cubre las diferencias entre reserva y facturación. El tope humano sigue siendo de USD 100 de gasto real, y **un tope de reservas no garantiza la facturación**: Meta no expone una API de saldo, así que el uso reportado (`reported_usage`) se reconcilia a mano con el panel de Meta.

### Reserva por operación (auditoría de costo máximo)

`services/api/tests/test_cost_bounds.py` calcula el peor caso con las tarifas Standard vigentes (Muse Spark 1.3: USD 1,25 y 4,25 por millón de tokens) y 3 caracteres por token, y exige un margen de al menos 20 %:

| Operación | Peor caso permitido | Reserva |
| --- | --- | ---: |
| Wilo (`guide`) | Hasta 3 llamadas: 2 de planificación con 1.200 tokens de salida y una respuesta con 4.096. Hasta 4 herramientas por turno, cada resultado de 15.000 caracteres o menos (`MAX_TRAILS` bajó de 30 a 12). Pregunta de 2.000 caracteres o menos. **USD 0,082** | **100.000 (USD 0,10)** |
| Voz (`transcribe`) | Stream de 60 s o menos, a USD 0,18 por hora: USD 0,003 | 5.000 |
| Identificación | Estrategia `verify`: 2 llamadas con 1.600 y 800 tokens de salida, más la imagen. Meta no documenta los tokens por imagen; se midieron unos 2.000 y se acotan empíricamente en 4.000. USD 0,020 | 30.000 |

- **Sin reintentos automáticos:** los 429 y 5xx de Meta se devuelven al cliente.
- **Sin búsqueda web:** no se usa grounding web.
- **Modelos:** Standard, nunca las variantes Contributor.
- **Riesgo residual:** el tamaño en tokens de una imagen de 16 MP no está documentado. Se vigila con `reported_usage`.

Con USD 0,30 por persona alcanzan unas 3 respuestas de Wilo o 10 identificaciones. La bolsa pública de USD 60 cubre unas 200 personas.

## 3. Activación progresiva (solo con autorización vigente)

No se ejecuta mientras falte la autorización. Ningún paso cambia código; se mantiene `SERVICE_MODE=demo` y nunca se usa `local` en el servicio público.

1. **Autorización.** Debe ser escrita por el propietario e indicar campaña, monto máximo en USD y fecha. Se registra la referencia; no se copian correos ni datos personales.
2. **Créditos.** Confirmar en la consola de Meta que los créditos siguen vigentes ese día.
3. **Esquema.** Hace falta el 007 aplicado (`cancelled` en el ledger), después de un backup a demanda. Sin él, cancelar un stream de voz deja la reserva colgada 10 minutos.
4. **Revisión con Meta, sin tráfico.** Etapa QA, antes de 008: el tope global es la bolsa QA (USD 5) y solo existen identidades de invitación QA. Desplegar con la etiqueta `meta`:

   ```bash
   REGION=southamerica-west1
   gcloud run services update bosque-vivo-api --region "$REGION" \
     --account=<owner> --project=nice-carving-513619-t4 --billing-project=nice-carving-513619-t4 \
     --no-traffic --tag meta \
     '--update-env-vars=^@^META_ENABLED=true@GUIDE_RESERVATION_UNITS=100000@VOICE_RESERVATION_UNITS=5000@META_RESERVATION_UNITS=30000@BUDGET_IDENTITY_UNITS=5000000@BUDGET_UNITS=5000000@BUDGET_LIFETIME_UNITS=5000000@BUDGET_REQUESTS=60@BUDGET_REQUESTS_PER_IDENTITY=60'
   ```

5. **Verificar los controles en la URL etiquetada**, sin gastar:
   - sin token, 401;
   - sesión sin permiso, 403;
   - `/sessions/me` correcto;
   - las variables efectivas de la revisión.
6. **Mover el tráfico** a la revisión `meta` solo si el paso 5 pasó: `gcloud run services update-traffic` con `--to-tags=meta=100`.
7. **Campaña mínima:** `scripts/meta_beta_campaign.py --execute --authorization "<referencia>" --max-usd <monto>`, con una sesión de evaluador sintética. Son cuatro llamadas (USD 0,145 reservados) más el registro del caso olivillo/ulmo.
8. **Revisar ledger y uso:** `scripts/beta_invite.py --status <identidad>` muestra reservas por estado y unidades. La evidencia JSON queda fuera del repositorio.
9. **Errores y latencias:** revisar los 502 y 429 del proveedor y las latencias contra las esperadas (Wilo 20–37 s; identificación 6–16 s).
10. **Decidir** si el acceso sigue habilitado. Si hay cualquier duda, volver al instante a la revisión con Meta apagado (sección 4).

## 4. Apagado de emergencia

Elige la opción más rápida según el caso:

1. **Volver a la revisión con Meta apagado** (segundos, sin construir nada): `gcloud run services update-traffic` con `--to-revisions` apuntando a esa revisión al 100 %.
2. **Apagar por variable** (unos 40 s): `--update-env-vars=META_ENABLED=false`.
3. **Cortar a un evaluador:** `POST /admin/identities/{identity}/revoke` con el token de operador. Revoca sus sesiones e invitaciones pendientes.

El ledger nunca se deshabilita ni se borra para resolver errores.

## 5. Pruebas sin gasto (04-11-2026)

`services/api/tests/test_meta_controls.py` usa el presupuesto propuesto, el ledger y las sesiones reales en PostgreSQL, y un Meta simulado (`httpx.MockTransport`) que cuenta llamadas:

| # | Control | Resultado |
| --- | --- | --- |
| 1 | Sin presupuesto (`BUDGET_UNITS=0`) | 503 en las tres capacidades, 0 llamadas y 0 reservas |
| 2 | Sin autenticación | 401, 0 reservas |
| 3 | Sin permiso | 403 en Wilo, transcripción e identificación, 0 reservas |
| 4 | Cuota agotada | La 9.ª petición diaria de la identidad responde 429 (tope de 8) |
| 5 | Concurrencia | Con una llamada en curso, la siguiente responde 429 sin llamar a Meta |
| 6 | Reserva fallida | Sin ledger, 503 antes de llamar a Meta |
| 7 | Renovación | Ni una sesión renovada ni una invitación nueva de la misma identidad suman cuota |
| 8 | Error del proveedor | 502 sanitizado, reserva `provider_error` cobrada (40.000 unidades) |
| 9 | Revocación | 401 y ninguna reserva nueva |
| 10 | Apagado (`META_ENABLED=false`) | 503, 503 y 501, y la voz devuelve `unavailable`. 0 llamadas |

Además, `test_cancelled_voice_stream_closes_its_reservation` reproduce un error real: el stream de voz cerraba sus reservas con `cancelled`, un estado que el CHECK de 003 no permitía. La reserva quedaba `reserved` durante 10 minutos, ocupando el único cupo de concurrencia. La migración 007 lo corrige, y la prueba falla sin ella.

## 6. Pendiente o no verificado

- Validez actual de `MODEL_API_KEY` y saldo de créditos Meta: requieren una llamada pagada.
- Agotamiento de cuota con Meta real. Se probó en PostgreSQL con dobles de prueba, pero no contra Meta.
- Timeout de 120 s del servidor con un proveedor lento real.

## 7. Registro de activación (04-11-2026)

- **Producción:** imagen `api:61de4fa4e05a` (`sha256:f40424e92a31…`), revisión `00020-qay` al 100 %. Migraciones 001 a 008 aplicadas tras el backup `1793811162597`. Rollback sin Meta: `00014-zux`.
- **Billing de `dev.meta.ai`, leído a las 17:00 UTC aprox.:**
  - créditos gratuitos en uso: `$123,39`, sin pagos registrados y con saldo pendiente `$0`;
  - Visa en archivo. El panel indica que se paga al llegar a `$10.000` o el 01-12-2026;
  - el panel no muestra vencimiento de los créditos. Los términos (13.3) dicen que pueden expirar;
  - el gráfico de uso rotula CLP, y la moneda del saldo no aparece indicada. Se interpreta como USD porque coincide con el consumo previo: es una inferencia.
- **Condición de los créditos:** el panel avisa que, mientras se usen créditos gratuitos, el contenido puede usarse para mejorar productos. Por eso no se envían datos personales, confidenciales ni Hepta, y **esto bloquea la apertura pública** hasta resolverlo. No se pulsó «Stop using free credits», porque el gasto iría a la tarjeta y eso no está autorizado.
- **Campaña QA:** 8 reservas de `qa-s5-01`, 7 `completed` y 1 `cancelled`, USD 0,40 reservados. Uso reportado: 19.552 tokens de entrada, 7.468 de salida y 4,7 s de audio, unos USD 0,057 por tarifa. Sin reservas atascadas.
  - Medios: dos fotos CC de `apps/mobile/assets/images/reference` y una voz sintética.
  - Wilo texto: 200 en 18,7 s; declara sin verificar la apertura de senderos.
  - Wilo voz: 200 en 29,4 s.
  - Coigüe (*N. dombeyi*): aceptada en 15,5 s, correcta.
  - Hongo fuera del catálogo: abstención en 11,1 s, correcta.
  - Olivillo: abstención con esta foto. No anula la confusión con ulmo del 03-11: son casos sueltos y no estiman precisión.
  - Stream de voz cerrado a mitad: reserva `cancelled`, gracias a 007.
- **Facebook Login:** Identity Platform inicializado sin proveedores. La app de Meta no existe; su creación quedó detenida antes de aceptar las Condiciones de la plataforma. Firebase (`addFirebase`) respondió 403.
- **Reconciliación pendiente:** el panel tarda hasta una hora en reflejar el uso.
