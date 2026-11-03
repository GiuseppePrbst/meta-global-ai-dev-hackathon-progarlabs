# Arquitectura de la biblioteca multimedia

Estado: 02-11-2026. Implementado: contrato `MediaAsset`, catálogo público derivado de
`taxa.json`, dos endpoints y pruebas. Pendiente: medios propios aprobados, variantes en
CDN, persistencia administrativa en PostgreSQL y videos externos con derechos.

## Principios

1. **Solo lo aprobado se sirve.** `publication_status` admite únicamente `public_approved`.
   Cualquier registro privado, candidato o pendiente falla la validación de Pydantic.
2. **Campos cerrados.** `MediaAsset` usa `extra="forbid"`: coordenadas, rutas locales,
   hashes, IDs de archivo ZIP o metadatos EXIF no pueden entrar en la API.
3. **Licencia visible.** Cada medio exige licencia, atribución, fuente y estado de revisión.
   Las licencias NC y ND se rechazan en la validación.
4. **Sin duplicar taxonomía.** Los identificadores de taxón siguen en `taxa.json` y
   `species.json`. La biblioteca solo referencia `taxon_id`.
5. **Dos niveles de almacenamiento, separados del código.**

| Nivel | Contenido | Ubicación | Versionado |
| --- | --- | --- | --- |
| Fuente privada | Originales, EXIF/GPS, miniaturas, clips y manifiestos | Carpeta privada fuera de Git y de los worktrees | No |
| Catálogo público | `MediaAsset` aprobados | `services/api/src/bosque_api/resources/` | Sí |
| Enlaces externos | Registros de `taxa.json` con licencia y autor | Mismo archivo que las fichas | Sí |

## Modelo

`services/api/src/bosque_api/media.py`:

- `MediaAsset`: `asset_id`, `taxon_id` opcional, `media_type` (`image`, `video`),
  `visual_role`, `title`, `alt_text`, `caption`, `source_type` (`external`, `owner`),
  `creator`, `source_url`, `public_url`, `license`, `attribution`, `redistribution`,
  dimensiones, duración y FPS para video, `review_status`, `publication_status` y
  `location_scope` (`undisclosed` por defecto).
- Roles visuales cerrados: `arbol_completo`, `copa`, `tronco`, `corteza`, `rama`, `hoja`,
  `enves`, `flor`, `fruto`, `helecho`, `arbusto`, `sotobosque`, `hongo`, `animal`,
  `habitat`, `paisaje`, `sin_organismo`, `no_evaluado`.
- Un medio externo sin evaluación visual usa `visual_role: no_evaluado`; no se infiere.

## Fuentes del catálogo

- **Externas.** Cada entrada de `media` en `taxa.json` se convierte en un `MediaAsset`
  con identificador `ext-<media_id>`. Hay 45 registros; todos tienen licencia CC0, CC BY,
  CC BY 2.0/4.0 o CC BY-SA. No se copian archivos: se enlazan.
- **Propias y licenciadas.** `resources/media-assets.json` es el único punto de entrada
  para medios aprobados por el titular o con licencia revisada. Está vacío (`[]`) porque
  los derechos de las fotos propias siguen pendientes.

`get_media()` valida IDs únicos y que cada `taxon_id` exista en el catálogo.

## Endpoints

| Método y ruta | Respuesta | Filtros |
| --- | --- | --- |
| `GET /taxa/{taxon_id}/media` | `MediaPage` (`items`, `total`, `limit`, `offset`) | `media_type`, `visual_role`, `limit` (1–100), `offset` |
| `GET /media/{asset_id}` | `MediaAsset` | — |

- Taxón desconocido → 404; medio no aprobado o inexistente → 404.
- No hay parámetro que acepte rutas de archivo ni estados privados; el filtro de
  publicación no existe porque no hace falta.
- `/media` queda fuera de la autenticación del modo demo, igual que `/taxa` y `/parks`.
- Compatibilidad: `GET /taxa`, `GET /taxa/{id}`, `GET /taxa/{id}/conservation` y
  `GET /parks/{park_id}/biodiversity` no cambian. El campo `media` de `Taxon` se conserva.

## Ingesta privada

`evaluations/content_library_ingest.py` procesa un ZIP de fotos y videos:

1. Valida el ZIP (`testzip`), rechaza rutas inseguras (traversal, absolutas, con barra
   invertida, unidades), enlaces simbólicos y extensiones no admitidas.
2. Calcula SHA-256 y descarta duplicados exactos.
3. Lee dimensiones, orientación EXIF, fecha original y GPS **solo** en el manifiesto privado.
4. Genera miniaturas y fotogramas de muestra en la carpeta privada, sin imprimir coordenadas.
5. Con `--sheets`, crea hojas de contacto para la revisión visual.

`evaluations/content_library_prepare.py` crea a partir de las selecciones revisadas:
escenas normalizadas (orientación aplicada, sin EXIF, lado mayor ≤ 2048 px), clips de
3, 5 y 10 s sin audio y sin metadatos, versiones de presentación sin audio y el manifiesto
de intercambio para el laboratorio SAM.

Los scripts no contienen rutas de datos ni resultados; la carpeta privada se indica siempre
con `--root`.

## Pruebas

`services/api/tests/test_media.py` cubre: 45 enlaces externos sin duplicar; catálogo propio
vacío; rechazo de estados privados y de campos extra (coordenadas, rutas); rechazo de NC/ND;
duración obligatoria en video; filtros, paginación y 404; ausencia de rutas locales,
coordenadas y hashes en respuestas; OpenAPI; y las reglas de saneamiento del ZIP
(rutas inseguras, IDs estables).

## Decisiones abiertas

- **Persistencia.** El MVP sigue con JSON versionado. Una tabla PostgreSQL para administración
  sería una migración aditiva e idempotente, no una dependencia; no se justifica todavía.
- **Almacenamiento de objetos.** Ninguno: no hay credenciales ni permisos verificados para
  un bucket. Los binarios no van a PostgreSQL.
- **Variantes optimizadas para la web.** Pendientes hasta que haya medios aprobados; los
  medios externos se sirven desde su origen con atribución.
