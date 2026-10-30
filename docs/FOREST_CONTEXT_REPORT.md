# Contexto forestal verificable — 27-10-2026

## Estado, base y alcance

Baseline iniciado en `a93709c`, árbol limpio, #12/#13 abiertos y CI de #13 aprobada.
Durante el trabajo ambos PR se fusionaron, pero #13 entró en bootstrap después del merge
de #12 a main. Main recibió además #14 (móvil) sin contener #13. Se preparó [#15](https://github.com/GiuseppePrbst/meta-global-ai-dev-hackathon-progarlabs/pull/15)
para revisión de esa reconciliación, sin merge automático. Base final, commits y CI del
incremento se registran en su PR; la ascendencia y el diff se verifican antes de publicar.
No se modifica web, móvil ni PR ajenos. GiuseppePrbst y su correo Git se verificaron.

El Research Pack se extrajo fuera del checkout tras revisar traversal, symlinks y tamaños.
SHA-256 ZIP: `8a76c75c39edc78ffcb2d2c1b749c385b244372b10ac1774e0fb1a7788e95f4b`.
Sus 49 hashes coinciden; **57 pruebas pasan** en venv Python 3.12 separado, con 166 avisos
de deprecación. No se copiaron requirements ni prototipos completos sobre los servicios.
Se tomaron como referencia semántica/algorítmica y se integraron contratos y pruebas propias.

Baseline del proyecto: **77 pasan, una PostGIS omitida**, Ruff y formato pasan. La CI anterior
de 78 tests pertenece a #13, no sustituye la de este incremento.

## Fuentes reales, archivos y derechos

Todo binario, GeoJSON fuente y manifiesto de ingesta permanece fuera del repositorio.
[Evidencia pública de QA](../data/public/forest-context-qa-2026-10-27.json) contiene metadatos,
hashes y resultados; los dominios completos quedan en el perfil local. No se publican SHP,
DBF ni polígonos del catastro con derechos de redistribución aún pendientes.

| Recurso | Adquisición y resultado |
| --- | --- |
| MINAGRI cbn_10reg_2018.rar | HTTP 200, Content-Length 944670461; bloqueado antes de guardar por límite 256 MiB. No error HTTP inventado ni evasión. |
| CIREN MapServer/13 | Alternativa oficial del mismo linaje CONAF 2018. Consulta envelope piloto, IDs completos y después tres features; conteos/IDs contrastados, sin exceededTransferLimit. |
| BCN Snaspe.zip | 15100372 bytes; SHA-256 `f3fa0c6f96d98bd4ab5039aaaa34b98486c309568d1b9891964cbed2b98f9d64`; ocho componentes revisados, total descomprimido bajo 64 MiB. |

MINAGRI anuncia SHP EPSG:32718 y escala 1:50.000. **No se comprobó su PRJ/DBF/CPG** porque
no se descargó el RAR. El servicio CIREN declara WKID 102100/latestWkid 3857; se solicitó
GeoJSON WGS84 y se midió en EPSG:32718. No se intercambiaron esos CRS.

BCN: PRJ comprobado **EPSG:3857**; CPG **UTF-8**, lectura explícita UTF-8. Siete campos DBF:
objectid int:10, st_area_sh y st_length_ float:19.11, Nombre/Tipo_Snasp/Region str:50,
Cod_Region int32:5. Los hashes de PRJ, DBF, SHP y demás componentes están en la evidencia.
Se preserva el carácter referencial y la antigüedad de edición sin verificar por registro.

Productor catastro: CONAF; distribuidor CIREN/IDE MINAGRI. El metadato exige citar CONAF;
no se convirtió esa indicación en una licencia CC ni en permiso general de redistribución.
Estado independiente: `rights_status: redistribution_pending`, `geometry_status: pilot_checked`,
`taxonomy_status: partial`. BCN permite libre uso con atribución bajo términos propios,
sin precisión geodésica ni garantía de actualidad legal. No se declara validación científica.

## QA completo del recorte

AOI: cuadrado de 500 m de lado alrededor del centro de referencia ya usado por el atlas,
transformado en EPSG:32718. No es límite oficial ni localización de un árbol.

| Propiedad | CONAF/CIREN | BCN |
| --- | --- | --- |
| Registros examinados | Tres devueltos por consulta piloto completa | 137 de la capa distribuida |
| Polígonos válidos dentro del piloto | 3 | 1 |
| Geometría final del recorte | Polygon | Polygon |
| Huecos / duplicados del recorte | 0 / 0 | 0 / 0 |
| Área de unión | Aproximadamente 250000 m² | Aproximadamente 250000 m² |
| Solapamiento de área | Cero salvo redondeo numérico | Cero |
| Invalidaciones observadas | Ninguna | Ocho geometrías inválidas fuera del piloto; sin reparar |

El perfil local conserva campos/tipos, dominios, nulos y blancos por separado. Las especies
vacías de CIREN usan espacios: no son nulos y no prueban ausencia. `id_uso`/`id_tifo` no
existen en la lista de campos observada; no se dedujeron desde el renderer.

CIREN declara 33 campos: 32 atributos más shape; la geometría no se cuenta como atributo nulo.
Atributos reales: uso, subuso, estructura, cobertura, altura, tipo_fores, subtipofor y seis
especiN_ci. Se preservan completos en `attributes_raw`; el mapeo añade etiquetas normalizadas
sin fabricar códigos ni reinterpretar altura. `superf_ha` sigue siendo el área original del
polígono padre, no el área recortada. La intersección se calcula por separado.

Discrepancias conservadas: BCN asigna su registro P.N.Puyehue a Región de Los Ríos;
CIREN devuelve Región de Los Lagos. Se registra la diferencia, sin resolverla inventando
una división administrativa. Parque Nacional Puyehue y P.N.Puyehue son textos originales.

## Contexto y PostGIS

Se añaden `GET /layers`, `POST /context/point`, `POST /context/area` y
`POST /forest/analyze/weighted`. Los siete endpoints anteriores permanecen compatibles;
`/forest/analyze` conserva selección por centro y su contrato Polygon.
Los nuevos AOI aceptan Polygon/MultiPolygon, huecos y WGS84 `[lon,lat]`.
Punto en borde devuelve todos los matches y flags. Exactitud opcional null no presupone
precisión GPS; valores explícitos admitidos 0–200 m. Superficies limitadas al piloto Los Lagos,
1 km², geometrías acotadas y máximo 500 candidatos recuperados por consulta.

La migración 002 crea solo context_layers/context_features y GiST, con unicidad por
fuente/ID y validación PostGIS. Rollback elimina esas dos tablas, conserva observaciones
y usa RESTRICT implícito. Ingesta por fuente transaccional, idempotente por hash/ID,
sin sobrescribir una fuente existente de otro hash. SQL usa parámetros; timeout de consulta
3 s. No se guardan consultas de ubicación.

La cobertura se calcula por **unión** de intersecciones por fuente; solapamientos se
reportan aparte. Distintas capas no son sumadas como si fueran territorios independientes.
Sin match es `no_coverage`, nunca ausencia confirmada de bosque/especie/protección.
La composición del polígono no etiqueta fotografías; GPS de dron no localiza cada copa.

La ejecución real local del motor, con los polígonos descargados, devolvió un match forestal
y uno protegido para el centro, y cobertura completa del AOI en ambas capas dentro de tolerancia.
Nothofagus dombeyi, Eucryphia cordifolia, Laurelia philippiana y Aextoxicon punctatum
resuelven al catálogo versionado; Laurelia philippiana usa su sinónimo GBIF para tepa.
Gevuina avellana y Saxegothaea conspicua quedan **unresolved** en el catálogo controlado de ocho.
Los nombres originales permanecen y la respuesta incluye versión taxonómica.

**Límite de evidencia:** el contexto real se probó con el motor offline. Sin PostGIS local,
la ingesta de estos archivos reales y su consulta HTTP con DB quedan pendientes. La CI prueba
PostGIS/API/migración con datos sintéticos; no se afirma que esa prueba use las fuentes reales.

## CHMv2 temporal y ponderado

[Evidencia nueva](../data/public/chmv2-weighted-2026-10-27.json). Se leyeron ambos Parquet
oficiales, cada uno con 213109 filas, quadkey sin nulos/duplicados y relación uno a uno.
No se usó una API STAC ni el overview visual.

| Índice | SHA-256 |
| --- | --- |
| acq_dates.parquet | 225461c8e3559589f702933c0b93e03374550dab87eeea2eef831d9070e9ae92 |
| tiles.parquet | 97e2a47aca8c9d70d24c8d36ec631543c7362d2c50312bfa9a8789783571aee0 |

Tile **2102332230**: adquisición mínima **2013-09-16**, máxima **2018-09-15**, `acq_n=6`.
Se contrastó su URL COG con el manifiesto de la ventana ya autorizada de #13. El intervalo
no determina fecha por píxel, publicación, copyright ni vigencia del bosque en 2026.
Si falta el par completo en el índice, devuelve null y una razón. Manifiestos con fechas
parciales/invertidas y claves duplicadas en los índices bloquean validación.

La ruta weighted respondió HTTP 200 con el raster real y las fechas verificadas.
Se reutilizó la ventana nativa 64×64 fuera de Git y su hash, sin descargar el tile completo.
Nuevo método: intersectar cada huella con el AOI en EPSG:32718, incluyendo huecos; media
ponderada por área válida. Máximo 10000 píxeles, una lectura por proceso y plazo cooperativo
de 10 s. No es cancelación efectiva de I/O; no se ofrece como worker de producción.

| Caso real | Media por centro (m) | Media por huella (m) |
| --- | --- | --- |
| Ventana completa | 12,476806640625, evidencia histórica | 12,476807666423621 |
| AOI recortado ¼ de píxel en ambos bordes X | 12,476806640625 | 12,48542186682609 |

Las diferencias reflejan ponderación/proyección, no exactitud científica adicional. El método
por centro puede atribuir área fuera del AOI parcial; la huella solo usa intersecciones.
La cobertura ponderada real es ≈0,9999993 por aproximación de aristas proyectadas y precisión
numérica. No se sustituyen resultados históricos de #13 ni se afirma precisión submétrica.

Se devuelven área consultada, intersección raster, área válida, nodata y ceros ambiguos.
`coverage_fraction=área_válida/AOI`; `ambiguous_fraction=área_cero_ambigua/intersección_raster`,
con denominador explícito. Sin altura válida, media/min/max null y `no_valid_data`.
En la ventana real no hubo ceros. Fixture sintético prueba ceros ambiguos, nodata, escala/offset,
huellas parciales, huecos, límites y ausencia de intersección. Altura dominante del catastro
y media CHMv2 son estimandos diferentes; ninguno mide crecimiento anual.

## Evaluación y privacidad

El usuario confirmó que no existe conjunto etiquetado. **n=0**; Top-1/3, falsos positivos,
abstención y latencias ML no disponibles. Cero llamadas pagadas en esta misión, costo observado
de inferencia USD 0. No se leyeron claves privadas ni se consultó el saldo. Costos de cómputo/red
local no estimados. BioCLIP2 no instalado; no se necesitó evaluar GPU con n=0.

[Protocolo congelado](../evaluations/forest-context-protocol.json): A Muse, B SAM+Muse,
C local condicionado a recursos/datos, D mejor baseline medido + contexto real, E control
con contexto permutado. Congelar split por individuo/campaña/bloque y revisión de hashes
exactos/perceptuales antes de inferencia. Separar terreno y dron. No hay mejora medida.

Hepta conserva permiso local de procesamiento/entrenamiento, sin publicación, transferencia
externa ni extensión a otros datos. No se entró a Fabric/Hepta. No se publicaron fotos,
anotaciones, pesos o derivados privados. Libros/PPTX no se subieron ni se convirtieron en
dataset; el extracto duplicado no se cuenta como otra fuente. No se usó iNaturalist.

## Reproducción y validación

Desde raíz, Python 3.12. El extra `data` añade solo Fiona 1.10.1 y PyArrow 26.0.0 para
SHP/Parquet, fijados en uv.lock; no cambia dependencias ML ni copia requirements del paquete.

```powershell
uv sync --project services/api --extra dev --extra raster --extra data --frozen
uv run --project services/api --extra raster --extra data --frozen python -m evaluations.forest_sources --output D:/temp/bosque-context-new-run
uv run --project services/api --extra raster --extra data --frozen python -m evaluations.chmv2_temporal --manifest D:/temp/bosque-vivo-chmv2-20261027/manifest.json --output D:/temp/bosque-chmv2-new-run
# Con DATABASE_URL de una base autorizada; sin volcar el DSN en consola:
uv run --project services/api --extra raster --frozen python evaluations/import_context.py D:/temp/bosque-context-new-run/bundle.json --migrate
```

Usar carpetas nuevas; no se sobrescriben fuentes. Los datos binarios y recortes quedan fuera
del checkout. Para weighted configurar FOREST_MANIFEST con el nuevo manifest externo.

Comprobaciones finales y logs en el PR: pytest, Ruff, formato, imports, lock/dependencias,
OpenAPI, migración PostGIS, rastreo de contratos, regresión web, build, Playwright,
límites de publicación y Gitleaks. Docker/PostGIS locales no disponibles y no se instalaron.
CI prueba servicios externos con mocks; las fuentes reales se comprobaron por separado.

## Integración y siguientes cinco acciones

José recibe [ejemplos aditivos](API_INTEGRATION.md). No se rediseñan web/móvil, no se
reemplazan modelos Muse/SAM y no se crean microservicios. Fabiana conserva rol empresarial
sin atribuirle admisión ni contribuciones competitivas pendientes.

1. Revisar reconciliación a main y PR del incremento; verificar ascendencia/diff, sin merge automático.
2. Importar el bundle real en PostGIS autorizado y verificar point/area HTTP con ese hash.
3. Resolver redistribución MINAGRI, versión BCN y discrepancias con fuente primaria actualizada.
4. Reunir etiquetas humanas/permisos, congelar grupos y ejecutar A/B antes de D/E; medir errores.
5. José integra estados y procedencia; antes de demo pública, autenticación por usuario antes
   de trabajo costoso, privacidad de observaciones, presupuesto global y worker con timeout efectivo.

CI verde no acredita preparación de producción, exactitud botánica ni permisos no comprobados.

Validación local final: 98 pruebas Python pasan y dos PostGIS omitidas; Ruff, formato,
imports, lock y compatibilidad de 47 paquetes pasan. Web: lint, typecheck, tres tests,
build y seis Playwright pasan. La prueba sintética PostGIS de CI se verifica en el PR,
no se presenta como carga local de datos reales.
