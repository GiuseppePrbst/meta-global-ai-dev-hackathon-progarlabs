import { StyleSheet, View } from 'react-native';

import { t } from '@/i18n/es-CL';
import { Tag, useTheme } from '@/ui';

/** Observación sintética de demostración, sin verificar: círculo abierto copihue, como su gota en el mapa. */
export function SyntheticTag() {
  return (
    <Tag label={`${t.atlas.syntheticTag} · ${t.atlas.unverified}`} background="demo" ink="onDemo" mark="ring"
      markColor="accent" tilt="left" />
  );
}

/** Marca de «sin verificar»: círculo abierto, igual que el punto del mapa. */
export function UnverifiedMark() {
  const { color } = useTheme();
  return <View style={[styles.mark, { borderColor: color.accent }]} />;
}

const styles = StyleSheet.create({
  mark: { width: 12, height: 12, borderRadius: 6, borderWidth: 2.5 },
});
