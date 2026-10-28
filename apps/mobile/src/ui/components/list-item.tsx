import { Pressable, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';

import { space, useTheme } from '@/ui/tokens/theme';

type ListItemProps = {
  /** Miniatura o marca al inicio de la fila. */
  leading?: React.ReactNode;
  /** Textos de la fila, apilados. */
  children: React.ReactNode;
  /** Lo que va al final, p. ej. un chevron. */
  trailing?: React.ReactNode;
  /** Sin `onPress` la fila no es un botón: se lee entera, pero no se puede tocar. */
  onPress?: () => void;
  accessibilityLabel: string;
  /** `regular`: 72 dp. `large`: 96 dp, para filas con miniatura grande. */
  size?: 'regular' | 'large';
  style?: StyleProp<ViewStyle>;
};

/** Fila de una lista: inicio, textos y final, con ripple si se puede tocar. */
export function ListItem({ leading, children, trailing, onPress, accessibilityLabel, size = 'regular', style }: ListItemProps) {
  const { color } = useTheme();
  const rowStyle = [styles.row, styles[size], style];
  const content = (
    <>
      {leading}
      <View style={styles.text}>{children}</View>
      {trailing}
    </>
  );

  if (!onPress) {
    return <View style={rowStyle} accessible accessibilityLabel={accessibilityLabel}>{content}</View>;
  }
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel}
      android_ripple={{ color: color.ripple }}
      style={({ pressed }) => [rowStyle, pressed && process.env.EXPO_OS === 'ios' && styles.pressed]}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: space.md },
  regular: { minHeight: 72, gap: space.md },
  large: { minHeight: 96, gap: space.lg },
  text: { flex: 1, gap: 2 },
  // iOS no tiene ripple: la fila se aclara mientras se presiona.
  pressed: { opacity: 0.7 },
});
