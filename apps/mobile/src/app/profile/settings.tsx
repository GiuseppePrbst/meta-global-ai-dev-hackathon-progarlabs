import Constants from 'expo-constants';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { resetOnboardingSeen } from '@/features/onboarding/onboarding-seen';
import {
  ALIAS_MAX, AVATAR_TONES, BIO_MAX, initials, PROFILE_TAGS, type Profile, type ProfileErrors, validateProfile,
} from '@/features/profile/profile';
import { Avatar, BackHeader, tagIcons } from '@/features/profile/profile-parts';
import { saveProfile, useProfile } from '@/features/profile/profile-store';
import { saveColorScheme } from '@/features/settings/color-scheme';
import { t } from '@/i18n/es-CL';
import { Button, CheckIcon, DataRows, FilterChip, LoadingState, radius, space, Text, TextButton, type, useTheme } from '@/ui';

type SaveState = 'idle' | 'saved' | 'memoryOnly';

/** Ajustes del perfil local: editarlo, qué se guarda y dónde, y créditos. */
export default function ProfileSettingsScreen() {
  const { color } = useTheme();
  const insets = useSafeAreaInsets();
  const profile = useProfile();
  const version = Constants.expoConfig?.version ?? '';

  return (
    <View style={[styles.screen, { backgroundColor: color.background }]}>
      <BackHeader title={t.profile.settingsTitle} />
      {profile ? (
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space.xl }]}
          keyboardShouldPersistTaps="handled">
          {/* El formulario se monta con el perfil ya leído: su borrador parte de ahí y no hay que sincronizarlo. */}
          <ProfileEditor initial={profile} />

          <Section title={t.profile.appearanceTitle}>
            <DarkModeToggle />
          </Section>

          <Section title={t.profile.privacyTitle}>
            <DataRows rows={t.profile.privacyRows} />
            <Text variant="bodySmall" tone="onSurfaceVariant">{t.profile.ageNote}</Text>
            <TextButton label={t.profile.replayOnboarding} onPress={resetOnboardingSeen} />
          </Section>

          <Section title={t.profile.aboutTitle}>
            <DataRows rows={t.profile.aboutRows(version)} />
          </Section>

          <Section title={t.profile.creditsTitle}>
            <DataRows rows={t.profile.creditsRows} />
          </Section>
        </ScrollView>
      ) : (
        <LoadingState label={t.profile.loading} />
      )}
    </View>
  );
}

function ProfileEditor({ initial }: { initial: Profile }) {
  const { color } = useTheme();
  const [draft, setDraft] = useState<Profile>(initial);
  const [errors, setErrors] = useState<ProfileErrors>({});
  const [saveState, setSaveState] = useState<SaveState>('idle');

  const edit = (patch: Partial<Profile>) => {
    setDraft((current) => ({ ...current, ...patch }));
    setSaveState('idle');
  };

  const save = async () => {
    const result = validateProfile(draft);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setDraft(result.profile);
    setSaveState((await saveProfile(result.profile)) ? 'saved' : 'memoryOnly');
  };

  const name = draft.alias.trim() || t.profile.defaultName;

  return (
    <Section title={t.profile.editTitle}>
      <View style={styles.preview}>
        <Avatar initials={initials(draft.alias)} tone={draft.avatarTone} size={72} label={t.profile.avatarA11y(name)} />
        <Text variant="titleMedium" numberOfLines={1} style={styles.grow}>{name}</Text>
      </View>

      <Field label={t.profile.aliasLabel} hint={t.profile.aliasHint(ALIAS_MAX)} value={draft.alias} max={ALIAS_MAX}
        error={errors.alias ? t.profile.tooLong(ALIAS_MAX) : undefined} onChangeText={(alias) => edit({ alias })} />
      <Field label={t.profile.bioLabel} hint={t.profile.bioHint(BIO_MAX)} value={draft.bio} max={BIO_MAX} multiline
        error={errors.bio ? t.profile.tooLong(BIO_MAX) : undefined} onChangeText={(bio) => edit({ bio })} />

      <View style={styles.field}>
        <Text variant="labelLarge" nativeID="tag-label">{t.profile.tagLabel}</Text>
        <View style={styles.tags} accessibilityLabelledBy="tag-label">
          {PROFILE_TAGS.map((tag) => (
            <FilterChip key={tag} label={t.profile.tags[tag]} icon={tagIcons[tag]} selected={draft.tag === tag}
              onPress={() => edit({ tag })} />
          ))}
        </View>
        <Text variant="bodySmall" tone="onSurfaceVariant">{t.profile.tagHint}</Text>
      </View>

      <Text variant="labelLarge" nativeID="tone-label">{t.profile.toneLabel}</Text>
      <View style={styles.tones} accessibilityRole="radiogroup" accessibilityLabelledBy="tone-label">
        {AVATAR_TONES.map((tone) => {
          const selected = draft.avatarTone === tone;
          return (
            <Pressable key={tone} onPress={() => edit({ avatarTone: tone })} accessibilityRole="radio"
              accessibilityLabel={t.profile.tones[tone]} accessibilityState={{ checked: selected }}
              style={[styles.tone, { borderColor: selected ? color.onSurface : 'transparent' }]}>
              <Avatar initials={initials(draft.alias)} tone={tone} size={48} />
              <Text variant="labelSmall" tone="onSurfaceVariant">{t.profile.tones[tone]}</Text>
            </Pressable>
          );
        })}
      </View>

      <Button label={t.profile.save} onPress={save} />
      {saveState !== 'idle' ? (
        <View style={styles.saved} accessibilityLiveRegion="polite">
          {saveState === 'saved' ? <CheckIcon color={color.onLimeSoft} size={18} /> : null}
          <Text variant="bodySmall" tone={saveState === 'saved' ? 'onLimeSoft' : 'onProvisional'} style={styles.grow}>
            {saveState === 'saved' ? t.profile.saved : t.profile.savedMemoryOnly}
          </Text>
        </View>
      ) : null}
    </Section>
  );
}

/** Interruptor del modo oscuro: aplica el cambio al instante y lo recuerda en el dispositivo. */
function DarkModeToggle() {
  const { color, scheme } = useTheme();
  const dark = scheme === 'dark';
  return (
    <View style={styles.toggle}>
      <View style={styles.grow}>
        <Text variant="labelLarge" nativeID="dark-mode-label">{t.profile.darkMode}</Text>
        <Text variant="bodySmall" tone="onSurfaceVariant">{t.profile.darkModeHint}</Text>
      </View>
      <Switch
        value={dark}
        onValueChange={(on) => saveColorScheme(on ? 'dark' : 'light')}
        accessibilityLabel={t.profile.darkMode}
        accessibilityHint={t.profile.darkModeHint}
        trackColor={{ false: color.outlineVariant, true: color.lime }}
        thumbColor={dark ? color.onLime : color.surface}
        ios_backgroundColor={color.outlineVariant}
      />
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { color } = useTheme();
  return (
    <View style={[styles.section, { backgroundColor: color.surface, borderColor: color.outlineVariant }]}>
      <Text variant="titleMedium" accessibilityRole="header">{title}</Text>
      {children}
    </View>
  );
}

type FieldProps = {
  label: string;
  hint: string;
  value: string;
  max: number;
  error?: string;
  multiline?: boolean;
  onChangeText: (value: string) => void;
};

/** Campo de texto con rótulo, ayuda, contador y error escrito (no solo en color). */
function Field({ label, hint, value, max, error, multiline, onChangeText }: FieldProps) {
  const { color } = useTheme();
  const length = [...value].length;
  return (
    <View style={styles.field}>
      <Text variant="labelLarge">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        maxLength={max}
        multiline={multiline}
        accessibilityLabel={label}
        accessibilityHint={error ?? hint}
        selectionColor={color.onLimeSoft}
        cursorColor={color.onSurface}
        autoCorrect={!!multiline}
        style={[
          type.bodyLarge,
          styles.input,
          multiline && styles.multiline,
          { color: color.onSurface, backgroundColor: color.surfaceMuted, borderColor: error ? color.onProvisional : 'transparent' },
        ]}
      />
      <View style={styles.fieldFoot}>
        <Text variant="bodySmall" tone={error ? 'onProvisional' : 'onSurfaceVariant'} style={styles.grow}>{error ?? hint}</Text>
        <Text variant="labelSmall" tone="onSurfaceVariant">{t.profile.counter(length, max)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: space.lg, gap: space.lg },
  section: { gap: space.md, padding: space.lg, borderRadius: radius.lg, borderWidth: 1 },
  preview: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  grow: { flex: 1 },
  field: { gap: space.xs },
  input: { minHeight: 48, paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: radius.md, borderWidth: 1.5 },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  fieldFoot: { flexDirection: 'row', gap: space.sm },
  tones: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
  tags: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap', paddingVertical: space.xs },
  tone: { alignItems: 'center', gap: space.xxs, padding: space.xs, borderRadius: radius.md, borderWidth: 2, minWidth: 64 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  saved: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
});
