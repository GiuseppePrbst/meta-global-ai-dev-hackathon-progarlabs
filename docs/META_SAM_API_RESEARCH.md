# Meta SAM 3.1 API Visual Lab — 30-10-2026

Se obtuvo una máscara real de vegetación en fotografía mediante Meta Model API.
Dos solicitudes sobre un mismo clip real completaron sin coincidencias: **cero tracks
reales**, sin afirmar seguimiento positivo. Visor privado y videos comparativos generados.
La selección y evaluación siguen parciales; este informe no mide precisión científica.

## A. GitHub y alcance

Rama `feat/meta-sam-api-visual-lab`, apilada sobre `feat/meta-expeditions-gis-ml` (#18),
que depende de #17. Identidad personal autorizada: GiuseppePrbst. PR abierto para
revisión, sin merge ni reescritura. El enlace y SHA actuales constan en el PR y entrega.
Código nuevo en `tools/meta_sam_api_lab/`, tests, controles de publicación y documentación.
No se cambian `apps/web/`, `apps/mobile/` ni sus recorridos; José conserva su interfaz.

## B. Fuentes y preparación

ZIP autorizado de 2.088.056.140 bytes; cuatro entradas, 2.088.055.374 bytes sin comprimir:
MP4, LRF, SRT y TXT. Inventario privado con SHA-256, tamaño, nombres y candidatos a
duplicado. Validación de traversal, nombres Windows inseguros, enlaces, cifrado, ratios,
cuotas, espacio, CRC y sobrescritura antes/durante la extracción. Solo se extrajo el MP4;
telemetría y originales se conservaron sin publicación.

Video fuente H.264, 1920×1080, aproximadamente 160,86 s. Preparación con FFmpeg/FFprobe
8.1.1: clips de cinco segundos, 640×360, 10 FPS, 50 frames, sin audio ni metadatos.
Se prepararon tres intervalos; solo el primero recibió dos inferencias SAM.
Otro intervalo aportó una imagen; el tercero llegó a upload, sin inferencia SAM.
Manifiestos privados conservan orientación, escala, hash y tiempo inicial. El frame
preparado `i` tiene tiempo relativo `i/10`; no se traslada su caja al original sin escala.

OneLake: se inspeccionó esquema real y seleccionaron 20 candidatas positivas y 10 controles
mediante etiquetas operativas. Se descargaron 12 positivas y 6 controles; enlaces restantes
no disponibles. Incluyendo una descarga inicial repetida: 19 ficheros, 18 hashes únicos.
Se leyeron siete logs Delta, siete archivos activos y 258 filas proyectadas; lectura
Parquet por rangos de 788.060 bytes, sin descargar toda la tabla. Identificadores,
URLs, fechas/tramos y deduplicación se conservan solo en el manifiesto privado.
No se demuestra independencia por vuelo ni ausencia real de vegetación en los controles.

Hardware de preparación: Windows, aproximadamente 24 GiB RAM; GTX 1650 SUPER 4 GiB
no utilizada para inferencia. Toda inferencia de esta misión ocurrió en Meta.
Antes del cambio de mandato se habían instalado dependencias PyTorch y un checkpoint
SAM 2 bajo la misión local anterior. Se desinstalaron torch/torchvision y eliminó ese
checkpoint al cambiar el mandato; nunca se ejecutó inferencia local. No se instaló SAM 3.1.

## C. Meta Model API

Base `https://api.meta.ai/v1`; clave leída de archivo privado backend. Acceso a modelos
comprobado por GET `/models`; no se encontró ni inventó una API de saldo/créditos.
SAM `sam-3.1`: POST `/responses`, SSE hasta `response.completed`, `store:false`,
`metadata.mask_encoding=one_bit`. Imágenes `input_image`; videos POST `/files`,
`purpose=user_data`, después `input_video.file_id`. DELETE `/files/{file_id}` al terminar.
Se reutiliza `MetaResponsesClient`, sin otro cliente HTTP/SDK ni nuevas dependencias.

Parser oficial `meta-sam-parser==0.1.0`, ya fijado en el lock: formatos imagen/video,
actualizaciones acumulativas, revisión más reciente por objeto/frame y terminación explícita.
Rechazos, streams incompletos y diagnósticos de error fallan; vacío completado es
`no_matches`. Límite local de salida 32 MB y de 5.000 máscaras. Cajas y raster se validan
contra el medio preparado. Un ID se mantiene con color estable; no prueba identidad biológica.
Fuentes: [segmentación](https://dev.meta.ai/docs/sam/segmenting),
[parser](https://dev.meta.ai/docs/sam/client-libraries),
[ejemplo oficial](https://dev.meta.ai/docs/cookbook/sam-api-basics).

## D. Fotografías

Cuatro solicitudes SAM de imagen, tres entradas distintas: una fotografía y dos frames.
La misma foto con `tree` devolvió cero objetos; con `vegetation` produjo una instancia
y máscara real. Los frames devolvieron cero. Ninguna comparación taxonómica ni botánica.

| Entrada genérica | Concepto | Máscaras | Latencia hasta respuesta (ms) | Imágenes reportadas |
| --- | --- | ---: | ---: | ---: |
| Frame inicial | tree | 0 | 2.369 | 1 |
| Fotografía | tree | 0 | 2.585 | 1 |
| Misma fotografía | vegetation | 1 | 8.763 | 1 |
| Frame de otro intervalo | vegetation | 0 | 1.474 | 1 |

Se guardaron originales preparados, raster binario, overlays, contornos, cajas, ID,
recorte y metadatos únicamente en almacenamiento privado. El parser oficial decodificó
la salida positiva; se validó correspondencia espacial de dimensiones, no exactitud humana.
`tree crown`, `bush` y `branches` quedan disponibles pero no se probaron con API real.

## E. Video

Dos inferencias reales del mismo clip de cinco segundos: `tree` y `vegetation`.
Meta informó 50 frames por solicitud, total 100 facturados reportados; 50 frames únicos.
Latencias de respuesta: 9.126 y 8.217 ms; no incluyen toda preparación/renderizado/DELETE.
Ambas terminaron con cero máscaras y cero tracks. Se generaron MP4 renderizados y
comparaciones lado a lado que muestran honestamente la ausencia de máscaras.

Un tercer upload preparó un ensayo espacial desde propuesta Muse. La versión de entonces
pasó floats al constructor oficial de caja y falló localmente antes de llamar a Responses;
DELETE confirmado. El manifiesto histórico conserva `provider_error`, aunque la causa
era validación local. Se corrigió floor/ceil y se movió construcción/validación **antes
de reserva y upload**. La corrección pasó pruebas sintéticas; no se repitió con API real
porque se alcanzó el techo de reservas. No se afirma tracking positivo ni calidad temporal.

## F. Muse Spark

Tres intentos de `muse-spark-1.3` con tres keyframes por intento. Primero incompleto:
alcanzó 1.200 tokens de salida sin resultado estructurado utilizable. Segundo HTTP 400
al usar `reasoning_effort=none`; la referencia actual no lo admite. Tercero con `minimal`
completó descripciones estructuradas por vista y propuesta de caja de vegetación.
No se enviaron videos completos a Muse: se probaron keyframes. Los nueve envíos de
imagen representan tres vistas únicas, no nueve muestras independientes.

El helper se mantiene explícito, fuera del flujo automático SAM. Muse orienta selección
de escena y caja aproximada; no aporta ground truth, especies confirmadas, distancias
a infraestructura ni validación de presencia. [Referencia de razonamiento](https://dev.meta.ai/docs/reasoning).

## G. Visualizador

FastAPI existente más HTML/JavaScript/Canvas, independiente y solo `127.0.0.1`.
Sin CDN, túnel o servicio público. Selección/carga, concepto, envío explícito, estados,
resultados guardados sin reinferencia, opacidad, máscaras/contornos, cajas/IDs, instancia,
video original, overlay sincronizado, avance por frame, velocidad y enlaces MP4.
Rechaza Host/Origin ajenos; CSP, no-store y lista de medios permitidos. No sirve config,
JSON de proveedor, hashes ni `file_id`. El presupuesto se verifica en backend.

[Instrucciones y CLI](../tools/meta_sam_api_lab/README.md). No se publica ninguna captura
de pantalla con medios reales. Con reservas agotadas, consultar resultados sigue funcionando;
una nueva inferencia falla cerrada. Reiniciar el visor no restituye presupuesto.

## H. Evaluación y validación

Seis solicitudes SAM completadas: cuatro imágenes y dos videos; una máscara de imagen,
cero tracks. Otros cuatro intentos reservados: dos fallos Muse, un Muse completado y
una validación espacial abortada después de upload. Sin anotaciones humanas verificadas:
IoU, Dice, recall, precisión, calidad de fronteras e ID switches **no evaluables**.
Cero coincidencias no demuestra que no exista vegetación. La muestra no es representativa.
No se entrenó, calibró ni ajustó ningún modelo. No se publica un benchmark científico.

Tests sintéticos verifican ZIP, límites, SSE/error/incompleto, Files/DELETE incluso en
error, caja entera antes de reserva, raster/contornos/crop, revisiones e intervalos de ID,
proyección privada y protecciones del visor. PostgreSQL prueba límite acumulado entre
días y compatibilidad del comportamiento diario previo. CI no hace llamadas reales.
Resultados finales de comandos se registran en el PR; Docker no está instalado localmente.

| Verificación local ejecutada | Resultado |
| --- | --- |
| Baseline Python antes del incremento, sin `TEST_DATABASE_URL` | 146 pasaron, 11 omitidos por infraestructura |
| `uv run --project services/api --extra dev --extra raster --extra data --frozen pytest -c services/api/pyproject.toml services -q`, con DB de pruebas | 170 pasaron, cero omitidos; una advertencia de deprecación TestClient/httpx |
| `ruff check services evaluations tools` y `ruff format --check services evaluations tools`, con el mismo prefijo uv | Correctos |
| `python scripts/check_repository.py` y `python -m unittest discover -s scripts/tests` | 34 archivos requeridos y enlaces/límites correctos; 2 tests |
| `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` | Correctos; 3 tests web |
| `npm run test:e2e` | 6 Playwright correctos, desktop y móvil |
| `node tools/meta_sam_api_lab/viewer.test.cjs` | Correcto; respuestas sintéticas, sin API ni medios privados |
| `docker compose config --quiet` y build de contenedores | No ejecutados localmente: Docker ausente; previstos en CI |

La advertencia de TestClient no falla tests y no motivó añadir otra dependencia.

## I. Privacidad

Autorización específica del usuario del 30-10-2026 para descargar, preparar y transmitir
estas fotos/videos a Meta actualiza la prohibición anterior **solo en esta misión**.
Clasificación RESTRICTED: sin permiso para publicación, entrenamiento, LiDAR o proveedores
adicionales. Todo medio, derivado, URL, ID, hash vinculable y respuesta detallada permanece
fuera de Git/worktrees y CI. Selección, logs y reporte detallado son privados.

Standard Mode no usa contenido para entrenamiento de Meta; no equivale a ZDR.
Files permite expiración explícita; se fijó 3.600 s y se recibió confirmación DELETE en
los tres uploads. No queda ID conocido pendiente en esta ejecución. El acuse confirma
la operación de API, no acredita eliminación instantánea de toda copia operativa/legal.
`store:false` no borra Files. No se promete una retención universal de treinta días.
Fuentes: [Files](https://dev.meta.ai/docs/file-handling),
[términos](https://dev.meta.ai/legal/terms-of-service),
[ZDR](https://dev.meta.ai/help/policies-and-privacy/zero-data-retention).

## J. Costos y límite

Nuevo techo de USD 1 autorizado expresamente por el usuario. Ledger persistente y
reservas no reembolsables: diez reservas suman **1.000.000 microUSD = USD 1**. No se
reutiliza la autorización histórica ni se devuelve presupuesto para forzar otro intento.
El nuevo límite acumulado se aplica bajo el mismo lock transaccional; cero por defecto
preserva a otros callers. La misión lo habilita en schema privado dedicado.

| Consumo reportado | Tarifa Standard consultada | Estimación USD |
| --- | --- | ---: |
| SAM: 4 imágenes | 2,50 / 1.000 imágenes | 0,01000000 |
| SAM: 100 frames | 0,20 / 1.000 frames; mínimo 50/solicitud | 0,02000000 |
| Muse: 2.017 tokens entrada | 1,25 / millón, sin aplicar descuento de caché | 0,00252125 |
| Muse: 1.868 tokens salida | 4,25 / millón | 0,00793900 |
| Total conocido estimado | No es factura ni saldo | **0,04046025** |

El error HTTP 400 y la validación local no reportaron uso de inferencia; no se inventan
cargos. La suma conocida no abre presupuesto nuevo: el techo conservador está reservado.
Créditos y factura no consultados por API. [Precios](https://dev.meta.ai/docs/pricing-rate-limits).

## K. Integración en Bosque Vivo

Transferible: recorte asistido por máscara en captura, selección explícita de instancia,
revisión visual y procedencia del resultado. Debe seguir separado de identificación
taxonómica, consentimiento y permisos de captura existentes. Muse aporta descripción
y solicitud de evidencia; SAM aporta geometría. El laboratorio no cambia OpenAPI público.

RGB y tracking no miden altura, crecimiento anual, distancia a conductores ni riesgo
eléctrico. CHMv2 sigue siendo estimación de altura de copa. Georreferenciar máscaras
requeriría calibración, poses y datos autorizados adicionales; no se implementó aquí.
Una posible integración en producto necesita validación humana antes de prometer utilidad.

## L. Cinco prioridades antes del 4 de noviembre

1. Revisar la máscara privada y crear anotaciones humanas de un subconjunto pequeño;
   registrar autor, protocolo y derechos antes de calcular IoU/Dice.
2. Revisar el ensayo espacial corregido y obtener nueva autorización de presupuesto
   si se decide probar tracking positivo; conservar resultados negativos actuales.
3. Completar enlaces 20/10 y separación por vuelo/fecha, con deduplicación perceptual
   y etiquetas específicas; no llamar negativos a controles sin revisión.
4. Elegir con José un único recorrido de captura asistida, usando contratos existentes
   y sin introducir datos privados en el atlas público.
5. Revisar PR apilados, CI, derechos y aportes competitivos; merge solo por revisión
   humana. No deducir elegibilidad del historial Git ni atribuir aportes a Fabiana.
