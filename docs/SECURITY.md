# Seguridad operativa

La base está orientada a desarrollo local. No es una API pública preparada para datos personales o sensibles. No se ha realizado auditoría de seguridad ni prueba de penetración.

## Secretos y privacidad

- Copiar `.env.example` a `.env` local y completar solo lo necesario; no versionar claves. `MODEL_API_KEY` se usa exclusivamente en backend. Nunca usar prefijos públicos del frontend para secretos.
- CI funciona sin credenciales Meta ni datos privados. Los mocks deben ser inequívocos y no enviar imágenes al proveedor.
- No registrar imágenes, EXIF, coordenadas precisas, cuerpos de proveedor, cabeceras de autorización ni claves. Los logs operativos pueden incluir código de error, duración e ID de petición no sensible.
- Los datos Hepta y sus derivados están excluidos del repositorio, de worktrees y de proveedores externos. Ver [DATA_GOVERNANCE.md](DATA_GOVERNANCE.md).

## Fronteras de confianza

Validar formato/tamaño de imágenes, confirmación de mayoría de edad y derechos, modelos de entrada, geometrías y rangos. Una extensión o MIME declarado no sustituye verificar contenido. No aceptar URLs arbitrarias para que el backend descargue archivos; esto evita ampliar la superficie de SSRF. Aplicar timeout a proveedores y no exponer mensajes internos o credenciales en errores.

El modo Meta no debe activarse públicamente hasta comprobar consentimiento, retirada de metadatos, condiciones del proveedor, límites y contrato de salida. La [política Meta](https://dev.meta.ai/legal/terms-of-service) exige 18 años para quienes usan los servicios y prohíbe dirigir integraciones a menores; revisar la versión vigente antes de habilitar.

La base de observaciones local no incluye una política de cuentas/autorización para internet. Antes de desplegar: autenticación, autorización por observación, rate limit, límites de carga, HTTPS, CORS exacto, consentimiento, retención/borrado, protección de ubicaciones sensibles y backups/restauración. No exponer PostgreSQL públicamente.

## Antes de publicar

1. Revisar estado y diff staged; confirmar cuenta y correo personal autorizados.
2. Ejecutar checks de estructura/secretos y pruebas; inspeccionar manualmente archivos nuevos y binarios.
3. Comprobar licencias, atribuciones y ausencia de datos restringidos, dumps, `.env` o capturas privadas.
4. Publicar mediante PR; sin force-push a `main` ni merge automático del bootstrap.

Un escaneo negativo no demuestra ausencia absoluta de secretos. Si se filtra una clave, revocarla/rotarla primero, reducir exposición y coordinar la limpieza de historial; borrar el archivo en un commit posterior no elimina la filtración.

## Reporte de incidentes

No abrir una issue pública con credenciales, imágenes privadas o coordenadas sensibles. Contactar privadamente al mantenedor GiuseppePrbst por un canal verificado de ProGarLabs; si no existe canal habilitado, solicitar uno sin adjuntar el dato. Describir impacto y pasos reproducibles con valores sintéticos. La configuración de avisos privados de GitHub queda a decisión del propietario.
