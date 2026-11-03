# Operación parcial de workers SAM

Estado: **no habilitado para operación continua ni llamadas reales**. No hay comandos
`start`, `stop`, `drain` o `resume` implementados. El saldo de Meta no se consulta
automáticamente. El propietario debe revisar la evidencia financiera antes de operar.

Con `SAM_WORKERS_DATABASE_URL` configurada para una base autorizada y aislada:

```text
python -m evaluations.sam_workers migrate
python -m evaluations.sam_workers status
python -m evaluations.sam_workers import-history --root <directorio_privado> --campaign <id>
python -m evaluations.sam_workers reconcile --root <salidas_privadas> --job <uuid>
```

`recover` devuelve leases vencidos sin iniciar a la cola; para trabajos que ya
iniciaron exige reconciliación manual. `reconcile` solo inspecciona evidencia y
no modifica resultados, reservas ni estados. La migración es aditiva; no aplicarla
al ledger real sin completar la validación de la infraestructura.
