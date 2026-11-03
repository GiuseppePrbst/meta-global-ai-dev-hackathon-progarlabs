# Contrato de entrega de medios al laboratorio SAM

Estado: 02-11-2026. Documento público de coordinación. Contiene el contrato, conteos no
sensibles y las reglas de uso. El manifiesto con rutas, hashes y notas de revisión está fuera
de Git, en la carpeta privada del titular, y no se publica.

## Reparto de responsabilidades

- **Este trabajo (contenido)** produce medios normalizados, clips y su manifiesto.
- **Laboratorio SAM (inferencia)** consume el paquete. No se modifican sus directorios
  (`tools/meta_sam_api_lab/`, adaptadores de inferencia ni resultados históricos).
- No se generan máscaras, overlays ni llamadas a Meta desde este trabajo.
- Los directorios de salida del laboratorio y los de contenido son distintos.

## Contenido del paquete

| Tipo | Cantidad | Formato | Uso previsto |
| --- | ---: | --- | --- |
| Escenas fotográficas | 15 | JPEG, orientación aplicada, sin EXIF, lado mayor ≤ 2048 px | Segmentación y tracking de vegetación |
| Clips de video | 9 | H.264, 720×1280 (vertical), 30 FPS, sin audio, sin metadatos; 3, 5 y 10 s | Árboles y copas en movimiento |
| Videos de presentación | 2 | H.264, 720×1280, sin audio ni metadatos | Demostración privada; no publicar |

Escenas por categoría: helechos y hojas (5), árboles (5) y vegetación compleja (5).
Clips: tres intervalos de los dos videos propios, elegidos tras revisar fotogramas
cada 5 s. Los intervalos no empiezan siempre al inicio del video.

Ausencias declaradas: **no hay fauna ni hongos** en el material entregado; el paquete no
los incluye. No se buscan ni se sustituyen con imágenes de otras especies.

## Estado de permisos

| Permiso | Estado |
| --- | --- |
| Procesamiento externo (Meta Model API) | **No confirmado por el titular.** No enviar. |
| Publicación en repositorio o aplicación | **No concedido.** |
| Uso en demostración privada y presentación interna | Declarado por el titular; alcance a confirmar |

La autorización de procesamiento Hepta de 30-10-2026 no cubre estas fotos. Antes de cualquier
envío a un proveedor externo, el titular debe confirmarlo por escrito.

## Riesgos de evaluación

- Ninguna de las 15 escenas seleccionadas muestra personas. Los videos de origen sí las
  muestran en algunos tramos; el clip de 48 s debe revisarse fotograma a fotograma antes de
  la inferencia y excluirse si aparece una persona.
- Cuatro fotografías del conjunto tienen carteles visibles; dos muestran nombres de árboles
  legibles. No se usan como caso ciego de identificación.
- Tres de las 15 escenas son de parques urbanos y no representan flora nativa. Las demás
  son de bosque o sotobosque cercano a senderos. Ninguna prueba presencia de especies en un
  parque nacional.
- Algunas copas y sotobosques son oclusivos; eso es parte de la prueba, no un defecto.

## Manifiesto de intercambio (privado)

Archivo `sam-handoff/manifest.json` en la carpeta privada, esquema `sam-media-handoff/1`.
Cada entrada incluye: `scene_id`, categoría, tipo, ruta del derivado, SHA-256 del original,
dimensiones normalizadas o `start_seconds`/`duration_seconds`/FPS para clips, roles visuales
observados, riesgos y nota de revisión. Las campañas y resultados de Opus no se escriben
en esa carpeta.

Los derechos de procesamiento y publicación aparecen en el propio manifiesto con
`not_confirmed` y `not_granted`.

## Validación

- Clips verificados con ffprobe: dimensiones 720×1280, sin pista de audio, sin etiquetas
  de ubicación ni de autor.
- Escenas verificadas: sin EXIF ni GPS.
- Las verificaciones se describen en [CONTENT_ENRICHMENT_REPORT.md](CONTENT_ENRICHMENT_REPORT.md).

## Próximos pasos

1. Titular: confirmar por escrito si autoriza el procesamiento externo y para qué uso.
2. Laboratorio SAM: leer el manifiesto privado y solicitar aquí cualquier escena adicional.
3. Recortar o excluir las escenas con personas antes de cualquier inferencia.
