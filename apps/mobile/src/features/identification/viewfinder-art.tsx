import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { LeafPlate } from '@/features/species-art/leaf-plate';
import { FadeGroup, InkPath, useInk, Wash } from '@/ui';

/** Un visor copihue que encuadra una hoja pintada: la toma que todavía no se puede hacer. */
export function Viewfinder({ ink }: { ink: string }) {
  return (
    <View style={styles.frame}>
      <Svg width={168} height={168} viewBox="0 0 168 168" style={StyleSheet.absoluteFill}>
        <Path d="M4 40V12a8 8 0 0 1 8-8h28M128 4h28a8 8 0 0 1 8 8v28M164 128v28a8 8 0 0 1-8 8h-28M40 164H12a8 8 0 0 1-8-8v-28"
          stroke={ink} strokeWidth={3.5} strokeLinecap="round" fill="none" />
      </Svg>
      <LeafPlate speciesId="eucryphia-cordifolia" size={128} draw delay={200} />
    </View>
  );
}

// Esquinas del visor de portada, cada una de largo 2·22 + arco de radio 8.
const coverCorners = [
  'M10 36V18a8 8 0 0 1 8-8h18',
  'M94 10h18a8 8 0 0 1 8 8v18',
  'M120 94v18a8 8 0 0 1-8 8H94',
  'M36 120H18a8 8 0 0 1-8-8V94',
];
const CORNER_LENGTH = 52;

/** Portada de Identificar: un visor que se entinta esquina a esquina sobre una hoja pintada. */
export function ViewfinderCover({ ink, wash }: { ink: string; wash: string }) {
  const progress = useInk(true, 120);
  return (
    <View style={styles.cover}>
      <Svg width={130} height={130} viewBox="0 0 130 130" style={StyleSheet.absoluteFill} accessible={false}>
        <FadeGroup progress={progress} from={0} to={0.4}>
          <Wash seed={23} cx={68} cy={64} rx={58} ry={48} color={wash} opacity={0.4} wobble={0.14} grain={10} />
        </FadeGroup>
        {coverCorners.map((d, i) => (
          <InkPath key={d} progress={progress} from={i * 0.12} to={i * 0.12 + 0.4} length={CORNER_LENGTH} d={d}
            stroke={ink} strokeWidth={1.6} fill="none" />
        ))}
      </Svg>
      <View style={styles.coverLeaf}>
        <LeafPlate speciesId="laureliopsis-philippiana" size={88} ink={ink} wash={wash} draw delay={360} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cover: { position: 'absolute', right: 4, top: -14, width: 130, height: 130, opacity: 0.85,
    alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '8deg' }] },
  coverLeaf: { transform: [{ rotate: '-24deg' }] },
  frame: { width: 168, height: 168, alignItems: 'center', justifyContent: 'center' },
});
