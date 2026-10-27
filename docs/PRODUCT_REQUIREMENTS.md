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

El bootstrap se revisa con las verificaciones del README y el [informe](BOOTSTRAP_REPORT.md). Para la entrega competitiva agregar evidencia de una llamada real Meta, dataset/licencias, evaluación, demo reproducible, video de tres minutos y revisión del portal oficial. No atribuir trabajo a Fabiana como participante sin autorización registrada.
