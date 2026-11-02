import { StyleSheet, View } from 'react-native';

import { Text } from '@/ui/components/text';
import { type ColorToken, useTheme } from '@/ui/tokens/theme';

type TagProps = {
  label: string;
  background: ColorToken;
  ink: ColorToken;
  /** `ring`: círculo abierto, «aún sin validar». `dash`: guion, «todavía no». */
  mark: 'ring' | 'dash';
  /** Color de la marca; por defecto el del texto. */
  markColor?: ColorToken;
  tilt: 'left' | 'right';
};

/** Etiqueta de estado como un trozo de cinta. Siempre con texto, nunca solo color. */
export function Tag({ label, background, ink, mark, markColor = ink, tilt }: TagProps) {
  const { color } = useTheme();
  return (
    <View style={[styles.tape, tilt === 'left' ? styles.tiltLeft : styles.tiltRight,
      { backgroundColor: color[background], borderColor: color[ink] }]}>
      {mark === 'ring'
        ? <View style={[styles.ring, { borderColor: color[markColor] }]} />
        : <View style={[styles.dash, { backgroundColor: color[markColor] }]} />}
      <Text variant="labelMedium" tone={ink} style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // Cinta gruesa con filo de tinta: esquinas casi rectas y una leve inclinación, como pegada a mano.
  tape: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 3,
    borderWidth: 1.5,
  },
  tiltLeft: { transform: [{ rotate: '-2deg' }] },
  tiltRight: { transform: [{ rotate: '1.5deg' }] },
  text: { fontWeight: '800' },
  ring: { width: 9, height: 9, borderRadius: 5, borderWidth: 2 },
  dash: { width: 9, height: 2, borderRadius: 1 },
});
