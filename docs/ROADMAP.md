# Roadmap de hackatón

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
