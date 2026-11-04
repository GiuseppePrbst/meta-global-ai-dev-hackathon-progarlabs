import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { interpolate, useAnimatedReaction, useAnimatedScrollHandler, useAnimatedStyle, useReducedMotion, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { toggleSaved, useSaved } from '@/features/catalog/saved';
import { type NameLayout, SpeciesDetail, SpeciesHero } from '@/features/catalog/species-detail';
import { useSpecies } from '@/features/catalog/use-species';
import { t } from '@/i18n/es-CL';
import { BackIcon, BookmarkIcon, Button, IconButton, LoadingState, radius, space, Text, useTheme } from '@/ui';

export default function SpeciesDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: species, isPending, error, refetch } = useSpecies(id);
  const { color, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const saved = useSaved();
  const scrollY = useSharedValue(0);
  const reducedMotion = useReducedMotion();
  // Lugar del nombre grande en el scroll, medido por la cabecera: la barra lo recibe al cruzarla.
  const [name, setName] = useState<NameLayout>({ top: 360, height: 46 });
  const onNameLayout = useCallback((layout: NameLayout) => setName(layout), []);
  const barBottom = insets.top + BAR_HEIGHT;
  const back = () => (router.canGoBack() ? router.back() : router.replace('/species'));

  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.set(event.contentOffset.y);
  });

  // El fondo de la barra entra justo antes de que el nombre la toque; el título sube desde abajo
  // mientras el nombre grande se apaga al cruzarla, como si pasara a la barra.
  const handoffStart = name.top - barBottom;
  const handoffEnd = handoffStart + name.height;
  const barStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.get(), [handoffStart - 32, handoffStart], [0, 1], 'clamp'),
  }));
  // El velo sobre la foto cede a medida que entra la barra clara.
  const veilStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.get(), [handoffStart - 32, handoffStart], [1, 0], 'clamp'),
  }));
  // Íconos del sistema claros sobre el velo y oscuros sobre la barra clara; solo cambia al cruzar.
  const [overPhoto, setOverPhoto] = useState(true);
  useAnimatedReaction(() => scrollY.get() < handoffStart - 16, (now, before) => {
    if (now !== before) scheduleOnRN(setOverPhoto, now);
  }, [handoffStart]);
  const barTitleStyle = useAnimatedStyle(() => {
    const y = scrollY.get();
    return {
      opacity: interpolate(y, [handoffStart + name.height * 0.35, handoffEnd + 8], [0, 1], 'clamp'),
      transform: [{ translateY: reducedMotion ? 0 : interpolate(y, [handoffStart, handoffEnd + 8], [18, 0], 'clamp') }],
    };
  });

  const isSaved = species ? saved.has(species.id) : false;
  // Botones oscuros con ícono claro sobre la foto; claros con ícono oscuro sobre la barra.
  const onPhoto = Boolean(species) && overPhoto;
  const buttonLook = onPhoto ? 'dark' : 'light';
  const buttonInk = onPhoto ? color.onDark : color.onSurface;

  return (
    <View style={[styles.screen, { backgroundColor: color.background }]}>
      <StatusBar style={onPhoto || scheme === 'dark' ? 'light' : 'dark'} />
      {species ? (
        <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16}
          contentContainerStyle={{ paddingBottom: insets.bottom + space.xl }}>
          <SpeciesHero species={species} scrollY={scrollY} barBottom={barBottom} onNameLayout={onNameLayout} />
          {/* La hoja sube sobre la foto con sus esquinas redondeadas. */}
          <View style={[styles.sheet, { backgroundColor: color.background }]}>
            <SpeciesDetail species={species} />
          </View>
        </Animated.ScrollView>
      ) : (
        <View style={[styles.fallback, { paddingTop: insets.top + 72 }]}>
          {isPending ? (
            <LoadingState label={t.species.loading} />
          ) : error ? (
            // Un error de carga no es «no está en el catálogo»: se puede reintentar.
            <View style={styles.message} accessibilityLiveRegion="assertive">
              <Text variant="titleLarge">{t.detail.errorTitle}</Text>
              <Text variant="bodyMedium" tone="onSurfaceVariant">{t.detail.errorBody}</Text>
              <Button label={t.common.retry} onPress={refetch} />
            </View>
          ) : (
            <View style={styles.message} accessibilityLiveRegion="polite">
              <Text variant="titleLarge">{t.detail.notFoundTitle}</Text>
              <Button label={t.detail.notFoundAction} onPress={() => router.replace('/species')} />
            </View>
          )}
        </View>
      )}

      {/* Velo de bosque sobre el borde superior de la foto: hace legibles la barra de estado y los botones. */}
      {species ? (
        <Animated.View pointerEvents="none" style={[styles.veil, { height: insets.top + VEIL_HEIGHT }, veilStyle]}>
          <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none">
            <Defs>
              <LinearGradient id="detail-veil" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={color.dark} stopOpacity={0.78} />
                <Stop offset="0.55" stopColor={color.dark} stopOpacity={0.4} />
                <Stop offset="1" stopColor={color.dark} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#detail-veil)" />
          </Svg>
        </Animated.View>
      ) : null}
      <Animated.View pointerEvents="none" style={[styles.bar, { height: barBottom, backgroundColor: color.background, borderColor: color.outlineVariant }, species ? barStyle : null]}>
        <Animated.View style={[{ marginTop: insets.top }, species ? barTitleStyle : null]}>
          <Text variant="titleMedium" numberOfLines={1} style={styles.barTitle}>
            {species?.commonName ?? t.detail.screenTitle}
          </Text>
        </Animated.View>
      </Animated.View>
      <View style={[styles.actions, { top: insets.top + space.sm }]} pointerEvents="box-none">
        <IconButton label={t.detail.back} onPress={back} look={buttonLook}>
          <BackIcon color={buttonInk} size={22} />
        </IconButton>
        {species ? (
          <IconButton label={isSaved ? t.species.unsave(species.commonName) : t.species.save(species.commonName)} look={buttonLook}
            selected={isSaved} onPress={() => toggleSaved(species.id)}>
            <BookmarkIcon color={isSaved && buttonLook === 'dark' ? color.lime : buttonInk} fill={isSaved ? color.lime : 'none'} size={22} />
          </IconButton>
        ) : null}
      </View>
    </View>
  );
}

/** Alto de la barra superior bajo el inset. */
const BAR_HEIGHT = 64;
/** Alto del velo bajo el inset: cubre los botones y se desvanece antes del nombre. */
const VEIL_HEIGHT = 112;

const styles = StyleSheet.create({
  screen: { flex: 1 },
  sheet: { marginTop: -radius.xl, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl },
  fallback: { padding: space.xl },
  message: { gap: space.lg, alignItems: 'flex-start' },
  veil: { position: 'absolute', top: 0, left: 0, right: 0 },
  bar: { position: 'absolute', top: 0, left: 0, right: 0, borderBottomWidth: StyleSheet.hairlineWidth, justifyContent: 'center' },
  barTitle: { paddingHorizontal: 72, textAlign: 'center' },
  actions: { position: 'absolute', left: space.lg, right: space.lg, flexDirection: 'row', justifyContent: 'space-between' },
});
