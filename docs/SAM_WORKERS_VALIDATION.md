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
