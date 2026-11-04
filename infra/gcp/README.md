# Bosque Vivo API en Google Cloud + Cloudflare (03-11-2026)

URL pública: **https://api-bosquevivo.progarlabs.com**

## Estado

| Área | Estado |
| --- | --- |
| API en Cloud Run, `SERVICE_MODE=demo` | Implementado y verificado desde fuera de GCP |
| PostgreSQL 16 + PostGIS 3.6.4 (Cloud SQL), migraciones 001–004 | Implementado y verificado. El ledger cloud empezó vacío |
| Cloudflare Worker + dominio + límite de tasa | Implementado y verificado |
| Protección del origen `run.app` | Implementada en el backend y verificada |
| Sesiones de beta cerrada (migración 005) | Implementadas. Probadas en una revisión etiquetada sin tráfico; la promoción espera la revisión del PR |
| Inferencia Meta (identificación, voz y guía) | **Deshabilitada.** `/identify` responde 501, Wilo 503, sin reservas ni llamadas pagadas |
| Origen web de la app de José en CORS | Pendiente: se desconoce su URL; hoy solo se permite `http://localhost:3000` |

Un `GET /health` correcto no demuestra que toda la aplicación funcione. Lo que se probó está en «Pruebas externas».

## Arquitectura

```
cliente → Cloudflare (api-bosquevivo.progarlabs.com)
          ├─ límite de tasa: 60 peticiones / 10 s por IP, bloqueo 10 s
          └─ Worker bosque-vivo-api-proxy ── origen fijo, agrega X-Bosque-Origin (secreto)
               → Cloud Run bosque-vivo-api (southamerica-west1)
                  ├─ el backend exige X-Bosque-Origin en todo salvo /health (HTTP y WebSocket)
                  ├─ salida Direct VPC, private-ranges-only (Meta sale por ruta pública, sin NAT)
                  └─ Cloud SQL bosque-vivo-pg (IP privada 10.79.185.3, TLS obligatorio)
```

¿Por qué Cloud Run tiene la verificación IAM de invocador desactivada (`--no-invoker-iam-check`)?

- La organización prohíbe `allUsers` (`iam.allowedPolicyMemberDomains`).
- La organización también prohíbe las claves de cuentas de servicio, así que el Worker no puede firmar tokens de Google.
- La alternativa, un balanceador HTTPS de GCP, tiene un cargo fijo mensual.

Por eso la protección la hace el propio backend (`ORIGIN_AUTH_TOKEN`), no el Worker:

- quien llame directo a `run.app` sin el encabezado recibe 403;
- el token demo no sirve sin ese encabezado.

## Recursos (proyecto `nice-carving-513619-t4`)

| Recurso | Nombre |
| --- | --- |
| Cloud Run | `bosque-vivo-api`: 1 vCPU, 1 GiB, mín. 0 / máx. 1, concurrencia 4, timeout 120 s, facturación por petición |
| Job de migraciones | `bosque-vivo-migrate` (Cloud Run job, misma imagen) |
| Cloud SQL | `bosque-vivo-pg`, `db-f1-micro` Enterprise, zonal, SSD de 10 GB con crecimiento automático hasta 20 GB, 7 backups diarios (07:00 UTC), PITR y protección contra borrado |
| Base de datos y usuario | `bosque_vivo` / `bosque_api` |
| Red | VPC `bosque-vivo-vpc`, subred `bosque-vivo-run` (10.10.0.0/26), rango PSA `bosque-vivo-psa` |
| Artifact Registry | `southamerica-west1-docker.pkg.dev/nice-carving-513619-t4/bosque-vivo/api:<sha>` |
| Cuentas de servicio | `bosque-vivo-api` (runtime: `cloudsql.client` y acceso a sus 4 secretos) y `bosque-vivo-build` (Cloud Build) |
| Secretos | `bosque-model-api-key`, `bosque-database-url`, `bosque-demo-tokens`, `bosque-origin-auth-token`, todos con réplica solo en `southamerica-west1` |
| Presupuestos | `bosque-vivo-cloud-trial`: CLP 90.000 trimestral, con umbrales de 25 a 100 % más 90 % pronosticado. `bosque-vivo-trial-cumulative`: CLP 90.000, del 01-11-2026 al 02-02-2027 |
| Cloudflare | Worker `bosque-vivo-api-proxy`, dominio personalizado y regla `http_ratelimit` limitada a este host |

Las copias privadas del token demo (`cloud-demo`) y del token de origen están en `D:/restricted-data/bosque-vivo/cloud/`, fuera de Git.

## Costo estimado (SKU oficiales de Santiago, CLP, consultados el 03-11-2026)

| Ítem | Mensual |
| --- | ---: |
| Cloud SQL `db-f1-micro` (14,41/h) | ~10.520 |
| SSD de 10 GB (233,3 por GB/mes) | ~2.330 |
| Backups, PITR | ~110 a 500 |
| Cloud Run, tráfico de demo (mín. 0) | ~1.300 |
| Registro, Secrets, Build, Logging y Worker | ~0 (capas gratuitas) |
| **Total** | **~14.300 a 15.000** |

Para el período hasta el 02-02-2027 (unos 3 meses) son unos **CLP 43.000 a 45.000**, dentro del presupuesto de CLP 90.000. El crédito del período de prueba mostrado en la consola el 03-11 era de CLP 294.115.

La cuenta no se actualizó a pago. Revisar el costo acumulado en Facturación → Informes, filtrando por el proyecto. Los datos de facturación tienen un retraso de hasta 24 h.

## Operación

Todos los comandos llevan `--account=<owner> --project=nice-carving-513619-t4 --billing-project=nice-carving-513619-t4 --region=southamerica-west1`, que aquí se omiten.

- **Nueva versión:**
  1. Construir con `ACCOUNT=<owner> bash infra/gcp/deploy.sh build`.
  2. Desplegar con `gcloud run deploy bosque-vivo-api --image=…/api:<sha>`. Los demás parámetros se conservan.
- **Rollback:**
  1. Listar revisiones con `gcloud run revisions list --service=bosque-vivo-api`.
  2. Volver a una con `gcloud run services update-traffic bosque-vivo-api --to-revisions=<rev>=100`.
- **Migraciones:**
  - Cada migración nueva se revisa y se ejecuta con el job `bosque-vivo-migrate`, que corre en la VPC con `DATABASE_URL` desde Secret Manager.
  - No se usan migraciones destructivas.
  - La base local del laboratorio no se toca.
- **Restaurar la base:**
  - Desde un backup: `gcloud sql backups list --instance=bosque-vivo-pg`, y luego `gcloud sql backups restore`.
  - A un instante (PITR): `gcloud sql instances clone bosque-vivo-pg <nuevo> --point-in-time=<UTC>`.
- **Rotar secretos:**
  1. Agregar la versión nueva por stdin: `gcloud secrets versions add <secreto> --data-file=-`. Nunca pasar el valor como argumento.
  2. Forzar una revisión nueva: `gcloud run services update bosque-vivo-api --update-labels=rotated=<fecha>`.
  3. Si se rota el token de origen, actualizarlo también en Cloudflare: `npx wrangler secret put ORIGIN_AUTH_TOKEN < archivo` (Node 22, desde `infra/cloudflare/worker`).
- **CORS para la app de José:**
  - Editar `CORS_ORIGINS` en `infra/gcp/api.env.yaml` y volver a desplegar con `--env-vars-file`.
  - CORS no protege la API contra el acceso directo. Esa función la cumplen el token demo y el encabezado de origen.
- **Habilitar Meta:**
  - Requisito: autorización de gasto vigente del propietario.
  - Pasos: `META_ENABLED=true`, `BUDGET_UNITS` y `BUDGET_LIFETIME_UNITS` mayores que 0, y las unidades de reserva `META_`, `VOICE_` y `GUIDE_RESERVATION_UNITS`.
  - No subir esos límites para facilitar pruebas.
- **Pausar sin perder datos:**
  - `gcloud sql instances patch bosque-vivo-pg --activation-policy=NEVER` detiene el cómputo y sigue cobrando el disco y los backups (~CLP 2.500 al mes).
  - Para reanudar: `--activation-policy=ALWAYS`.
  - Con la base detenida, la API responde 503 en las rutas con persistencia.
- **Apagar la exposición pública:** volver a exigir IAM con `gcloud run services update bosque-vivo-api --invoker-iam-check`.

## Plan para el fin del período de prueba (02-02-2027)

- **Antes del 20-01-2027:** decidir con el propietario si se continúa con pago.
- **Si no se continúa:**
  1. Exportar la base: `gcloud sql export sql bosque-vivo-pg gs://<bucket privado>/bosque_vivo.sql.gz --database=bosque_vivo`, o hacer un `pg_dump` mediante el job.
  2. Pausar la instancia.
  3. Al terminar la prueba, GCP detiene los recursos. Los datos se conservan unos 30 días si se actualiza la cuenta en ese plazo.
- **La eliminación definitiva** (`deletion-protection`, instancia, VPC, secretos y Worker) requiere la autorización explícita del propietario. No se automatiza.
- **El presupuesto trimestral** se reinicia el 01-01-2027. El presupuesto acumulado cubre el período completo.

## Pruebas externas (03-11-2026, desde fuera de GCP)

| Prueba | Resultado |
| --- | --- |
| `GET /health`, `/parks`, `/species`, `/taxa`, `/knowledge/status` y `/openapi.json` vía Cloudflare | 200, entre 0,08 y 0,5 s |
| `run.app` directo a `/parks`: sin encabezado, con token demo y con encabezado falso | 403 en los tres casos |
| WebSocket `/guide/voice/stream` | 101 vía Cloudflare; 403 directo a `run.app` |
| `/observations` sin token y con token inválido | 401 |
| `/identify` sin token | 401 |
| `/guide/query` con token válido y Meta apagado | 503 antes de reservar; sin llamada pagada |
| `/identify` con token válido, PNG sintético y Meta apagado | 501; sin llamada pagada |
| Cuerpo inválido | 422 |
| `DELETE /health` | 405 |
| `/parks/no-existe` | 404 |
| Ruta inexistente | 401: en modo demo, la identidad se exige antes de resolver la ruta |
| CORS desde `https://evil.example` | 400, sin `Access-Control-Allow-Origin` |
| CORS desde `http://localhost:3000` | 200, con el origen permitido |
| Límite de tasa: 120 peticiones paralelas | 23 con 200 y 97 con 429 |
| Persistencia tras reinicio | Observación sintética creada, revisión nueva (`00002`), leída de nuevo y borrada (204) |
| Migraciones | 001 a 004 aplicadas. PostGIS 3.6.4, TLS activo, restricción `identify\|raster\|transcribe\|guide` presente |

No ejecutado:

- **Imagen malformada en `/identify`:** con Meta apagado, el 501 ocurre antes de validar la imagen. Esa validación está cubierta por los tests unitarios.
- **Timeout de 120 s:** probarlo exigiría una petición lenta real.
- **Límites de presupuesto del ledger:** no hay reservas mientras Meta esté apagado.

## Beta cerrada: invitaciones y sesiones (04-11-2026)

Contrato para clientes: [docs/SESSION_AUTH_CONTRACT.md](../../docs/SESSION_AUTH_CONTRACT.md). Meta: [docs/META_CLOUD_ACTIVATION.md](../../docs/META_CLOUD_ACTIVATION.md).

- **Migración 005:**
  - Aplicada el 04-11 con el job `bosque-vivo-migrate`, después del backup a demanda `1793753850662`.
  - Es aditiva: solo crea `access_invitations`, `access_sessions` y `auth_events`.
  - El rollback de esquema (`005_sessions.down.sql`) se niega a borrar si hay auditoría.
- **Crear una invitación:** solo con el token de operador `cloud-demo`, que se lee desde el archivo privado y nunca va como argumento. El script `scripts/beta_invite.py` imprime la invitación una sola vez:

  ```bash
  python scripts/beta_invite.py beta-07 guide,transcribe,identify < D:/restricted-data/bosque-vivo/cloud/demo-token-cloud-demo
  ```

  Entrega la invitación al evaluador por un canal privado. Vence en 72 h si no se canjea, y el acceso dura 14 días.
- **Revocar a un evaluador:** `python scripts/beta_invite.py --revoke beta-07 < …/demo-token-cloud-demo`.
- **Promover una versión con sesiones:**
  1. Desplegar sin tráfico: `gcloud run services update bosque-vivo-api --image=…@sha256:<digest> --no-traffic --tag=sessions`, más las variables nuevas de `api.env.yaml`.
  2. Probar la URL etiquetada con el encabezado de origen.
  3. Mover el tráfico: `gcloud run services update-traffic bosque-vivo-api --to-tags=sessions=100`.
- **Rollback:** volver el 100 % del tráfico a la revisión `bosque-vivo-api-00004-d2l` con `gcloud run services update-traffic` y `--to-revisions`, como en «Operación». La revisión 00004 ignora las tablas nuevas, así que no hay que tocar el esquema.
- **Límites en memoria:** el de sesión (60/min) y el de canjes fallidos por IP (10 cada 15 min) suponen `max-instances=1`. Si se escala, hay que moverlos a PostgreSQL.
