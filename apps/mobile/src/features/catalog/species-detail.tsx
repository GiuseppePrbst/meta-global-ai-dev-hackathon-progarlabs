import { Image, Linking, StyleSheet, View } from 'react-native';

import type { Species } from '@/domain/species';
import { getReferencePhoto } from '@/features/catalog/reference-photos';
import { SpeciesTags } from '@/features/catalog/species-tags';
import { useGuideEntry } from '@/features/guide/use-guide';
import { SpeciesSilhouette } from '@/features/species-art/species-silhouette';
import { formatDate, t } from '@/i18n/es-CL';
import {
  BarkIcon, CheckIcon, DataRows, ExternalIcon, type IconComponent, InfoIcon, LeafIcon, LockIcon, PinIcon, radius, space,
  SpeciesIcon, Tag, Text, TextButton, useTheme,
} from '@/ui';

/** Foto de referencia a todo el ancho, con su crédito debajo. */
export function SpeciesHero({ species }: { species: Species }) {
  const { color } = useTheme();
  const photo = getReferencePhoto(species.id);
  return (
    <View style={[styles.hero, { backgroundColor: color.dark }]}>
      {photo ? (
        <Image source={photo.source} style={StyleSheet.absoluteFill} resizeMode="cover" accessible
          accessibilityLabel={t.detail.photoA11y(species.commonName)} accessibilityIgnoresInvertColors />
      ) : (
        <View style={styles.heroEmpty} accessible accessibilityLabel={t.detail.noPhoto}>
          <View style={styles.heroSilhouette}><SpeciesSilhouette speciesId={species.id} color={color.darkSurfaceHigh} /></View>
        </View>
      )}
    </View>
  );
}

/** Cuerpo de la ficha: identidad, lugar en la guía, rasgos, crédito de la foto y procedencia. */
export function SpeciesDetail({ species }: { species: Species }) {
  const { color } = useTheme();
  const { traits, provenance } = species;
  const photo = getReferencePhoto(species.id);
  const entry = useGuideEntry(species.id);

  const notes: [string, string, IconComponent][] = [
    [t.detail.leaf, traits.leaf, LeafIcon],
    [t.detail.bark, traits.bark, BarkIcon],
    [t.detail.habit, traits.habit, SpeciesIcon],
    [t.detail.whereToLook, traits.whereToLook, PinIcon],
  ];

  return (
    <View style={styles.body}>
      <View style={styles.identity}>
        <Text variant="display" accessibilityRole="header">{species.commonName}</Text>
        <Text variant="scientificLarge" tone="onSurfaceVariant">{species.scientificName}</Text>
        <View style={styles.tags}>
          <SpeciesTags species={species} />
        </View>
        <Text variant="labelMedium" tone="onSurfaceVariant">{t.detail.family(traits.family)}</Text>
        {species.taxonomicStatus === 'provisional' ? (
          <Text variant="bodySmall" tone="onSurfaceVariant" style={styles.statusNote}>{t.status.provisionalNote}</Text>
        ) : null}
      </View>

      {/* Su lugar en la guía personal: descubierta o por descubrir. */}
      <View style={[styles.guide, { backgroundColor: entry ? color.dark : color.surface, borderColor: entry ? color.dark : color.outlineVariant }]}
        accessible accessibilityLabel={entry ? `${t.detail.inGuideTitle}. ${t.detail.inGuideBody(entry.addedAt)}` : `${t.detail.notInGuideTitle}. ${t.detail.notInGuideBody}`}>
        <View style={[styles.guideIcon, { backgroundColor: entry ? color.lime : color.surfaceMuted }]}>
          {entry ? <CheckIcon color={color.onLime} size={22} /> : <LockIcon color={color.outline} size={20} />}
        </View>
        <View style={styles.guideText}>
          <Text variant="titleSmall" tone={entry ? 'onDark' : 'onSurface'}>{entry ? t.detail.inGuideTitle : t.detail.notInGuideTitle}</Text>
          <Text variant="bodySmall" tone={entry ? 'onDarkVariant' : 'onSurfaceVariant'}>
            {entry ? t.detail.inGuideBody(entry.addedAt) : t.detail.notInGuideBody}
          </Text>
        </View>
        {entry ? null : <Tag label={t.pending.tag} tone="demo" />}
      </View>

      <View style={styles.section}>
        <Text variant="titleLarge" accessibilityRole="header">{t.detail.traitsTitle}</Text>
        <View style={styles.draft}>
          <InfoIcon color={color.onSurfaceVariant} size={16} />
          <Text variant="bodySmall" tone="onSurfaceVariant" style={styles.grow}>{t.detail.traitsDraft}</Text>
        </View>
        <View style={[styles.card, { backgroundColor: color.surface, borderColor: color.outlineVariant }]}>
          {notes.map(([label, value, Icon], i) => (
            <View key={label} accessible accessibilityLabel={`${label}. ${value}`}
              style={[styles.note, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: color.outlineVariant }]}>
              <View style={[styles.noteIcon, { backgroundColor: color.limeSoft }]}>
                <Icon color={color.onLimeSoft} size={16} />
              </View>
              <View style={styles.grow}>
                <Text variant="labelMedium" tone="onSurfaceVariant">{label}</Text>
                <Text variant="bodyMedium">{value}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {photo ? (
        <View style={styles.section}>
          <Text variant="titleSmall">{t.detail.photoCaption}</Text>
          <Text variant="bodySmall" tone="onSurfaceVariant">{t.detail.photoCredit(photo.author, photo.license)}</Text>
          <TextButton label={t.detail.photoSource} role="link" onPress={() => Linking.openURL(photo.sourceUrl)}
            trailing={<ExternalIcon color={color.onSurface} size={16} />} />
        </View>
      ) : null}

      <View style={styles.section}>
        <Text variant="titleLarge" accessibilityRole="header">{t.detail.provenanceTitle}</Text>
        <View style={[styles.card, styles.cardPad, { backgroundColor: color.surface, borderColor: color.outlineVariant }]}>
          <DataRows rows={[
            [t.detail.source, provenance.sourceName],
            [t.detail.version, provenance.version],
            [t.detail.license, provenance.license],
            [t.detail.accessed, formatDate(provenance.accessedAt)],
            [t.detail.attribution, provenance.attribution],
            [t.detail.validation, `${provenance.status === 'validated' ? t.detail.validated : t.detail.pendingValidation} · ${provenance.validationOwner}`],
          ]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { width: '100%', aspectRatio: 1 / 0.92, maxHeight: 520, overflow: 'hidden' },
  heroEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heroSilhouette: { width: '50%', aspectRatio: 1 },
  body: { padding: space.lg, gap: space.xl },
  identity: { gap: space.xs },
  tags: { marginVertical: space.xs },
  statusNote: { marginTop: space.xs },
  guide: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.lg, borderWidth: 1 },
  guideIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  guideText: { flex: 1, gap: 2 },
  section: { gap: space.sm },
  draft: { flexDirection: 'row', gap: space.sm, alignItems: 'center' },
  grow: { flex: 1 },
  card: { borderRadius: radius.lg, borderWidth: 1, overflow: 'hidden' },
  cardPad: { paddingHorizontal: space.md, paddingVertical: space.xs },
  note: { flexDirection: 'row', gap: space.md, padding: space.md, alignItems: 'flex-start' },
  noteIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
});
