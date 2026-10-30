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

## Implementación del 27-10-2026

Runner A/B y métricas implementados; [comandos y manifiesto](../evaluations/README.md).
Sin dataset etiquetado permitido: cero casos evaluables, Top-1/Top-3 no disponibles.
[Prueba real](../evaluations/meta-access-2026-10-27.json): Muse abstuvo ante dibujo sintético;
SAM decodificó una máscara. Es verificación de integración, no precisión. No se ejecutó
comparación científica A/B. La segmentación fallida conserva original y su estado en B;
analizar ese subgrupo por separado. No confundir fallback con máscara válida.

Manifiesto exige individual_id, partición, revisor, SHA-256, especie, fuente/licencia y
autorización. external_processing_authorized es falso por defecto: permiso local para Hepta
no autoriza Meta. El runner rechaza transferencias sin autorización por caso y bandera explícita.
Mocks nunca producen tasas de precisión. Reporta número ejecutado/evaluable, errores, abstención,
latencias totales y por etapa. Desglose de etapas excluye preprocesamiento del tiempo de modelo;
el preprocesamiento ocurre antes de la corrida cronometrada. No atribuirlo a latencia extremo a extremo.

## Contexto y experimento acotado, 27-10-2026

El usuario confirmó que no hay conjunto con etiquetas humanas: n=0. No se ejecutaron
A/B/C/D/E ni se declaró mejora de contexto. [Protocolo](../evaluations/forest-context-protocol.json)
fijado antes de medir: mismos individuos, campañas/bloques separados, hashes exactos y
revisión perceptual de casi duplicados; negativos fuera del catálogo y métricas separadas
por terreno/dron. A/B mantienen Muse/SAM existentes; C queda condicionado a datos/recursos;
D usa el mejor baseline medido y contexto real suave; E permuta contexto con semilla fija.
Sin etiquetas/modelos/IoU humanos no hay precisión científica. Cero llamadas pagadas nuevas.

Los tests prueban contexto y taxonomía de polígonos, no botánica de fotografías. El runner
anterior no implementa todas las validaciones de campaña/bloque/perceptual del protocolo
nuevo: deben completarse al admitir el dataset antes de ejecutar ese experimento.
No generar miles de labels mediante spatial join, ni usar la salida del modelo como verdad.
Los libros/PPTX son referencias protegidas; libro y extracto duplicado son la misma fuente.
# Evidencia del 29-10-2026

[Recibo de consolidación](../evaluations/backend-validation-2026-10-29.json): SAM+Muse reales
por HTTP con dibujo sintético autorizado, abstención sin candidatos; esto no evalúa botánica.
Runner vacío devuelve not_evaluated, n=0 y métricas nulas. Casos reales requieren campaña,
bloque y grupo perceptual/revisión humana; validación de particiones incluye esas claves.
No mezcla tipos de fotografía. No se ejecutaron C/D/E ni se midió mejora por contexto.
Los contadores de uso y estimaciones por tarifa no son cargos observados.

## Expediciones y voz — 29-10-2026

Prompt `botanical-multiview-v3`: hasta tres vistas del mismo individuo; una foto conserva
contrato. Con SAM, solo primaria segmentada; adicionales originales. El indicador
`use_segmentation` permite A/B explícito con igual conjunto de fotos. No se ejecutó A/B
real ni se midió beneficio. El manifiesto de fotos sigue vacío: n=0, precisión no evaluada.
No se sustituyen etiquetas humanas por rasgos bibliográficos o composición de polígonos.

Tests nuevos usan imágenes/WAV sintéticos y `httpx.MockTransport`. Cubren audio truncado,
codec/duración, texto español, nombres botánicos, protocolo de tool calling, límite de
llamadas, argumentos/identidad, referencias no consultadas, falta de fuentes y timeout.
No miden WER/CER, latencia real, acierto taxonómico, robustez a inyección ni utilidad turística.
Antes de una prueba real: consentimiento externo, presupuesto NUEVO, acceso/créditos,
Standard Mode y material permitido; mantener audios y fotos fuera del repositorio.
Propuesta mínima: audios españoles con los diez términos de VOICE_GUIDE, transcripción
humana, WER/nombres exactos y latencia/uso; preguntas con fuentes y revisión humana.
Es una propuesta, no una evaluación ejecutada. [Informe](META_EXPEDITIONS_REPORT.md).

## SAM espacial y evaluación botánica — 30-10-2026

Implementado y probado solo con datos sintéticos: prompts espaciales, correcciones,
confianza opcional, métricas de máscara/tracking contra referencias humanas y desglose
`by_photo_type` en `summarize`. **No se ejecutó ninguna inferencia nueva** y no hay
casos validados: n = 0. La confianza de SAM no es IoU ni probabilidad; Top-k no se calcula
con mocks. Protocolo A–F, negativos y benchmarks aéreos en
[BOTANICAL_EVALUATION.md](BOTANICAL_EVALUATION.md). Diagnóstico y campaña pagada propuesta
en [SAM_SPATIAL_RESEARCH.md](SAM_SPATIAL_RESEARCH.md).
