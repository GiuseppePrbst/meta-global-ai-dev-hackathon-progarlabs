import { StyleSheet, View } from 'react-native';

import { Text } from '@/ui/components/text';
import { type ColorToken, radius, useTheme } from '@/ui/tokens/theme';

export type TagTone = 'lime' | 'provisional' | 'demo' | 'neutral' | 'dark';

const tones: Record<TagTone, { face: ColorToken; ink: ColorToken }> = {
  lime: { face: 'limeSoft', ink: 'onLimeSoft' },
  provisional: { face: 'provisional', ink: 'onProvisional' },
  demo: { face: 'demo', ink: 'onDemo' },
  neutral: { face: 'surfaceMuted', ink: 'onSurfaceVariant' },
  dark: { face: 'darkSurfaceHigh', ink: 'onDark' },
};

/** Etiqueta corta de grupo o estado: siempre con texto, el color solo acompaña. */
export function Tag({ label, tone }: { label: string; tone: TagTone }) {
  const { color } = useTheme();
  const look = tones[tone];
  return (
    <View style={[styles.tag, { backgroundColor: color[look.face] }]}>
      <Text variant="tag" tone={look.ink} numberOfLines={1}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: { alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 2, borderRadius: radius.sm - 2 },
});
