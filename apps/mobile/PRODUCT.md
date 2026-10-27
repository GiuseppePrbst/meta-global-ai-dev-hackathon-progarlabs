# Product

<!-- impeccable:product-schema 1 -->

Registro de producto de la app móvil Bosque Vivo Chile, versión 27-10-2026. Deriva de [docs/](docs/README.md) y de [docs/product](../../docs/product/) del repositorio; las decisiones detalladas viven allí y este archivo no las sustituye. El vocabulario sigue el [glosario](docs/GLOSSARY.md).

## Platform

android

Expo (React Native) con dev client. Android es la plataforma de referencia para diseño, pruebas y demo: convenciones Android/Material. iOS (simulador) debe funcionar correctamente, sin adaptar su lenguaje de diseño.

## Users

Dos públicos primarios con el mismo peso, ambos personas adultas:

- **Turista adulto en terreno**: aprende durante una visita al entorno de Puyehue, con el móvil en la mano, luz variable y conectividad irregular. No debe confundir el mapa con una ruta oficial ni verse obligado a activar GPS.
- **Adulto que aprende botánica**: quiere distinguir rasgos y entender por qué aparecen ciertos candidatos o por qué la identificación se abstiene.

Ambos comparten el recorrido P0: foto → candidatos o abstención → ficha → borrador → observación. Guardaparques, profesionales ambientales y organizaciones territoriales son públicos secundarios: el producto conserva la trazabilidad que necesitan, pero la app no se diseña primero para ellos.

Las personas son hipótesis de diseño, no usuarios investigados ([PERSONAS.md](../../docs/product/PERSONAS.md)). La app es solo para personas adultas.

## Product Purpose

Que una persona adulta en terreno pueda fotografiar un árbol, recibir candidatos o una abstención honesta, consultar la ficha de la especie, registrar una observación trazable y ubicarla en el territorio, viendo en todo momento qué es provisional, estimado, mock o no configurado.

La app Expo es el cliente de la demo competitiva de la hackatón (28-oct → 4-nov-2026); la web queda congelada como banco de pruebas ([ADR 0001](docs/adr/0001-app-movil-como-cliente-de-la-demo.md)). Éxito para la demo: el recorrido P0 funciona de punta a punta en un Android físico contra la API desplegada. Éxito de producto (por validar): las personas entienden la abstención, encuentran la fuente y completan el recorrido.

## Positioning

Conecta individuo, bosque y territorio con procedencia visible. Frente a una etiqueta de especie aislada o una respuesta conversacional, la app muestra qué sabe, qué estima y qué no puede resolver: candidatos sin falsas probabilidades, abstención como resultado útil, estado taxonómico provisional, altura de copa rotulada como estimación y fuentes cerca del dato.

## Operating Context

- Uso en exterior, con una mano, luz variable y red irregular. La app tolera desconexión (catálogo en caché con fecha, borradores locales con envío manual), pero no es offline-first; identificar exige red y lo dice antes de capturar.
- Navegación principal de cuatro pestañas: **Identificar**, **Especies**, **Atlas**, **Registro**. «Acerca de» y Ajustes viven en un menú secundario.
- Confirmación de mayoría de edad una vez (revocable) y confirmación de derechos para cada fotografía ([privacidad](docs/PRIVACIDAD_Y_CONSENTIMIENTO.md)).
- Piloto de referencia: Puyehue y su entorno, sin asociación oficial con el parque.
- Distribución de la demo: APK *preview* con EAS en Android físico ([distribución](docs/DISTRIBUCION.md)).

## Capabilities and Constraints

| Prioridad | Capacidad |
| --- | --- |
| P0 | Descubrimiento (cámara/galería → derechos → identificación → candidatos o abstención → ficha → borrador → observación); Catálogo con ficha y caché |
| P1 | Atlas 2D con lista textual equivalente; Registro de borradores y observaciones enviadas |
| P2 | Atlas 3D (terreno, imagen satelital, altura de copa CHMv2) y panel Bosque, condicionados al spike y a licencias |
| Fuera | Mapa offline, cuentas, interacción por voz, telemetría de terceros |

Restricciones que el diseño debe respetar:

- Estados visibles distintos, con texto y no solo color: provisional, modo demostración (mock), abstención, estimado, no configurado (503), no implementado (501), sin conexión, datos en caché ([arquitectura](docs/ARQUITECTURA.md#estados-visibles)).
- Un error nunca se presenta como resultado de identificación; la abstención no se presenta como error; el orden de candidatos no es una probabilidad.
- Un Candidato no se convierte por sí solo en la especie de una Observación: la persona la elige.
- La foto se recodifica sin EXIF, nunca se adjunta a una observación ni llega al servidor; la ubicación es opcional por observación y está apagada por defecto.
- El mapa no es guía de rutas ni garantía de seguridad; ningún encuadre se presenta como límite oficial. Toda exageración vertical se rotula.
- Textos en `es-CL`, externalizados desde el inicio.
- Contratos de API y diseño visual: propuestas no decididas ([contratos](docs/CONTRATOS_API.md)).

## Brand Commitments

- Nombre: **Bosque Vivo Chile**. Identidad propia, sin relación con ProGarLabs: la referencia blanco/púrpura de [DESIGN_PRINCIPLES.md](../../docs/product/DESIGN_PRINCIPLES.md) no aplica a la app.
- Voz: honesta sobre la incertidumbre y la procedencia; el lenguaje del [glosario](docs/GLOSSARY.md) es vinculante (p. ej. «Observación», no «avistamiento»; «Candidato», no «match»).
- Naturaleza sin ficción científica: no presentar un paisaje inventado como Puyehue.

## Evidence on Hand

- Catálogo inicial de ocho especies candidatas, todas *provisionales* hasta validación taxonómica.
- Documentación de decisiones en [docs/](docs/README.md) y dos ADR aceptados.
- **No existen**: fotografía autorizada del área, entrevistas o pruebas con usuarios, métricas de precisión del modelo, datos de adopción ni asociación oficial con el parque. No fabricarlos. Hasta tener fotografía autorizada, usar ilustración conceptual rotulada.
- Hepta, LiDAR, imágenes aéreas de terceros e infraestructura son RESTRICTED: no usarlos como imagen, fixture ni derivado ([DATA_GOVERNANCE.md](../../docs/DATA_GOVERNANCE.md)).

## Product Principles

1. **La evidencia acompaña al resultado.** Fuente, estado taxonómico, fecha y límites junto a la ficha o capa, no en una página legal.
2. **La incertidumbre es un estado útil.** La abstención sugiere una nueva toma; nada se presenta como más seguro de lo que es.
3. **Una acción clara por paso.** Capturar, revisar, interpretar, guardar; navegación reconocible entre foto, ficha y atlas.
4. **Privacidad proporcional.** Nada se infiere como consentimiento; GPS opcional; la foto no sale del dispositivo más allá de la identificación.
5. **El terreno manda.** Una mano, luz variable, red irregular: la app debe seguir siendo útil y honesta sin conexión.

## Accessibility & Inclusion

Requisitos no negociables: etiquetas accesibles, objetivos táctiles amplios, contraste suficiente, texto escalable, anuncios de carga y error para lectores de pantalla, respeto de movimiento reducido y lista textual equivalente al mapa. Los estados se comunican con texto, no solo con color. No declarar accesibilidad certificada por un checklist o una prueba automatizada aislada; probar comprensión con personas adultas.
