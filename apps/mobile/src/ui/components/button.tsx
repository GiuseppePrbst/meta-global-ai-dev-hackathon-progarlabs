import { Pressable, type StyleProp, StyleSheet, type ViewStyle } from 'react-native';

import { Text } from '@/ui/components/text';
import { type ColorToken, radius, space, useTheme } from '@/ui/tokens/theme';

type ButtonProps = {
  label: string;
  onPress: () => void;
  /** `primary`: lima, la acción del paso. `soft`: lima suave, acción de una tarjeta. `dark`: sobre fondo claro, secundaria fuerte. `ghost`: contorno sobre oscuro. */
  tone?: 'primary' | 'soft' | 'dark' | 'ghost';
  /** Ícono antes del texto. */
  leading?: React.ReactNode;
  /** Ícono tras el texto, p. ej. un chevron en un círculo. */
  trailing?: React.ReactNode;
  /** `compact`: 40 dp de alto visible (con área de toque de 48). */
  size?: 'regular' | 'compact';
  accessibilityLabel?: string;
  role?: 'button' | 'link';
  style?: StyleProp<ViewStyle>;
};

const tones: Record<NonNullable<ButtonProps['tone']>, { face: ColorToken | 'transparent'; ink: ColorToken; border?: ColorToken; ripple: ColorToken }> = {
  primary: { face: 'lime', ink: 'onLime', ripple: 'ripple' },
  soft: { face: 'limeSoft', ink: 'onLimeSoft', ripple: 'ripple' },
  dark: { face: 'dark', ink: 'onDark', ripple: 'onDarkRipple' },
  ghost: { face: 'transparent', ink: 'onDark', border: 'darkOutline', ripple: 'onDarkRipple' },
};

/** Botón en píldora: 52 dp de alto, o 40 en tarjetas. */
export function Button({ label, onPress, tone = 'primary', leading, trailing, size = 'regular', accessibilityLabel, role = 'button', style }: ButtonProps) {
  const { color } = useTheme();
  const look = tones[tone];
  const compact = size === 'compact';
  return (
    <Pressable onPress={onPress} accessibilityRole={role} accessibilityLabel={accessibilityLabel}
      hitSlop={compact ? 4 : undefined}
      android_ripple={{ color: color[look.ripple], foreground: true }}
      style={({ pressed }) => [
        styles.button,
        compact ? styles.compact : styles.regular,
        {
          backgroundColor: look.face === 'transparent' ? 'transparent' : color[look.face],
          borderColor: look.border ? color[look.border] : 'transparent',
          opacity: pressed ? 0.88 : 1,
        },
        trailing ? styles.withTrailing : null,
        style,
      ]}>
      {leading}
      <Text variant="button" tone={look.ink} style={trailing ? styles.grow : null} numberOfLines={1}>{label}</Text>
      {trailing}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    overflow: 'hidden',
  },
  regular: { minHeight: 52, paddingHorizontal: space.xl },
  compact: { minHeight: 40, paddingHorizontal: space.lg },
  withTrailing: { justifyContent: 'space-between', paddingRight: space.sm },
  grow: { flexShrink: 1 },
});
