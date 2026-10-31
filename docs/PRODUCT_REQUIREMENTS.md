# Requisitos y aceptación

Versión inicial, 27-10-2026. Esta tabla distingue la base de desarrollo del MVP competitivo. Las pruebas automatizadas verifican comportamiento del software; no verifican exactitud científica.

| Módulo | Base requerida | Aceptación del MVP posterior |
| --- | --- | --- |
| M01 Catálogo | Ocho nombres candidatos, ID estable, nombre común, estado taxonómico y procedencia; validación de estructura. | Validar cada nombre contra fuente taxonómica/versionada; registrar aceptado/sinónimo y revisión humana. Fichas con contenido autorizado y fuentes. |
| M02 Identificación | Contrato tipado, preparación de entrada, estados de carga/error y adaptador mock rotulado; abstención sin probabilidades inventadas. | Fotografía autorizada → segmentación → candidatos → contexto → respuesta estructurada. Probar Muse Spark/SAM 3.1 con claves backend, timeout y errores. Abstenerse ante evidencia insuficiente. |
| M03 Atlas | Vista MapLibre y estados vacíos; geometrías sintéticas separadas del mundo real. | Observaciones con procedencia, ficha vinculada, área de interés verificada y coordenadas consentidas; atribución de capas. |
| M04 Bosque | Contrato de altura estimada, fuente/licencia y pipeline raster documentado; sin descarga global. | Ventana CHMv2 validada, estadísticas con nodata/CRS/unidades y advertencia de incertidumbre. No presentar crecimiento anual. |
| M05 Explorar | Navegación entre inicio, especies, atlas, identificar y proyecto; diseño responsive accesible. | Recorrido turístico comprensible, fotografías con derechos y lugares/rutas solo desde fuentes verificables. No usar el mapa como garantía de seguridad de senderos. |
| M06 Evaluación | Metodología, formato de casos y pruebas con mocks. | Dataset permitido con separación de evaluación; Top-1/Top-3 cuando aplique, errores, abstención, latencia y comparación reproducible. Publicar resultados con tamaño de muestra y límites. |

## Requisitos transversales

- Las vistas muestran si el contenido es provisional, sintético, mock o real. Un error API no se transforma silenciosamente en un resultado de IA.
- No solicitar coordenadas precisas como requisito para aprender botánica. Ninguna clave de Meta aparece en cliente, URL, bundle o logs.
- Controles etiquetados, foco visible, navegación por teclado, mensajes asociados al campo y contenido utilizable sin mapa/WebGL. Respetar movimiento reducido.
- API valida entradas de usuario y devuelve errores explícitos; OpenAPI es la fuente del contrato. Fixtures de frontend deben ajustarse a ese contrato.
- Persistencia, seguridad, consentimiento, retención y recuperación deben estar resueltos antes de un despliegue público. La configuración local no acredita un servicio de producción.

## Criterios de salida

### Expediciones backend, 29-10-2026

El recorrido autorizado es expedición de referencia → una a tres fotos del mismo ejemplar →
candidatos/abstención y siguiente foto recomendada → registro personal → colección privada →
pregunta hablada o escrita y respuesta con fuentes. No se modifica web/móvil en este incremento.
José integra los [contratos](API_INTEGRATION.md); producto puede revisar esta estrategia sin
atribuir entregables competitivos a Fabiana mientras no exista autorización del organizador.

No hay navegación a árboles ni senderos verificados. No se incentiva recolectar, manipular,
salir de senderos habilitados o repetir capturas para obtener puntos. Ubicación opcional,
sin ranking; completar el objetivo educativo no requiere taxón ni GPS. Una sugerencia IA
no es identificación verificada y el servicio no dispone todavía de revisión científica.
Texto accesible acompaña la narración del dispositivo. Audios/transcripciones son efímeros.

La demo funcional con mocks es software comprobado, no precisión botánica ni STT español
evaluado. Pruebas reales requieren derechos externos, presupuesto nuevo y material permitido.
La captura pública científica, crecimiento y aplicaciones industriales quedan pendientes.

El bootstrap se revisa con las verificaciones del README y el [informe](BOOTSTRAP_REPORT.md). Para la entrega competitiva agregar evidencia de una llamada real Meta, dataset/licencias, evaluación, demo reproducible, video de tres minutos y revisión del portal oficial. No atribuir trabajo a Fabiana como participante sin autorización registrada.

## Ampliación a ecosistema — 31-10-2026

La tabla M01–M06 conserva los requisitos del 27-10-2026, centrados en árboles. Desde esta
fecha la definición vigente es la [visión de ecosistema](PRODUCT_VISION_ECOSYSTEM.md), con
el piloto en el [Parque Nacional Puyehue](PILOT_PUYEHUE.md). Los módulos nuevos son
requisitos, no funciones implementadas:

| Módulo | Base requerida | Aceptación |
| --- | --- | --- |
| M07 Fauna | Fichas educativas de especies documentadas por CONAF, con fuente y RCE con ámbito | Sin identificación por IA ni ubicaciones; observación registrable sin foto ni taxón |
| M08 Fungi | Categoría taxonómica propia; candidatos regionales separados de la presencia en el parque | Sin consumo ni recolección; presencia solo con ocurrencia verificada |
| M09 Conservación | [`ConservationAssessment`](RCE_CONSERVATION_2026.md) por ámbito | Categorías regionales no colapsadas; ausencia en la nómina ≠ LC |
| M10 Parque y gemelo digital | [Entidades](ECOSYSTEM_DATA_MODEL.md) con fuente, CRS y fecha; siete tipos de evidencia | Ningún sendero, punto de fauna ni hotspot inventado; no es tiempo real |
| M11 Cinco pantallas | Descubrir, Mapa, Enciclopedia, Mi diario y Perfil diferenciados | Estados de evidencia visibles; sin cifras ficticias ni «Ver en 3D» sin activos |
| M12 Aventura y progresión | Misiones educativas e insignias por conocimiento | Sin especies EN/CR obligatorias, sin GPS obligatorio, sin salir del sendero |

Los requisitos transversales anteriores siguen vigentes.
