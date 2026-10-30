import { Pressable, type StyleProp, StyleSheet, type ViewStyle } from 'react-native';

import { Text } from '@/ui/components/text';
import { radius, space, useTheme } from '@/ui/tokens/theme';

type ButtonProps = {
  label: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

/** Botón relleno de la acción principal: píldora de 48 dp en el verde de la barra. */
export function Button({ label, onPress, style }: ButtonProps) {
  const { color } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" android_ripple={{ color: color.ripple }}
      style={[styles.button, { backgroundColor: color.primary }, style]}>
      <Text variant="labelLarge" tone="onPrimary">{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    paddingHorizontal: space.xl,
    borderRadius: radius.full,
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
