import { type StyleProp, StyleSheet, type ViewStyle } from 'react-native';

import { Ledge } from '@/ui/components/ledge';
import { Text } from '@/ui/components/text';
import { type ColorToken, radius, space } from '@/ui/tokens/theme';

type ButtonProps = {
  label: string;
  onPress: () => void;
  /** `primary`: la acción del paso, en verde bosque. `tonal`: una acción secundaria, en lima. */
  tone?: 'primary' | 'tonal';
  /** Ícono antes del texto. */
  leading?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

const tones: Record<NonNullable<ButtonProps['tone']>, { face: ColorToken; edge: ColorToken; ink: ColorToken }> = {
  primary: { face: 'primary', edge: 'topBarEdge', ink: 'onPrimary' },
  tonal: { face: 'lime', edge: 'leafInk', ink: 'leafInk' },
};

/** Botón en píldora con canto que se hunde al tocarlo; 52 dp de alto con el canto. */
export function Button({ label, onPress, tone = 'primary', leading, style }: ButtonProps) {
  const look = tones[tone];
  return (
    <Ledge face={look.face} edge={look.edge} radius={radius.full} onPress={onPress} accessibilityRole="button"
      style={style} faceStyle={styles.face}>
      {leading}
      <Text variant="button" tone={look.ink}>{label}</Text>
    </Ledge>
  );
}

const styles = StyleSheet.create({
  face: {
    minHeight: 48,
    paddingHorizontal: space.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
});
