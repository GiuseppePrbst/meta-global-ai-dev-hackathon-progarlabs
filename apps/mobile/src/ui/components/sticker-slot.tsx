import { Pressable, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';

import { Text } from '@/ui/components/text';
import { radius, stroke, useTheme } from '@/ui/tokens/theme';

type StickerSlotProps = {
  /** Número del hueco en el álbum, escrito a mano en la esquina. */
  number: string;
  /** Silueta de lo que falta, dibujada tenue. */
  children?: React.ReactNode;
  accessibilityLabel: string;
  /** Abre lo que irá en el hueco, p. ej. la ficha de la especie. */
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

/** Hueco del álbum donde irá un cromo: contorno punteado, número y la silueta de lo que falta. */
export function StickerSlot({ number, children, accessibilityLabel, onPress, style }: StickerSlotProps) {
  const { color } = useTheme();
  const content = (
    <>
      <View style={styles.art} importantForAccessibility="no-hide-descendants">{children}</View>
      <Text variant="handBold" tone="accent" style={styles.number}>{number}</Text>
    </>
  );
  const look = [styles.slot, { borderColor: color.outline }, style];
  if (!onPress) return <View style={look} accessible accessibilityLabel={accessibilityLabel}>{content}</View>;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel}
      android_ripple={{ color: color.ripple }} style={({ pressed }) => [look, pressed && { backgroundColor: color.surfaceContainer }]}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  slot: {
    aspectRatio: 1,
    overflow: 'hidden',
    borderRadius: radius.lg,
    borderWidth: stroke.ink,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  art: { opacity: 0.55 },
  number: { position: 'absolute', top: 4, left: 10, fontVariant: ['tabular-nums'] },
});
