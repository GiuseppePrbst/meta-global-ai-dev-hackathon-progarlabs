# Privacidad y consentimiento

Versión 27-10-2026. Aplica [DATA_GOVERNANCE.md](../../../docs/DATA_GOVERNANCE.md) y [SECURITY.md](../../../docs/SECURITY.md) a la app móvil. La app está dirigida solo a personas adultas.

## Consentimiento

| Confirmación | Cuándo | Persistencia | Efecto |
| --- | --- | --- | --- |
| Confirmación de mayoría de edad | Una vez, antes de la primera identificación | Preferencia local, revocable en Ajustes | Sin ella, Identificar queda bloqueado; Catálogo y Atlas siguen disponibles. |
| Confirmación de derechos | Para cada fotografía, también las de galería | No se guarda; viaja con la petición (`rights_confirmed`) | Sin ella no se envía la imagen. |

El consentimiento no se infiere de que la persona haya elegido o capturado una foto.

## Fotografías

1. Se capturan con la cámara o se eligen de la galería; en Android se usa el selector del sistema para no pedir acceso a toda la galería.
2. Antes de salir del dispositivo se redimensionan y se **recodifican a JPEG**, lo que elimina EXIF y GPS. Una prueba automatizada verifica que el archivo resultante no contiene metadatos EXIF ni GPS; mientras esa prueba no exista, la eliminación se considera **no verificada**.
3. El archivo resultante debe pesar menos de 10 MiB.
4. La foto **nunca** se adjunta a una observación ni se guarda en el servidor. El borrador puede conservar una miniatura solo en el dispositivo; se borra junto con el borrador.

## Ubicación

- Se pide permiso de ubicación **solo en primer plano** y solo cuando la persona activa el interruptor de ubicación de una observación (apagado por defecto). Sin ubicación en segundo plano.
- Las coordenadas no se registran en logs ni se envían fuera de `POST /observations`.
- Aprender botánica o identificar nunca exige GPS.
- **Bloqueo**: el Atlas muestra observaciones de todas las personas. La generalización de ubicaciones sensibles se decide en el backend (BV-09) antes de exponer la API; el cliente no la decide.

## Datos en el dispositivo

- Borradores (notas, miniatura, especie elegida, ubicación si se activó) e IDs de observaciones enviadas, en SQLite local sin cifrado propio; la protección depende del bloqueo del dispositivo. Las notas pueden contener información sensible: la app lo advierte en el campo.
- La persona puede borrar cada borrador y limpiar todos los datos locales desde Ajustes.
- Borrar datos locales no borra observaciones ya enviadas: la API todavía no ofrece borrado (pendiente de retención/borrado en BV-09).

## Terceros y logs

- Sin analítica ni crash reporting de terceros en el MVP.
- Logs solo en desarrollo: código de error, duración y ruta. Nunca imágenes, EXIF, coordenadas, notas, cuerpos de respuesta ni cabeceras.
- Ninguna clave de Meta o de proveedor privado vive en la app; `EXPO_PUBLIC_*` es público y queda dentro del binario.
- Los proveedores de teselas reciben la IP y el área visible del mapa; se indica en «Acerca de» junto con su atribución.

## Pendiente antes de un despliegue público

Autenticación, autorización por observación, retención y borrado, generalización de ubicaciones sensibles, límites de petición y revisión de términos de los proveedores de mapas. Hasta entonces la API no debe exponerse sin protección, aunque la app esté lista.
