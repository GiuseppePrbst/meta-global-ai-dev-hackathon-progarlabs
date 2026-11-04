import { router, Stack, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useRef, useState, useSyncExternalStore } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSpecies } from '@/features/catalog/use-species';
import { t } from '@/i18n/es-CL';
import ModelViewer, { type ModelViewerHandle, type ModelViewerStatus } from '@/model-viewer/model-viewer';
import { Button, CloseIcon, CubeIcon, FitIcon, IconButton, LoadingState, radius, space, Tag, Text, useTheme } from '@/ui';

const noSubscription = () => () => {};
/** En web con render en servidor, el DOM component se monta solo en el cliente (necesita `window`). */
const useIsClient = () => useSyncExternalStore(noSubscription, () => true, () => false);

/** Alto aproximado de la cabecera y el pie que flotan sobre el visor, para centrar el modelo entre ambos. */
const HEADER = 72;
const FOOTER = 120;

/**
 * Visor 3D a pantalla completa de una especie. Por ahora todas muestran el mismo modelo de prueba (el
 * trofeo de la hackatón), rotulado como tal en la cabecera y en el pie.
 */
export default function ModelScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: species } = useSpecies(id);
  const { color } = useTheme();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const mounted = useIsClient();
  const viewer = useRef<ModelViewerHandle>(null);
  const [status, setStatus] = useState<ModelViewerStatus | 'loading'>('loading');
  const onStatus = useCallback((next: ModelViewerStatus) => setStatus(next), []);
  const close = () => (router.canGoBack() ? router.back() : router.replace(id ? `/species/${id}` : '/species'));
  const name = species?.commonName ?? t.detail.screenTitle;

  return (
    <View style={[styles.screen, { backgroundColor: color.dark }]}>
      <Stack.Screen options={{ presentation: 'fullScreenModal', animation: reducedMotion ? 'fade' : 'slide_from_bottom' }} />
      <StatusBar style="light" />

      {mounted && status !== 'failed' ? (
        <ModelViewer
          ref={viewer}
          modelId="test-trophy"
          colors={{
            background: color.dark,
            accent: color.lime,
            materials: {
              madera: '#8A5A36',
              acrilico_negro: '#0B0F0C',
              vinilo_fluor: color.lime,
              // Sus letras venían en una textura del .mtl, que no llegó: sin ella es una lámina blanca
              // que tapa la placa entera, así que se oculta.
              vinilo_textos: null,
            },
            fallback: color.onDarkVariant,
          }}
          reducedMotion={reducedMotion}
          insets={{ top: insets.top + HEADER, bottom: insets.bottom + FOOTER }}
          onStatus={onStatus}
          dom={{
            style: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: color.dark },
            accessibilityLabel: t.model.viewerA11y(name),
          }}
        />
      ) : null}

      {status === 'loading' ? (
        <Animated.View exiting={FadeOut.duration(200)} style={styles.center} pointerEvents="none">
          <LoadingState label={t.model.loading} on="dark" />
        </Animated.View>
      ) : null}

      {status === 'failed' ? (
        <View style={[styles.center, styles.failed]} accessibilityLiveRegion="assertive">
          <CubeIcon color={color.onDarkVariant} size={40} />
          <Text variant="titleLarge" tone="onDark" style={styles.centerText}>{t.model.failedTitle}</Text>
          <Text variant="bodyMedium" tone="onDarkVariant" style={styles.centerText}>{t.model.failedBody}</Text>
          <Button label={t.model.failedAction} onPress={close} />
        </View>
      ) : null}

      {/* Cabecera: cerrar, nombre de la especie con la etiqueta de prueba, y volver a la vista inicial. */}
      <View style={[styles.header, { paddingTop: insets.top + space.sm }]} pointerEvents="box-none">
        <IconButton label={t.model.close} onPress={close} look="dark">
          <CloseIcon color={color.onDark} size={22} />
        </IconButton>
        <View style={styles.title} pointerEvents="none">
          <Text variant="titleMedium" tone="onDark" numberOfLines={1} accessibilityRole="header">{name}</Text>
          {species ? (
            <Text variant="scientific" tone="onDarkVariant" numberOfLines={1}>{species.scientificName}</Text>
          ) : null}
        </View>
        {status === 'ready' ? (
          <IconButton label={t.model.reset} onPress={() => viewer.current?.resetView()} look="dark">
            <FitIcon color={color.onDark} size={22} />
          </IconButton>
        ) : <View style={styles.spacer} />}
      </View>

      {/* Pie: qué es este modelo (siempre visible) y cómo se mueve. */}
      {status === 'ready' ? (
        <Animated.View entering={reducedMotion ? undefined : FadeIn.delay(500).duration(320)}
          style={[styles.footer, { bottom: insets.bottom + space.lg }]}>
          <View style={[styles.note, { backgroundColor: color.darkScrim, borderColor: color.darkOutline }]}>
            <Tag label={t.model.tag} tone="demo" />
            <Text variant="bodySmall" tone="onDark">{t.model.note(name)}</Text>
          </View>
          <Text variant="labelMedium" tone="onDarkVariant" style={styles.hint}
            accessibilityElementsHidden importantForAccessibility="no">{t.model.hint}</Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  failed: { gap: space.md, padding: space.xl },
  centerText: { textAlign: 'center' },
  header: {
    position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center',
    gap: space.md, paddingHorizontal: space.lg,
  },
  title: { flex: 1, alignItems: 'center' },
  spacer: { width: 44 },
  footer: { position: 'absolute', left: space.lg, right: space.lg, gap: space.sm, alignItems: 'center' },
  note: {
    alignSelf: 'stretch', gap: space.xs, padding: space.md, borderRadius: radius.xl - 8, borderWidth: 1,
  },
  hint: { textAlign: 'center' },
});
