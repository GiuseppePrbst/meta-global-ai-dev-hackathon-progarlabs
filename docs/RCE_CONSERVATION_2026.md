# Nómina RCE 2026 — estado de conservación oficial

Investigación documental del 31-10-2026 para el siguiente incremento técnico. **No se
importó nada:** sin migración, sin cambios en el catálogo, sin copiar el XLSX al
repositorio. Las cifras salen de la lectura del archivo oficial con `openpyxl`, en un entorno
temporal fuera del repositorio.

## Fuente oficial

| Campo | Valor |
| --- | --- |
| Emisor | Ministerio del Medio Ambiente de Chile, [portal de clasificación de especies](https://clasificacionespecies.mma.gob.cl/) |
| Archivo | `NominaDeEspecies_SegunEstadoConservacion-Chile_actualizado_20mProcesoRCE_20octubre2026.xlsx` |
| Descarga | [URL oficial](https://clasificacionespecies.mma.gob.cl/wp-content/uploads/2026/10/NominaDeEspecies_SegunEstadoConservacion-Chile_actualizado_20mProcesoRCE_20octubre2026.xlsx), HTTP 200, 523.209 bytes, descargado el 31-10-2026 |
| SHA-256 | `1a1dadbaf554a53f39143c40a898fc252bc2e3354734b202fb31deba4fbe607d`, igual al hash del archivo aportado en el encargo |
| Almacenamiento | Copia local fuera de Git; ruta privada no versionada |
| Condiciones de uso | El portal **no publica** licencia ni condiciones de redistribución. Hasta resolverlo, el XLSX y sus filas completas no se redistribuyen |

## Versionado y discrepancias

Se registran sin corregirlas:

| Fuente | Dice |
| --- | --- |
| Nombre del archivo | «actualizado … 20 octubre 2026» |
| Portal (sección de la nómina) | Cubre del 1.º al 20.º proceso, «actualizado a octubre de 2026» |
| Celda `Ayuda!A1` | `ACTUALIZADO marzo 2026 (incluye hasta 20mo Proceso)` |
| Portal (lista de procesos) | «20º Proceso (2023)» con etiqueta **Finalizado** |
| [DS 54/2025 MMA](https://clasificacionespecies.mma.gob.cl/wp-content/uploads/2026/03/DS_54_2025_MMA_oficializa_20_RCE-DO_5_3_2026.pdf) | Oficializa el 20.º proceso. El nombre del PDF indica publicación en el Diario Oficial el 05-03-2026 |

Interpretación prudente: «marzo 2026» coincide con la publicación del DS 54/2025, y «octubre
2026» con la fecha de carga del archivo. El año «2023» del portal parece referirse al inicio
del proceso. La coherencia exacta no está confirmada; queda abierta hasta contrastarla con la
página del 20.º proceso y con el Diario Oficial.

## Estructura

Tres hojas: `Ayuda`, `Especies` y `Estadísticas`. `Especies` tiene 1.615 filas de datos y las
columnas:

- nombre científico, nombre común y sinonimia («incompleta», según el encabezado);
- reino, phylum o división, clase, orden y familia;
- endemismo;
- texto de distribución regional y una columna 0/1 **por región** (de Arica y Parinacota a
  Magallanes, más Antártica e islas oceánicas);
- categoría vigente, fuente, criterio, n.º de proceso y decreto o referencia;
- dos categorías anteriores con su fuente;
- tipo (vertebrado, invertebrado, planta u hongo);
- ID del Inventario Nacional.

## Estadísticas por reino

| Reino | Filas en `Especies` | Contadas en `Estadísticas` |
| --- | ---: | ---: |
| Animalia | 775 | 753 |
| Plantae | 701 | 698 |
| Fungi | 139 | 138 |
| **Total** | **1.615** | **1.589** |

- 1.589 filas tienen `RCE` como fuente de la categoría vigente y 26 no la tienen. Esas 26
  registran situaciones como «taxón sin registros de presencia en Chile» (11), «presencia
  accidental» (7) o un nombre no válido.
- La hoja `Estadísticas` cuenta las 1.589 y, cuando una especie tiene distintas categorías
  por zona, la asigna a la de mayor amenaza (metodología declarada en la hoja). Por eso sus
  conteos **no** sirven para ubicar una especie en una región.
- Categorías vigentes simples en `Especies`: EN 322, LC 313, VU 312, CR 199, NT 169, DD 85,
  EX 18 y EW 1. Las 196 filas restantes tienen texto compuesto o no categorizado.
- La hoja `Estadísticas` informa 66 especies con «más de una categoría en Chile». Una
  detección simple de filas con «;» en la categoría encuentra 80 (44 Plantae, 29 Animalia,
  7 Fungi). La diferencia no está conciliada.

**Interpretación obligatoria:**

- Las 1.615 filas no son una lista de especies amenazadas: incluyen LC, DD y otras
  situaciones.
- Tampoco son un inventario de la biodiversidad de Chile.
- El 20.º proceso no clasificó las 1.615: el libro compila los procesos 1 a 20 (hasta 117
  especies en un proceso).

## RCE frente a UICN y otras protecciones

- El **RCE** es la clasificación oficial chilena (Reglamento de Clasificación de Especies,
  art. 37 de la Ley 19.300), oficializada por decreto supremo y con alcance territorial
  propio.
- La **Lista Roja de la UICN** es una evaluación internacional independiente. Puede diferir
  en categoría, fecha y ámbito, y no se mezclan.
- El estado de conservación tampoco equivale a otras protecciones legales: la Ley de Caza
  (columna de fuentes anteriores), las prohibiciones de extracción del parque o los permisos
  de acceso. Cada una se modela por separado.

## Categorías

| Código | Significado |
| --- | --- |
| EX | Extinta |
| EW | Extinta en estado silvestre |
| CR | En peligro crítico |
| EN | En peligro |
| VU | Vulnerable |
| NT | Casi amenazada |
| LC | Preocupación menor |
| DD | Datos insuficientes |
| R | Rara (categoría histórica) |

Las columnas de categorías anteriores usan además fuentes históricas: Boletín 47 MNHN, Ley
de Caza, Libros Rojos, Núñez et al. 1997 y Yáñez et al. 1997.

## Decretos

Cada fila conserva el decreto de su categoría vigente. Ejemplos verificados en el libro:

- DS 42/2011 MMA: proceso 7
- DS 38/2015 MMA: proceso 11
- DS 79/2018 MMA: proceso 14
- DS 23/2019 MMA: proceso 15
- DS 16/2020 MMA: proceso 16
- DS 54/2025 MMA: proceso 20

## Ámbito territorial

Hay categorías que **dependen de la región**, y el texto de la celda define el ámbito. Con
ubicación desconocida no se elige una categoría única: se muestran todas con su ámbito.

El Parque Nacional Puyehue abarca las regiones de **Los Lagos (X)** y **Los Ríos (XIV)**
([piloto](PILOT_PUYEHUE.md#discrepancias-registradas)). Para una especie con categorías
regionales, la del parque puede diferir según el lado del límite regional. La región se
determina por intersección de la geometría con límites regionales oficiales, nunca por
suposición.

La columna 0/1 por región indica **distribución regional** según la nómina, no presencia en
el parque ni en una coordenada.

### Caso olivillo — *Aextoxicon punctatum*

| Campo | Libro |
| --- | --- |
| Categoría | `VU (XV-V-RM ); LC (VI-XII)` |
| Criterio | VU B1ab(iii)+2ab(iii) desde las regiones de Valparaíso y Metropolitana al norte; «--» desde O'Higgins al sur |
| Fuente / proceso / decreto | RCE / 14 / DS 79/2018 MMA |
| Distribución (texto) | IV-X; Los Lagos = 1 |

La [ficha del 14.º proceso](https://clasificacionespecies.mma.gob.cl/procesos-de-clasificacion/14o-proceso-de-clasificacion-de-especies-2017-2018/listado-de-especies-y-fichas-finales-14o-proceso-rce/)
confirma el mismo criterio: VU al norte de Valparaíso y la RM, LC desde O'Higgins al sur.

- **Los Lagos y Los Ríos:** LC.
- **Ámbito norte:** VU.
- **Ubicación desconocida:** mostrar ambas con su ámbito.

### Caso güiña — *Leopardus guigna*

`VU (XV-XIV); NT (X-XII)`, criterio `VU A2c; C2a(i) (XIV al norte); - (X al sur)`, proceso 7,
DS 42/2011 MMA. **Los Ríos (XIV) queda en el tramo VU y Los Lagos (X) en el tramo NT.** En
Puyehue, la categoría aplicable depende de la región del registro. Es el caso de prueba más
importante del piloto.

## Coincidencia con el catálogo arbóreo

Comparación exacta del nombre científico, más una búsqueda del epíteto en la columna de
sinonimia:

| Especie | Resultado |
| --- | --- |
| *Aextoxicon punctatum* | Presente (caso olivillo) |
| *Nothofagus dombeyi*, *N. betuloides*, *N. pumilio* | Sin coincidencia. El libro contiene otras *Nothofagus* (*N. alessandrii*, *N. glauca*, *N. macrocarpa*) |
| *Eucryphia cordifolia* | Sin coincidencia (sí está *E. glutinosa*) |
| *Weinmannia trichosperma*, *Laureliopsis philippiana*, *Podocarpus nubigenus* | Sin coincidencia ni en sinonimia |

**La ausencia de coincidencia no significa LC, DD, ausencia de amenaza ni ausencia de
protección.** El campo queda como «sin clasificación RCE encontrada en la nómina
(versión, hash)».

## Ejemplos de fauna y hongos

| Especie | Reino | Categoría (texto) | Proceso / decreto | Columna Los Lagos |
| --- | --- | --- | --- | --- |
| *Dromiciops gliroides* | Animalia | NT | 7 / DS 42/2011 | 1 |
| *Campephilus magellanicus* | Animalia | NT | 16 / DS 16/2020 | 1 |
| *Leopardus guigna* | Animalia | VU (XV-XIV); NT (X-XII) | 7 / DS 42/2011 | 1 |
| *Puma concolor* | Animalia | NT | 7 / DS 42/2011 | 1 |
| *Enicognathus leptorhynchus* | Animalia | LC | 14 / DS 79/2018 | 1 |
| *Pteroptochos tarnii* | Animalia | LC | 14 / DS 79/2018 | 1 |
| *Cyttaria hariotii* | Fungi | LC | 20 / DS 54/2025 | 1 |
| *Boletus chilensis* | Fungi | EN, criterio B1ab(iii)+2ab(iii) | 15 / DS 23/2019 | 1 |
| *Amanita gayana* | Fungi | NT | 11 / DS 38/2015 | 1 |

En el libro hay 372 filas con la columna Los Lagos = 1: Animalia 219, Plantae 83, Fungi 70.
Es distribución regional, no una lista del parque.

## Reglas de reconciliación

1. **Nombre.** Coincidencia exacta del nombre aceptado en el backbone del catálogo (GBIF o
   COL XR, ver [BOTANICAL_DATASETS.md](BOTANICAL_DATASETS.md)) con el nombre RCE.
2. **Sinonimia.** Una coincidencia por la columna de sinonimia del RCE solo produce
   `needs_review`; no se acepta automáticamente.
3. **Sinónimos excluidos.** Los registrados como `removed_incorrect` o `disputed_excluded`
   (por ejemplo *Weinmannia corymbosa*, *Betula antarctica*) **no** se reactivan por
   aparecer en otra fuente.
4. **Sin coincidencia.** Estado explícito `not_found_in_source`, nunca una categoría
   inferida.
5. **Categoría compuesta.** Se divide en evaluaciones por ámbito (región o población),
   conservando el texto original intacto.
6. **Ámbito.** El código de región romano se traduce a un código regional oficial; la
   correspondencia queda versionada y probada.
7. **Conflictos.** Si dos versiones de la nómina difieren, se conservan ambas en el
   historial; la vigente se decide por fecha de decreto.
8. Nunca se agregan especies al catálogo de identificación por figurar en el RCE.

## Diseño de datos: `ConservationAssessment`

Entidad futura (P1), sin migración en esta misión. Contexto en
[ECOSYSTEM_DATA_MODEL.md](ECOSYSTEM_DATA_MODEL.md#conservación).

| Campo | Ejemplo (olivillo, tramo sur) |
| --- | --- |
| `taxon_id` | `aextoxicon-punctatum` |
| `source_name` | `MMA RCE Nómina` |
| `source_version` | `20octubre2026` |
| `source_sha256` | `1a1dadba…607d` |
| `source_taxon_name` | `Aextoxicon punctatum` |
| `taxonomy_backbone` | GBIF o COL XR con su versión |
| `jurisdiction` | `CL` |
| `assessment_system` | `RCE` (separado de `IUCN`) |
| `category` | `LC` |
| `scope_type` | `regional` |
| `scope_regions` | `VI…XII` (códigos oficiales) |
| `scope_text_original` | `LC (VI-XII)` |
| `criteria` | `--` |
| `rce_process` | `14` |
| `decree` | `DS 79/2018 MMA` |
| `source_url` | URL de la nómina o de la ficha del proceso |
| `retrieved_at` | `2026-10-31` |
| `review_status` | `imported_unreviewed` → `reviewed` |
| `history` | Categorías anteriores con su fuente |

Un taxón con categoría regional tiene **varias** filas. El campo actual
`Species.conservation_status` (hoy `null`) **no** se rellena con un valor único. Cuando
exista, la API devolverá la lista de evaluaciones y la categoría aplicable solo si se conoce
la región.

## Gobernanza

- El XLSX queda fuera de Git hasta conocer las condiciones de redistribución. Se puede
  versionar un extracto mínimo (las filas de los taxones del catálogo y del piloto) solo con
  autorización registrada en [DATASET_LICENSES.md](DATASET_LICENSES.md).
- Cada importación registra hash, fecha y responsable. Giuseppe es el responsable propuesto;
  la revisión científica de la reconciliación sigue pendiente.
- Una categoría RCE no es una observación, una distribución regional no es una coordenada y
  un dato de conservación no autoriza mostrar ubicaciones sensibles.

## Plan de ETL futuro (P1)

1. Descargar desde la URL oficial y verificar el SHA-256. Un hash distinto se trata como
   versión nueva y nunca como sobrescritura silenciosa.
2. Leer las tres hojas con encabezados por nombre, no por posición, y fallar si cambian.
3. Normalizar el nombre científico (espacios y autores) sin alterar el original.
4. Reconciliar con el catálogo según las reglas anteriores y generar un informe de
   `matched`, `needs_review` y `not_found_in_source`.
5. Dividir las categorías compuestas por ámbito.
6. Cargar en una tabla de evaluaciones con `source_version`, de forma idempotente y sin
   borrar versiones previas.
7. Producir un informe de diferencias contra la versión anterior para revisión humana.

## Pruebas exigidas

- Conteos por reino iguales a 775, 701 y 139 para este hash, y 1.589 con fuente RCE.
- Olivillo: dos evaluaciones (VU norte, LC sur). Con región Los Lagos, la aplicable es LC.
- Güiña: con región Los Ríos devuelve VU; con Los Lagos devuelve NT; con región desconocida
  devuelve las dos sin elegir.
- Las siete especies del catálogo sin coincidencia quedan como `not_found_in_source` y nunca
  como LC o DD.
- Los sinónimos excluidos no se reactivan.
- Un hash distinto crea una versión nueva, y reimportar el mismo hash no cambia nada.
- Encabezados cambiados hacen fallar la importación.
- Las fixtures de CI son **sintéticas** e imitan la estructura, sin copiar filas del XLSX.
