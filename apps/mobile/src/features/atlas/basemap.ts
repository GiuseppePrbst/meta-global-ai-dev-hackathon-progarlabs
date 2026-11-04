// Mapas base del Atlas, solo para la demo y uso no comercial (docs/DATASET_LICENSES.md).
// Módulo de TypeScript puro: también lo importa el DOM component del mapa.

export type Basemap = 'satellite' | 'osm';

/** El Atlas abre con la imagen satelital. */
export const DEFAULT_BASEMAP: Basemap = 'satellite';

export const OSM_COPYRIGHT = 'https://www.openstreetmap.org/copyright';
// Fecha de consulta del registro de OpenStreetMap en docs/DATASET_LICENSES.md.
export const OSM_ACCESSED = '2026-10-27';

// Mosaico Sentinel-2 cloudless de EOX, capa 2025 en Web Mercator (WMTS GoogleMapsCompatible, matriz `g`).
// CC BY-NC-SA 4.0: uso no comercial con atribución visible en el mapa. Resolución nativa ~10 m, que en
// la latitud de Puyehue equivale a z14; más cerca MapLibre amplía la tesela de z14 en vez de pedir otras.
export const EOX_YEAR = 2025;
export const EOX_TILES = `https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-${EOX_YEAR}_3857/default/g/{z}/{y}/{x}.jpg`;
export const EOX_MAX_ZOOM = 14;
export const EOX_LICENSE_URL = 'https://cloudless.eox.at';
// Fecha de consulta del registro de EOX en docs/DATASET_LICENSES.md.
export const EOX_ACCESSED = '2026-11-02';
