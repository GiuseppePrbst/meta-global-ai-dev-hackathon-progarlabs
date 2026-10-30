import { Linking, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { OSM_COPYRIGHT } from '@/features/atlas/basemap';
import { EmptyAtlasSheet, SurveyHill } from '@/features/atlas/contour-art';
import { CONTROLS_BOTTOM, CONTROLS_GUTTER } from '@/features/atlas/map-layout';
import { UnverifiedMark } from '@/features/atlas/status-marks';
import { t } from '@/i18n/es-CL';
import { BAND_EDGE, Chip, Divider, EmptyState, FrameIcon, IconButton, MinusIcon, PlusIcon, radius, space, StatusBanner, Surface, Text, useTheme } from '@/ui';

// Piezas que flotan sobre el mapa del Atlas, o lo tapan mientras no puede mostrarse.

type MapSummaryProps = {
  /** Observaciones dibujadas; `null` mientras cargan o si fallaron, para no decir «0». */
  count: number | null;
  observationsError: boolean;
  tileError: boolean;
};

/** Recuento de observaciones sintéticas y los avisos de lo que no cargó; arriba a la izquierda. */
export function MapSummary({ count, observationsError, tileError }: MapSummaryProps) {
  return (
    <Animated.View entering={FadeIn.delay(600).duration(320)} style={styles.summary} pointerEvents="box-none">
      {count !== null ? (
        <Chip label={t.atlas.syntheticCount(count)} accessibilityLabel={t.atlas.syntheticCountA11y(count)}
          leading={<UnverifiedMark />} />
      ) : null}
      {observationsError ? (
        <View accessibilityLiveRegion="polite">
          <StatusBanner message={t.atlas.observationsErrorBanner} />
        </View>
      ) : null}
      {tileError ? (
        <View accessibilityLiveRegion="polite">
          <StatusBanner message={t.atlas.tileError} />
        </View>
      ) : null}
    </Animated.View>
  );
}

type MapControlsProps = { onZoomIn: () => void; onZoomOut: () => void; onRecenter: () => void };

/** Zoom y vuelta al encuadre, abajo a la derecha. */
export function MapControls({ onZoomIn, onZoomOut, onRecenter }: MapControlsProps) {
  const { color } = useTheme();
  return (
    <Animated.View entering={FadeIn.delay(700).duration(320)} style={styles.controls}>
      <Surface elevation="raised" style={styles.group}>
        <IconButton label={t.atlas.zoomIn} onPress={onZoomIn} borderless={false}>
          <PlusIcon color={color.onSurface} />
        </IconButton>
        <Divider />
        <IconButton label={t.atlas.zoomOut} onPress={onZoomOut} borderless={false}>
          <MinusIcon color={color.onSurface} />
        </IconButton>
      </Surface>
      <Surface elevation="raised" style={styles.group}>
        <IconButton label={t.atlas.recenter} onPress={onRecenter} borderless={false}>
          <FrameIcon color={color.primary} />
        </IconButton>
      </Surface>
    </Animated.View>
  );
}

/** Atribución visible del mapa base, enlazada a la página de derechos de autor. */
export function BasemapAttribution() {
  const { color } = useTheme();
  return (
    <Pressable
      onPress={() => Linking.openURL(OSM_COPYRIGHT)}
      accessibilityRole="link"
      accessibilityLabel={t.atlas.attributionA11y}
      hitSlop={{ top: 14, bottom: 14, left: 8, right: 8 }}
      style={[styles.attribution, { backgroundColor: color.surface, borderColor: color.outlineVariant }]}>
      <Text variant="labelSmall" tone="onSurfaceVariant">{t.atlas.attribution}</Text>
    </Pressable>
  );
}

/** Telón mientras carga el mapa base; se retira con un fundido. */
export function MapLoading() {
  const { color } = useTheme();
  return (
    <Animated.View exiting={FadeOut.duration(520)} style={[styles.curtain, { backgroundColor: color.background }]}
      accessibilityLiveRegion="polite">
      <SurveyHill ink={color.leafInk} wash={color.lime} />
      <Text variant="bodyMedium" tone="onSurfaceVariant">{t.atlas.loading}</Text>
    </Animated.View>
  );
}

/** Telón cuando el mapa no puede funcionar en el dispositivo: remite a la lista. */
export function MapUnavailable() {
  const { color } = useTheme();
  return (
    <View style={[styles.curtain, { backgroundColor: color.background }]}>
      <EmptyState layout="centered" accessibilityLiveRegion="assertive" art={<EmptyAtlasSheet ink={color.outline} />}
        title={t.atlas.failedTitle} body={t.atlas.failedBody} />
    </View>
  );
}

const styles = StyleSheet.create({
  summary: {
    position: 'absolute', top: BAND_EDGE + space.md, left: space.md, right: CONTROLS_GUTTER, gap: space.sm, alignItems: 'flex-start',
  },
  controls: { position: 'absolute', right: space.md, bottom: CONTROLS_BOTTOM, gap: space.md },
  group: { borderRadius: radius.lg, overflow: 'hidden' },
  attribution: {
    position: 'absolute',
    right: space.md,
    bottom: space.md,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  curtain: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
    padding: space.xl,
  },
});
