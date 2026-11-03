# Roadmap

## Prioridades vigentes — 31-10-2026

Jerarquía acordada con la [visión de ecosistema](PRODUCT_VISION_ECOSYSTEM.md). P2 y P3 **no**
son capacidades implementadas. El MVP no se retrasa por construir un simulador ecológico.

| Prioridad | Alcance | Estado al 31-10-2026 |
| --- | --- | --- |
| **P0 — MVP de hackatón** | Puyehue como piloto ([piloto](PILOT_PUYEHUE.md)); catálogo inicial de 8 árboles; identificación `verify` con abstención; capturas y colección personales; atlas y contexto forestal real; información educativa de fauna y de hongos con fuentes oficiales; Wilo con servicios disponibles; navegación comprensible; demo honesta | Backend de identificación, capturas, contexto, CHMv2 y guía **implementado**. Fichas de fauna y hongos **pendientes** (contenido con fuente, sin identificación por IA). Integración de las cinco pantallas: José |
| **P1 — Gemelo digital territorial** | Límites y sectores; senderos oficiales; capas de ecosistemas; catálogo multirreino; estados RCE regionales ([RCE](RCE_CONSERVATION_2026.md)); ocurrencias verificadas; interacciones ecológicas documentadas; fichas enriquecidas; expediciones configurables | Propuesta ([modelo](ECOSYSTEM_DATA_MODEL.md)) |
| **P2 — Expansión nacional** | Nuevos parques; catálogos por parque; datasets regionales; nuevas especies y modalidades de identificación, cada una con su propio conjunto de evaluación; contenido offline; colaboración científica moderada | Propuesta |
| **P3 — Gemelo digital avanzado** | Análisis temporales; sensores; simulación ecológica solo con un modelo validado; 3D; modelos espaciales avanzados; biodiversidad y cambio ambiental | Investigación |

Pendientes P0 hasta la entrega del 4-11-2026:

| Responsable | Pendientes |
| --- | --- |
| José | Pantallas Descubrir, Mapa, Enciclopedia, Mi diario y Perfil sobre los contratos implementados |
| Giuseppe | Fichas de fauna y hongos con fuente y estado; política de ubicaciones sensibles; demo honesta |
| Equipo | Revisión de elegibilidad antes de atribuir aportes de diseño |

**Avance del 31-10-2026** (rama `feat/puyehue-biodiversity-meta-evaluation`, PR abierto).
Hay catálogo multirreino de 20 taxones con fichas, evidencia en Puyehue y RCE regional, y
las rutas `/taxa`, `/taxa/{id}/conservation` y `/parks/puyehue/biodiversity`. Esto adelanta
parte de P1 sin migraciones. La campaña de evaluación de fauna y hongos está en
[MULTIKINGDOM_AI_EVALUATION.md](MULTIKINGDOM_AI_EVALUATION.md). Ningún taxón de fauna u
hongo queda habilitado para identificación.

## Calendario original de hackatón (27-10-2026)

Se conserva como plan histórico; las fechas de cierre siguen vigentes.


Plan de trabajo, no registro de tareas completadas. Ventana: 27 de octubre–4 de noviembre de 2026. Cierre de referencia: 4 de noviembre 21:00 ET; revisar [fuentes y horario](SOURCES.md). Reservar al menos el último tercio de cada jornada para integración, errores o permisos.

| Fecha | Hito | José: frontend/UI/UX | Giuseppe: GIS/ML | Condición de salida |
| --- | --- | --- | --- | --- |
| 27 oct | Foundation | Web navegable y checks | API, contratos, CI y gobernanza | Base ejecutable, pruebas, PR de bootstrap revisable. |
| 28 oct | Botanical Data & UI Shell | Componentes, móvil, catálogo y primer mapa | Validar ocho taxones/fuentes, contrato API | Fixtures y API intercambiables con procedencia visible. |
| 29 oct | Meta AI Integration | Carga, consentimiento, errores y abstención | Muse Spark/SAM 3.1, timeout, salida validada | Llamada real autorizada registrada, sin secretos ni contenido sensible. |
| 30 oct | Botanical Intelligence | Resultados/candidatos y fichas | Rasgos, candidatos y evaluación inicial | No hay probabilidades sin calibración; casos difíciles se abstienen. |
| 31 oct | Geospatial Atlas | Observaciones y fichas desde mapa | PostGIS, geometrías y capas verificadas | Observación trazable y sin ubicaciones inventadas. |
| 1 nov | Forest Intelligence | Capa y panel de procedencia/límites | Ventana CHMv2 y estadísticas | Altura estimada, metros, nodata y fuente visibles. |
| 2 nov | Evaluation & Polish | Accesibilidad, móvil, errores y latencia percibida | Evaluación reproducible, API errores, comparación | Informe honesto con muestra, errores y abstención. |
| 3 nov | Release Candidate | Congelar UI y grabar recorrido | Despliegue, verificaciones y observabilidad | RC reproducible, rollback y demo ensayada sin datos privados. |
| 4 nov | Submission | Video tres minutos y revisión final | Repo, licencias, resultados y evidencia Meta | Representante admitido envía y conserva comprobante. |

Fabiana conserva la visión y priorización empresarial; no asignar aportes competitivos sin resolver su elegibilidad. Ver [equipo](TEAM_AND_GOVERNANCE.md). Producto, frontend y GIS acuerdan a diario una sola ruta de demo y bloqueos; no añadir predicción forestal o análisis eléctrico para compensar una integración incompleta.

Si Meta o una licencia bloquean el trabajo, adelantar UX, contratos y evaluación con mocks, registrando la dependencia. La falta de uso real de Meta sigue siendo un bloqueo de la entrega competitiva y no se da por resuelta con mock.
