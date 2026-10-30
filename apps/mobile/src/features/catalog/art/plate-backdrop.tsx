import { StyleSheet, View } from 'react-native';
import Svg from 'react-native-svg';

import { speciesWash } from '@/features/species-art/leaf-plate';
import { seedOf, useLayoutSize, Wash } from '@/ui';

/** Mancha grande del color de la especie detrás de la lámina: el fondo pintado de la página. */
export function PlateBackdrop({ speciesId }: { speciesId: string }) {
  const { width, onLayout } = useLayoutSize();
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" onLayout={onLayout}>
      {width > 0 ? (
        <Svg width={width} height={width}>
          <Wash seed={seedOf(speciesId) + 5} cx={width * 0.5} cy={width * 0.5} rx={width * 0.4} ry={width * 0.38}
            color={speciesWash(speciesId)} opacity={0.14} wobble={0.18} grain={14} />
        </Svg>
      ) : null}
    </View>
  );
}
