# Matriz de contenido por taxón

Estado: 02-11-2026. Generada desde `services/api/src/bosque_api/resources/taxa.json`
y `species.json` (árboles) mediante la API de taxones; cada celda refleja el dato **ya
versionado**, no una evaluación nueva. Los 20 identificadores se conservan. Los ocho árboles
no se duplican: su nombre y taxonomía vienen de `species.json`.

## Estado por taxón

| ID | Grupo | Nombre(s) común(es) | Fotos enlazadas | Descripción | Hábitat | Ecología | Distribución | Rasgos | Fuentes | Validación de rasgos | Estado de identificación | Presencia en Puyehue |
|---|---|---|---:|---|---|---|---|---:|---:|---|---|---|
| `nothofagus-dombeyi` | tree | Coigüe | 3 | — | sí | — | — | 2 | 1 | source_checked | recognition_experimental | documented_in_park |
| `eucryphia-cordifolia` | tree | Ulmo | 3 | — | sí | — | — | 2 | 1 | source_checked | recognition_candidate | documented_in_park |
| `aextoxicon-punctatum` | tree | Olivillo | 3 | — | sí | — | — | 2 | 1 | source_checked | recognition_candidate | documented_in_park |
| `weinmannia-trichosperma` | tree | Tineo | 3 | — | sí | — | — | 2 | 1 | source_checked | recognition_experimental | documented_in_park |
| `laureliopsis-philippiana` | tree | Tepa | 3 | — | sí | — | — | 2 | 1 | source_checked | recognition_experimental | documented_in_park |
| `podocarpus-nubigenus` | tree | Mañío | 3 | — | sí | — | — | 2 | 1 | source_checked | recognition_candidate | documented_in_park |
| `nothofagus-betuloides` | tree | Coigüe de Magallanes | 3 | — | sí | — | — | 2 | 1 | source_checked | recognition_experimental | documented_in_park |
| `nothofagus-pumilio` | tree | Lenga | 3 | — | sí | — | — | 3 | 1 | source_checked | recognition_experimental | documented_in_park |
| `enicognathus-leptorhynchus` | bird | Choroy | 3 | sí | sí | — | sí | 4 | 2 | secondary_source | recognition_experimental | documented_in_park |
| `campephilus-magellanicus` | bird | Carpintero negro | 3 | sí | sí | — | sí | 4 | 2 | secondary_source | recognition_candidate | documented_in_park |
| `pteroptochos-tarnii` | bird | Hued-hued del sur | 3 | sí | sí | — | sí | 4 | 1 | secondary_source | recognition_experimental | documented_in_park |
| `troglodytes-aedon` | bird | Chercán | 3 | sí | sí | — | — | 3 | 1 | secondary_source | recognition_candidate | documented_in_park |
| `theristicus-melanopis` | bird | Bandurria | 3 | sí | sí | — | sí | 3 | 1 | secondary_source | recognition_experimental | documented_in_park |
| `dromiciops-gliroides` | mammal | Monito del monte | 1 | — | — | — | — | 0 | 0 | pending | recognition_restricted | documented_in_park |
| `leopardus-guigna` | mammal | Güiña | 1 | — | — | — | — | 0 | 0 | pending | recognition_restricted | documented_in_park |
| `puma-concolor` | mammal | Puma | 1 | — | — | — | — | 0 | 0 | pending | recognition_restricted | documented_in_park |
| `cyttaria-hariotii` | fungus | Llao-llao | 3 | sí | — | — | — | 2 | 2 | secondary_source | recognition_experimental | regional_candidate |
| `cyttaria-espinosae` | fungus | Digüeñe | 0 | sí | — | — | — | 3 | 1 | secondary_source | recognition_experimental | not_assessed |
| `boletus-chilensis` | fungus | Seta | 0 | — | — | — | — | 0 | 0 | pending | educational_catalog | regional_candidate |
| `amanita-gayana` | fungus | Hongo de Gay | 0 | — | — | — | — | 0 | 0 | pending | educational_catalog | regional_candidate |

Leyenda: «sí» = campo con contenido versionado; «—» = vacío. «Validación de rasgos» viene del
catálogo (`source_checked`, `secondary_source` o `pending`). Ningún campo vacío se ha completado
con texto plausible sin fuente.

## Lectura de la matriz

- **Fotografías enlazadas.** Los 45 registros externos ya existentes son enlaces con licencia
  y autor. Los taxones con cero fotos (cyttaria-espinosae, boletus-chilensis, amanita-gayana)
  no tienen imagen válida todavía: no se sustituyen por otras especies.
- **Ecología y distribución.** La ecología está vacía en todos los taxones. La distribución
  solo existe en cuatro taxones. Completarla requiere fuentes nuevas y revisión humana; esta
  sesión no lo hizo.
- **Mamíferos sensibles** (monito del monte, güiña, puma): sin rasgos, sin hábitat y con
  estado de identificación restringido. No se convierten en objetivos de búsqueda.
- **Hongos.** Sin identificación confiable por especie en el catálogo; no se incluyen
  indicaciones de comestibilidad ni recolección.

## Casos científicos que deben preservarse

- **Güiña:** VU en Los Ríos y NT en Los Lagos; la categoría depende de la región (RCE).
- **Olivillo:** categorías territoriales diferenciadas; no sustituir por una categoría única.
- **Bandurria:** conflicto histórico entre `Theristicus caudatus` y `Theristicus melanopis`.
  El catálogo usa `Theristicus melanopis`; el cambio requiere reconciliación documentada.
- **Chercán:** posible revisión taxonómica respecto de `Troglodytes musculus`; el catálogo
  usa `Troglodytes aedon`, pendiente de reconciliación.
- **Cyttaria:** dificultades de diferenciación visual; las fotografías no bastan para separar
  las especies.
- **Coigüe:** la campaña anterior tuvo fotografías poco diagnósticas; no reutilizar esas
  imágenes como referencia de identificación.

## Pendiente de enriquecimiento

Prioridad según el encargo: ocho árboles, carpintero negro, choroy, hued-hued, chercán y
bandurria. Requiere investigación con fuentes oficiales o científicas, registro de versión y
fecha, y revisión humana. No se ejecutó en esta sesión.
