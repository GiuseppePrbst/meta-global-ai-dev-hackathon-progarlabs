# Contratos y pipeline GIS

Biblioteca interna con GeoJSON Point y Polygon en WGS84, orden `[longitud, latitud]`,
rangos finitos y validación topológica mediante Shapely. Un polígono admite como
máximo 20 anillos de 1000 posiciones cada uno. Estos contratos no prometen resolver
casos que cruzan el antimeridiano: el piloto debe usar áreas locales revisadas.

`CanopyProvider` separa análisis raster de la API. `UnconfiguredCanopyProvider` devuelve
un error explícito; `CHMV2_SOURCE` expone únicamente metadatos. No se descargó ningún raster.
Rasterio 1.5.2, GeoPandas 1.2.0 y PyProj 3.8.0 se declaran como extra `raster`, separado
del entorno web/API. Sus metadatos actuales admiten Python 3.12; el extra no se instaló
ni ejecutó durante el bootstrap.

## Pipeline que debe implementar Giuseppe

1. Registrar el área permitida y su procedencia. Usar límites oficiales verificados,
   nunca coordenadas inventadas ni localizaciones de infraestructura restringida.
2. Consultar índice/metadata CHMv2; comprobar licencia, cobertura, fecha de imagen,
   CRS, resolución, unidad y NoData. Registrar URL, versión, fecha de acceso y checksum.
3. Elegir un COG autorizado para el área. Leer una ventana pequeña con Rasterio;
   limitar extensión y número de píxeles. No descargar el mosaico global.
4. Transformar el polígono al CRS del raster con PyProj; recortar con máscara válida,
   excluir NoData y conservar resolución/unidades y metadatos. No reproyectar para
   aparentar mayor precisión que la fuente.
5. Calcular conteo de píxeles válidos y altura mínima, media y máxima; registrar
   cobertura válida y fechas. Validar contra un raster diminuto sintético antes de datos reales.
6. Servir resultado con `estimated: true`, atribución y limitaciones. Es una estimación
   de altura sobre el suelo, no una medición de campo, edad del árbol ni crecimiento anual.

Se verificó el registro [CHMv2 de AWS](https://registry.opendata.aws/dataforgood-fb-forestsv2/)
el 27-10-2026: datos v2 CC BY 4.0. La licencia del dataset no concede derechos sobre
imágenes fuente Vantor ni reemplaza la licencia de pesos de DINOv3.

La única geometría de fixture está en `data/synthetic/observations.geojson`, en `[0,0]`,
identificada como sintética y sin atribuir árboles reales a ese lugar. No hay rutas
turísticas ni límites del Parque Nacional Puyehue incorporados.

## Implementación GIS/ML

LocalCanopyProvider en raster.py analiza una ventana local validada por manifiesto/hash;
Rasterio y PyProj son opcionales, sin GeoPandas ni modelos. No admite URLs suministradas por
el usuario. Límites y reproducción: [reporte](../../docs/GIS_ML_REPORT.md).

Tests generan GeoTIFF sintético en tmp_path; nunca versionan el raster. Se probó una ventana
real 64x64 CHMv2 mediante HTTP Range, sin tile completo. Ceros ambiguos se excluyen para
CHMv2; no se equiparan a ausencia de árboles. Fuente, metros, CRS, nodata, cobertura y límites
se exponen en contrato. Las fechas específicas del tile y exactitud local siguen pendientes.
