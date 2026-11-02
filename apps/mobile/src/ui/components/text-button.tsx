import { Pressable, type StyleProp, StyleSheet, type ViewStyle } from 'react-native';

import { Text } from '@/ui/components/text';
import { type ColorToken, space, useTheme } from '@/ui/tokens/theme';

type TextButtonProps = {
  label: string;
  onPress: () => void;
  /** `link` si abre otra pantalla o una página externa. */
  role?: 'button' | 'link';
  /** Ícono tras el texto. */
  trailing?: React.ReactNode;
  tone?: ColorToken;
  style?: StyleProp<ViewStyle>;
};

/** Acción de texto subrayada, sin relleno, con área de toque de 48 dp. */
export function TextButton({ label, onPress, role = 'button', trailing, tone = 'onSurface', style }: TextButtonProps) {
  const { color } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole={role} android_ripple={{ color: color.ripple }}
      style={[styles.button, style]}>
      <Text variant="labelLarge" tone={tone} style={styles.label}>{label}</Text>
      {trailing}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { flexDirection: 'row', alignItems: 'center', gap: space.xs, minHeight: 48, alignSelf: 'flex-start' },
  label: { textDecorationLine: 'underline' },
});
