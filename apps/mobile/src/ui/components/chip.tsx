import { Pressable, StyleSheet } from 'react-native';

import { CheckIcon, type IconComponent } from '@/ui/components/icons';
import { Text } from '@/ui/components/text';
import { radius, space, useTheme } from '@/ui/tokens/theme';

type FilterChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: IconComponent;
  /** Fondo sobre el que va: cambia el chip sin elegir. */
  on?: 'light' | 'dark';
  accessibilityLabel?: string;
  /** Chip que se activa y desactiva (p. ej. una capa): activo muestra un check, no solo color. */
  toggle?: boolean;
};

/** Chip de filtro o de capa: lima cuando está activo, y el estado también se anuncia. */
export function FilterChip({ label, selected, onPress, icon, on = 'light', accessibilityLabel, toggle = false }: FilterChipProps) {
  const Icon = toggle && selected ? CheckIcon : icon;
  const { color } = useTheme();
  const idle = on === 'dark'
    ? { backgroundColor: color.darkScrim, borderColor: color.darkOutline, ink: color.onDark }
    : { backgroundColor: color.surfaceMuted, borderColor: color.surfaceMuted, ink: color.onSurface };
  const ink = selected ? color.onLime : idle.ink;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected }} hitSlop={{ top: 6, bottom: 6 }}
      android_ripple={{ color: on === 'dark' && !selected ? color.onDarkRipple : color.ripple }}
      style={[
        styles.chip,
        selected ? { backgroundColor: color.lime, borderColor: color.lime } : idle,
        Icon ? styles.withIcon : null,
      ]}>
      {Icon ? <Icon color={ink} size={18} /> : null}
      <Text variant="labelLarge" style={{ color: ink }} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 36,
    paddingHorizontal: space.lg,
    borderRadius: radius.full,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    overflow: 'hidden',
  },
  withIcon: { paddingLeft: space.md },
});
