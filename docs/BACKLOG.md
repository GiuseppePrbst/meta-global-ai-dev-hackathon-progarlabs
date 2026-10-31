# Backlog inicial

Estado base: 27-10-2026. Los IDs son estables y las 11 issues iniciales fueron creadas con la cuenta personal verificada; su existencia no significa que estén terminadas. Responsables **funcionales propuestos**, sin asignación automática de cuentas. P0 = bloqueo de entrega; P1 = necesario en MVP; P2 = mejora; P3 = futuro. Esfuerzo relativo: 1 pequeño, 2 medio, 3 grande, 5 investigación/incertidumbre.

| Epic / tarea | Issue publicada |
| --- | --- |
| E01 / BV-01 Foundation | [#1](https://github.com/GiuseppePrbst/meta-global-ai-dev-hackathon-progarlabs/issues/1) |
| E02 / BV-02 Product Design | [#2](https://github.com/GiuseppePrbst/meta-global-ai-dev-hackathon-progarlabs/issues/2) |
| E03 / BV-03 Frontend & UX | [#3](https://github.com/GiuseppePrbst/meta-global-ai-dev-hackathon-progarlabs/issues/3) |
| E04 / BV-04 Botanical Knowledge | [#4](https://github.com/GiuseppePrbst/meta-global-ai-dev-hackathon-progarlabs/issues/4) |
| E05 / BV-05 Meta AI | [#5](https://github.com/GiuseppePrbst/meta-global-ai-dev-hackathon-progarlabs/issues/5) |
| E06 / BV-06 Atlas | [#6](https://github.com/GiuseppePrbst/meta-global-ai-dev-hackathon-progarlabs/issues/6) |
| E07 / BV-07 Forest Intelligence | [#7](https://github.com/GiuseppePrbst/meta-global-ai-dev-hackathon-progarlabs/issues/7) |
| E08 / BV-08 Evaluation | [#8](https://github.com/GiuseppePrbst/meta-global-ai-dev-hackathon-progarlabs/issues/8) |
| E09 / BV-09 Deployment | [#9](https://github.com/GiuseppePrbst/meta-global-ai-dev-hackathon-progarlabs/issues/9) |
| E10 / BV-10 Submission | [#10](https://github.com/GiuseppePrbst/meta-global-ai-dev-hackathon-progarlabs/issues/10) |
| E11 / BV-11 Future Research | [#11](https://github.com/GiuseppePrbst/meta-global-ai-dev-hackathon-progarlabs/issues/11) |

## E01 — Project Foundation / BV-01

- **Problema:** falta una base compartida y verificable. **Objetivo:** instalación web/API, monorepo, CI y Git seguros.
- **Responsable:** Giuseppe; José valida web. **Prioridad:** P0. **Esfuerzo:** 2. **Dependencias:** cuenta personal y correo verificados.
- **Aceptación:** README reproducible; checks verdes; `main` publicada y PR bootstrap sin merge; ningún secreto ni dato restringido. Evidencia en informe.
- **Entregables:** scaffold, Compose, CI, instrucciones y PR. **Riesgos:** permisos Git, incompatibilidades locales y diferencias CI.

## E02 — Product Design / BV-02

- **Problema:** alcance amplio puede impedir una demo coherente. **Objetivo:** una ruta de valor y criterios comprobables.
- **Responsable:** Fabiana para estrategia empresarial; aplicación a la entrega pendiente de autorización. José y Giuseppe acuerdan alcance competitivo mientras tanto. **Prioridad:** P0. **Esfuerzo:** 2. **Dependencias:** aclarar admisiones y reglas.
- **Aceptación:** cinco públicos, tres journeys, criterios y prioridades; separar hipótesis de entrevistas reales; ninguna contribución competitiva de Fabiana sin autorización registrada.
- **Entregables:** documentos de producto y decisión de demo. **Riesgos:** elegibilidad, sobrealcance y confundir diseño de producto con implementación UI.

## E03 — Frontend & UX / BV-03

- **Problema:** los contratos no bastan para que una persona use el producto. **Objetivo:** flujo móvil accesible entre captura, catálogo y atlas.
- **Responsable:** José. **Prioridad:** P1. **Esfuerzo:** 3. **Dependencias:** BV-01 y contrato API; puede comenzar con fixtures sin esperar BV-05/BV-06.
- **Aceptación:** cinco rutas navegables, teclado/foco, carga/vacío/error, preview de foto, abstención visible y E2E del recorrido principal.
- **Entregables:** componentes, páginas y pruebas. **Riesgos:** WebGL, red, fotos pesadas y promesas engañosas en datos demo.

## E04 — Botanical Knowledge Base / BV-04

- **Problema:** nombres candidatos no son una taxonomía validada. **Objetivo:** ocho fichas trazables.
- **Responsable:** Giuseppe; José presenta estado/fuente. **Prioridad:** P0. **Esfuerzo:** 2. **Dependencias:** BV-01 y licencias de fuentes.
- **Aceptación:** cada nombre tiene fuente, ID/versión, aceptado o sinónimo, fecha/revisor y contenido autorizado; no afirmar ejemplares presentes en Puyehue sin registro.
- **Entregables:** catálogo validado y manifiesto. **Riesgos:** sinónimos, nombres comunes ambiguos y licencias de imágenes distintas al dataset.

## E05 — Meta AI Integration / BV-05

- **Problema:** el mock no demuestra uso real de Meta. **Objetivo:** segmentación y razonamiento con respuesta estructurada.
- **Responsable:** Giuseppe. **Prioridad:** P0. **Esfuerzo:** 3. **Dependencias:** BV-04, acceso habilitado, derechos de fotos y términos Meta revisados.
- **Aceptación:** prueba autorizada Muse Spark/SAM 3.1; retiro EXIF; validación de salida y máscaras; timeout/errores; abstención; sin probabilidades sin calibración ni claves cliente.
- **Entregables:** pipeline integrado, pruebas de contrato y evidencia de modelo/fecha/latencia sin contenido sensible. **Riesgos:** cuotas, formatos, geografía, privacidad y términos Contributor.

## E06 — Geospatial Atlas / BV-06

- **Problema:** una ficha aislada pierde contexto y trazabilidad. **Objetivo:** observaciones georreferenciadas y mapa con procedencia.
- **Responsable:** Giuseppe para PostGIS/capas; José para interacción. **Prioridad:** P1. **Esfuerzo:** 3. **Dependencias:** contrato de observación y BV-04; puede avanzar en paralelo a BV-05.
- **Aceptación:** persistencia verificada, rangos/CRS y geometrías válidos; punto sintético rotulado; capas reales con licencia y atribución; ubicación opcional/consentida.
- **Entregables:** esquema PostGIS, API, mapa y prueba de ida/vuelta. **Riesgos:** coordenadas sensibles, datos no oficiales y pérdidas por reiniciar entorno.

## E07 — Forest Intelligence / BV-07

- **Problema:** no hay contexto de estructura forestal reproducible. **Objetivo:** una ventana CHMv2 permitida y sus estadísticas.
- **Responsable:** Giuseppe; José implementa controles/procedencia. **Prioridad:** P1. **Esfuerzo:** 3. **Dependencias:** BV-06, selección de recurso/licencia y pipeline raster.
- **Aceptación:** fuente v2, fecha, CRS, metros, nodata, área efectiva y estadísticas verificadas con fixture; distinguir estimación de medición y de crecimiento anual.
- **Entregables:** análisis por área y panel de capa. **Riesgos:** cobertura local, sesgo en relieve, recursos masivos y exactitud no validada.

## E08 — Model Evaluation / BV-08

- **Problema:** una demo convincente no demuestra exactitud. **Objetivo:** medir calidad y límites con casos permitidos.
- **Responsable:** Giuseppe. **Prioridad:** P0. **Esfuerzo:** 3. **Dependencias:** BV-04/BV-05 y etiquetas humanas independientes.
- **Aceptación:** ejecución reproducible con Top-1/Top-3 aplicables, abstención, error, latencia y fallas API; no mezclar mock con resultados del modelo; reportar muestra y limitaciones.
- **Entregables:** dataset manifest, comandos y reporte. **Riesgos:** fuga de evaluación, muestra sesgada y verdad botánica débil.

## E09 — Deployment & Reliability / BV-09

- **Problema:** desarrollo local no garantiza demo disponible. **Objetivo:** RC desplegable y recuperable.
- **Responsable:** Giuseppe; José verifica navegador/móvil. **Prioridad:** P0. **Esfuerzo:** 2. **Dependencias:** BV-03/BV-05/BV-06 y proveedor autorizado.
- **Aceptación:** HTTPS, secretos backend, CORS exacto, backups/restauración, límites y consentimiento; smoke remoto; rollback documentado; no exponer API local sin auth.
- **Entregables:** despliegue de demo y runbook. **Riesgos:** disponibilidad, costos, acceso público a observaciones y diferencias de entorno.

## E10 — Hackathon Submission / BV-10

- **Problema:** producto listo puede incumplir el envío. **Objetivo:** entrega única y comprobada dentro del plazo.
- **Responsable:** representante oficialmente admitido por confirmar; José/ Giuseppe preparan evidencia técnica. **Prioridad:** P0. **Esfuerzo:** 2. **Dependencias:** BV-08/BV-09 y elegibilidad/derechos verificados.
- **Aceptación:** repo público revisado, contribuciones nuevas/preexistentes diferenciadas, uso real Meta, video tres minutos, formulario oficial revisado y comprobante de recepción; no merge de bootstrap sin revisión.
- **Entregables:** release, video, enlaces y comprobante. **Riesgos:** reglas actualizadas, zona horaria y fallas de última hora.

## E11 — Future Research / BV-11

- **Problema:** necesidades futuras requieren evidencia adicional. **Objetivo:** explorar DINOv3, crecimiento, invasoras e infraestructura sin bloquear MVP.
- **Responsable:** Giuseppe en investigación; Fabiana en estrategia empresarial; José en prototipos cuando corresponda. **Prioridad:** P3. **Esfuerzo:** 5. **Dependencias:** MVP, permisos específicos, datos longitudinales y validación científica.
- **Aceptación:** hipótesis y baseline medible, decisión continuar/parar y derechos antes de experimentos; ninguna inferencia de crecimiento a partir de una sola capa CHMv2.
- **Entregables:** propuesta de investigación posterior. **Riesgos:** causalidad, licencias, costos y material Hepta restringido; no usarlo sin permiso.

## Siguientes cinco tareas

1. Revisar/integrar BV-01 con sus pruebas y evidencia.
2. Confirmar admisiones, representante, reglas y derechos de entrega (BV-02/BV-10).
3. Validar taxonomía y un conjunto pequeño de fotos permitidas (BV-04).
4. José completa UX/carga/errores sobre el contrato; Giuseppe prueba acceso real y pipeline IA (BV-03/BV-05), en paralelo.
5. Giuseppe valida PostGIS/primer recurso GIS; José conecta atlas y ficha sin cambiar el contrato unilateralmente (BV-06).

## Avance GIS/ML — 27-10-2026

- BV-04: ocho nombres y sinónimos contrastados con GBIF, snapshot/licencia/tests. Pendiente
  validación botánica humana de rasgos, nombres comunes, natividad y conservación.
- BV-05: Muse integrado y SAM opcional tipado con parser oficial; llamadas reales sobre
  sintético verificadas. Pendiente calidad sobre fotos autorizadas y controles de producción.
- BV-06: contratos aditivos y ejemplos para José; persistencia existente preservada.
  Integración UI, autenticación y visibilidad privada siguen pendientes.
- BV-07: pipeline sintético y ventana CHMv2 real de 4096 píxeles; API 200 verificada.
  Pendiente periodo por tile, exactitud local y aislamiento para plazos estrictos.
- BV-08: runner A/B, métricas y control de fuga/derechos; cero casos científicos.
  Pendiente dataset con etiquetas humanas y autorización externa; no precisión atribuible al mock.

Las issues no se cierran por tener código parcial. Evidencia: [reporte GIS/ML](GIS_ML_REPORT.md).

## Incremento de contexto — 27-10-2026

- BV-04: crosswalk del catálogo/sinónimos para nombres predominantes, ambiguos/fuera de
  catálogo unresolved. No equivale a etiquetas ni cierra la revisión botánica.
- BV-05: se conservan Muse/SAM; sin sustitución de modelos ni llamadas pagadas nuevas.
- BV-06: point/area/layers y migración PostGIS, QA real offline del piloto CONAF/BCN.
  Importación de archivos reales en PostGIS local pendiente; CI verifica fixtures sintéticos.
- BV-07: fechas por tile verificadas y nuevo método ponderado; no reescribe evidencia #13.
- BV-08: protocolo acotado, n=0 confirmado por usuario; dataset humano/permisos y A/B/D/E
  pendientes, BioCLIP condicionado. No cerrar issues por pruebas del software.

Próximos pasos y trazabilidad en [informe de contexto](FOREST_CONTEXT_REPORT.md).
# Estado posterior a consolidación, 29-10-2026

BV-04/05/06/07/08 conservan su seguimiento existente, sin cierre automático.
Implementado: #15/#16 integrados; contexto real PostGIS/HTTP; reservas compartidas y credenciales
individuales de demo; privacidad/eliminación de observaciones; worker raster interrumpible;
smoke sintético SAM+Muse. Pendientes: dataset humano externo autorizado (n=0), rasgos/revisión
científica, derechos territoriales definitivos, identidad productiva/TLS/proxy y operación de purga.
Móvil: typecheck local bloqueado por dependencias ausentes; tarea para su responsable.
Próximos pasos y evidencia en [reporte](BACKEND_META_CONSOLIDATION_REPORT.md).

## Expediciones backend, 29-10-2026

Implementado con tests: multivista compatible, recomendaciones de foto, STT WAV desacoplado,
guía Muse con herramientas acotadas, capturas/colección privadas, evidencia e idempotencia,
retención/borrado y contexto territorial sin coordenadas externas. Referencias morfológicas
contrastadas para ocho taxones; revisión humana sigue pendiente. No se cierran issues por mocks.

P0 pendiente externo: presupuesto nuevo, acceso/créditos y audio/fotos autorizados, etiquetas
humanas (n=0), revisión científica y prueba real del nuevo STT/tool calling. Integración UI
corresponde a José usando [contratos](API_INTEGRATION.md), sin cambios visuales aquí.
Operación pendiente antes de internet: TLS/proxy/cuerpo limitado, identidad productiva,
purga y reservas monetarias conservadoras. P1 (SAM video, BioCLIP, Hepta local, A/B contextual)
no ejecutado mientras faltan estas condiciones. [Reporte](META_EXPEDITIONS_REPORT.md).

## Identificación de conjunto abierto — 30-10-2026

Hecho:
- PR #17–#21 integrados en `main`.
- Contrato open-set compatible.
- Estrategias `abstain`, `comparators` y `verify`, con aceptación selectiva.
- Seis comparadores con fuente y conjunto independiente congelado (56 casos).
- Métricas con intervalos y comparación pareada.

Pendiente:
1. Revisión de especialista de los conjuntos de desarrollo y evaluación.
2. Que José consuma `acceptance` y `exploratory_candidates`
   ([contrato](API_INTEGRATION.md#identificación-de-conjunto-abierto--contrato-para-josé-30-10-2026)).
3. Ampliar los comparadores con fuentes botánicas chilenas revisadas.
4. Hecho: `verify` activada por defecto tras la evaluación independiente; revisarla cuando
   haya etiquetas de especialista. Evaluar multivista con 3 vistas, que tendió a abstenerse.
5. Probar el recorte por caja de usuario (SAM) frente a la foto original.

[Reporte](OPEN_SET_IDENTIFICATION_REPORT.md).

## Ecosistema, gemelo digital y piloto Puyehue — 31-10-2026

Origen: [visión](PRODUCT_VISION_ECOSYSTEM.md), [piloto](PILOT_PUYEHUE.md),
[RCE](RCE_CONSERVATION_2026.md), [modelo](ECOSYSTEM_DATA_MODEL.md) y
[roadmap P0–P3](ROADMAP.md).

| ID | Prioridad | Tarea | Responsable funcional | Hecho cuando |
| --- | --- | --- | --- | --- |
| BV-12.1 | P0 | Pantallas Descubrir, Mapa, Enciclopedia, Mi diario y Perfil sobre los contratos implementados | José | Estados de evidencia visibles; sin datos ficticios; recorrido Playwright o móvil |
| BV-12.2 | P0 | Fichas educativas de las 6 especies de fauna CONAF priorizadas, con RCE y ámbito | Giuseppe | Fuente y fecha por campo; sin ubicaciones |
| BV-12.3 | P0 | Fichas educativas de hongos como candidatos regionales | Giuseppe | Rotuladas «sin evidencia de presencia en el parque»; sin comestibilidad |
| BV-12.4 | P0 | Política de ubicaciones sensibles | Giuseppe | Regla escrita y revisada antes de publicar cualquier punto |
| BV-12.5 | P1 | ETL RCE con pruebas (olivillo, güiña, ausencia ≠ LC) | Giuseppe | Pruebas de [RCE](RCE_CONSERVATION_2026.md#pruebas-exigidas) en verde con fixtures sintéticas |
| BV-12.6 | P1 | Límite, sectores y senderos oficiales de Puyehue | Giuseppe | Geometría con licencia, CRS y fecha; senderos vacíos si no hay fuente |
| BV-12.7 | P1 | Catálogo multirreino y `identification_capability` | Giuseppe | Contrato aditivo; IDs actuales intactos |
| BV-12.8 | P1 | Ocurrencias de hongos con calidad geográfica (GBIF, mycoBaseCL) | Giuseppe | Licencia y precisión verificadas por registro |
| BV-12.9 | P1 | Expediciones configurables | José y Giuseppe | Retos sin EN/CR, GPS ni salida de sendero |
| BV-12.10 | P2 | Evaluación independiente de identificación de fauna y hongos | Giuseppe | Conjunto congelado por reino; sin heredar métricas de árboles |

### Avance del 31-10-2026 (rama `feat/puyehue-biodiversity-meta-evaluation`)

| ID | Estado | Evidencia |
| --- | --- | --- |
| BV-12.2 | Parcial | Fichas de las 8 especies de fauna CONAF (6 RCE más chercán y bandurria) en `/taxa`. Los mamíferos tienen solo identidad, RCE y evidencia del parque, sin descripción con fuente |
| BV-12.3 | Hecho | 4 hongos con `regional_candidate` o `not_assessed`; sin comestibilidad |
| BV-12.5 | Hecho (subconjunto) | `evaluations/rce_import.py` idempotente, con pruebas de olivillo, güiña, ausencia ≠ LC y encabezados |
| BV-12.7 | Hecho | Catálogo multirreino y `IdentificationCapability` aditivos; IDs intactos |
| BV-12.8 | Parcial | Conteo GBIF dentro del polígono BCN: ningún hongo pasa los filtros. mycoBaseCL no se integró |
| BV-12.10 | Primera ronda | Conjuntos congelados por reino y campaña real ([informe](MULTIKINGDOM_AI_EVALUATION.md)) |
| BV-13.1 | Nuevo P1 | Resolver la región desde coordenadas con límites regionales oficiales en PostGIS |
| BV-13.2 | Nuevo P1 | Revisión de especialista de las etiquetas de los conjuntos congelados |
