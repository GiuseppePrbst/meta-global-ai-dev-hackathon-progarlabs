import { StyleSheet } from 'react-native';

import { Surface } from '@/ui/components/surface';
import { Text } from '@/ui/components/text';
import { radius, space, stroke, useTheme } from '@/ui/tokens/theme';

type ChipProps = {
  label: string;
  /** Marca o ícono antes del texto. */
  leading?: React.ReactNode;
  /** Lectura completa cuando el texto visible es abreviado. */
  accessibilityLabel?: string;
};

/** Píldora informativa que flota sobre el mapa o el papel; no es un botón. */
export function Chip({ label, leading, accessibilityLabel }: ChipProps) {
  const { color } = useTheme();
  return (
    <Surface elevation="raised" style={[styles.chip, { borderColor: color.leafInk }]} accessible accessibilityLabel={accessibilityLabel}>
      {leading}
      <Text variant="titleSmall">{label}</Text>
    </Surface>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 40,
    paddingHorizontal: space.md,
    borderRadius: radius.full,
    borderWidth: stroke.ink,
  },
});
