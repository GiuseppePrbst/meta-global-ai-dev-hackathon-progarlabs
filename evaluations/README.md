# Evaluación reproducible

No existen imágenes evaluadas, inferencias reales ni métricas de precisión publicadas.
Los tests de adapters prueban contrato/transporte con mocks; no miden capacidad botánica.

## Protocolo inicial

- Manifestar cada imagen con `sample_id`, hash, licencia y derechos de procesamiento,
  fuente, split, etiqueta de referencia revisada, revisor y condición visual.
- Separar por individuo y sesión de captura para evitar fugas entre desarrollo y test.
  Incluir ocho especies candidatas, especies externas y casos sin suficiente evidencia.
- Estratificar por hoja/corteza/árbol completo, iluminación, desenfoque, oclusión y
  fondo complejo; no crear estratos con imágenes sin derechos suficientes.
- Congelar versiones del catálogo, prompt, modelos, parser SAM y preprocesamiento.
  Comparar Muse solo con SAM+Muse sobre los mismos casos y parámetros documentados.
- Registrar Top-1 y Top-3 contra etiquetas, abstenciones, errores API por tipo, duración
  total y por etapa. Publicar denominadores, tamaño de muestra y resultados por estrato.
- La precisión sobre todos los casos cuenta errores y abstenciones como no aciertos;
  informar también cobertura y precisión condicionada a respuestas para no ocultarlos.
- No convertir el texto de un modelo o el score de segmentación en una probabilidad
  calibrada de especie. La calibración requiere datos y metodología propios.
- Revisar falsos positivos fuera del catálogo y decisiones inseguras antes de activar
  IA. Una abstención clara es preferible a una identificación sin evidencia.

La evidencia de una corrida debe registrar comando, commit, entorno, fecha, modelo,
dataset permitido, hashes y resultados. Nunca publicar claves, imágenes RESTRICTED,
coordenadas sensibles o payloads completos en logs. Los resultados ausentes se
reportan como `no ejecutado`, nunca como cero errores o precisión perfecta.

Responsable funcional: Giuseppe Proboste. José puede desarrollar estados UI con el
mock mientras se prepara el conjunto permitido. La autorización competitiva de cada
contribución sigue la gobernanza del proyecto.
