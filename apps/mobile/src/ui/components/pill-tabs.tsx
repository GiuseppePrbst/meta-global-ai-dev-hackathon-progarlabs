import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { Text } from '@/ui/components/text';
import { radius, space, useTheme } from '@/ui/tokens/theme';

export type PillTab<T extends string> = { key: T; label: string };

type PillTabsProps<T extends string> = {
  options: PillTab<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel: string;
};

/** Pestañas internas de una pantalla, en píldoras: la activa en lima. */
export function PillTabs<T extends string>({ options, value, onChange, accessibilityLabel }: PillTabsProps<T>) {
  const { color } = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel} contentContainerStyle={styles.row}>
      {options.map((option) => {
        const selected = option.key === value;
        return (
          <Pressable key={option.key} onPress={() => onChange(option.key)} accessibilityRole="tab"
            accessibilityState={{ selected }} android_ripple={{ color: color.ripple }}
            style={[styles.tab, { backgroundColor: selected ? color.lime : color.surface, borderColor: selected ? color.lime : color.outlineVariant }]}>
            <Text variant="labelLarge" tone={selected ? 'onLime' : 'onSurface'}>{option.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: space.sm, paddingHorizontal: space.lg },
  tab: {
    minHeight: 44,
    paddingHorizontal: space.lg + 2,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
