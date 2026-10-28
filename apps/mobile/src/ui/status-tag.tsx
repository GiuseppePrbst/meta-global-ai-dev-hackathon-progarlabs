import { StyleSheet, Text, View } from 'react-native';

import { t } from '@/i18n/es-CL';
import { type, useTheme } from '@/ui/theme';

/** Etiqueta de estado taxonómico, como un trozo de cinta. Siempre con texto, nunca solo color. */
export function ProvisionalTag() {
  const { color } = useTheme();
  return (
    <View style={[styles.tape, styles.tiltLeft, { backgroundColor: color.provisional }]}>
      <View style={[styles.mark, { borderColor: color.onProvisional }]} />
      <Text style={[type.labelMedium, styles.text, { color: color.onProvisional }]}>{t.status.provisional}</Text>
    </View>
  );
}

/** Capacidad que todavía no existe en la app (equivale a un 501): se dice, no se simula. */
export function NotImplementedTag() {
  const { color } = useTheme();
  return (
    <View style={[styles.tape, styles.tiltRight, { backgroundColor: color.demo }]}>
      <View style={[styles.dash, { backgroundColor: color.onDemo }]} />
      <Text style={[type.labelMedium, styles.text, { color: color.onDemo }]}>{t.pending.tag}</Text>
    </View>
  );
}

/** Observación sintética de demostración, sin verificar: círculo abierto copihue, como su gota en el mapa. */
export function SyntheticTag() {
  const { color } = useTheme();
  return (
    <View style={[styles.tape, styles.tiltLeft, { backgroundColor: color.demo }]}>
      <View style={[styles.mark, { borderColor: color.accent }]} />
      <Text style={[type.labelMedium, styles.text, { color: color.onDemo }]}>
        {`${t.atlas.syntheticTag} · ${t.atlas.unverified}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // Cinta: esquinas casi rectas y una leve inclinación, como pegada a mano.
  tape: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 2,
  },
  tiltLeft: { transform: [{ rotate: '-2deg' }] },
  tiltRight: { transform: [{ rotate: '1.5deg' }] },
  text: { fontWeight: '800' },
  // Círculo abierto: «aún sin validar», distinto de un punto relleno.
  mark: { width: 9, height: 9, borderRadius: 5, borderWidth: 2 },
  // Guion: «todavía no», distinto del círculo de provisional.
  dash: { width: 9, height: 2, borderRadius: 1 },
});
