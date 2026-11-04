import type { ImageSourcePropType } from 'react-native';

import { demoShapeIndex } from '@/features/atlas/demo-trail';

// Foto de portada de cada sendero, fija según su trazado de demostración. Ninguna muestra el sendero:
// son fotos de referencia con licencia de Wikimedia Commons (ver assets/images/reference/ATTRIBUTION.md).
// La primera fue tomada en el PN Puyehue; las demás son fotos de especies del catálogo, reutilizadas
// como portada, y no prueban presencia de la especie en el sendero.

export type TrailPhoto = {
  source: ImageSourcePropType;
  /** Descripción accesible: qué muestra y que no es el sendero. */
  a11y: string;
  /** Autor, licencia y origen, para «Sobre este mapa». */
  credit: string;
  url: string;
};

const trailPhotos: TrailPhoto[] = [
  {
    source: require('../../../assets/images/reference/puyehue-rio-chanleufu.jpg'),
    a11y: 'Foto de referencia del río Chanleufu, en el Parque Nacional Puyehue. No muestra el sendero.',
    credit: 'Río Chanleufu, PN Puyehue. Ramirezh2019, CC BY-SA 4.0, Wikimedia Commons. Referencia del entorno, no del sendero',
    url: 'https://commons.wikimedia.org/wiki/File:Parque_Nacional_Puyehue.jpg',
  },
  {
    source: require('../../../assets/images/reference/nothofagus-dombeyi.jpg'),
    a11y: 'Foto de referencia de un coigüe. No fue tomada en el sendero.',
    credit: 'Coigüe (Nothofagus dombeyi). Warren Bohmwald, CC0 1.0, Wikimedia Commons. No fue tomada en el sendero',
    url: 'https://commons.wikimedia.org/wiki/File:Nothofagus_dombeyi_-_Warren_Bohmwald_-_458885887.jpeg',
  },
  {
    source: require('../../../assets/images/reference/laureliopsis-philippiana.jpg'),
    a11y: 'Foto de referencia de un tepa. No fue tomada en el sendero.',
    credit: 'Tepa (Laureliopsis philippiana), Valdivia. Cristian Riquelme, CC BY 4.0, Wikimedia Commons. No fue tomada en el sendero',
    url: 'https://commons.wikimedia.org/wiki/File:Laureliopsis_philippiana,_Valdivia,_Los_R%C3%ADos,_Chile_62188473.jpg',
  },
  {
    source: require('../../../assets/images/reference/nothofagus-pumilio.jpg'),
    a11y: 'Foto de referencia de hojas de lenga. No fue tomada en el sendero.',
    credit: 'Lenga (Nothofagus pumilio), hojas. Mlwiki, CC BY-SA 4.0, Wikimedia Commons. No fue tomada en el sendero',
    url: 'https://commons.wikimedia.org/wiki/File:Nothofagus_pumilio,_leaves.jpg',
  },
];

/** Portada del sendero `trailId`: siempre la misma para el mismo sendero. */
export function getTrailPhoto(trailId: string): TrailPhoto {
  return trailPhotos[demoShapeIndex(trailId) % trailPhotos.length];
}
