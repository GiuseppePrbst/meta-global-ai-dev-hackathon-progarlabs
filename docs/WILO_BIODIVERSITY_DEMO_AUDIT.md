# Wilo: auditoría de los 20 taxones para la demo (03-11-2026)

Auditor: Claude Opus 5.5, agente de desarrollo, por encargo de Giuseppe Proboste. **No es una validación botánica ni zoológica de especialista.** El catálogo científico no se modificó en sus identificadores, evaluaciones RCE, observaciones ni estados de identificación. La demo se filtra con una capa aparte, [`resources/demo-eligibility.json`](../services/api/src/bosque_api/resources/demo-eligibility.json).

## Regla de elegibilidad

`bosque_api/demo.py` revisa en cada carga los requisitos mínimos:

- taxonomía trazable: `source_checked`, o una discrepancia documentada en notas;
- descripción;
- hábitat;
- al menos dos rasgos con fuente;
- una fuente revisable;
- una foto con autor y licencia;
- limitaciones explícitas.

Si a un taxón declarado `demo_ready` le falta un requisito, baja automáticamente a `needs_review`. Un perfil incompleto nunca aparece como terminado.

`collectible` exige `demo_ready` y `sensitivity: none`. Las especies sensibles nunca son coleccionables.

API:

- `GET /taxa?demo_only=true` devuelve solo `demo_ready`.
- `GET /taxa/{id}/eligibility` expone el estado, los requisitos que faltan, el motivo y las restricciones.
- `TaxonSummary` suma `demo_status` y `collectible`. El cambio es aditivo.

## Resultado

| Taxón | Grupo | Taxonomía | Descripción / hábitat / ecología / distribución | Rasgos | Fuentes | Fotos | RCE en parque (Los Ríos/Los Lagos) | Identificación por foto | Demo |
| --- | --- | --- | --- | --- | --- | ---: | --- | --- | --- |
| Coigüe (*Nothofagus dombeyi*) | árbol | source_checked | sí / sí / no / no | 2 (source_checked) | 2 (official, scientific) | 3 | sin registro | recognition_experimental | **demo_ready** |
| Ulmo (*Eucryphia cordifolia*) | árbol | source_checked | sí / sí / sí / sí | 2 (source_checked) | 2 (official, secondary) | 3 | sin registro | recognition_candidate | **demo_ready** |
| Olivillo (*Aextoxicon punctatum*) | árbol | source_checked | sí / sí / sí / sí | 2 (source_checked) | 2 (official, secondary) | 3 | LC / LC | recognition_candidate | **demo_ready** |
| Tineo (*Weinmannia trichosperma*) | árbol | source_checked | sí / sí / sí / sí | 2 (source_checked) | 2 (official, secondary) | 3 | sin registro | recognition_experimental | **demo_ready** |
| Tepa (*Laureliopsis philippiana*) | árbol | source_checked | sí / sí / no / sí | 2 (source_checked) | 2 (official, secondary) | 3 | sin registro | recognition_experimental | **demo_ready** |
| Mañío (*Podocarpus nubigenus*) | árbol | source_checked | sí / sí / no / sí | 2 (source_checked) | 2 (official, secondary) | 3 | sin registro | recognition_candidate | **demo_ready** |
| Coigüe de Magallanes (*Nothofagus betuloides*) | árbol | source_checked | sí / sí / no / sí | 2 (source_checked) | 2 (official, secondary) | 3 | sin registro | recognition_experimental | **demo_ready** |
| Lenga (*Nothofagus pumilio*) | árbol | source_checked | sí / sí / sí / sí | 3 (source_checked) | 2 (official) | 3 | sin registro | recognition_experimental | **demo_ready** |
| Choroy (*Enicognathus leptorhynchus*) | ave | source_checked | sí / sí / no / sí | 4 (secondary_source) | 2 (secondary) | 3 | LC / LC | recognition_experimental | **demo_ready** |
| Carpintero negro (*Campephilus magellanicus*) | ave | source_checked | sí / sí / no / sí | 4 (secondary_source) | 2 (scientific, secondary) | 3 | NT / NT | recognition_candidate | **demo_ready** (no coleccionable: sensible por nidos) |
| Hued-hued del sur (*Pteroptochos tarnii*) | ave | source_checked | sí / sí / no / sí | 4 (secondary_source) | 1 (secondary) | 3 | LC / LC | recognition_experimental | **demo_ready** |
| Chercán (*Troglodytes aedon*) | ave | name_discrepancy | sí / sí / no / no | 3 (secondary_source) | 1 (secondary) | 3 | sin registro | recognition_candidate | **demo_ready** |
| Bandurria (*Theristicus melanopis*) | ave | name_discrepancy | sí / sí / no / sí | 3 (secondary_source) | 1 (secondary) | 3 | LC / LC | recognition_experimental | **demo_ready** |
| Monito del monte (*Dromiciops gliroides*) | mamífero | source_checked | sí / sí / sí / sí | 2 (source_checked) | 1 (official) | 1 | NT / NT | recognition_restricted | **educational_only** |
| Güiña (*Leopardus guigna*) | mamífero | source_checked | sí / sí / sí / sí | 2 (source_checked) | 1 (official) | 1 | VU / NT | recognition_restricted | **educational_only** |
| Puma (*Puma concolor*) | mamífero | source_checked | sí / sí / no / sí | 2 (source_checked) | 1 (official) | 1 | NT / NT | recognition_restricted | **educational_only** |
| Llao-llao (*Cyttaria hariotii*) | hongo | source_checked | sí / sí / no / no | 2 (secondary_source) | 2 (secondary) | 3 | LC / LC | recognition_experimental | **educational_only** |
| Digüeñe (*Cyttaria espinosae*) | hongo | source_checked | sí / sí / no / no | 3 (secondary_source) | 1 (secondary) | 1 | sin registro | recognition_experimental | **educational_only** |
| Seta (*Boletus chilensis*) | hongo | source_checked | no / no / no / no | 0 (pending) | 0 | 0 | EN / EN | educational_catalog | **excluded_from_demo** |
| Hongo de Gay (*Amanita gayana*) | hongo | unresolved | no / no / no / no | 0 (pending) | 0 | 0 | NT / NT | educational_catalog | **excluded_from_demo** |

Totales:

- **13 `demo_ready`**: 8 árboles y 5 aves.
- **5 `educational_only`**: 3 mamíferos sensibles y 2 *Cyttaria*.
- **2 `excluded_from_demo`**.
- 0 en `needs_review`.

## Enriquecimiento con fuentes (03-11-2026)

| Taxones | Campos completados | Fuente |
| --- | --- | --- |
| Ulmo, olivillo, tineo, tepa, mañío, coigüe de Magallanes | Descripción, distribución por regiones, hábitat general y ecología cuando la ficha la trae | [Fundación R. A. Philippi, catálogo de flora nativa](https://fundacionphilippi.cl/catalogo/) (ficha botánica secundaria) |
| Coigüe | Descripción (árbol siempreverde de hasta 40 m) | [Universidad de Concepción, Flora y fauna](https://florayfauna.udec.cl/nothofagus-dombeyi-mirb-oerst/). Esa ficha no publica distribución, así que el campo queda `null` |
| Lenga | Descripción, distribución, altitud y fenología | [SIB Argentina](https://sib.gob.ar/especies/nothofagus-pumilio) |
| Monito del monte, güiña, puma | Descripción, hábitat, distribución regional, ecología y dos rasgos cada uno | Fichas MMA de especie clasificada (RCE), en PDF, consultadas el 03-11-2026 |
| Llao-llao, digüeñe | Hábitat (ramas o troncos de *Nothofagus*) | Wikipedia en español, la misma fuente secundaria que ya usaba el perfil |
| Digüeñe | Primera foto: [Commons 156105289](https://commons.wikimedia.org/wiki/File:Digue%C3%B1e_con_apotecios_formados.jpg), Nanilution, CC BY-SA 4.0 | Revisión visual del agente: cuerpos globosos sobre una rama, *in situ* |

Fuentes MMA de los mamíferos:

- [*Dromiciops gliroides*](https://clasificacionespecies.mma.gob.cl/wp-content/uploads/2019/10/Dromiciops_glirioides_P07.pdf)
- [*Leopardus guigna*](https://clasificacionespecies.mma.gob.cl/wp-content/uploads/2019/10/Leopardus_guigna_P07.pdf)
- [*Puma concolor*](https://clasificacionespecies.mma.gob.cl/wp-content/uploads/2019/10/Puma_concolor_P07.pdf)

Cómo se redactaron los textos:

- Los escribió el agente a partir de esas fichas, de forma resumida y sin copiar párrafos.
- Muse no redactó contenido científico.
- Ningún campo sin fuente se completó: la ecología del coigüe, de la tepa y de las aves sigue en `null`.

Se descartó una foto CC BY 4.0 del digüeñe porque muestra un cuerpo fructífero recolectado en la mano, y la demo no promueve la recolección.

## Discrepancias revisadas

- **Chercán.**
  - COL XR acepta *Troglodytes aedon*; algunas autoridades separan *T. musculus*.
  - La ficha CONAF de Puyehue escribe *Troglodytes aedon* y el RCE no lo lista.
  - Queda `name_discrepancy` documentada. Es trazable y Wilo la muestra como limitación.
- **Bandurria.**
  - La ficha CONAF de Puyehue (consultada el 03-11) y la de Torres del Paine escriben *Theristicus caudatus*.
  - El RCE lista *T. caudatus* como sinónimo de *T. melanopis*, y COL XR las trata como especies distintas.
  - Se mantiene *T. melanopis* con la discrepancia visible. El Atlas vincula la mención CONAF *T. caudatus* con este taxón solo porque esa sinonimia figura en `synonyms_reviewed`; la evidencia queda a escala de parque.
- ***Cyttaria*.**
  - El RCE registra «*Cyttaria darwinii* p.part.» como sinonimia de *C. hariotii*.
  - En la campaña SAM/Muse del 02-11, ningún modelo separó especies de *Cyttaria* ([SAM31_EXTENDED_RESEARCH_REPORT.md](SAM31_EXTENDED_RESEARCH_REPORT.md)).
  - Las fichas son educativas, sin reconocimiento confiable ni consejos de consumo.

## Fauna sensible

Monito del monte, güiña, puma y carpintero negro llevan `sensitivity: location_sensitive`:

- Las herramientas de Wilo devuelven `safety: "Especie sensible: entregar solo información educativa general."`.
- El prompt prohíbe orientar la búsqueda de estas especies.
- La distribución se informa a escala regional, como lo hace la ficha MMA.
- Ninguna respuesta incluye coordenadas: el catálogo no las tiene y la prueba `test_tools_are_bounded_and_sensitive_species_stay_educational` lo verifica.

## Hongos

- Ninguna ficha indica comestibilidad ni recolección.
- `eligibility()` agrega la restricción «Sin consejos de comestibilidad ni recolección» y el prompt de Wilo la refuerza.
- El escenario S3 («¿El digüeñe es comestible?») se ejecutó contra la API real; ver [WILO_DEMO_SCENARIOS.md](WILO_DEMO_SCENARIOS.md).

## Excluidos y pendientes

- **Excluidos.** *Boletus chilensis* y *Amanita gayana* se mantienen en el catálogo y en el RCE (EN/EN y NT/NT), pero salen de la demo. La primera no tiene perfil ni fotos con fuente, y la taxonomía de la segunda no está resuelta.
- **Pendientes.**
  - Ecología con fuente de coigüe, tepa, mañío, coigüe de Magallanes y aves.
  - Distribución del coigüe y del chercán.
  - Fuentes primarias para las aves, que hoy dependen de Wikipedia.
  - Revisión de especialista de todas las fichas.
