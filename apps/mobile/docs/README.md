# App móvil Bosque Vivo Chile: documentación

Estado 27-10-2026: **planificación**. La app todavía no existe; estos documentos registran las decisiones tomadas para construirla. Los contratos de la API son una propuesta y el diseño visual no está decidido.

| Documento | Contenido |
| --- | --- |
| [../PRODUCT.md](../PRODUCT.md) | Registro de producto para trabajo de diseño: usuarios, propósito, restricciones, marca y accesibilidad |
| [PLAN.md](PLAN.md) | Objetivo, alcance por prioridad, cronograma 28-oct → 4-nov, bloqueos y riesgos |
| [ARQUITECTURA.md](ARQUITECTURA.md) | Stack, estructura, capas, estados visibles, errores, Atlas 2D/3D y conectividad |
| [CONTRATOS_API.md](CONTRATOS_API.md) | Endpoints consumidos, mapeo a dominio y brechas/propuestas de contrato |
| [PRIVACIDAD_Y_CONSENTIMIENTO.md](PRIVACIDAD_Y_CONSENTIMIENTO.md) | Confirmaciones, fotografías, ubicación, datos locales y terceros |
| [DISTRIBUCION.md](DISTRIBUCION.md) | Dev build, APK *preview* con EAS y qué implica distribuirlo |
| [PRUEBAS.md](PRUEBAS.md) | Niveles de prueba, casos mínimos y registro de ejecución |
| [OPCIONAL_INTERACCION_POR_VOZ.md](OPCIONAL_INTERACCION_POR_VOZ.md) | Funcionalidad opcional fuera de la demo, con recomendación |
| [GLOSSARY.md](GLOSSARY.md) | Lenguaje del dominio; propuesto para promoverse a la raíz |
| [adr/](adr/) | Decisiones difíciles de revertir |

## Decisiones clave

- La app Expo es el cliente de la demo competitiva; la web queda como banco de pruebas ([ADR 0001](adr/0001-app-movil-como-cliente-de-la-demo.md)).
- El Atlas usa MapLibre GL JS en un Expo DOM component para tener 2D siempre y 3D opcional ([ADR 0002](adr/0002-atlas-con-maplibre-gl-js-en-dom-component.md)).
- La foto se recodifica sin EXIF y nunca llega al servidor; la ubicación es opcional por observación.
- Tolerancia a desconexión, no offline-first; sin cuentas ni telemetría de terceros en el MVP.

## Responsables

José lidera la responsabilidad funcional de la app; Giuseppe la de API, GIS y modelos. Todas las personas pueden colaborar en cualquier módulo.
