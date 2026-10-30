# Adaptadores botánicos

Biblioteca ligera instalada junto a la API. `Identifier` define la respuesta tipada;
`MockIdentifier` siempre devuelve `insufficient_evidence`, `provider: mock`, lista vacía
y modelo nulo. No hay probabilidades ni identificaciones fingidas.

`MetaResponsesClient` prepara solicitudes HTTP Responses, usa `SecretStr`, timeout,
errores sanitizados y `store: false`. `MuseSparkAdapter.describe` solicita rasgos
visibles y devuelve texto; no convierte ese texto en una especie. `SAMAdapter.segment`
devuelve el protocolo textual sin decodificar máscaras. Ninguno está conectado a la ruta
de identificación. Los tests usan `httpx.MockTransport`, nunca una clave real.

Los modelos son argumentos del constructor. Referencias oficiales consultadas el
27-10-2026: [quickstart](https://dev.meta.ai/docs/quickstart),
[Responses](https://dev.meta.ai/docs/protocols/responses),
[SAM segmenting](https://dev.meta.ai/docs/sam/segmenting) y
[Muse Spark](https://dev.meta.ai/models/muse-spark).
Quickstart muestra `https://api.meta.ai/v1` y `muse-spark-1.3`. Los ejemplos SAM
usan `sam-3.1`, aunque su página comercial muestra `sam-3-1`: verificar el identificador
habilitado para la cuenta antes de una prueba real. No se hizo esa prueba.

Antes de activar IA: revisar condiciones para mayores de 18 años, acceso y retención;
validar consentimiento y derechos; decodificar máscaras con el parser oficial;
construir candidatos restringidos al catálogo; validar JSON con Pydantic; medir abstención,
errores y latencia en un conjunto permitido. El texto del proveedor es entrada no confiable.
`store: false` no sustituye revisar los términos de uso y retención del proveedor.

No se incluyen DINOv3, pesos ni dependencias GPU. Investigación opcional y licencias
de los pesos deben revisarse por separado. Hepta y sus derivados quedan excluidos.

## Implementación GIS/ML

MuseSparkAdapter.identify usa JSON Schema por Chat Completions, valida Pydantic y restringe
IDs al catálogo suministrado. Responses permanece para describe y SAM. segment_typed aplica
el parser oficial meta-sam-parser 0.1.0, valida máscaras y devuelve estados sin simular datos.
El endpoint integra SAM opcional y conserva la imagen preparada cuando falla.
Se probaron Muse/SAM reales sobre dibujo sintético, con evidencia sanitizada y consumo
Muse; no demuestra precisión botánica. Ver [reporte](../../docs/GIS_ML_REPORT.md).

## Expediciones

identify admite hasta tres vistas del mismo ejemplar con evidencia y recomendación de
siguiente foto, sin cambiar los estados anteriores. MetaVoiceAdapter añade ASR WAV efímero;
query_guide implementa ciclo Muse limitado a cuatro herramientas de lectura y dos llamadas.
Se reutiliza MetaResponsesClient y httpx; no se añaden SDKs, pesos ni TTS obligatorio.
Protocolos probados con mocks; las nuevas integraciones no tienen prueba real autorizada.
[Contratos y operación](../../docs/API_INTEGRATION.md).
