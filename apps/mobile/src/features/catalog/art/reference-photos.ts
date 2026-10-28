import type { ImageSourcePropType } from 'react-native';

// Fotos de referencia de Wikimedia Commons para la ficha, solo para desarrollo: cuando la API entregue
// fotos, este archivo y assets/images/reference/ se reemplazan. Copias sin editar de la miniatura de
// 960 px (CC0, CC BY o CC BY-SA, nada NC), con autor, licencia y enlace visibles junto a la foto.
// Ninguna fue tomada en Puyehue. Atribución en assets/images/reference/ATTRIBUTION.md y
// docs/DATASET_LICENSES.md; descarga 28-10-2026.

export type ReferencePhoto = {
  source: ImageSourcePropType;
  /** Proporción ancho/alto de la foto. */
  aspect: number;
  author: string;
  license: string;
  /** Página del archivo en Commons: fuente, licencia completa e historial. */
  sourceUrl: string;
};

const page = (file: string) => `https://commons.wikimedia.org/wiki/File:${file}`;

const photos: Record<string, ReferencePhoto> = {
  'nothofagus-dombeyi': {
    source: require('../../../../assets/images/reference/nothofagus-dombeyi.jpg'),
    aspect: 960 / 1280,
    author: 'Warren Bohmwald',
    license: 'CC0',
    sourceUrl: page('Nothofagus_dombeyi_-_Warren_Bohmwald_-_458885887.jpeg'),
  },
  'eucryphia-cordifolia': {
    source: require('../../../../assets/images/reference/eucryphia-cordifolia.jpg'),
    aspect: 960 / 720,
    author: 'Lin linao',
    license: 'CC BY-SA 4.0',
    sourceUrl: page('Hojas_y_brote_de_ulmo.jpg'),
  },
  'aextoxicon-punctatum': {
    source: require('../../../../assets/images/reference/aextoxicon-punctatum.jpg'),
    aspect: 960 / 1280,
    author: 'Daderot',
    license: 'CC0',
    sourceUrl: page('Aextoxicon_punctatum_-_Palmengarten_Frankfurt_-_DSC01934.JPG'),
  },
  'weinmannia-trichosperma': {
    source: require('../../../../assets/images/reference/weinmannia-trichosperma.jpg'),
    aspect: 960 / 640,
    author: 'Krzysztof Ziarnek, Kenraiz',
    license: 'CC BY-SA 4.0',
    sourceUrl: page('Weinmannia_trichosperma_kz02.jpg'),
  },
  'laureliopsis-philippiana': {
    source: require('../../../../assets/images/reference/laureliopsis-philippiana.jpg'),
    aspect: 1,
    author: 'Cristian Riquelme',
    license: 'CC BY 4.0',
    sourceUrl: page('Laureliopsis_philippiana,_Valdivia,_Los_R%C3%ADos,_Chile_62188473.jpg'),
  },
  // Original de 615 px: se copió tal cual, sin ampliar.
  'podocarpus-nubigenus': {
    source: require('../../../../assets/images/reference/podocarpus-nubigenus.jpg'),
    aspect: 615 / 432,
    author: 'Lin linao',
    license: 'CC BY-SA 3.0',
    sourceUrl: page('Podocarpus_nubigena-hojas.JPG'),
  },
  'nothofagus-betuloides': {
    source: require('../../../../assets/images/reference/nothofagus-betuloides.jpg'),
    aspect: 960 / 640,
    author: 'Krzysztof Ziarnek, Kenraiz',
    license: 'CC BY 4.0',
    sourceUrl: page('Nothofagus_betuloides_kz02.jpg'),
  },
  'nothofagus-pumilio': {
    source: require('../../../../assets/images/reference/nothofagus-pumilio.jpg'),
    aspect: 960 / 720,
    author: 'Mlwiki',
    license: 'CC BY-SA 4.0',
    sourceUrl: page('Nothofagus_pumilio,_leaves.jpg'),
  },
};

export function getReferencePhoto(speciesId: string): ReferencePhoto | undefined {
  return photos[speciesId];
}
