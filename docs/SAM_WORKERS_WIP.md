# Cola SAM: avance en desarrollo

La migración aditiva crea `sam_experiment_jobs`. El reclamo usa `FOR UPDATE SKIP LOCKED`.
Los leases vencidos antes de iniciar vuelven a la cola; los trabajos que ya comenzaron
requieren reconciliación manual. `completed` y `no_matches` no se reclaman de nuevo.

Esta implementación es **incompleta y no está autorizada para operación continua**.
El adaptador experimental admite solo imágenes y conceptos, delega en `run_experiment`
y exige que el ledger use exactamente la misma URL que la cola. La autorización
requiere fuente, responsable, vigencia, montos y hash de evidencia privada. La etiqueta
de fuente y el hash no autentican automáticamente la evidencia ante Meta: siguen
necesitando revisión humana, no son una consulta de Billing. Existe importación
histórica idempotente y una resolución auditada basada en evidencia vinculada.
Hay ejecución en primer plano y controles básicos, pero no hay supervisión con reinicio,
reconciliación automática ni control RPM;
no se deben ejecutar llamadas reales hasta completar y validar esos controles.

Para usar la cola con una base de pruebas aislada, configurar `SAM_WORKERS_DATABASE_URL`
y ejecutar `python -m evaluations.sam_workers migrate`, `status` o `recover`. El comando
`plan --spec <archivo_privado>` no usa red; `enqueue` también requiere `--campaign`.
`import-history --root <resultados_privados> --campaign <id>` importa solo estados
terminales con identidad experimental no determinada; `reconcile --root <salidas_privadas>
--job <uuid>` inspecciona evidencia sin cambiar el estado de la cola. `resolve` permite
una decisión humana solo cuando el resultado, el intento y el ledger coinciden.
La migración en una base compartida debe hacerse solo tras revisión y respaldo.
