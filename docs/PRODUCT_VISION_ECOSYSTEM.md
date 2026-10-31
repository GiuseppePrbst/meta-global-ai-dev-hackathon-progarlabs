# Visión de producto — ecosistema y gemelo digital

Decisión de producto del 31-10-2026. Amplía la [visión inicial](product/PRODUCT_VISION.md)
(27-10-2026, centrada en árboles), que se conserva como registro histórico. Esta es la
definición vigente para todo el equipo. Separa lo implementado de lo propuesto: nada de lo
descrito como P1–P3 existe todavía en el código.

## Visión y misión

> Bosque Vivo Chile transforma la exploración de parques nacionales en una experiencia
> interactiva de descubrimiento de biodiversidad, combinando inteligencia artificial,
> conocimiento científico y un gemelo digital del ecosistema para aprender, observar y
> contribuir responsablemente al conocimiento de la naturaleza.

**Definición operativa.** Bosque Vivo Chile es una plataforma de exploración, aprendizaje y
colección de biodiversidad que construye una representación digital verificable de los
ecosistemas de los parques nacionales de Chile. Comienza en el Parque Nacional Puyehue
([piloto](PILOT_PUYEHUE.md)).

**Misión.** El objetivo es incentivar la exploración responsable y el conocimiento de la
biodiversidad chilena, no coleccionar fotografías. La aventura y la colección existen para
aumentar el compromiso educativo. No deben perjudicar al ecosistema ni presentar
predicciones de IA como hechos científicos.

## Públicos objetivo

| Público | Necesidad | Qué no se le promete |
| --- | --- | --- |
| Visitantes adultos de parques nacionales | Entender lo que ven sin conocimiento previo | Identificación garantizada ni rutas no verificadas |
| Familias y grupos con un adulto responsable | Actividades educativas dentro del sendero | Uso directo por menores de la integración Meta (la API exige `adult_confirmed`) |
| Docentes y guías | Material con fuentes para una salida | Contenido científico sin revisión |
| Equipos ambientales y aficionados avanzados | Registro personal ordenado y trazable | Que una captura privada sea un registro científico público |

Estas son hipótesis de producto, no demanda validada (ver [personas](product/PERSONAS.md)).

## Problema

- La información sobre biodiversidad de un parque está dispersa entre fichas oficiales,
  listados de conservación, bases taxonómicas y capas GIS. Rara vez se presenta en
  terreno con sus fuentes.
- Las apps de identificación suelen responder siempre, incluso cuando la foto no basta.
  El visitante no distingue una sugerencia de una confirmación.
- La gamificación ingenua premia acercarse, recolectar o salir del sendero, en conflicto
  con las [reglas del parque](PILOT_PUYEHUE.md#reglas-del-parque).

## Propuesta de valor

1. **Descubrir con honestidad.** La identificación de conjunto abierto se abstiene cuando la
   evidencia no basta ([resultados](OPEN_SET_IDENTIFICATION_REPORT.md)).
2. **Aprender con procedencia.** Cada ficha y respuesta de Wilo cita fuente, versión y
   estado de revisión.
3. **Explorar el territorio.** El mapa distingue presencia documentada, hábitat potencial y
   observación ([tipos de evidencia](ECOSYSTEM_DATA_MODEL.md#tipos-de-evidencia)).
4. **Coleccionar sin dañar.** Las misiones se completan observando y aprendiendo. No se
   recolecta, no se persigue fauna y no se sale del sendero.

## Diferenciación

- Abstención medida, no solo declarada. En el conjunto independiente congelado (etiquetas
  débiles), `verify` redujo los negativos aceptados de 25/37 a 3/37, a cambio de cobertura.
- Conservación con alcance territorial. Las categorías RCE dependientes de la región no se
  reducen a una etiqueta nacional ([RCE](RCE_CONSERVATION_2026.md)).
- El gemelo digital se define como relación verificable entre datos, no como una
  visualización 3D.

## Qué es el gemelo digital de Bosque Vivo

Es una **representación geoespacial y temporal** que relaciona, con fuente y fecha:

- límites de áreas protegidas, sectores y senderos oficiales;
- ecosistemas, formaciones vegetacionales y hábitats;
- taxones, estados de conservación y relaciones ecológicas documentadas;
- registros de presencia y observaciones de visitantes, siempre separados;
- topografía, cobertura vegetal y altura estimada del dosel (CHMv2) cuando exista;
- cambios entre snapshots, solo cuando los datos permitan compararlos.

**Qué no es:**

- No es un mapa 3D.
- No es una simulación ecológica en tiempo real.
- No es un inventario de individuos.
- No determina dónde está cada animal, hongo o árbol.
- Un mapa de vegetación no prueba que exista un ejemplar en una coordenada.
- CHMv2 estima la altura de copa; sus estadísticas no indican crecimiento anual.

Modelo conceptual: [ECOSYSTEM_DATA_MODEL.md](ECOSYSTEM_DATA_MODEL.md).

## Alcance biológico: flora, fauna y Fungi

El producto deja de limitarse a ocho especies arbóreas. **Las ocho se conservan** como el
único catálogo de reconocimiento visual evaluado (IDs estables en
`services/api/src/bosque_api/resources/species.json`).

| Dominio | Grupos progresivos | Evidencia admitida | Identificación por IA hoy |
| --- | --- | --- | --- |
| Flora | Árboles, arbustos, herbáceas, helechos, briófitas | Fotografía; observación | Solo las 8 especies arbóreas, con `verify` y abstención; el resto no está evaluado |
| Fauna | Aves, mamíferos, anfibios, reptiles, insectos y otros invertebrados | Fotografía, observación directa; audio solo con una función evaluada y autorizada; rastros como evidencia indirecta | **No disponible.** Sin evaluación |
| Fungi | Macrohongos, lignícolas, asociados a árboles; líquenes con su tratamiento propio | Fotografía; observación | **No disponible.** Sin evaluación |

Reglas:

- Los hongos no son plantas y tienen su propia categoría taxonómica. El reino taxonómico se
  distingue de la categoría visual de navegación.
- Nunca se ofrece información de consumo, comestibilidad ni recolección.
- Una huella, un canto o un excremento no confirma una especie sin un método validado.
- No se promueve perseguir ni acercarse a animales.
- Las métricas de árboles **no** se extrapolan a fauna ni a hongos.

Estados de capacidad por taxón: `educational_catalog`, `visual_recognition_not_evaluated`,
`evaluation_pending`, `identification_unavailable` y `candidate_identification` (este último
solo con evidencia evaluada).

## Cinco pantallas

Dirección conceptual para José y diseño; no altera `apps/web` ni `apps/mobile`. La app
móvil actual (PR #23) tiene pestañas Atlas, Identificar, Observaciones y Especies, con
equivalencias directas.

| Pantalla | Propósito | Contenido conceptual | Base existente |
| --- | --- | --- | --- |
| **Descubrir** | Inicio de aventura | Mensaje contextual, Wilo, acceso a cámara, pregunta por voz o texto, misiones educativas, introducción al parque, descubrimientos destacados con fuente | `/identify`, `/guide/query`, `/guide/transcribe`, `/expeditions` |
| **Mapa** | Exploración principal | Capas: parque, sectores, senderos oficiales verificados, hábitats, formaciones, lugares interpretativos autorizados, registros públicos revisados, capturas privadas. Filtros: flora, fauna, hongos, hábitat, estado de evidencia | `/layers`, `/context/*`, `/forest/*`; senderos y capas multirreino pendientes |
| **Enciclopedia** | Fichas de biodiversidad | Nombres, reino y familia, descripción, fotos autorizadas, rasgos, confundibles, hábitat, ecología, distribución, conservación oficial con ámbito, fuente y fecha, relación con el parque, preguntas para Wilo | `/species` (8 árboles); fichas multirreino pendientes |
| **Mi diario** | Colección personal | Estados separados: registrado, sugerido por IA, pendiente, revisado por especialista, público autorizado | `/captures/*`; revisión por especialista y publicación no existen |
| **Perfil** | Progresión | Expediciones, conocimiento, logros educativos, colección, privacidad, actividades verificadas | Sin endpoint; kilómetros solo con medición real consentida |

Prohibido en la interfaz:

- puntos exactos de especies sensibles;
- «hotspots» de especie derivados de distribución regional;
- botones «Ver en 3D» sin activos reales;
- cifras ficticias de senderos, hallazgos o logros.

### Color y marca

La referencia conceptual del encargo usa verdes oscuros, lima, blanco y acentos púrpura.
Bosque Vivo puede tener una identidad de producto propia, compatible con el púrpura y
blanco de ProGarLabs. Wilo conserva su identidad canónica de mascota de ProGarLabs. La
imagen de referencia no se versiona: no se revisaron sus derechos. Los tokens actuales
siguen en [DESIGN_SYSTEM.md](product/DESIGN_SYSTEM.md) y en `apps/mobile/src/ui/tokens`.

## Mecánicas de aventura y colección

La inspiración en juegos de exploración se limita a la mecánica de descubrir y coleccionar.
No se copian personajes ni propiedad intelectual.

- Colecciones por grupo taxonómico; un descubrimiento pendiente de identificación también
  cuenta como registro.
- Misiones de aprendizaje y expediciones por parque.
- Insignias educativas por conocimiento demostrado, no por rareza capturada.
- Lecciones sobre relaciones ecológicas documentadas.

Límites:

- No exigir especies EN o CR.
- No recompensar perseguir animales ni repetir capturas.
- No exigir salir del sendero.
- No exigir GPS para completar todos los objetivos.
- Completar una colección no equivale a validación científica.

Misión piloto: [«Exploradores del Bosque Siempreverde — Puyehue»](PILOT_PUYEHUE.md#primera-expedición-exploradores-del-bosque-siempreverde--puyehue).

## Wilo

Wilo es el guía de exploración. Responde con herramientas y fuentes autorizadas
(`/guide/query` y `guide_tools.py`), nunca con conocimiento general del modelo presentado
como hecho. Siempre distingue:

- información oficial del parque;
- ficha taxonómica;
- conservación con su ámbito;
- observaciones;
- hábitat potencial;
- incertidumbre de la IA.

Puede informar, explicar y recomendar observación responsable. No hay TTS, escucha continua
ni reconocimiento de cantos validados: no se presentan como capacidades.

## MVP frente a visión futura

| Nivel | Contenido | Estado |
| --- | --- | --- |
| P0 MVP de hackatón | Puyehue piloto, 8 árboles, `verify` con abstención, capturas y colección privadas, atlas y contexto forestal real, fichas educativas de fauna y hongos con fuentes, Wilo con servicios disponibles, demo honesta | Backend de identificación, capturas, contexto y guía implementado; fichas de fauna y hongos pendientes |
| P1 Gemelo territorial | Límites y sectores, senderos oficiales, ecosistemas, catálogo multirreino, RCE regional, ocurrencias verificadas, relaciones documentadas, expediciones configurables | Propuesta |
| P2 Expansión nacional | Nuevos parques, catálogos por parque, nuevas modalidades de identificación con evaluación propia, contenido offline, colaboración científica moderada | Propuesta |
| P3 Gemelo avanzado | Análisis temporales, sensores, simulación solo con modelo validado, 3D | Investigación |

Detalle en el [roadmap](ROADMAP.md).

## Indicadores de éxito

Indicadores propuestos sin línea base. No se publican cifras hasta medirlas.

- Tasa de aceptación incorrecta en negativos y cobertura en positivos, sobre conjuntos
  congelados y por reino. Hoy solo existe para árboles.
- Proporción de respuestas de Wilo con fuente citada y proporción de abstenciones correctas.
- Misiones completadas sin GPS ni captura de especie (aprendizaje sin presión de captura).
- Cero incidentes de exposición de ubicaciones sensibles y cero misiones contrarias a
  las reglas del parque.
- Fichas con fuente, fecha y estado de revisión, sobre el total publicado.

## Restricciones ecológicas

Sin perturbación de fauna, recolección, salida de senderos, drones ni exposición de nidos,
madrigueras o especies vulnerables. Las fotos privadas y las capturas no se publican
automáticamente. Material Hepta: nunca asociado al parque ni publicado
([gobernanza](DATA_GOVERNANCE.md)).

Fabiana García orienta el diseño de producto empresarial; mientras no conste su admisión,
este documento no le atribuye entregables competitivos
([gobernanza del equipo](TEAM_AND_GOVERNANCE.md)).

## Actualización 31-10-2026 — estados de capacidad implementados

El backend usa ahora `educational_catalog`, `recognition_not_evaluated`,
`recognition_experimental`, `recognition_candidate`, `recognition_enabled` y
`recognition_restricted` ([modelo](ECOSYSTEM_DATA_MODEL.md#estado-de-implementación--31-10-2026)).

- La tabla de alcance biológico sigue vigente: no hay identificación de fauna ni de hongos
  para el visitante.
- Carpintero negro y chercán alcanzaron un criterio preliminar en evaluación, sin endpoint
  ([evaluación](MULTIKINGDOM_AI_EVALUATION.md)).
- Los hongos *Cyttaria* no se distinguen entre sí: siguen solo como fichas.
