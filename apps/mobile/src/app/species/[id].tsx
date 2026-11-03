import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { toggleSaved, useSaved } from '@/features/catalog/saved';
import { SpeciesDetail, SpeciesHero } from '@/features/catalog/species-detail';
import { useSpecies } from '@/features/catalog/use-species';
import { t } from '@/i18n/es-CL';
import { BackIcon, BookmarkIcon, Button, IconButton, LoadingState, radius, space, Text, useTheme } from '@/ui';

export default function SpeciesDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: species, isPending, error, refetch } = useSpecies(id);
  const { color } = useTheme();
  const insets = useSafeAreaInsets();
  const saved = useSaved();
  const scrollY = useSharedValue(0);
  // Alto real de la foto, medido: decide cuándo aparece la barra superior.
  const [heroHeight, setHeroHeight] = useState(360);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/species'));

  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.set(event.contentOffset.y);
  });

  // La barra superior aparece cuando la foto sale de la vista; el nombre pasa a ella.
  const barStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.get(), [heroHeight - insets.top - 120, heroHeight - insets.top - 56], [0, 1], 'clamp'),
  }));

  const isSaved = species ? saved.has(species.id) : false;

  return (
    <View style={[styles.screen, { backgroundColor: color.background }]}>
      {species ? (
        <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16}
          contentContainerStyle={{ paddingBottom: insets.bottom + space.xl }}>
          <View onLayout={(event) => setHeroHeight(event.nativeEvent.layout.height)}>
            <SpeciesHero species={species} />
          </View>
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

      <Animated.View pointerEvents="none" style={[styles.bar, { height: insets.top + 64, backgroundColor: color.background, borderColor: color.outlineVariant }, species ? barStyle : null]}>
        <Text variant="titleMedium" numberOfLines={1} style={[styles.barTitle, { marginTop: insets.top }]}>
          {species?.commonName ?? t.detail.screenTitle}
        </Text>
      </Animated.View>
      <View style={[styles.actions, { top: insets.top + space.sm }]} pointerEvents="box-none">
        <IconButton label={t.detail.back} onPress={back} look="light">
          <BackIcon color={color.onSurface} size={22} />
        </IconButton>
        {species ? (
          <IconButton label={isSaved ? t.species.unsave(species.commonName) : t.species.save(species.commonName)} look="light"
            selected={isSaved} onPress={() => toggleSaved(species.id)}>
            <BookmarkIcon color={color.onSurface} fill={isSaved ? color.lime : 'none'} size={22} />
          </IconButton>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  sheet: { marginTop: -radius.xl, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl },
  fallback: { padding: space.xl },
  message: { gap: space.lg, alignItems: 'flex-start' },
  bar: { position: 'absolute', top: 0, left: 0, right: 0, borderBottomWidth: StyleSheet.hairlineWidth, justifyContent: 'center' },
  barTitle: { paddingHorizontal: 72, textAlign: 'center' },
  actions: { position: 'absolute', left: space.lg, right: space.lg, flexDirection: 'row', justifyContent: 'space-between' },
});
