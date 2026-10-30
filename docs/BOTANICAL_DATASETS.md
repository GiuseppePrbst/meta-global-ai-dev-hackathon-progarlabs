# Datasets botánicos de las ocho especies — registro verificado, 30-10-2026

Inventario reproducible de fuentes y candidatas para **evaluar** Muse Spark. No es un
dataset de entrenamiento ni un conjunto revisado. **0 imágenes con revisión humana de
ProGarLabs.** Todo número sale de `evaluations/botanical_registry.py` (consulta
`queried_at` en cada archivo):

- [`gbif-colxr-crosswalk.json`](../evaluations/botanical/gbif-colxr-crosswalk.json): taxonomía.
- [`source-inventory.json`](../evaluations/botanical/source-inventory.json): conteos por fuente y especie.
- [`candidate-manifest.json`](../evaluations/botanical/candidate-manifest.json): 277 candidatas,
  esquema `bosque-vivo-botanical-candidates/1`.

## Crosswalk GBIF Backbone → COL XR

Las claves del Backbone histórico de `species.json` se conservan; no se reemplazaron.
COL XR = checklist `7ddf754f-d193-4cc9-b351-99906754a03b`. Sus claves (alfanuméricas)
no son intercambiables con las numéricas del Backbone (`d7dddbf4-…`).

| ID interno | Backbone | COL XR | Nombre aceptado en COL XR | Estado |
| --- | ---: | --- | --- | --- |
| nothofagus-dombeyi | 2874895 | R8FKD | Nothofagus dombeyi (Mirb.) Blume | Nombre exacto; autoría difiere (Backbone «(Mirb.) Oerst.») |
| eucryphia-cordifolia | 3920287 | 3BYLN | Eucryphia cordifolia Cav. | Exacto |
| aextoxicon-punctatum | 4195638 | 65DRF | Aextoxicon punctatum Ruiz & Pav. | Exacto |
| weinmannia-trichosperma | 3613680 | 5BWSY | Weinmannia trichosperma Cav. | **Colisión de sinónimo** |
| laureliopsis-philippiana | 3783047 | 3SMFT | Laureliopsis philippiana (Looser) Schodde | Exacto; *Laurelia philippiana* es sinónimo correcto |
| podocarpus-nubigenus | 5285976 | 4KQ5H | Podocarpus nubigenus Lindl. | Exacto |
| nothofagus-betuloides | 2874949 | V5FNY | Nothofagus betuloides (Mirb.) Blume | **Colisión de sinónimo**; autoría difiere |
| nothofagus-pumilio | 2874907 | 47T2C | Nothofagus pumilio (Poepp. & Endl.) Krasser | Exacto; un sinónimo sin resolver |

Ambigüedades para la revisión taxonómica (no se corrigió el catálogo):

1. *Weinmannia corymbosa* Ruiz & Pav., listado como sinónimo de Tineo, resuelve en COL XR a
   **Caldcluvia paniculata**, otro taxón.
2. *Betula antarctica* G.Forst. (y «ex Willd.»), listado como sinónimo de Coigüe de
   Magallanes, resuelve a **Nothofagus antarctica**, que además es el negativo difícil de Lenga.
3. *Calusparassus pumilio* … ex Decne. solo coincide a nivel de género (`HIGHERRANK`).
4. Negativo *Nothofagus obliqua* es sinónimo en COL XR de **Lophozonia obliqua** (Mirb.)
   Heenan & Smissen. Una evaluación debe usar la clave aceptada.

## Disponibilidad por fuente (taxón COL XR)

GBIF: los conteos de licencia se basan en la licencia **del registro**, no del medio.

| Especie | Ocurrencias | Con imagen | Con imagen en Chile | Con imagen CC BY-NC | Pl@ntNet verificadas con imagen | iNaturalist RG con imagen | Commons (archivos directos) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Coigüe | 2641 | 1642 | 1164 | 958 | 18 | 1136 | 53 |
| Ulmo | 1356 | 927 | 860 | 591 | 13 | 690 | 24 |
| Olivillo | 1893 | 1180 | 1111 | 765 | 1 | 910 | 23 |
| Tineo | 1392 | 1020 | 812 | 578 | 5 | 691 | 12 |
| Tepa | 771 | 487 | 434 | 312 | 6 | 380 | 10 |
| Mañío | 774 | 487 | 411 | 287 | 2 | 313 | 11 |
| Coigüe de Magallanes | 1500 | 1113 | 502 | 479 | 0 | 732 | 12 |
| Lenga | 2502 | 1877 | 828 | 1119 | 8 | 1503 | 59 |

- El dataset Pl@ntNet **automático** (10.15468/mma2ec) devolvió 0 registros con imagen
  para las ocho especies, como se esperaba.
- Los conteos de Commons coinciden con el inventario recibido del usuario. Los de
  identify.plantnet.org que trae ese inventario (p. ej. 264 observaciones / 468 imágenes de
  Coigüe) **no** corresponden al dataset publicado en GBIF (18). No se pudieron conciliar:
  la aplicación incluye observaciones no publicadas o no verificadas.
- iNaturalist aporta la mayoría de las imágenes, pero no se incorpora: dataset CC BY-NC y
  términos que prohíben el entrenamiento comercial de IA.

## Candidatas registradas

Fuentes: los archivos directos de cada categoría Commons, más hasta 15 observaciones
Pl@ntNet verificadas con imagen por especie, todas sus fotos (73 medios: 61 de Chile y
12 de Argentina).

| Especie | Candidatas | `metadata_checked` | Rechazadas (motivo) | Órgano informado por la fuente | Grupos de partición |
| --- | ---: | ---: | --- | --- | ---: |
| Coigüe | 75 | 74 | 1 (sin autor) | hoja 13, fruto 4, corteza 3, flor 1, árbol 1; 53 desconocido | 45 |
| Ulmo | 42 | 41 | 1 (NC) | hoja 10, corteza 3, flor 1, fruto 1, árbol 1; 26 desconocido | 29 |
| Olivillo | 24 | 23 | 1 (sin autor) | hoja 1; 23 desconocido | 12 |
| Tineo | 23 | 23 | 0 | hoja 7, árbol 2, corteza 1, flor 1; 12 desconocido | 11 |
| Tepa | 17 | 17 | 0 | hoja 5, corteza 1, fruto 1; 10 desconocido | 14 |
| Mañío | 13 | 13 | 0 | hoja 2; 11 desconocido | 8 |
| Coigüe de Magallanes | 12 | 11 | 1 (sin autor) | 12 desconocido | 10 |
| Lenga | 71 | 68 | 3 (2 NC, 1 sin autor) | hoja 7, corteza 4, árbol 1; 59 desconocido | 36 |
| **Total** | **277** | **270** | **7** | Pl@ntNet: hoja 45, corteza 12, fruto 6, árbol 5, flor 3, desconocido 2 | 165 |

- Órgano: Pl@ntNet lo declara en el título del medio (`organ_provenance =
  plantnet_media_title:<tag>`). Commons no lo informa y **no** se infiere del nombre de
  archivo: los 204 archivos de Commons quedan `unknown`.
- `metadata_checked` significa licencia compatible, autor, URL y especie de la fuente.
  **No** valida la etiqueta. La pertenencia a una categoría de Commons es una etiqueta
  de plataforma. Por ejemplo, la categoría de Coigüe contiene un archivo titulado como
  atardecer en una laguna (solo se leyó el título, no se revisó la imagen).
- Licencias aceptadas: CC0/PD, CC BY y CC BY-SA (con atribución y share-alike al
  redistribuir). Rechazadas: NC, ND, solo GFDL, ausente o no reconocida. Pl@ntNet: el
  registro es CC BY 4.0, la foto CC BY-SA; se usa la licencia del medio.
- Deduplicación: SHA-1 de Commons (del original), SHA-256 y dHash de 64 bits de la
  miniatura descargada fuera de Git (277/277 con hash). **0 duplicados** exactos o
  perceptuales a distancia de Hamming ≤ 6. El SHA-256 del manifiesto es `null` porque
  falta el del original; `downloaded_sha256` es el de la miniatura.
- Particiones: unión de observación Pl@ntNet, autor+fecha de Commons (posible mismo
  individuo o salida) y duplicados → `individual_group`; split determinista por hash de
  grupo: 149 test / 128 development. Ningún grupo cruza particiones (lo comprueba una prueba).

## Meta 10–15 revisadas por especie

Hay candidatas suficientes en número para todas, pero **ninguna revisada**. La diversidad
de órganos con procedencia es baja en Olivillo (1 hoja), Mañío (2) y Coigüe de Magallanes
(0, sin Pl@ntNet verificadas). Lo siguiente es una revisión humana de ProGarLabs:
confirmar especie y órgano por imagen, descargar el original y calcular su SHA-256, y
documentar el permiso de procesamiento en Meta. Solo entonces una candidata puede
convertirse en `EvaluationCase` ([protocolo](BOTANICAL_EVALUATION.md)).

## Fuentes de referencia sin ingesta de imágenes

Universidad de Concepción, Fundación R.A. Philippi, SIMBIO/MMA y materiales recibidos
(Enersis/Huinay, CORMA, Bosque Laurifolio Valdiviano y presentación de reconocimiento)
sirven para revisar taxonomía y rasgos con cita, no como fuente de fotografías sin permiso.
HerbarioDigital UdeC es CC BY-NC-ND. Chileflora y Corteza quedan pendientes de licencia.
