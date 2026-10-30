# Registro de recursos y licencias

Consulta: 27-10-2026. Registrar una licencia de fuente **no** significa que el dataset haya sido incorporado. Recursos futuros requieren manifiesto por archivo/versión. No se añadió licencia general del código sin decisión de ProGarLabs.

## Recursos del bootstrap

| Nombre / ubicación | Fuente / URL | Fecha y versión | Licencia, atribución y redistribución | Procesamiento | Validación |
| --- | --- | --- | --- | --- | --- |
| Ocho especies candidatas en catálogo/fixtures | Lista proporcionada en el encargo de ProGarLabs; contraste futuro [WFO](https://www.worldfloraonline.org/) / [GBIF](https://www.gbif.org/) | 27-10-2026, bootstrap v1 | `LicenseRef-ProGarLabs-Pending`; publicación del bootstrap autorizada por el encargo, licencia general por decidir. No se copiaron descripciones ni fotos de terceros. | Estructuración y comprobación de formato; no validación taxonómica completa. | Giuseppe propuesto; pendiente validar taxón/ID/versión. |
| Fixture GeoJSON `data/synthetic/observations.geojson` | Creación sintética de desarrollo; sin fuente territorial real | 27-10-2026, bootstrap v1 | `LicenseRef-ProGarLabs-Pending`; no representa observaciones ni mediciones. Su redistribución depende de la licencia que decida ProGarLabs. | Punto `[0,0]` para pruebas de geometría, sin alturas. | Pruebas de software; sin validez científica. |

## Fuentes investigadas; datos no descargados

| Nombre | Fuente / URL | Versión y fecha de consulta | Licencia / atribución / redistribución | Procesamiento aplicado | Responsable / estado |
| --- | --- | --- | --- | --- | --- |
| Meta/WRI Canopy Height Maps v2 | [Registro AWS](https://registry.opendata.aws/dataforgood-fb-forestsv2/) | v2; consulta 27-10-2026; fecha exacta de tile aún no seleccionada | CC BY 4.0 indicada en registro. Citar Meta y WRI, CHMv2, fecha de acceso y atribución de imágenes Vantor según ficha; conservar aviso y cambios aplicados. No extiende derechos a imágenes fuente. | Ninguno; solo contrato y metadatos. | Giuseppe propuesto; licencia de producto consultada, cobertura/tile pendientes. |
| World Flora Online | [Términos](https://www.worldfloraonline.org/termsOfUse) | Sin exportación/versión seleccionada; consulta 27-10-2026 | Licencias por elemento/proveedor; revalidar términos. No copiar fotos/textos por asumir una licencia uniforme. | Ninguno. | Giuseppe propuesto; pendiente registro taxonómico y derechos. |
| GBIF | [Términos](https://www.gbif.org/terms) | Sin dataset/DOI seleccionado; consulta 27-10-2026 | CC0/CC BY/CC BY-NC según dataset. Atribuir publicador/DOI; comprobar imágenes separadamente. No incorporar NC a uso comercial sin resolver permisos. | Ninguno. | Giuseppe propuesto; pendiente recurso exacto. |
| MMA SIMBIO / áreas protegidas | [Puyehue](https://simbio.mma.gob.cl/DPA/VistaImpresionComuna/217) | Sin capa/version seleccionada; consulta 27-10-2026 | Publicación oficial no basta: verificar licencia y atribución del archivo seleccionado antes de redistribuir. | Ninguno; sin geometrías copiadas. | Giuseppe propuesto; licencia y escala pendientes. |
| ESA WorldCover | [Datos y licencia](https://esa-worldcover.org/en/data-access) | 2020 v100 / 2021 v200; consulta 27-10-2026 | CC BY 4.0; atribución ESA WorldCover/consorcio y Copernicus Sentinel según año/producto; indicar modificaciones. | Ninguno. | Giuseppe propuesto; recurso y pertinencia pendientes. |
| OpenStreetMap | [Copyright](https://www.openstreetmap.org/copyright), [tiles](https://operations.osmfoundation.org/policies/tiles/) | Sin extracto versionado; consulta 27-10-2026 | Datos ODbL, atribución visible a colaboradores OSM. Tiles son un servicio distinto con política de uso, caché y prohibición de descargas masivas. | Ninguno en dataset del repositorio. | José para interfaz y Giuseppe para datos; proveedor de producción pendiente. |
| Copernicus / NASA Earthdata | [Copernicus](https://www.copernicus.eu/), [Earthdata](https://www.earthdata.nasa.gov/) | Fuentes candidatas, sin producto seleccionado | Términos específicos sin verificar; no autorizado por este registro. | Ninguno. | Giuseppe propuesto; pendiente. |

## No admitidos

Hepta Insights: **RESTRICTED**, sin autorización para este proyecto. No adquirir, enviar a proveedores, publicar imágenes/LiDAR/coordenadas/derivados/pesos ni utilizar en entrenamiento. Almacenamiento fuera del repositorio y worktrees. Ver [gobernanza](DATA_GOVERNANCE.md).

## Plantilla para una incorporación

```yaml
name: nombre_del_recurso
source: proveedor
url: enlace_directo_a_la_ficha
accessed_at: YYYY-MM-DD
version: version_o_fecha_del_producto
license: identificador_y_url
attribution: texto_exigido
redistribution: condiciones_comprobadas
classification: PUBLIC_VERIFIED
processing: transformaciones_o_ninguno
validator: persona_responsable
validation_status: pending
```

Completar valores reales, checksum y límites espaciales/temporales antes de usar; la plantilla no es un dataset autorizado.

## Incorporaciones GIS/ML, 27-10-2026

| Recurso | Procedencia, licencia y procesamiento | Validación y límites |
| --- | --- | --- |
| data/public/taxonomy-gbif-2026-10-27.json y campos taxonomy del catálogo | GBIF Secretariat, Backbone Taxonomy, DOI 10.15468/39omei; API v1, snapshot 2026-10-27; CC BY 4.0; redistribución con atribución y aviso de cambios. Consultas match exact y synonyms, sin fotos ni ocurrencias. | Contraste automatizado fuente_checked; Giuseppe responsable de revisión humana pendiente. Ocho nombres aceptados; rasgos, nombres comunes, natividad y conservación pendientes. Hash en reporte y test. |
| data/public/chmv2-window-2026-10-27.json | CHMv2 v2 ml3 Meta/WRI, mirror Taylor Geospatial / Source Cooperative; CC BY 4.0. Atribución Meta/WRI/Vantor del registro AWS y repackaging Taylor Geospatial; citas Tolan 2024 y Brandt 2026 en SOURCES. Estadísticas de ventana 64x64, sin imágenes fuente. | CRS, codificación, escala y nodata observados; periodo del tile y exactitud local pendientes. Ventana GeoTIFF fuera de Git; hash y transformación en evidencia. No hay crecimiento anual. |
| Raster sintético temporal de tests | Generado con valores explícitos por el código del proyecto, fixture-1, 2026-10-27, LicenseRef-ProGarLabs-Pending. No se redistribuye archivo GeoTIFF. | Transformación, nodata y estadísticas de software; no mediciones reales. |
| Dibujo de prueba Meta | Generado en memoria por el agente durante la sesión autorizada, 128x128, sin material de terceros; LicenseRef-ProGarLabs-Pending. Solo hash y resultados sanitizados publicados. | Una prueba negativa sintética; no dataset científico. |

La consulta de fuentes no equivale a revisión botánica humana. No se otorga nueva licencia
a fotografías privadas; autorización local del usuario registrada en la sesión, sin publicación
ni envío a terceros. No se incorporó ningún contenido Hepta al repositorio.

## Fuentes reales de contexto, 27-10-2026

| Recurso | Fuente/versión y procesamiento | Derechos / validación |
| --- | --- | --- |
| cbn_10reg_2018 MINAGRI | Catálogo oficial, CONAF productor, IDE MINAGRI/CIREN distribuidor. RAR HTTP 200 de 944670461 bytes; bloqueado a 256 MiB, no descargado. | PRJ/DBF/CPG y derechos de redistribución del fichero no comprobados; no etiquetar validated. |
| Catastro Los Lagos CIREN REST/13 | Mismo linaje CONAF 2018, no otra validación independiente. Tres features oficiales completos del AOI 500×500 m, output WGS84, fuente 3857, recorte/QA en 32718. | Metadato legal exige citar CONAF; local reference, redistribution_pending. Geometría del piloto comprobada; taxonomía parcial y validación humana pendiente. No publicar polígonos/archivos crudos aquí. |
| BCN Snaspe.zip | Biblioteca del Congreso Nacional, compilación oficial de edición por registro no verificada. 137 registros, PRJ 3857, CPG UTF-8, piloto de un polígono; ocho geometrías inválidas fuera del piloto sin reparar. | Términos propios de libre uso con atribución BCN; referencial, no geodésico ni garantía legal actual. No se asigna licencia CC uniforme. |
| CHMv2 acq_dates/tiles Parquet | Meta/WRI, repackaging Taylor Geospatial, consulta 27-10-2026, unión por quadkey de 213109 filas cada uno. | CC BY 4.0; atribución Meta/WRI/Vantor y Taylor Geospatial. Intervalo del tile 2013-09-16/2018-09-15, no captura de cada píxel. |

Archivos y hashes de todos los componentes, campos, perfiles y discrepancias en
[data/public/forest-context-qa-2026-10-27.json](../data/public/forest-context-qa-2026-10-27.json)
y [evidencia CHMv2 nueva](../data/public/chmv2-weighted-2026-10-27.json). Datos binarios,
recortes y dominios completos permanecen fuera del checkout; responsable de revisión
Giuseppe. Fecha de acceso no cambia la edición de catastro a 2026. No se otorgan permisos
de entrenamiento/publicación sobre libros, fotos privadas ni recursos no comprobados.
