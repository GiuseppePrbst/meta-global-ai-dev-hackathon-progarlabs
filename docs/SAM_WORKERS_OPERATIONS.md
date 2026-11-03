# Operación parcial de workers SAM

Estado: **no habilitado para operación continua ni llamadas reales**. El saldo de Meta
no se consulta automáticamente. El propietario debe revisar la evidencia financiera
antes de operar; faltan pruebas de recuperación y reconciliación con el ledger.

Con `SAM_WORKERS_DATABASE_URL` configurada para una base autorizada y aislada:

```text
python -m evaluations.sam_workers migrate
python -m evaluations.sam_workers status
python -m evaluations.sam_workers doctor
python -m evaluations.sam_workers report
python -m evaluations.sam_workers dry-run --spec <archivo_privado> --registry <registro_privado>
python -m evaluations.sam_workers import-history --root <directorio_privado> --campaign <id>
python -m evaluations.sam_workers reconcile --root <salidas_privadas> --job <uuid>
python -m evaluations.sam_workers start --simulated --campaign <id> --registry <registro_privado> --root <salidas_privadas>
python -m evaluations.sam_workers drain --campaign <id>
python -m evaluations.sam_workers stop --campaign <id>
python -m evaluations.sam_workers resume --campaign <id>
```

`recover` devuelve leases vencidos sin iniciar a la cola; para trabajos que ya
iniciaron exige reconciliación manual. `reconcile` solo inspecciona evidencia y
no modifica resultados, reservas ni estados. La migración es aditiva; no aplicarla
al ledger real sin completar la validación de la infraestructura.

`start` permanece en primer plano y termina al agotarse el lote. `drain` y `stop`
solicitan que termine el trabajo activo sin tomar otro. `resume` solo cambia la intención;
el operador debe iniciar otro proceso. No se instala ningún servicio. La simulación
exige una base denominada `sam_workers_offline_test` y no realiza reservas ni red Meta.
