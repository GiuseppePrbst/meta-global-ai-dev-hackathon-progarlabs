import { Image, StyleSheet, View, type ViewProps } from 'react-native';

import { useLayoutSize } from '@/ui/hooks/use-layout-size';
import { useTheme } from '@/ui/tokens/theme';

// Tesela generada por scripts/paper-grain.py.
const grain = require('../../../assets/images/paper-grain.png');
const TILE = 192;

/** Fondo de papel de acuarela: el color del suelo y, encima, el grano teselado y teñido según el tema. */
export function Paper({ style, children, onLayout, ...props }: ViewProps) {
  const { color } = useTheme();
  const size = useLayoutSize();
  // Teselas explícitas: `resizeMode="repeat"` no se comporta igual en todas las plataformas.
  const columns = Math.ceil(size.width / TILE);
  const rows = Math.ceil(size.height / TILE);

  return (
    <View
      style={[{ backgroundColor: color.background }, style]}
      onLayout={(event) => {
        size.onLayout(event);
        onLayout?.(event);
      }}
      {...props}>
      <View style={[StyleSheet.absoluteFill, styles.grain, { opacity: color.grainOpacity }]} pointerEvents="none"
        accessible={false} importantForAccessibility="no-hide-descendants">
        {Array.from({ length: rows * columns }, (_, i) => (
          <Image key={i} source={grain} tintColor={color.grain}
            style={{ position: 'absolute', width: TILE, height: TILE, left: (i % columns) * TILE, top: Math.floor(i / columns) * TILE }} />
        ))}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  grain: { overflow: 'hidden' },
});
