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

Hepta Insights: **RESTRICTED**, sin licencia pública. La autorización específica del
30-10-2026 al final de este registro permite fotos/videos seleccionados en Meta para
esta misión. Otros usos siguen excluidos; no publicar imágenes/LiDAR/coordenadas/
derivados/pesos ni entrenar durante esta misión. Fuera del repositorio y worktrees.
Ver [gobernanza](DATA_GOVERNANCE.md).

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
# Evidencia de integración, 29-10-2026

Se reutilizaron los recortes/manifiestos autorizados del 27-10 fuera de Git. Ingesta real
no cambia sus derechos: CONAF/CIREN redistribución pendiente y BCN bajo sus condiciones
referenciales/atribución, sin inventar licencia CC. No se publica fuente vectorial/raster.
El nuevo recibo contiene hashes/conteos/estadísticas; el dibujo sintético de smoke no es
dataset botánico y sus fotos/máscaras no se incorporan al repositorio.

# Referencias morfológicas de Expediciones, 29-10-2026

Solo se incorporan resúmenes propios muy breves de hechos morfológicos en
`services/api/src/bosque_api/resources/species.json`, sin imágenes ni copias de descripciones.
Clasificación: referencia factual contrastada, no observación. No se concede licencia a las
páginas/fotografías originales: la disponibilidad pública no autoriza redistribuirlas.
Fuentes de terceros preexistentes, sin descarga de archivos; conservación/natividad no se
completan con estas consultas. Responsable de revisión humana pendiente: Giuseppe Proboste.
Procesamiento: lectura y síntesis factual; `trait_validation_status: source_checked`,
fecha de acceso 2026-10-29. Los resúmenes no prueban presencia ni identifican ejemplares.

| Taxón | Fuente directa / edición de página cuando consta | Atribución y límites |
| --- | --- | --- |
| Nothofagus dombeyi | [Flora y Fauna UdeC](https://florayfauna.udec.cl/nothofagus-dombeyi-mirb-oerst/), web sin edición declarada | Universidad de Concepción, Wilson González; hechos resumidos, sin fotos/texto extenso |
| Nothofagus pumilio | [SIB/APN](https://sib.gob.ar/especies/nothofagus-pumilio), web; referencia Gut 2017 | Administración de Parques Nacionales Argentina; hechos resumidos, no se reutilizan ocurrencias ni cartografía |
| Eucryphia cordifolia | [Fundación R.A. Philippi](https://fundacionphilippi.cl/catalogo/eucryphia-cordifolia/), 20-04-2018 | Fundación R.A. Philippi, todos los derechos reservados de la página; solo hechos resumidos propios |
| Aextoxicon punctatum | [Fundación R.A. Philippi](https://fundacionphilippi.cl/catalogo/aextoxicon-punctatum/), 13-06-2017 | Misma política, sin fotos ni textos extensos |
| Weinmannia trichosperma | [Fundación R.A. Philippi](https://fundacionphilippi.cl/catalogo/weinmannia-trichosperma/), 09-05-2018 | Misma política, sin fotos ni textos extensos |
| Laureliopsis philippiana | [Fundación R.A. Philippi](https://fundacionphilippi.cl/catalogo/laureliopsis-philippiana/), 30-11-2017 | Misma política, sin fotos ni textos extensos |
| Podocarpus nubigenus | [Fundación R.A. Philippi](https://fundacionphilippi.cl/catalogo/podocarpus-nubigenus/), 30-10-2014 | Misma política, sin fotos ni textos extensos |
| Nothofagus betuloides | [Fundación R.A. Philippi](https://fundacionphilippi.cl/catalogo/nothofagus-betuloides/), 28-06-2016 | Misma política, sin fotos ni textos extensos |

Ejemplos en `evaluations/expeditions-contract-examples.json`: SYNTHETIC, creados durante esta
misión, `LicenseRef-ProGarLabs-Pending`; sin datos de campo ni material de terceros.
Punto [0,0], propietario/UUID y tiempos son ficticios. Los modelos son dependencias de Meta,
no entrenados aquí. Hepta y sus derivados siguen excluidos, sin nueva autorización.

## Fotos/videos restringidos — autorización de sesión, 30-10-2026

Fuente: Hepta vía Microsoft Fabric/OneLake y ZIP proporcionado por el usuario;
versión de adquisición 2026-10-30, no fecha inferida de captura. Derechos: permiso
específico de procesamiento privado comunicado por el usuario, sin licencia pública,
redistribución ni entrenamiento. No se incorpora ningún medio al repositorio.
Procesamiento: lectura acotada de metadatos, descarga seleccionada, deduplicación,
FFmpeg, inferencia Meta Standard y renderizado privado. Responsable de revisión:
Giuseppe Proboste; anotación humana y calidad botánica pendientes.

Se obtuvieron 12 candidatas positivas y 6 controles únicos, más una copia repetida;
las etiquetas operativas no son ground truth. Video original, transformaciones,
atribución detallada, permisos, URLs, fechas, hashes y derivados constan únicamente en
manifiestos privados. La excepción actualiza las prohibiciones históricas de transferencia
para esta misión, no para otros recursos. Las fixtures nuevas son dibujos/raster/bytes
SYNTHETIC generados por tests, sin reproducir datos Hepta ni observaciones reales.

## Registro botánico de candidatas — 30-10-2026

```yaml
name: bosque-vivo-botanical-candidates/1
source: GBIF (Pl@ntNet verificadas, COL XR) y Wikimedia Commons (categorías por especie)
url: evaluations/botanical/candidate-manifest.json
accessed_at: 2026-10-30
version: consulta registrada en queried_at de cada archivo
license: por medio; ver campo license y record_license de cada registro
attribution: campo attribution por registro (autor, archivo/observación, plataforma)
redistribution: solo metadatos y enlaces; no se redistribuyen imágenes
classification: PUBLIC_VERIFIED (metadatos); imágenes no incorporadas
processing: miniaturas fuera de Git para SHA-256 y dHash; sin entrenamiento ni envío a Meta
validator: Giuseppe Proboste (revisión humana pendiente)
validation_status: pending
```

Reglas aplicadas: la licencia del registro no se extiende al medio (Pl@ntNet: registro
CC BY 4.0, foto CC BY-SA). NC, ND, solo-GFDL, licencia ausente o no reconocida → `rejected`.
iNaturalist no se incorpora (dataset CC BY-NC y términos que prohíben entrenamiento
comercial de IA). HerbarioDigital UdeC (CC BY-NC-ND), Chileflora y Corteza quedan como
referencia sin ingesta de imágenes. Consulta, descarga, procesamiento externo, evaluación,
entrenamiento y redistribución son autorizaciones distintas. Este registro solo cubre
consulta de metadatos y hashing local de miniaturas. Detalle en
[BOTANICAL_DATASETS.md](BOTANICAL_DATASETS.md).

## Campaña de validación Meta — 30-10-2026

```yaml
name: CanopyRS/Detectree2 (4 teselas test)
source: Hugging Face datasets-server; original Zenodo 10.5281/zenodo.8136161 v2
url: https://huggingface.co/datasets/CanopyRS/Detectree2
accessed_at: 2026-10-30
version: revisión HF cda2ad37660f422dc5837f697ad4ee41c49441ce
license: CC-BY-4.0 (verificada en tarjeta HF y registro Zenodo)
attribution: Ball, Jackson, Hickman & Koay (2023), Crown Data for "Accurate delineation of individual tree crowns in tropical forests from aerial RGB imagery using Mask R-CNN"
redistribution: solo métricas y nombres de tesela; teselas fuera de Git
classification: PUBLIC_VERIFIED
processing: PNG RGB local, envío a Meta SAM 3.1 Standard, decodificación RLE COCO
validator: Giuseppe Proboste
validation_status: pending
```

Las fotos botánicas de la campaña (Pl@ntNet CC BY-SA y Commons CC BY/BY-SA/CC0 por
archivo) se enviaron a Meta Standard para evaluar, sin entrenamiento ni redistribución.
Las copias quedan fuera de Git con su atribución en el manifiesto local.

## Fuentes del piloto Puyehue y RCE — consulta 31-10-2026

| Nombre | Fuente / URL | Versión y fecha | Licencia / redistribución | Procesamiento | Responsable / estado |
| --- | --- | --- | --- | --- | --- |
| Nómina RCE (MMA) | [XLSX oficial](https://clasificacionespecies.mma.gob.cl/wp-content/uploads/2026/10/NominaDeEspecies_SegunEstadoConservacion-Chile_actualizado_20mProcesoRCE_20octubre2026.xlsx) | Archivo «20octubre2026»; `Ayuda!A1` dice «marzo 2026». SHA-256 `1a1dadbaf554a53f39143c40a898fc252bc2e3354734b202fb31deba4fbe607d` | Sin condiciones publicadas; **no redistribuir** el archivo ni filas completas | Lectura local de conteos y de las filas citadas en [RCE_CONSERVATION_2026.md](RCE_CONSERVATION_2026.md) | Giuseppe propuesto; importación pendiente (P1) |
| Ficha CONAF Puyehue | [conaf.cl](https://www.conaf.cl/parque_nacionales/parque-nacional-puyehue/) | Consulta 31-10-2026 | Texto oficial; se citan hechos, no se copia la ficha | Ninguno | Fuente de presencia a escala de parque (tipo 1) |
| SIMBIO, área protegida 971 | [SIMBIO](https://simbio.mma.gob.cl/CbaAP/Details/971) | Consulta 31-10-2026; superficie de 1994, plan de 2008 | KMZ/SHP «referencial» sin licencia verificada; no descargado | Ninguno | Pendiente |
| Comunicado SBAP | [Traspaso marzo 2027](https://sbap.gob.cl/sala-de-prensa/noticias-y-comunicados/detalle/2026/06/16/traspaso-del-programa-de-%C3%A1reas-silvestres-de-conaf-al-servicio-se-realizar%C3%A1-a-partir-de-marzo-de-2027) | 16-06-2026 | Cita de hechos | Ninguno | Contexto institucional |
| mycoBaseCL | [Preprint v1](https://doi.org/10.32942/X20T2N); [datos](https://doi.org/10.5281/zenodo.22388379) | v1.0, 21-09-2026; sin revisión por pares | Preprint CC BY 4.0; licencia del dataset de Zenodo **no verificada** | Ninguno | Referencia taxonómica candidata; no prueba presencia |

## Campaña multirreino — 31-10-2026

| Fuente | Uso | Licencia aplicada | Redistribución en Git | Notas |
| --- | --- | --- | --- | --- |
| iNaturalist research-grade vía GBIF (`50c9509d-…`) | Fotos de flora, fauna y hongos para evaluación con Meta | **Licencia del medio**, no la del registro: se aceptan CC0, CC BY y CC BY-SA; se rechazan NC, ND y medios sin licencia | Solo metadatos (ID, URL, autor, licencia) | Muchos registros CC BY tienen la foto en CC BY-NC: se rechazan (`record_cc_but_media_restricted` en `evaluations/biodiversity/media-availability.json`) |
| Pl@ntNet verificado vía GBIF (10.15468/gtebaa) | Flora | Licencia por medio, normalmente CC BY-SA | Solo metadatos | El conjunto automático (10.15468/mma2ec) no se usa como verdad de terreno |
| Wikimedia Commons | Flora, fauna, hongos y paisajes de Puyehue sin organismo | `LicenseShortName` por archivo | Solo metadatos | La categoría no prueba el taxón: se combina con inspección del agente |
| Nómina RCE (MMA), SHA-256 `1a1dadba…607d` | `resources/conservation.json` (11 taxones) | Sin licencia publicada | Solo hechos seleccionados con atribución; el XLSX queda fuera de Git | Reimportación idempotente con `evaluations/rce_import.py` |
| BCN SNASPE (`Snaspe.zip`, SHA-256 `f3fa0c6f…9d64`) | Polígono referencial para contar registros GBIF en Puyehue | «Libre uso con atribución» (BCN) | No: geometría privada y simplificada | La tabla de atributos asigna el parque solo a Los Ríos, aunque abarca dos regiones |
| es.wikipedia | Rasgos secundarios de fichas y comparadores | CC BY-SA 4.0 | Paráfrasis breve con enlace | Fuente secundaria; muchas frases no tienen cita |
| ROC, Atlas de las Aves Nidificantes de Chile | Ficha del carpintero negro | Derechos del editor | Paráfrasis breve con enlace | Sin reproducción de texto |

eBird y Macaulay Library no se usaron como fuente de medios porque sus licencias no permiten
reutilizarlos en volumen. Las fotos de la campaña se guardan solo en
`D:/data/bosque-vivo/biodiversity-originals`, fuera de Git. Ninguna se publica ni se usa
para entrenar.
