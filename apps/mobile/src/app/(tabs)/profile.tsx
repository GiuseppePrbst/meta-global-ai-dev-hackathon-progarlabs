import { router, useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { subtleIn } from '@/features/journal/discoveries';
import { buildActivity } from '@/features/profile/activity';
import { countDiscoveries, levelFor } from '@/features/profile/levels';
import { initials } from '@/features/profile/profile';
import {
  ActivityList, Avatar, CoverCurve, LevelCard, ProfileTagLabel, UpcomingLevels, useProfileInputs, WiloCheer,
} from '@/features/profile/profile-parts';
import { useProfile } from '@/features/profile/profile-store';
import { useFocusKey } from '@/features/focus-key';
import { t } from '@/i18n/es-CL';
import {
  CoverImage, EmptyState, IconButton, LoadingState, NAVIGATION_BAR_OVERLAP, ScreenHeader, SettingsIcon, space, StatusBanner, Text,
  TextButton, TrailIcon, useTheme,
} from '@/ui';

const cover = require('../../../assets/images/reference/puyehue-rio-chanleufu.jpg');

/** Cuántas actividades se ven en el perfil antes de «Ver todo». */
const RECENT = 3;
const AVATAR = 128;
const COVER = 196;
const CURVE = 44;
/** Alto del velo superior, igual que en la ficha de especie. */
const VEIL_HEIGHT = 112;

/** Se remonta al volver a la pestaña, para repetir la entrada animada. */
export default function ProfileTab() {
  return <ProfileScreen key={useFocusKey()} />;
}

function ProfileScreen() {
  const { color } = useTheme();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const focused = useIsFocused();
  const profile = useProfile();
  const inputs = useProfileInputs();

  const level = useMemo(() => (inputs ? levelFor(countDiscoveries(inputs)) : undefined), [inputs]);
  const activity = useMemo(() => (inputs ? buildActivity(inputs) : []), [inputs]);

  if (!profile || !inputs || !level) {
    return (
      <View style={[styles.screen, { backgroundColor: color.background }]}>
        <ScreenHeader title={t.profile.title} />
        <LoadingState label={t.profile.loading} />
      </View>
    );
  }

  const name = profile.alias || t.profile.defaultName;
  const openActivity = () => router.push('/profile/activity');
  const enter = (i: number) => (reducedMotion ? undefined : subtleIn(i));

  return (
    <View style={[styles.screen, { backgroundColor: color.background }]}>
      {/* Íconos claros sobre el velo, solo con la pestaña visible: las demás siguen montadas. */}
      {focused ? <StatusBar style="light" /> : null}
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.cover, { height: insets.top + COVER }]}>
          <CoverImage source={cover} accessibilityLabel={t.profile.coverA11y} />
          {/* Mismo velo que la ficha de especie: oscurece arriba para el engranaje y la barra de estado. */}
          <Svg pointerEvents="none" width="100%" height={insets.top + VEIL_HEIGHT} style={styles.veil}>
            <Defs>
              <LinearGradient id="profile-cover-veil" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={color.dark} stopOpacity={0.78} />
                <Stop offset="0.55" stopColor={color.dark} stopOpacity={0.4} />
                <Stop offset="1" stopColor={color.dark} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#profile-cover-veil)" />
          </Svg>
          <IconButton label={t.profile.settings} onPress={() => router.push('/profile/settings')} look="dark"
            style={[styles.gear, { top: insets.top + space.sm }]}>
            <SettingsIcon color={color.onDark} size={22} />
          </IconButton>
          <Text variant="labelSmall" tone="onDark" style={styles.credit} importantForAccessibility="no">{t.profile.coverCredit}</Text>
          <CoverCurve height={CURVE} />
        </View>

        <Animated.View entering={enter(0)} style={styles.padded}>
          <View style={styles.avatarWrap}>
            <Avatar initials={initials(profile.alias)} tone={profile.avatarTone} size={AVATAR} label={t.profile.avatarA11y(name)} />
          </View>
          <Text variant="display" accessibilityRole="header" numberOfLines={1}>{name}</Text>
          <ProfileTagLabel tag={profile.tag} />
          {profile.bio ? <Text variant="bodyLarge" tone="onSurfaceVariant" style={styles.bio}>{profile.bio}</Text> : null}
        </Animated.View>

        <Animated.View entering={enter(2)} style={[styles.padded, styles.block]}>
          <WiloCheer level={level} />
          <LevelCard level={level} onPress={openActivity} hint={t.profile.levelHintActivity} />
          <UpcomingLevels level={level} />
          <Text variant="bodySmall" tone="onSurfaceVariant">{t.profile.levelRule}</Text>
        </Animated.View>

        <Animated.View entering={enter(4)} style={styles.padded}>
          <View style={styles.sectionHead}>
            <Text variant="titleLarge" accessibilityRole="header" style={styles.grow}>{t.profile.activityTitle}</Text>
            {activity.length > RECENT ? (
              <TextButton label={t.profile.activitySeeAll} onPress={openActivity} role="link" />
            ) : null}
          </View>
          {activity.length ? (
            <ActivityList items={activity.slice(0, RECENT)} catalog={inputs.catalog} />
          ) : (
            <EmptyState icon={TrailIcon} title={t.profile.activityEmptyTitle} body={t.profile.activityEmptyBody}
              action={{ label: t.tabs.map, onPress: () => router.navigate('/atlas') }} />
          )}
        </Animated.View>

        <View style={styles.padded}>
          <StatusBanner message={t.profile.noAccountNote} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingBottom: space.xl + NAVIGATION_BAR_OVERLAP, gap: space.lg },
  cover: { overflow: 'hidden' },
  veil: { position: 'absolute', top: 0, left: 0, right: 0 },
  gear: { position: 'absolute', right: space.lg },
  // Sobre la ola, en el borde derecho, donde la curva deja más foto.
  credit: { position: 'absolute', right: space.md, bottom: CURVE - 6, opacity: 0.9 },
  padded: { paddingHorizontal: space.lg },
  avatarWrap: { marginTop: -AVATAR * 0.62 - space.lg, marginBottom: space.sm },
  bio: { marginTop: space.sm },
  block: { gap: space.md },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.sm },
  grow: { flex: 1 },
});
