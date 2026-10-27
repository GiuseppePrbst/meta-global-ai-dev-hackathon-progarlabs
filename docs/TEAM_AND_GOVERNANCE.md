# Equipo y gobernanza

Estado: 27 de octubre de 2026. Bosque Vivo Chile es un proyecto de ProGarLabs SpA, Osorno, Chile. Los roles siguientes son responsabilidades funcionales; no restringen quién puede modificar código ni determinan la autoría Git.

## Responsabilidades

| Persona | Función y decisiones | Entregables e interfaces |
| --- | --- | --- |
| José Schwerter | Frontend & UI/UX Lead. Decide arquitectura web, componentes, interacción, diseño responsive, accesibilidad, MapLibre y rendimiento visual dentro de los requisitos acordados. | Aplicación web, captura de fotografías, fichas, atlas, experiencia turística y pruebas de interfaz/E2E. Recibe contratos de Giuseppe y criterios de producto; acuerda cambios de API antes de integrarlos. |
| Fabiana García | Product Designer y cofundadora de ProGarLabs. Define problema, públicos, discovery, estrategia, funcionalidades, priorización, journeys, arquitectura de información y viabilidad empresarial de largo plazo. | Hipótesis, criterios de aceptación y visión comercial. Su rol de producto se conserva, pero cualquier aporte directo a la entrega competitiva requiere primero aclarar su elegibilidad con los organizadores. No implementa por definición los componentes frontend: esa responsabilidad principal corresponde a José. |
| Giuseppe Proboste | GIS & Machine Learning Lead. Decide arquitectura IA/GIS, integración Meta, Muse Spark/SAM 3.1, experimentos DINOv3, imágenes, teledetección, fotogrametría/LiDAR, raster/vector, CHMv2 y evaluación científica. Puede decidir arquitectura transversal cuando afecte integraciones. | API y contratos, trazabilidad de datos, pipeline geoespacial, evaluación reproducible y límites del modelo. Entrega a José resultados estructurados y explica incertidumbre; contrasta necesidades con producto. |

## Empresa y participación competitiva

Fabiana no fue admitida inicialmente, según la información entregada por ProGarLabs. **No se la declara participante oficial ni autora de aportes competitivos.** Mantener separada la planificación empresarial de largo plazo. Registrar una autorización escrita de los organizadores antes de integrar o atribuir aportes suyos a la entrega.

La admisión de cada participante, el representante oficial y la composición final del equipo deben verificarse contra el portal del evento; el cargo empresarial o acceso a GitHub no acredita admisión. El repositorio no prueba esas admisiones. Como control conservador del proyecto, no superar cuatro participantes y mantener una sola entrega, sujeto a la verificación final de las reglas del Startup Track.

## RACI simplificada

R = realiza; A = responde por la decisión; C = consultado; I = informado. Esta matriz describe colaboración funcional, no permisos técnicos.

| Actividad | José | Fabiana (ámbito empresarial) | Giuseppe |
| --- | --- | --- | --- |
| Visión, segmentos y prioridades de largo plazo | C | A/R | C |
| UI, componentes, móvil y accesibilidad | A/R | C* | C |
| Contratos API y persistencia | C | I* | A/R |
| Taxonomía, fuentes y licencias de datos | C | I* | A/R |
| IA, GIS y evaluación cuantitativa | C | I* | A/R |
| Journeys y aceptación empresarial | R | A/R | C |
| Entrega competitiva y evidencia técnica | R | Sin asignación hasta autorización | R |

\* Para trabajo que afecte directamente la entrega, consultar o integrar aportes de Fabiana solo tras resolver la elegibilidad. La documentación de estos roles fue elaborada como bootstrap asistido; no acredita que las personas hayan realizado los entregables.

## Colaboración y decisiones

- José puede avanzar en `apps/web/` con fixtures rotulados y el contrato OpenAPI; Giuseppe puede avanzar en `services/`, `data/` y `evaluations/`. Cambiar un contrato requiere acordar ejemplo válido, ejemplo de error y prueba de integración.
- Resolver decisiones reversibles en el PR; registrar decisiones de arquitectura y su motivo en `docs/ARCHITECTURE.md`. Desacuerdos de alcance se resuelven contra criterios de aceptación y la fecha de entrega.
- Cualquier integrante puede colaborar fuera de su especialidad. No crear CODEOWNERS con cuentas no confirmadas ni asignar usuarios GitHub por deducción de sus nombres.
- Publicar solo desde cuentas personales autorizadas y con correo Git verificable. La persona que ejecuta Git conserva su identidad real; el uso de asistencia automatizada se declara en el registro de contribuciones. Los roles anteriores no autorizan suplantar autores.
- PR hacia `main`, checks antes de integrar y revisión humana; preferir squash merge. No force-push a `main`, reescritura destructiva ni merge automático del bootstrap.
- El representante oficialmente admitido revisará requisitos, contribuciones preexistentes, derechos y entrega final. Su designación queda pendiente de confirmación humana.
