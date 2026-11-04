import type { ImageSourcePropType } from 'react-native';

// Fotos de la tarjeta de cada parque: lo único local de la ficha, porque la API no entrega fotos de
// parques. El texto y las cifras vienen de GET /parks/{id} (src/api/parks.ts). Son miniaturas de 960 px
// sin editar de Wikimedia Commons, tomadas en el parque (ver assets/images/reference/ATTRIBUTION.md).

export type ParkPhoto = {
  source: ImageSourcePropType;
  /** Qué muestra, para la descripción accesible y el pie de foto. */
  caption: string;
  author: string;
  license: string;
  url: string;
};

const NRE = 'Natalia Reyes Escobar';
const BY_SA_4 = 'CC BY-SA 4.0';

const puyehue: ParkPhoto[] = [
  {
    source: require('../../../assets/images/reference/puyehue-salto.jpg'),
    caption: 'Salto de agua entre bosque siempreverde',
    author: NRE,
    license: BY_SA_4,
    url: 'https://commons.wikimedia.org/wiki/File:Parque_Nacional_Puyehue_12.jpg',
  },
  {
    source: require('../../../assets/images/reference/puyehue-laguna-espejo.jpg'),
    caption: 'Laguna Espejo',
    author: NRE,
    license: BY_SA_4,
    url: 'https://commons.wikimedia.org/wiki/File:Laguna_Espejo_Parque_Nacional_Puyehue_21.jpg',
  },
  {
    source: require('../../../assets/images/reference/puyehue-mirador-puma.jpg'),
    caption: 'Vista desde el Mirador del Puma',
    author: NRE,
    license: BY_SA_4,
    url: 'https://commons.wikimedia.org/wiki/File:Parque_Nacional_Puyehue_10.jpg',
  },
  {
    source: require('../../../assets/images/reference/puyehue-bosque.jpg'),
    caption: 'Ladera de bosque nativo',
    author: NRE,
    license: BY_SA_4,
    url: 'https://commons.wikimedia.org/wiki/File:Parque_Nacional_Puyehue_22.jpg',
  },
  {
    source: require('../../../assets/images/reference/puyehue-lago-constancia.jpg'),
    caption: 'Lago Constancia',
    author: NRE,
    license: BY_SA_4,
    url: 'https://commons.wikimedia.org/wiki/File:Lago_Constancia_Parque_Nacional_Puyehue_32.jpg',
  },
  {
    source: require('../../../assets/images/reference/puyehue-rio-chanleufu.jpg'),
    caption: 'Río Chanleufu',
    author: 'Ramirezh2019',
    license: BY_SA_4,
    url: 'https://commons.wikimedia.org/wiki/File:Parque_Nacional_Puyehue.jpg',
  },
];

const photos: Record<string, ParkPhoto[]> = { puyehue };

/** Fotos del parque; vacío si no hay ninguna local. */
export function getParkPhotos(parkId: string): ParkPhoto[] {
  return photos[parkId] ?? [];
}
