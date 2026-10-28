import { type Insets, Pressable, type StyleProp, StyleSheet, type ViewStyle } from 'react-native';

import { useTheme } from '@/ui/tokens/theme';

type IconButtonProps = {
  /** Etiqueta accesible: el ícono solo no dice qué hace el botón. */
  label: string;
  onPress: () => void;
  children: React.ReactNode;
  /** Superficie sobre la que va: cambia el color del ripple. */
  on?: 'paper' | 'band';
  /** Ripple circular que sale del cuadrado; sin él, el ripple llena el botón (p. ej. en un grupo). */
  borderless?: boolean;
  hitSlop?: number | Insets;
  style?: StyleProp<ViewStyle>;
};

/** Botón de ícono con área de toque de 48 dp. */
export function IconButton({ label, onPress, children, on = 'paper', borderless = true, hitSlop, style }: IconButtonProps) {
  const { color } = useTheme();
  const ripple = on === 'band' ? color.onTopBarRipple : color.ripple;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={hitSlop}
      android_ripple={borderless ? { color: ripple, borderless: true, radius: 24 } : { color: ripple }}
      style={[styles.button, style]}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
});
