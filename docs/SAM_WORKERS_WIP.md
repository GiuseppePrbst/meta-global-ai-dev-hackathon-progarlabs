# Cola SAM: avance en desarrollo

La migración aditiva crea `sam_experiment_jobs`. El reclamo usa `FOR UPDATE SKIP LOCKED`.
Los leases vencidos antes de iniciar vuelven a la cola; los trabajos que ya comenzaron
requieren reconciliación manual. `completed` y `no_matches` no se reclaman de nuevo.

Esta implementación es **incompleta y no está autorizada para operación continua**.
El adaptador experimental admite solo imágenes y conceptos, delega en `run_experiment`
y exige que el ledger use exactamente la misma URL que la cola. La confirmación de
saldo es una declaración del operador, no una consulta de Billing. No hay importador
histórico, supervisión, reconciliación automática, control RPM ni CLI de ejecución;
no se deben ejecutar llamadas reales hasta completar y validar esos controles.

Para usar la cola con una base de pruebas aislada, configurar `SAM_WORKERS_DATABASE_URL`
y ejecutar `python -m evaluations.sam_workers migrate`, `status` o `recover`. El comando
`plan --spec <archivo_privado>` no usa red; `enqueue` también requiere `--campaign`.
La migración en una base compartida debe hacerse solo tras revisión y respaldo.
