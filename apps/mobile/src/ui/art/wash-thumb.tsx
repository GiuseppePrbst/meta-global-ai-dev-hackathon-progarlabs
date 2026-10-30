import { StyleSheet } from 'react-native';
import Svg from 'react-native-svg';

import { Wash } from '@/ui/art/watercolor';

type WashThumbProps = {
  /** Lado del cuadrado, en dp. */
  size: number;
  seed: number;
  color: string;
  opacity: number;
  wobble: number;
  grain: number;
  /** Margen de la mancha hasta el borde del cuadrado: `[horizontal, vertical]`. */
  inset: [number, number];
};

/** Mancha de acuarela que llena una miniatura cuadrada, detrás de lo que la miniatura muestre. */
export function WashThumb({ size, seed, color, opacity, wobble, grain, inset }: WashThumbProps) {
  return (
    <Svg width={size} height={size} style={StyleSheet.absoluteFill} accessible={false}>
      <Wash seed={seed} cx={size / 2} cy={size / 2} rx={size / 2 - inset[0]} ry={size / 2 - inset[1]}
        color={color} opacity={opacity} wobble={wobble} grain={grain} />
    </Svg>
  );
}
