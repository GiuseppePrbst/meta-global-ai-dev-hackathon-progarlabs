import { StyleSheet } from 'react-native';

import { Surface } from '@/ui/components/surface';
import { Text } from '@/ui/components/text';
import { radius, space } from '@/ui/tokens/theme';

type ChipProps = {
  label: string;
  /** Marca o ícono antes del texto. */
  leading?: React.ReactNode;
  /** Lectura completa cuando el texto visible es abreviado. */
  accessibilityLabel?: string;
};

/** Píldora informativa que flota sobre el mapa o el papel; no es un botón. */
export function Chip({ label, leading, accessibilityLabel }: ChipProps) {
  return (
    <Surface elevation="raised" style={styles.chip} accessible accessibilityLabel={accessibilityLabel}>
      {leading}
      <Text variant="labelLarge">{label}</Text>
    </Surface>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 36,
    paddingHorizontal: space.md,
    borderRadius: radius.full,
  },
});
