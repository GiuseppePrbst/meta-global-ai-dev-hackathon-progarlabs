# Gobernanza de datos

Estado: 27 de octubre de 2026. Se aplica al código, fixtures, fotografías, coordenadas, máscaras, modelos, evaluaciones, capturas y logs. Giuseppe es el responsable funcional propuesto de validación científica; toda publicación requiere además comprobar derechos.

## Clasificación y límites

| Clase | Ejemplos | Tratamiento |
| --- | --- | --- |
| PUBLIC_VERIFIED | Datos con recurso, versión, licencia y atribución verificadas | Incorporar solo la porción necesaria, con manifiesto y límites científicos. |
| SYNTHETIC | Fixtures creados para pruebas | Rotular explícitamente; no presentarlos como observaciones, mediciones, rutas o predicciones reales. |
| PENDING | Especies candidatas, fotos o recursos sin validación completa | No redistribuir contenido de terceros ni usar como verdad de evaluación. Conservar referencias y estado pendiente. |
| RESTRICTED | Imágenes georreferenciadas, LiDAR, infraestructura y derivados de proyectos Hepta Insights | Fuera del repositorio **y de todos los worktrees**. No descargar, transferir, procesar externamente ni publicar sin autorización específica. |

No se han autorizado datos Hepta para este bootstrap. Queda prohibido subirlos a GitHub, enviarlos a Meta Model API, incluirlos en datasets públicos o capturas, exponer coordenadas de infraestructura, crear máscaras/derivados publicables, entrenar con ellos o publicar pesos derivados. Una autorización de lectura no equivale a autorización de entrenamiento, redistribución o envío a terceros. Estas restricciones incluyen datos de terceros y secretos comerciales.

## Admisión de un recurso

Antes de descargar o integrar, registrar en `docs/DATASET_LICENSES.md` o en un manifiesto versionado junto al dataset:

1. Nombre e identificador, proveedor, URL y fecha de consulta/adquisición.
2. Versión/fecha del producto, licencia exacta y enlace a sus términos.
3. Atribución exigida y condiciones de redistribución/uso comercial.
4. Clasificación, área/periodo cubierto, resolución y limitaciones.
5. Procesamiento aplicado, sistema de coordenadas y hash del archivo cuando exista.
6. Responsable y estado de validación; evidencia de autorización si corresponde.

La disponibilidad pública de una web o API no concede automáticamente derechos sobre textos, fotografías o cada registro. Verificar cada licencia de GBIF/WFO y cada producto chileno; evitar CC BY-NC en un producto comercial sin permiso suficiente. No se copia contenido botánico descriptivo ni fotografía de terceros en el bootstrap.

## Fotografías y observaciones

El usuario debe tener derechos y consentir el procesamiento antes de una futura llamada real. Eliminar EXIF y datos personales innecesarios antes de salir del dispositivo; no inferir consentimiento de una carga local. Las coordenadas son opcionales y no deben incorporarse a logs. No almacenar archivos de fotografías ni enviar contenido a terceros en el modo mock. No diseñar la integración Meta para menores de 18 años.

Las observaciones de desarrollo deben distinguir procedencia, especie sugerida, validación humana y ubicación. Una sugerencia del modelo no confirma una especie; un punto sintético no confirma presencia en Puyehue. Antes de despliegue público deben definirse retención, borrado, autenticación, consentimiento y generalización de ubicaciones sensibles.

## Geoespacial y evaluación

CHMv2 estima altura de copa; no es una medición directa ni una tasa anual de crecimiento. Registrar versión, fechas de imágenes, unidades, CRS, nodata, cobertura y transformaciones. Procesar ventanas pequeñas de COG/STAC cuando corresponda; no descargar rasters globales durante el bootstrap. Separar muestras de entrenamiento, selección y evaluación, con derechos verificables.

## Publicación

Revisar archivos staged antes de **cada** commit/push: nombres, contenido, diffs, secretos y datos restringidos. Los controles automáticos reducen errores pero no reemplazan la revisión. Nunca incluir `.env`, claves ni resultados privados en logs de CI. Si se encuentra material restringido, detener la publicación, limitar el acceso y avisar al titular; no reescribir historia pública sin coordinar respuesta al incidente.

Fuentes y estado de licencias: [DATASET_LICENSES.md](DATASET_LICENSES.md). Política operativa: [SECURITY.md](SECURITY.md). Ningún manifiesto equivale a una autorización nueva.

## Excepción limitada comunicada el 27-10-2026

El usuario autorizó durante la sesión procesamiento local de fotografías Hepta, sin
publicación. El permiso no cambia la clasificación RESTRICTED, no autoriza transferencia
a Meta/otros proveedores, entrenamiento ni redistribución de fotos/metadatos/derivados.
Cualquier copia permitida debe permanecer fuera del repositorio y de sus worktrees.
Se comprobó acceso de lectura a esquema con Azure/OneLake; no se descargaron fotos.
Antes de ampliar uso se requiere autorización específica del titular. La declaración
del usuario queda como evidencia de sesión, no como una licencia pública del dataset.
