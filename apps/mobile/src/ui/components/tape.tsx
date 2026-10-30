import { StyleSheet, type ViewProps } from 'react-native';
import Animated, { type AnimatedProps } from 'react-native-reanimated';

import { useTheme } from '@/ui/tokens/theme';

type TapeProps = Pick<AnimatedProps<ViewProps>, 'style' | 'entering'>;

/**
 * Trozo de cinta lima translúcida que sujeta algo al cuaderno. Va en posición absoluta: la posición,
 * el giro y, si hace falta, el tamaño van en `style`.
 */
export function Tape({ style, entering }: TapeProps) {
  const { color } = useTheme();
  return <Animated.View entering={entering} style={[styles.tape, { backgroundColor: color.lime }, style]} />;
}

const styles = StyleSheet.create({
  tape: { position: 'absolute', width: 56, height: 18, opacity: 0.85, borderRadius: 1 },
});
