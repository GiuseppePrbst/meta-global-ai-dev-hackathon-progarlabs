import { Pressable, type PressableProps, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';

import { type ColorToken, stroke, useTheme } from '@/ui/tokens/theme';

type LedgeProps = Pick<PressableProps, 'onPress' | 'accessibilityRole' | 'accessibilityLabel' | 'accessibilityHint' | 'accessibilityState' | 'hitSlop'> & {
  /** Color de la cara de la pieza. */
  face: ColorToken;
  /** Contorno y canto; por defecto la tinta de hoja. */
  edge?: ColorToken;
  radius: number;
  /** Posición y tamaño de la pieza entera, canto incluido. */
  style?: StyleProp<ViewStyle>;
  /** Relleno y disposición de la cara. */
  faceStyle?: StyleProp<ViewStyle>;
  children: React.ReactNode;
};

/**
 * Pieza del álbum con contorno de tinta. Si se puede tocar lleva canto inferior, como un cromo de
 * cartón, y la cara baja hasta taparlo mientras se presiona: el canto significa «se puede tocar».
 * Sin `onPress` es una pieza quieta, pegada al papel, sin canto.
 */
export function Ledge({ face, edge = 'leafInk', radius, style, faceStyle, children, onPress, ...a11y }: LedgeProps) {
  const { color } = useTheme();
  const faceLook = [styles.face, { backgroundColor: color[face], borderColor: color[edge], borderRadius: radius }, faceStyle];
  return (
    <View style={[onPress && styles.piece, style]}>
      {onPress ? <View style={[styles.ledge, { backgroundColor: color[edge], borderRadius: radius }]} /> : null}
      {onPress ? (
        <Pressable onPress={onPress} android_ripple={{ color: color.ripple }} {...a11y}
          style={({ pressed }) => [faceLook, pressed && styles.pressed]}>
          {children}
        </Pressable>
      ) : (
        <View style={faceLook} {...a11y}>{children}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  piece: { paddingBottom: stroke.ledge },
  // El canto queda detrás de la cara, asomando solo por abajo.
  ledge: { position: 'absolute', left: 0, right: 0, top: stroke.ledge, bottom: 0 },
  face: { borderWidth: stroke.ink, overflow: 'hidden' },
  pressed: { transform: [{ translateY: stroke.ledge }] },
});
