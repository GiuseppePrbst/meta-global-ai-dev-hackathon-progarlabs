# Operación parcial de workers SAM

Estado: **no habilitado para operación continua ni llamadas reales**. El saldo de Meta
no se consulta automáticamente. El propietario debe revisar la evidencia financiera
antes de operar; faltan pruebas de recuperación y reconciliación con el ledger.
El ledger rechaza fase I sin un snapshot de crédito explícito: las rutas de campaña,
Muse y CLI del laboratorio obtienen ahora ese contexto desde configuración privada.
Fase I requiere `campaign_id`, `financial_authorization_id`, `financial_authorization_file` y
`financial_evidence_file`; la evidencia y autorización deben estar fuera de Git.
Su hash no verifica automáticamente el saldo de Meta. Las fases A–H conservan su
admisión anterior. Sin evidencia vigente la ejecución se bloquea.

Con `SAM_WORKERS_DATABASE_URL` configurada para una base autorizada y aislada:

```text
python -m evaluations.sam_workers migrate
python -m evaluations.sam_workers status
python -m evaluations.sam_workers doctor
python -m evaluations.sam_workers report
python -m evaluations.sam_workers register-authorization --campaign <id> --config <config_privada> --authorization <autorizacion_privada> --evidence <evidencia_privada>
python -m evaluations.sam_workers dry-run --spec <archivo_privado> --registry <registro_privado>
python -m evaluations.sam_workers import-history --root <directorio_privado> --campaign <id>
python -m evaluations.sam_workers reconcile --root <salidas_privadas> --job <uuid>
python -m evaluations.sam_workers resolve --root <salidas_privadas> --job <uuid> --decision <completed|no_matches> --reviewer <responsable> --reason <motivo>
python -m evaluations.sam_workers start --simulated --campaign <id> --registry <registro_privado> --root <salidas_privadas>
python -m evaluations.sam_workers drain --campaign <id>
python -m evaluations.sam_workers stop --campaign <id>
python -m evaluations.sam_workers resume --campaign <id>
```

`recover` devuelve leases vencidos sin iniciar a la cola; para trabajos que ya
iniciaron exige reconciliación manual. `reconcile` inspecciona evidencia sin cambios.
`resolve` exige coincidencia del job, intento, fingerprint, resultado, reserva
finalizada y limpieza; guarda responsable, motivo y hash en una auditoría. No modifica
reservas ni archivos. La migración es aditiva; no aplicarla
al ledger real sin completar la validación de la infraestructura.

`start` permanece en primer plano y termina al agotarse el lote. `drain` y `stop`
solicitan que termine el trabajo activo sin tomar otro. `resume` solo cambia la intención;
el operador debe iniciar otro proceso. No se instala ningún servicio. La simulación
exige una base denominada `sam_workers_offline_test` y no realiza reservas ni red Meta.
El registro de autorización guarda hash, campaña, responsable, vigencia y techo de fase
en el PostgreSQL compartido. Su identificador se incorpora a la configuración privada;
el ledger verifica el registro y los archivos al reservar. La migración debe revisarse
antes de aplicarla al ledger real y el registro no verifica la autenticidad del saldo.
