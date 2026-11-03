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
trabajos. Las rutas antiguas que llaman fase I sin snapshot ahora fallan antes de
reservar: todavía necesitan una integración de autorización para poder ejecutarse.
Una coincidencia de fase de la reserva en reconciliación no prueba vínculo con el job.
