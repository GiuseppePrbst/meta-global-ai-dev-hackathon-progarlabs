import { Pressable, StyleSheet } from 'react-native';

import { type IconComponent } from '@/ui/components/icons';
import { Text } from '@/ui/components/text';
import { radius, space, useTheme } from '@/ui/tokens/theme';

type FilterChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: IconComponent;
  /** Cuántos elementos deja ver el filtro; se muestra junto al rótulo. */
  count?: number;
  /** Fondo sobre el que va: cambia el chip sin elegir. */
  on?: 'light' | 'dark';
  accessibilityLabel?: string;
};

/** Chip de filtro o de capa: lima cuando está activo, y el estado también se anuncia. */
export function FilterChip({ label, selected, onPress, icon: Icon, count, on = 'light', accessibilityLabel }: FilterChipProps) {
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
      {count === undefined ? null : (
        <Text variant="labelMedium" style={[styles.count, { color: ink }]}>{String(count)}</Text>
      )}
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
  count: { opacity: 0.7, fontVariant: ['tabular-nums'] },
});
