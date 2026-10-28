import { StyleSheet, Text, View } from 'react-native';

import { t } from '@/i18n/es-CL';
import { radius, type, useTheme } from '@/ui/theme';

/** Etiqueta de estado taxonómico. Siempre con texto, nunca solo color. */
export function ProvisionalTag() {
  const { color } = useTheme();
  return (
    <View style={[styles.tag, { backgroundColor: color.provisional, borderColor: color.provisionalOutline }]}>
      <View style={[styles.mark, { borderColor: color.onProvisional }]} />
      <Text style={[type.labelMedium, { color: color.onProvisional }]}>{t.status.provisional}</Text>
    </View>
  );
}

/** Capacidad que todavía no existe en la app (equivale a un 501): se dice, no se simula. */
export function NotImplementedTag() {
  const { color } = useTheme();
  return (
    <View style={[styles.tag, { backgroundColor: color.demo, borderColor: color.onDemo }]}>
      <View style={[styles.dash, { backgroundColor: color.onDemo }]} />
      <Text style={[type.labelMedium, { color: color.onDemo }]}>{t.pending.tag}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  // Círculo abierto: «aún sin validar», distinto de un punto relleno.
  mark: { width: 8, height: 8, borderRadius: 4, borderWidth: 1.5 },
  // Guion: «todavía no», distinto del círculo de provisional.
  dash: { width: 8, height: 1.5, borderRadius: 1 },
});
