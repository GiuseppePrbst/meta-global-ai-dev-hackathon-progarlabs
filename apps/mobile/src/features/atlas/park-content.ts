import type { ImageSourcePropType } from 'react-native';

// Contenido de la tarjeta de cada parque. Los datos son hechos tomados de la ficha oficial de CONAF
// (https://www.conaf.cl/parque_nacionales/parque-nacional-puyehue/, consulta 03-11-2026) y redactados
// con palabras propias: no se copia la ficha. Las fotos son miniaturas de 960 px sin editar de
// Wikimedia Commons, tomadas en el parque (ver assets/images/reference/ATTRIBUTION.md).

export type ParkPhoto = {
  source: ImageSourcePropType;
  /** Qué muestra, para la descripción accesible y el pie de foto. */
  caption: string;
  author: string;
  license: string;
  url: string;
};

export type ParkFact = { value: string; label: string };

export type ParkContent = {
  parkId: string;
  region: string;
  photos: ParkPhoto[];
  /** Cifras destacadas, en el orden en que se muestran. */
  facts: ParkFact[];
  description: string[];
  sectors: string[];
  /** Árboles que CONAF nombra en la flora del parque: presencia a escala de parque, no de un punto. */
  flora: string[];
  hours: string;
  access: string;
  source: { name: string; url: string; accessed: string };
};

const NRE = 'Natalia Reyes Escobar';
const BY_SA_4 = 'CC BY-SA 4.0';

const puyehue: ParkContent = {
  parkId: 'puyehue',
  region: 'Región de Los Lagos · Osorno y Valdivia',
  photos: [
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
  ],
  facts: [
    { value: '112.755', label: 'hectáreas' },
    { value: '1941', label: 'año de creación' },
    { value: '3', label: 'sectores' },
    { value: '130+', label: 'especies de aves' },
  ],
  description: [
    'Creado en 1941 y ampliado hasta fijar sus deslindes actuales en 1981, Puyehue protege uno de los bosques húmedos siempreverdes más exuberantes del sur de Chile, alimentado por lluvias abundantes y suelos volcánicos.',
    'Abajo dominan el ulmo y el coigüe; al subir aparecen la tepa y el mañío, y cerca del límite de la vegetación quedan bosques puros de lenga y coigüe de Magallanes. Es parte de la Reserva de la Biósfera Bosques Templados Lluviosos de los Andes Australes.',
  ],
  sectors: ['Aguas Calientes', 'Anticura', 'Antillanca'],
  flora: ['Ulmo', 'Coigüe', 'Olivillo', 'Tineo', 'Tepa', 'Mañío', 'Lenga', 'Coigüe de Magallanes'],
  hours: 'Todos los días, 9:00 a 17:30',
  access: 'Ruta internacional 215-CH, entre Osorno y Bariloche',
  source: {
    name: 'CONAF',
    url: 'https://www.conaf.cl/parque_nacionales/parque-nacional-puyehue/',
    accessed: '2026-11-03',
  },
};

const contents: Record<string, ParkContent> = { puyehue };

export function getParkContent(parkId: string): ParkContent | undefined {
  return contents[parkId];
}
