# Registro de recursos y licencias

Consulta: 27-10-2026. Registrar una licencia de fuente **no** significa que el dataset haya sido incorporado. Recursos futuros requieren manifiesto por archivo/versión. No se añadió licencia general del código sin decisión de ProGarLabs.

## Recursos del bootstrap

| Nombre / ubicación | Fuente / URL | Fecha y versión | Licencia, atribución y redistribución | Procesamiento | Validación |
| --- | --- | --- | --- | --- | --- |
| Ocho especies candidatas en catálogo/fixtures | Lista proporcionada en el encargo de ProGarLabs; contraste futuro [WFO](https://www.worldfloraonline.org/) / [GBIF](https://www.gbif.org/) | 27-10-2026, bootstrap v1 | `LicenseRef-ProGarLabs-Pending`; publicación del bootstrap autorizada por el encargo, licencia general por decidir. No se copiaron descripciones ni fotos de terceros. | Estructuración y comprobación de formato; no validación taxonómica completa. | Giuseppe propuesto; pendiente validar taxón/ID/versión. |
| Fixture GeoJSON `data/synthetic/observations.geojson` | Creación sintética de desarrollo; sin fuente territorial real | 27-10-2026, bootstrap v1 | `LicenseRef-ProGarLabs-Pending`; no representa observaciones ni mediciones. Su redistribución depende de la licencia que decida ProGarLabs. | Punto `[0,0]` para pruebas de geometría, sin alturas. | Pruebas de software; sin validez científica. |

## Fotos de referencia de la ficha (app móvil)

Una foto por especie en `apps/mobile/assets/images/reference/` (registro en `apps/mobile/src/features/catalog/reference-photos.ts`), descarga 28-10-2026. **Copias locales solo para desarrollo**, autorizadas por José el 28-10-2026 como excepción a «no copiar fotografía de terceros» de DATA_GOVERNANCE.md: cargar desde Wikimedia fallaba en Android (403 por su política de agente de usuario) y las fotos vendrán del backend. Son la miniatura de 960 px sin editar (el original de *Podocarpus*, de 615 px, tal cual); la app muestra autor, licencia, «Wikimedia Commons» y enlace junto a cada una, y `ATTRIBUTION.md` en la misma carpeta repite la atribución. Ninguna fue tomada en Puyehue y así se rotula; no prueban presencia de la especie en el área. Se excluyeron licencias NC. La ilustración conceptual sigue siendo la vista por defecto.

| Especie | Archivo en Commons | Autor | Licencia |
| --- | --- | --- | --- |
| *Nothofagus dombeyi* | [Nothofagus dombeyi - Warren Bohmwald - 458885887.jpeg](https://commons.wikimedia.org/wiki/File:Nothofagus_dombeyi_-_Warren_Bohmwald_-_458885887.jpeg) | Warren Bohmwald (vía iNaturalist) | CC0 |
| *Eucryphia cordifolia* | [Hojas y brote de ulmo.jpg](https://commons.wikimedia.org/wiki/File:Hojas_y_brote_de_ulmo.jpg) | Lin linao | CC BY-SA 4.0 |
| *Aextoxicon punctatum* | [Aextoxicon punctatum - Palmengarten Frankfurt - DSC01934.JPG](https://commons.wikimedia.org/wiki/File:Aextoxicon_punctatum_-_Palmengarten_Frankfurt_-_DSC01934.JPG) | Daderot | CC0 |
| *Weinmannia trichosperma* | [Weinmannia trichosperma kz02.jpg](https://commons.wikimedia.org/wiki/File:Weinmannia_trichosperma_kz02.jpg) | Krzysztof Ziarnek, Kenraiz | CC BY-SA 4.0 |
| *Laureliopsis philippiana* | [Laureliopsis philippiana, Valdivia, Los Ríos, Chile 62188473.jpg](https://commons.wikimedia.org/wiki/File:Laureliopsis_philippiana,_Valdivia,_Los_R%C3%ADos,_Chile_62188473.jpg) | Cristian Riquelme (vía iNaturalist) | CC BY 4.0 |
| *Podocarpus nubigenus* | [Podocarpus nubigena-hojas.JPG](https://commons.wikimedia.org/wiki/File:Podocarpus_nubigena-hojas.JPG) | Lin linao | CC BY-SA 3.0 |
| *Nothofagus betuloides* | [Nothofagus betuloides kz02.jpg](https://commons.wikimedia.org/wiki/File:Nothofagus_betuloides_kz02.jpg) | Krzysztof Ziarnek, Kenraiz | CC BY 4.0 |
| *Nothofagus pumilio* | [Nothofagus pumilio, leaves.jpg](https://commons.wikimedia.org/wiki/File:Nothofagus_pumilio,_leaves.jpg) | Mlwiki | CC BY-SA 4.0 |

Pendiente (Giuseppe propuesto): confirmar la identificación de cada foto, reemplazar estas copias por las fotos del backend y borrarlas del repositorio; mientras estén, conservar la atribución y la licencia CC BY-SA de las obras que la tienen.

## Fuentes investigadas; datos no descargados

| Nombre | Fuente / URL | Versión y fecha de consulta | Licencia / atribución / redistribución | Procesamiento aplicado | Responsable / estado |
| --- | --- | --- | --- | --- | --- |
| Meta/WRI Canopy Height Maps v2 | [Registro AWS](https://registry.opendata.aws/dataforgood-fb-forestsv2/) | v2; consulta 27-10-2026; fecha exacta de tile aún no seleccionada | CC BY 4.0 indicada en registro. Citar Meta y WRI, CHMv2, fecha de acceso y atribución de imágenes Vantor según ficha; conservar aviso y cambios aplicados. No extiende derechos a imágenes fuente. | Ninguno; solo contrato y metadatos. | Giuseppe propuesto; licencia de producto consultada, cobertura/tile pendientes. |
| World Flora Online | [Términos](https://www.worldfloraonline.org/termsOfUse) | Sin exportación/versión seleccionada; consulta 27-10-2026 | Licencias por elemento/proveedor; revalidar términos. No copiar fotos/textos por asumir una licencia uniforme. | Ninguno. | Giuseppe propuesto; pendiente registro taxonómico y derechos. |
| GBIF | [Términos](https://www.gbif.org/terms) | Sin dataset/DOI seleccionado; consulta 27-10-2026 | CC0/CC BY/CC BY-NC según dataset. Atribuir publicador/DOI; comprobar imágenes separadamente. No incorporar NC a uso comercial sin resolver permisos. | Ninguno. | Giuseppe propuesto; pendiente recurso exacto. |
| MMA SIMBIO / áreas protegidas | [Puyehue](https://simbio.mma.gob.cl/DPA/VistaImpresionComuna/217) | Sin capa/version seleccionada; consulta 27-10-2026 | Publicación oficial no basta: verificar licencia y atribución del archivo seleccionado antes de redistribuir. | Ninguno; sin geometrías copiadas. | Giuseppe propuesto; licencia y escala pendientes. |
| ESA WorldCover | [Datos y licencia](https://esa-worldcover.org/en/data-access) | 2020 v100 / 2021 v200; consulta 27-10-2026 | CC BY 4.0; atribución ESA WorldCover/consorcio y Copernicus Sentinel según año/producto; indicar modificaciones. | Ninguno. | Giuseppe propuesto; recurso y pertinencia pendientes. |
| OpenStreetMap | [Copyright](https://www.openstreetmap.org/copyright), [tiles](https://operations.osmfoundation.org/policies/tiles/) | Sin extracto versionado; consulta 27-10-2026 | Datos ODbL, atribución visible a colaboradores OSM. Tiles son un servicio distinto con política de uso, caché y prohibición de descargas masivas. | Ninguno en dataset del repositorio. Web y Atlas móvil (demo) consumen el servicio estándar de teselas con atribución visible. | José para interfaz y Giuseppe para datos; proveedor de producción pendiente. |
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
