import type { ImageSourcePropType } from 'react-native';

// Foto de portada de cada sendero de demostración. Ninguna muestra el trazado, que es sintético:
// son fotos de referencia con licencia de Wikimedia Commons (ver assets/images/reference/ATTRIBUTION.md).
// La del sendero principal fue tomada en el PN Puyehue; las demás son fotos de especies del
// catálogo, reutilizadas como portada, y no prueban presencia de la especie en el trazado.

export type TrailPhoto = {
  source: ImageSourcePropType;
  /** Descripción accesible: qué muestra y que no es el sendero. */
  a11y: string;
  /** Autor, licencia y origen, para «Sobre este mapa». */
  credit: string;
  url: string;
};

const trailPhotos: Record<string, TrailPhoto> = {
  'demo-trail': {
    source: require('../../../assets/images/reference/puyehue-rio-chanleufu.jpg'),
    a11y: 'Foto de referencia del río Chanleufu, en el Parque Nacional Puyehue. No muestra el sendero de demostración.',
    credit: 'Río Chanleufu, PN Puyehue. Ramirezh2019, CC BY-SA 4.0, Wikimedia Commons. Referencia del entorno, no del trazado',
    url: 'https://commons.wikimedia.org/wiki/File:Parque_Nacional_Puyehue.jpg',
  },
  'demo-loop': {
    source: require('../../../assets/images/reference/nothofagus-dombeyi.jpg'),
    a11y: 'Foto de referencia de un coigüe. No fue tomada en el sendero de demostración.',
    credit: 'Coigüe (Nothofagus dombeyi). Warren Bohmwald, CC0 1.0, Wikimedia Commons. No fue tomada en el trazado',
    url: 'https://commons.wikimedia.org/wiki/File:Nothofagus_dombeyi_-_Warren_Bohmwald_-_458885887.jpeg',
  },
  'demo-zigzag': {
    source: require('../../../assets/images/reference/laureliopsis-philippiana.jpg'),
    a11y: 'Foto de referencia de un tepa. No fue tomada en el sendero de demostración.',
    credit: 'Tepa (Laureliopsis philippiana), Valdivia. Cristian Riquelme, CC BY 4.0, Wikimedia Commons. No fue tomada en el trazado',
    url: 'https://commons.wikimedia.org/wiki/File:Laureliopsis_philippiana,_Valdivia,_Los_R%C3%ADos,_Chile_62188473.jpg',
  },
  'demo-arc': {
    source: require('../../../assets/images/reference/nothofagus-pumilio.jpg'),
    a11y: 'Foto de referencia de hojas de lenga. No fue tomada en el sendero de demostración.',
    credit: 'Lenga (Nothofagus pumilio), hojas. Mlwiki, CC BY-SA 4.0, Wikimedia Commons. No fue tomada en el trazado',
    url: 'https://commons.wikimedia.org/wiki/File:Nothofagus_pumilio,_leaves.jpg',
  },
};

export function getTrailPhoto(trailId: string): TrailPhoto {
  return trailPhotos[trailId] ?? trailPhotos['demo-trail'];
}
