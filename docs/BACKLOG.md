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
