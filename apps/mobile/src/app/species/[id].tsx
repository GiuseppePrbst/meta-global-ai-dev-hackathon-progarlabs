import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SpeciesSheet } from '@/features/catalog/species-sheet';
import { useSpecies } from '@/features/catalog/use-species';
import { t } from '@/i18n/es-CL';
import { APP_BAR_HEIGHT, AppBar, BAND_EDGE, Button, LoadingState, Paper, seedOf, space, Text } from '@/ui';

const SHEET_MARGIN = space.md;

export default function SpeciesDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: species, isPending, error, refetch } = useSpecies(id);
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);
  const [nameBottom, setNameBottom] = useState(0);

  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.set(event.contentOffset.y);
  });

  // El nombre pasa a la barra cuando el nombre del pliego queda bajo ella.
  const titleStyle = useAnimatedStyle(() => {
    const visible = nameBottom > 0 && scrollY.get() > nameBottom;
    return { opacity: withTiming(visible ? 1 : 0, { duration: 180 }) };
  });

  return (
    <Paper style={styles.screen}>
      {species ? (
        <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16}
          contentContainerStyle={{
            padding: SHEET_MARGIN,
            paddingTop: insets.top + APP_BAR_HEIGHT + BAND_EDGE + SHEET_MARGIN,
            paddingBottom: insets.bottom + space.xxl,
          }}>
          <SpeciesSheet species={species} onNameLayout={(bottom) => setNameBottom(bottom + SHEET_MARGIN)} />
        </Animated.ScrollView>
      ) : (
        <View style={[styles.fallback, { paddingTop: insets.top + APP_BAR_HEIGHT + space.xl }]}>
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

      <AppBar title={species?.commonName ?? t.detail.screenTitle} seed={seedOf(id ?? 'ficha')} backLabel={t.detail.back}
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/species'))}
        titleStyle={species ? titleStyle : undefined} />
    </Paper>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  fallback: { padding: space.xl },
  message: { gap: space.lg, alignItems: 'flex-start' },
});
