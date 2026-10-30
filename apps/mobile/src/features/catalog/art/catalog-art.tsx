import { StyleSheet, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { LeafPlate } from '@/features/species-art/leaf-plate';

const coverLeaves = [
  { id: 'eucryphia-cordifolia', rotate: '-18deg', right: 72, top: 4, delay: 0 },
  { id: 'nothofagus-pumilio', rotate: '14deg', right: 16, top: 0, delay: 140 },
  { id: 'podocarpus-nubigenus', rotate: '38deg', right: -28, top: 26, delay: 280 },
];

/** Portada del catálogo: tres láminas que se pintan al abrir, en la tinta de la barra sobre aguada lima. */
export function CatalogCover({ ink, wash }: { ink: string; wash: string }) {
  return coverLeaves.map((leaf) => (
    <View key={leaf.id}
      style={[styles.coverLeaf, { right: leaf.right, top: leaf.top, transform: [{ rotate: leaf.rotate }] }]}>
      <LeafPlate speciesId={leaf.id} size={112} ink={ink} wash={wash} draw delay={leaf.delay} />
    </View>
  ));
}

/** Pliego vacío: el contorno punteado de una hoja que no está. */
export function EmptySheet({ ink }: { ink: string }) {
  return (
    <Svg width={72} height={88} viewBox="0 0 72 88" accessible={false}>
      <Rect x={1} y={1} width={70} height={86} rx={4} stroke={ink} strokeWidth={1.5} fill="none" />
      <Path d="M36 74 C 18 60, 16 34, 36 14 C 56 34, 54 60, 36 74 Z M36 74 L36 82" stroke={ink} strokeWidth={1.5}
        strokeDasharray={[4, 4]} fill="none" strokeLinecap="round" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  coverLeaf: { position: 'absolute', width: 112, height: 112, opacity: 0.8 },
});
