import { type Insets, Pressable, type StyleProp, StyleSheet, type ViewStyle } from 'react-native';

import { elevation, useTheme } from '@/ui/tokens/theme';

type IconButtonProps = {
  /** Etiqueta accesible: el ícono solo no dice qué hace el botón. */
  label: string;
  onPress: () => void;
  children: React.ReactNode;
  /**
   * `plain`: solo el ícono. `light`: círculo blanco con filete, sobre fondo claro o foto.
   * `dark`: círculo oscuro translúcido, sobre el mapa. `muted`: círculo gris claro, en una cabecera.
   */
  look?: 'plain' | 'light' | 'dark' | 'muted';
  /** Para un botón que alterna un estado (p. ej. guardar). */
  selected?: boolean;
  hitSlop?: number | Insets;
  style?: StyleProp<ViewStyle>;
};

/** Botón de ícono: círculo de 44 dp con área de toque de 48. */
export function IconButton({ label, onPress, children, look = 'plain', selected, hitSlop = 2, style }: IconButtonProps) {
  const { color } = useTheme();
  const onDark = look === 'dark';
  const face = {
    plain: { backgroundColor: 'transparent', borderColor: 'transparent' },
    light: { backgroundColor: color.surface, borderColor: color.outlineVariant },
    dark: { backgroundColor: color.darkScrim, borderColor: color.darkOutline },
    muted: { backgroundColor: color.surfaceMuted, borderColor: 'transparent' },
  }[look];
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={hitSlop}
      accessibilityState={selected === undefined ? undefined : { selected }}
      android_ripple={{ color: onDark ? color.onDarkRipple : color.ripple, borderless: true, radius: 24 }}
      style={({ pressed }) => [
        styles.button,
        face,
        look === 'dark' || look === 'light' ? [elevation.card, { shadowColor: color.shadow }] : null,
        { opacity: pressed ? 0.8 : 1 },
        style,
      ]}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
