# Evaluación de IA

**Estado inicial:** no se ha ejecutado evaluación de Muse Spark, SAM 3.1 o DINOv3. No hay precisión botánica, calibración ni latencia de modelo acreditadas. Las pruebas con mock verifican contratos, abstención y fallas del software.

## Pregunta

¿El flujo fotografía → segmentación → candidatos → razonamiento contextual mejora identificación y utilidad frente a imagen sin segmentar, y cuándo debe abstenerse? La evaluación no pretende diagnosticar sanidad forestal ni predecir crecimiento.

## Casos y derechos

Construir un manifest con `case_id`, hash, fuente, licencia/consentimiento, etiqueta y taxón/version, revisor, tipo de toma, partición y dificultad. Mantener fotos autorizadas en almacenamiento permitido; usar rutas/IDs locales en logs públicos. No imágenes Hepta ni fotos con personas/EXIF sensible. Incluir hojas, corteza, árbol completo, mala luz, oclusión, varias plantas, especies fuera de catálogo e imágenes sin árbol. Un revisor competente resuelve etiquetas ambiguas o las excluye de métricas de acierto.

Separar desarrollo/selección de evaluación final; no repetir individuos casi idénticos entre particiones. Conservar una partición fija y lista explícita de exclusiones. La muestra inicial pequeña sirve para detectar fallas, no para generalizar a toda la flora de Chile.

## Métricas y denominadores

- **Top-1 / Top-3:** acierto del primer candidato o dentro de hasta tres, entre casos etiquetados elegibles; publicar también tasa global incluyendo abstenciones como no acierto. No comparar denominadores distintos.
- **Abstención:** casos sin propuesta / entradas válidas; informar aciertos condicionados a respuesta y errores peligrosos evitados/perdidos.
- **Errores:** falso taxón, fuera de catálogo, respuesta inválida, timeout y error de proveedor. Separar problemas de transporte de calidad del modelo.
- **Latencia:** tiempo total y por etapa, mediana y p95 cuando la muestra lo permita; contar fallos y documentar número de repeticiones/calentamiento.
- **Segmentación:** revisión de máscara y, si hay máscaras humanas autorizadas, IoU con protocolo fijado. No asumir que una máscara visualmente plausible identifica una especie.

No mostrar porcentajes de confianza como probabilidades sin un experimento de calibración independiente. Preferir rasgos observados, candidatos ordenados y razones para abstenerse.

## Protocolo reproducible

1. Congelar manifest, catálogo, commit, prompts y nombres/versiones de modelos y parámetros compatibles con documentación vigente.
2. Ejecutar mismas entradas en alternativa A (imagen) y B (segmentación + imagen/contexto), con límites y timeout constantes. DINOv3 solo si existe un baseline y presupuesto.
3. Guardar ID de ejecución, modo real/mock, versión, latencias, errores, candidatos y decisión; excluir contenido sensible y secretos.
4. Calcular métricas desde resultados crudos permitidos, revisar discrepancias y publicar comando, tamaño de muestra, exclusiones y limitaciones.
5. Una persona revisa resultados antes de usarlos en UI, video o afirmaciones de precisión.

Formato y ejecución se desarrollan en `evaluations/`; [BV-08](BACKLOG.md) es el trabajo pendiente. Un resultado de demo aislado no reemplaza este protocolo.
