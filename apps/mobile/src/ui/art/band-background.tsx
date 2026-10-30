import { StyleSheet } from 'react-native';
import Svg from 'react-native-svg';

import { PaintedBand } from '@/ui/art/watercolor';
import { useTheme } from '@/ui/tokens/theme';

type BandBackgroundProps = { seed: number; width: number; height: number };

/**
 * Banda de aguada verde de las barras superiores, a todo el tamaño de la barra que la contiene.
 * Su filo mojado cae `BAND_EDGE` dentro del borde inferior de la barra.
 */
export function BandBackground({ seed, width, height }: BandBackgroundProps) {
  const { color } = useTheme();
  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill} accessible={false} pointerEvents="none">
      <PaintedBand seed={seed} width={width} height={height} color={color.topBar}
        glaze={color.topBarGlaze} edge={color.topBarEdge} paper={color.background} />
    </Svg>
  );
}
