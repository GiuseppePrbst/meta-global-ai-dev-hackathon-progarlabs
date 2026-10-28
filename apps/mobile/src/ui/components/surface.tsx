import { StyleSheet, View, type ViewProps } from 'react-native';

import { Paper } from '@/ui/art/paper';
import { elevation as shadows, useTheme } from '@/ui/tokens/theme';

type SurfaceProps = ViewProps & {
  elevation: keyof typeof shadows;
  /** Con grano de papel, como una hoja; sin él, una superficie lisa. */
  paper?: boolean;
};

/** Superficie que flota sobre el papel o el mapa: fondo, filo fino y sombra. La forma va en `style`. */
export function Surface({ elevation, paper = false, style, ...props }: SurfaceProps) {
  const { color } = useTheme();
  const surfaceStyle = [
    styles.surface,
    { backgroundColor: color.surface, borderColor: color.outlineVariant, shadowColor: color.scrim },
    shadows[elevation],
    style,
  ];
  return paper ? <Paper style={surfaceStyle} {...props} /> : <View style={surfaceStyle} {...props} />;
}

const styles = StyleSheet.create({
  surface: { borderWidth: StyleSheet.hairlineWidth },
});
