# Validación parcial de workers SAM — 03-11-2026

- PostgreSQL 18 aislado: 14 pruebas focalizadas aprobadas, incluyendo adquisición
  concurrente, recuperación, diez transiciones sintéticas y pruebas del ledger.
- Importación privada: 442 resultados terminales insertados; una segunda ejecución
  encontró 442 existentes y no insertó ninguno. No se reconstruyó la identidad
  experimental completa. No se modificaron manifiestos ni se llamó a Meta.
- Suite de servicios: 282 aprobadas y 21 omitidas. Primero fallaron dos pruebas por
  menos de 1 GiB libre en `C:`; con temporal nuevo en `D:` pasaron.
- Pendiente: operación con diez trabajos y resultados completos mediante CLI,
  pruebas de interrupción integral, límites RPM/TPM y prueba con Meta autorizada.

La etiqueta `provider_verified` y el hash de un archivo son una declaración trazable,
no prueba automática de saldo o de autenticidad ante el proveedor.

## Continuación — prueba offline

Diez trabajos sintéticos pasaron por `run_one` con adaptador simulado, PostgreSQL
aislado y diez archivos de resultado; una instancia nueva no encontró más trabajos y
la inspección reconoció las diez evidencias. No hubo solicitudes Meta ni reservas reales.
La prueba se ejecutó directamente desde pytest, no desde una CLI supervisada.

El límite de snapshot descuenta reservas de todas las identidades desde la fecha de
observación dentro del advisory lock del ledger, sin restar reservas anteriores dos
veces si están finalizadas. Para cubrir cargos aún inciertos también descuenta
reservas anteriores pendientes o vencidas; esa parte puede ser conservadora en exceso.
No garantiza que otros consumidores fuera del ledger, ni procesos que no usen
este control, respeten el mismo límite. No es autorización para activar inferencias.

## Demostración CLI

En PostgreSQL 18 aislado se migró la cola, se ejecutaron `doctor`, `plan`, `dry-run`,
encolado, `start --simulated`, `drain`, `resume`, segundo `start`, `reconcile` y
`report`: diez trabajos, diez resultados privados y ninguna ejecución adicional tras
reiniciar. El ledger no estaba presente en esa base y no se realizó ninguna reserva.
`drain` se invocó tras completar el lote; aún falta probarlo durante una inferencia.
La consulta del ledger informa explícitamente `missing_reservation_id` cuando falta.

## Integración del PR #31

En la rama combinada: 289 pruebas de servicios aprobadas y 24 omitidas; 58 pruebas
focalizadas aprobadas y 2 omitidas con PostgreSQL aislado; test JavaScript del visor
aprobado. La CLI de workers procesó diez trabajos sintéticos y un reinicio no agregó
trabajos. En esa etapa las rutas antiguas sin snapshot fallaban antes de reservar;
su adaptación se describe abajo.
Una coincidencia de fase de la reserva en reconciliación no prueba vínculo con el job.

## Continuación: vínculos y recuperación

Las nuevas reservas de worker se vinculan a job e intento en la misma transacción;
si el lease no coincide, se revierte la reserva. La finalización de cero filas ahora
devuelve error. Una resolución de resultado terminal exige evidencia y crea un registro
de auditoría; una segunda resolución se rechaza. No se fabrican vínculos históricos.

Pruebas PostgreSQL multiproceso con proveedor simulado comprobaron `stop` y `drain`
durante un job activo, y terminación abrupta seguida de lease vencido y recuperación:
el trabajo incierto permanece en reconciliación y solo se procesa el pendiente. Quedan
pendientes pruebas integrales de timeout y 429/503, uso real de Meta y supervisión
continua. La fase I no está autorizada sin evidencia vigente del propietario.

Validación adicional del 03-11: suite de servicios 296 aprobadas y 25 omitidas;
pruebas focalizadas 66 aprobadas y 2 omitidas por falta de OpenCV. La suite completa
omitió PostGIS y pruebas que requieren `TEST_DATABASE_URL` (las pruebas focalizadas
del ledger se ejecutaron por separado en PostgreSQL 18 aislado), además de extras GIS
y OpenCV. El importador reconoció 466 resultados terminales: 442 existentes y 24
adicionales; una segunda pasada reconoció 466 sin insertar. El proveedor fue simulado.

El helper compartido valida autorización privada para la CLI, el visor, la campaña
SAM y los callers Muse adaptados. Falta demostrar que todos los accesos directos al
ledger no puedan construir manualmente un snapshot sin evidencia; la etiqueta del
proveedor y el hash siguen requiriendo revisión humana. Permanecen pendientes las
pruebas integrales de timeout y respuestas 429/503 durante ejecución y recuperación.
