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
histórica idempotente y una inspección de evidencia que requiere revisión manual.
No hay supervisión, reconciliación automática, control RPM ni CLI de ejecución;
no se deben ejecutar llamadas reales hasta completar y validar esos controles.

Para usar la cola con una base de pruebas aislada, configurar `SAM_WORKERS_DATABASE_URL`
y ejecutar `python -m evaluations.sam_workers migrate`, `status` o `recover`. El comando
`plan --spec <archivo_privado>` no usa red; `enqueue` también requiere `--campaign`.
`import-history --root <resultados_privados> --campaign <id>` importa solo estados
terminales con identidad experimental no determinada; `reconcile --root <salidas_privadas>
--job <uuid>` inspecciona evidencia sin cambiar el estado de la cola.
La migración en una base compartida debe hacerse solo tras revisión y respaldo.
