import { router } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { buildActivity } from '@/features/profile/activity';
import { countDiscoveries, levelFor } from '@/features/profile/levels';
import { ActivityList, BackHeader, LevelCard, useProfileInputs } from '@/features/profile/profile-parts';
import { t } from '@/i18n/es-CL';
import { EmptyState, LoadingState, space, StatusBanner, Text, TrailIcon, useTheme } from '@/ui';

/** Historial completo del perfil, con el nivel arriba. */
export default function ProfileActivityScreen() {
  const { color } = useTheme();
  const insets = useSafeAreaInsets();
  const inputs = useProfileInputs();
  const activity = useMemo(() => (inputs ? buildActivity(inputs) : []), [inputs]);
  const level = useMemo(() => (inputs ? levelFor(countDiscoveries(inputs)) : undefined), [inputs]);

  return (
    <View style={[styles.screen, { backgroundColor: color.background }]}>
      <BackHeader title={t.profile.activityScreenTitle} />
      {inputs && level ? (
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space.xl }]}>
          {/* Ya en el historial, la tarjeta lleva al Diario, donde están las insignias y la guía. */}
          <LevelCard level={level} onPress={() => router.navigate('/journal')} hint={t.profile.levelHintJournal} />
          <Text variant="bodySmall" tone="onSurfaceVariant">{t.profile.levelRule} {t.profile.activityScreenBody}</Text>
          {activity.length ? (
            <ActivityList items={activity} catalog={inputs.catalog} />
          ) : (
            <EmptyState icon={TrailIcon} title={t.profile.activityEmptyTitle} body={t.profile.activityEmptyBody} />
          )}
          <StatusBanner message={t.journal.demoNote} />
        </ScrollView>
      ) : (
        <LoadingState label={t.profile.loading} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: space.lg, gap: space.md },
});
