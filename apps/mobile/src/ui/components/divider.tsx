import { type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/ui/tokens/theme';

/** Filete fino entre elementos; los márgenes o el grosor distinto van en `style`. */
export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  const { color } = useTheme();
  return <View style={[styles.divider, { backgroundColor: color.outlineVariant }, style]} />;
}

const styles = StyleSheet.create({
  divider: { height: StyleSheet.hairlineWidth },
});
