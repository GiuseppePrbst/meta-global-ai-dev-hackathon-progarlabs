import { useState } from 'react';
import { Image, StyleSheet, View, type ViewProps } from 'react-native';

import { useTheme } from '@/ui/theme';

// Tesela generada por scripts/paper-grain.py.
const grain = require('../../assets/images/paper-grain.png');
const TILE = 192;

/** Fondo de papel de acuarela: el color del suelo y, encima, el grano teselado y teñido según el tema. */
export function Paper({ style, children, onLayout, ...props }: ViewProps) {
  const { color } = useTheme();
  const [size, setSize] = useState({ width: 0, height: 0 });
  // Teselas explícitas: `resizeMode="repeat"` no se comporta igual en todas las plataformas.
  const columns = Math.ceil(size.width / TILE);
  const rows = Math.ceil(size.height / TILE);

  return (
    <View
      style={[{ backgroundColor: color.background }, style]}
      onLayout={(event) => {
        setSize({ width: event.nativeEvent.layout.width, height: event.nativeEvent.layout.height });
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
