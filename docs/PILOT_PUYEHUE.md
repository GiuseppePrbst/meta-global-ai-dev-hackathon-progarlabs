# Piloto territorial — Parque Nacional Puyehue

Decisión del 31-10-2026: **el Parque Nacional Puyehue es el parque piloto oficial de Bosque
Vivo Chile.** La primera experiencia interpretativa se concentra en el **sector Anticura**,
sujeta a comprobar senderos y condiciones de uso. La expansión nacional viene después
([visión](PRODUCT_VISION_ECOSYSTEM.md)).

Fuentes consultadas el 31-10-2026. Horarios, accesos y reglas pueden cambiar: se vuelven a
verificar antes de cualquier demo o publicación.

## Justificación

- El repositorio ya tiene contexto GIS real del entorno: capa BCN SNASPE (hash registrado),
  catastro CONAF 2018 vía CIREN, PostGIS y ventana CHMv2. Ver
  [FOREST_CONTEXT_REPORT.md](FOREST_CONTEXT_REPORT.md).
- Las ocho especies arbóreas del catálogo tienen taxonomía trazable, rasgos con fuente y
  evaluación Muse/SAM ([OPEN_SET_IDENTIFICATION_REPORT.md](OPEN_SET_IDENTIFICATION_REPORT.md)).
- La [ficha oficial CONAF](https://www.conaf.cl/parque_nacionales/parque-nacional-puyehue/)
  menciona las ocho especies en distintos ambientes del parque.
- Ya existen la expedición de referencia `puyehue`, las capturas privadas y el guía con
  herramientas ([API_INTEGRATION.md](API_INTEGRATION.md)).

## Institucionalidad y fuentes

| Hecho | Fuente | Nota |
| --- | --- | --- |
| Administra CONAF; tierras fiscales | [SIMBIO 971](https://simbio.mma.gob.cl/CbaAP/Details/971) | Plan de manejo de 2008 |
| Traspaso del programa de áreas silvestres de CONAF al SBAP «a partir de marzo de 2027» | [SBAP, 16-06-2026](https://sbap.gob.cl/sala-de-prensa/noticias-y-comunicados/detalle/2026/06/16/traspaso-del-programa-de-%C3%A1reas-silvestres-de-conaf-al-servicio-se-realizar%C3%A1-a-partir-de-marzo-de-2027) | **Anunciado, no concluido** en octubre de 2026 |
| SIMBIO avisa que el SBAP es la fuente oficial de datos de biodiversidad desde el 02-02-2026 y que SIMBIO se sincronizará gradualmente | SIMBIO 971 | Las fuentes MMA y SBAP se revisan juntas |
| Creado por DS 374/1941 (Min. Tierras y Colonización); ampliado en 1950; límites actuales por DS 445/1981 (Bienes Nacionales) | CONAF | SIMBIO indica además una modificación de su historia legal por la Ley 21.600 (2023) |
| Parte de la Reserva de la Biósfera Bosques Templados Lluviosos de los Andes Australes | CONAF y SIMBIO | — |
| Categoría UICN II, código WDPA-050 | SIMBIO | — |

### Discrepancias registradas

- **Superficie.** CONAF indica 112.755 ha. SIMBIO indica 102.521,7 ha como superficie
  oficial (dato de 1994, sin descontar una desafectación de 14,91 ha de 2001), y su
  superficie calculada aparece como 0 ha. Ninguna cifra se usa como métrica propia; la
  superficie de producto se calculará desde la geometría oficial con su CRS.
- **División administrativa.** CONAF cita las provincias de Valdivia y Osorno y las comunas
  de Río Bueno, Lago Ranco, Puyehue y Puerto Octay. SIMBIO cita la comuna de Puyehue y las
  regiones de Los Lagos y Los Ríos. El parque abarca **dos regiones**, lo que importa para
  las categorías RCE regionales ([RCE](RCE_CONSERVATION_2026.md#ámbito-territorial)).

## Sectores

CONAF nombra tres sectores: **Antillanca**, **Anticura** y **Aguas Calientes**. En Anticura
menciona una concesión operada por Altúe. La ficha **no nombra senderos de Anticura ni da
longitudes**. Nombra como senderos concesionados (con cobro) El Indio, Repucura y La
Princesa, sin asignarlos a un sector en el texto consultado.

## Alcance del sector Anticura

Recorrido educativo **conceptual**:

- reconocer el bosque siempreverde y sus estratos;
- observar distintas formas de vida sin manipularlas;
- relacionar plantas, hongos, animales y agua;
- reconocer rasgos a distancia;
- aprender sobre conservación.

**No se genera ningún trazado GPS.** Antes de presentar una ruta como habilitada se exige su
geometría desde una fuente autorizada (CONAF/SBAP), con fecha, licencia y condiciones de
acceso verificadas. Mientras falte, el mapa muestra el límite del parque y sectores con
fuente, y zonas de interés general rotuladas como tales.

## Ecosistemas

Información **oficial** (CONAF, ficha del parque):

- La formación dominante es el bosque húmedo siempreverde, sostenido por altas
  precipitaciones.
- En sectores bajos: ulmo y coigüe, con olivillo y tineo.
- Sotobosque con abundantes arbustos, lianas, helechos, musgos y líquenes.
- En sectores altos: tepa y mañío con grandes coigües; más arriba domina el coigüe.
- Cerca del límite arbóreo: rodales puros de coigüe de Magallanes y lenga.
- Suelos de origen volcánico. En Antillanca hay cavernas formadas por flujos de lava
  subterráneos.

Ecosistemas terrestres listados por **SIMBIO** (porcentaje aproximado del parque, todos con
estado LC en esa ficha):

| Ecosistema (SIMBIO) | % aprox. |
| --- | ---: |
| Bosque siempreverde andino de *N. dombeyi* – *Saxegothaea conspicua* | 31 |
| Bosque caducifolio andino de *N. pumilio* / *Drimys andina* | 27 |
| Bosque caducifolio andino de *N. pumilio* / *Ribes cucullatum* | 20 |
| Matorral bajo andino de *Adesmia longipes* – *Senecio bipontinii* | 12 |
| Bosque laurifolio de *N. dombeyi* – *Eucryphia cordifolia* | 6,7 |
| Bosque siempreverde de *N. nitida* – *Podocarpus nubigenus* | 1,4 |

SIMBIO informa además humedales por unos 3.999 ha (3,5 %) y advierte que su cartografía es
referencial. El gradiente altitudinal, el sotobosque, los ambientes acuáticos y el contexto
volcánico se documentan desde estas fuentes. Cualquier análisis GIS propio (por ejemplo,
CHMv2 por formación) se rotula como **hipótesis derivada**, no como hecho del parque.

## Las ocho especies arbóreas documentadas

CONAF menciona las ocho en el parque. Eso respalda su inclusión en una guía del parque,
**pero no sus coordenadas individuales ni su presencia en un sendero concreto de Anticura.**

| ID del catálogo | Nombre | Ambiente según CONAF |
| --- | --- | --- |
| `nothofagus-dombeyi` | Coigüe | Bajo y alto; domina en altura |
| `eucryphia-cordifolia` | Ulmo | Sectores bajos |
| `aextoxicon-punctatum` | Olivillo | Sectores bajos |
| `weinmannia-trichosperma` | Tineo | Sectores bajos |
| `laureliopsis-philippiana` | Tepa | Sectores altos |
| `podocarpus-nubigenus` | Mañío | Sectores altos |
| `nothofagus-betuloides` | Coigüe de Magallanes | Cerca del límite arbóreo |
| `nothofagus-pumilio` | Lenga | Cerca del límite arbóreo |

## Fauna documentada por CONAF

Candidatas a fichas educativas, citadas por la ficha CONAF del parque. Que CONAF las mencione
es **presencia documentada a escala de parque**, no ocurrencia individual ni ubicación. La
categoría RCE proviene de la [nómina oficial](RCE_CONSERVATION_2026.md).

| Especie | Nombre común | RCE vigente (texto del libro) | Proceso / decreto |
| --- | --- | --- | --- |
| *Dromiciops gliroides* | Monito del monte | NT | 7 / DS 42/2011 MMA |
| *Campephilus magellanicus* | Carpintero negro | NT | 16 / DS 16/2020 MMA |
| *Leopardus guigna* | Güiña | VU (XV-XIV); NT (X-XII) — **depende de la región** | 7 / DS 42/2011 MMA |
| *Puma concolor* | Puma | NT | 7 / DS 42/2011 MMA |
| *Enicognathus leptorhynchus* | Choroy | LC | 14 / DS 79/2018 MMA |
| *Pteroptochos tarnii* | Hued-hued | LC | 14 / DS 79/2018 MMA |

CONAF cita además más de 130 especies de aves y nombra, entre otras, zorro gris, quique,
coipo, vizcacha, chingue, pato correntino, torcaza, aguilucho, cóndor, huala, chercán y
bandurria. No se convierten en objetivos de captura obligatoria. La observación de fauna puede
registrarse sin fotografía y sin identificación definitiva. Nunca se dirige al usuario a
madrigueras, nidos ni sitios sensibles.

## Hongos candidatos (pendientes de evidencia)

La nómina RCE incluye 139 hongos. Los siguientes tienen distribución que cubre Los Lagos según
el libro, pero **no hay evidencia de su presencia en Puyehue ni en Anticura**: son
candidatos de investigación regional.

| Especie | RCE | Proceso / decreto |
| --- | --- | --- |
| *Cyttaria hariotii* | LC | 20 / DS 54/2025 MMA |
| *Boletus chilensis* | EN | 15 / DS 23/2019 MMA |
| *Amanita gayana* | NT | 11 / DS 38/2015 MMA |

Para pasar a ficha del parque se necesita un registro de ocurrencia con fuente, calidad
geográfica, fecha y licencia (por ejemplo GBIF con filtros de calidad, o un inventario
oficial).

Fuente taxonómica complementaria: **mycoBaseCL** (Riquelme, Valdés-Reyes, Palfner y
Galleguillos). Es un preprint v1 en [EcoEvoRxiv](https://doi.org/10.32942/X20T2N), publicado
el 21-09-2026 y **sin revisión por pares**. Contiene 6.546 registros (6.299 a nivel de especie)
compilados de literatura 1810–2026 en Darwin Core, con datos en
[Zenodo](https://doi.org/10.5281/zenodo.22388379); el preprint tiene licencia CC BY 4.0.
La licencia del dataset de Zenodo no se verificó. Sirve como referencia taxonómica, **no**
como validación de presencia en el parque. Nunca se ofrece información de comestibilidad.

## Fuentes GIS

| Fuente | Uso | Estado |
| --- | --- | --- |
| BCN SNASPE (`bcn_snaspe_pilot`, EPSG:3857, hash en [CAPTURE_DOMAIN.md](CAPTURE_DOMAIN.md)) | Referencia de límite para el estado espacial de capturas | Implementado; no verifica acceso legal |
| CONAF 2018 vía CIREN MapServer | Formaciones y uso del suelo | Consultas acotadas; redistribución pendiente |
| SIMBIO 971 (KMZ/SHP «referencial») | Límite y ecosistemas | No descargado; licencia del archivo por verificar |
| CHMv2 | Altura estimada de dosel | Ventana pequeña; no mide crecimiento |
| IDE MINAGRI, GBIF, SBAP | Catastro, ocurrencias, futuras capas oficiales | Investigado; sin ingesta |

Cada capa conserva geometría, CRS, fecha, fuente, cobertura y limitaciones
([DATASET_LICENSES.md](DATASET_LICENSES.md)).

## Reglas del parque

Ficha CONAF consultada el 31-10-2026:

- **Horario y acceso.** Abierto todos los días de 9:00 a 17:30, sin reservas. Senderos
  gratuitos salvo los concesionados. Las travesías largas requieren autorización del
  administrador, y montañistas y excursionistas deben registrarse con guardaparques.
- **Prohibiciones:**
  - salir de senderos marcados o asumir riesgos innecesarios;
  - extraer semillas, plantas, ramas, piedras o rocas;
  - alimentar o perturbar fauna;
  - ingresar mascotas o animales exóticos;
  - encender fuentes de calor (Ley 20.653, art. 22);
  - fumar, alcohol y drogas, y ruidos molestos;
  - **usar drones**, salvo investigación o filmación profesional con autorización previa de
    CONAF.

La app no ofrece misiones incompatibles con estas reglas. La investigación con videos Hepta
**no** implica autorización de vuelo en el parque, y ese material no se asocia a Puyehue.

## Tipos de evidencia de presencia

Siete tipos, sin mezclarlos (definición completa en
[ECOSYSTEM_DATA_MODEL.md](ECOSYSTEM_DATA_MODEL.md#tipos-de-evidencia)):

1. presencia documentada por fuente oficial del parque (por ejemplo, la ficha CONAF);
2. observación científica georreferenciada;
3. observación ciudadana validada;
4. observación personal pendiente de revisión;
5. hábitat potencial;
6. asociación ecológica documentada;
7. hipótesis de identificación por IA.

## Privacidad de especies sensibles

- Sin puntos exactos públicos para fauna amenazada, nidos ni madrigueras. La generalización
  la decide una política revisada antes de publicar cualquier registro.
- Las capturas son privadas por defecto, para todas las especies (comportamiento actual de
  `/captures`).

## Primera expedición: «Exploradores del Bosque Siempreverde — Puyehue»

**Objetivo educativo:** comprender cómo se relacionan árboles, animales, hongos y los
estratos del bosque.

Narrativa: Wilo invita a recorrer un sendero habilitado (por verificar) leyendo el bosque por
capas, del suelo al dosel. Retos (ninguno exige especies raras, GPS ni salir del sendero):

1. Reconocer hojas de formas diferentes, mirando sin arrancar.
2. Identificar elementos del sotobosque: helechos, musgos, lianas.
3. Aprender sobre descomposición y el papel de los hongos, sin tocarlos ni recolectarlos.
4. Distinguir un registro real de una hipótesis de IA en el propio diario.
5. Reconocer señales del cuidado del parque (normas, señalética).
6. Completar una pregunta educativa con Wilo, que responde con fuente.

Una fotografía es opcional. La identificación sugerida queda `unverified`. Completar la
misión no requiere taxón ni ubicación (comportamiento actual de la expedición `puyehue`).

## Criterios de aceptación del piloto

1. Límite del parque y sectores desde una fuente oficial con CRS, fecha y licencia.
2. Ningún sendero presentado como habilitado sin geometría oficial y fecha de verificación.
3. Las ocho especies con ficha, fuente y estado de revisión; ninguna coordenada individual
   inventada.
4. Fichas de fauna CONAF con categoría RCE y ámbito; sin ubicaciones.
5. Hongos solo como candidatos regionales mientras falte ocurrencia verificada.
6. La misión piloto se puede completar sin GPS, sin especies EN/CR y sin salir del sendero.
7. Las reglas del parque se muestran con fecha de consulta.
8. Ningún dato Hepta en la experiencia del parque.
