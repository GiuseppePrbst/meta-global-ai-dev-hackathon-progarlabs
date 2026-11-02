import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import type { Species } from '@/domain/species';
import { LeafLeader, NoteBadge } from '@/features/catalog/art/leaf-leader';
import { PlateBackdrop } from '@/features/catalog/art/plate-backdrop';
import { PlateLens } from '@/features/catalog/art/plate-lens';
import { getReferencePhoto } from '@/features/catalog/art/reference-photos';
import { TapedPhoto } from '@/features/catalog/art/taped-photo';
import { sheetNumber } from '@/features/catalog/catalog';
import { ProvisionalTag } from '@/features/catalog/provisional-tag';
import { useGuideEntry } from '@/features/guide/use-guide';
import { LeafPlate } from '@/features/species-art/leaf-plate';
import { useSpeciesCatalog } from '@/features/catalog/use-species';
import { formatDate, t } from '@/i18n/es-CL';
import { HerbariumLabel, InfoIcon, LeafIcon, Ledge, PhotoIcon, radius, type Segment, SegmentedControl, seedOf, space, StickerSlot, Tag, Text, TextButton, useTheme } from '@/ui';

type PlateFace = 'plate' | 'photo';

const faces: Segment<PlateFace>[] = [
  { key: 'plate', label: t.detail.facePlate, Icon: LeafIcon },
  { key: 'photo', label: t.detail.facePhoto, Icon: PhotoIcon },
];

type SpeciesSheetProps = {
  species: Species;
  /** Borde inferior del nombre común, medido desde el borde superior del pliego. */
  onNameLayout: (bottom: number) => void;
};

/** Pliego de herbario: lámina, notas al margen, identidad y etiqueta de procedencia en una sola hoja. */
export function SpeciesSheet({ species, onNameLayout }: SpeciesSheetProps) {
  const { color } = useTheme();
  const catalog = useSpeciesCatalog().data;
  const [identityY, setIdentityY] = useState(0);
  const sheet = catalog ? sheetNumber(catalog, species.id) : '';
  const { traits, provenance } = species;
  const photo = getReferencePhoto(species.id);
  const [face, setFace] = useState<PlateFace>('plate');
  const inGuide = useGuideEntry(species.id);

  const notes: { label: string; value: string; marker?: string }[] = [
    { label: t.detail.leaf, value: traits.leaf, marker: '1' },
    { label: t.detail.bark, value: traits.bark },
    { label: t.detail.habit, value: traits.habit },
    { label: t.detail.whereToLook, value: traits.whereToLook },
  ];

  const labelRows: [string, string][] = [
    [t.detail.source, provenance.sourceName],
    [t.detail.version, provenance.version],
    [t.detail.license, provenance.license],
    [t.detail.accessed, formatDate(provenance.accessedAt)],
    [t.detail.attribution, provenance.attribution],
    [t.detail.validation, `${t.detail.pendingValidation} · ${provenance.validationOwner}`],
  ];

  return (
    <View style={styles.sheet}>
      {/* La lámina y la foto ocupan el mismo cuadrado: cambiar de una a otra no mueve la página. */}
      <View style={styles.plateArea}>
        {face === 'photo' && photo ? (
          <Animated.View key="photo" exiting={FadeOut.duration(140)} style={StyleSheet.absoluteFill}>
            <TapedPhoto photo={photo} seed={seedOf(species.id) + 11} accessibilityLabel={t.detail.photoA11y(species.commonName)} />
          </Animated.View>
        ) : (
          // Al volver, la lámina se monta de nuevo y se vuelve a entintar.
          <Animated.View key="plate" entering={FadeIn.duration(200)} exiting={FadeOut.duration(140)} style={StyleSheet.absoluteFill}
            accessible accessibilityRole="image" accessibilityLabel={t.detail.plateA11y(species.commonName)}>
            <PlateBackdrop speciesId={species.id} />
            <PlateLens speciesId={species.id} ink={color.leafInk} ring={color.accent} ground={color.surface} />
            <LeafLeader speciesId={species.id} ink={color.leafInk} badge={color.accent} onBadge={color.onAccent} />
          </Animated.View>
        )}
      </View>
      <View style={styles.caption}>
        <View style={styles.captionHead}>
          <Text variant="handBold" tone="accent">{t.detail.plateNumber(sheet)}</Text>
          {photo ? (
            <SegmentedControl variant="paper" options={faces} value={face} onChange={setFace}
              accessibilityLabel={t.detail.faceLabel} />
          ) : null}
        </View>
        {face === 'photo' && photo ? (
          <>
            <Text variant="bodyMedium" style={styles.captionStrong}>{t.detail.photoCaption}</Text>
            <Text variant="bodyMedium" tone="onSurfaceVariant">{t.detail.photoCredit(photo.author, photo.license)}</Text>
            <TextButton label={t.detail.photoSource} onPress={() => Linking.openURL(photo.sourceUrl)} role="link" />
          </>
        ) : (
          <>
            <Text variant="bodyMedium" style={styles.captionStrong}>{t.detail.plateCaption}</Text>
            <Text variant="bodyMedium" tone="onSurfaceVariant">{t.detail.lensHint}</Text>
          </>
        )}
      </View>

      {/* Entrada de guía de campo: nombre, científico y familia sobre un filete de tinta. */}
      <View style={styles.identity} onLayout={(event) => setIdentityY(event.nativeEvent.layout.y)}>
        <Text variant="headlineMedium" accessibilityRole="header"
          onLayout={(event) => onNameLayout(identityY + event.nativeEvent.layout.y + event.nativeEvent.layout.height)}>
          {species.commonName}
        </Text>
        <Text variant="scientificLarge">{species.scientificName}</Text>
        <Text variant="overline" tone="onSurfaceVariant">{t.detail.family(traits.family)}</Text>
        <View style={[styles.entryRule, { backgroundColor: color.leafInk }]} />
        <View style={styles.statusBlock}>
          <ProvisionalTag />
          <Text variant="bodyMedium" tone="onSurfaceVariant">{t.status.provisionalNote}</Text>
        </View>
      </View>

      {/* Su lugar en la guía personal: el cromo si ya la sumó, o el hueco que falta llenar. */}
      <Ledge face="surface" radius={radius.card} style={styles.guide} faceStyle={styles.guideFace}>
        {inGuide ? (
          <View style={[styles.guideSlot, styles.guideCromo, { borderColor: color.leafInk }]} accessible
            accessibilityLabel={t.guide.detailCollectedA11y(sheet)}>
            <LeafPlate speciesId={species.id} size={60} />
            <Text variant="handBold" tone="accent" style={styles.guideNumber}>{sheet}</Text>
          </View>
        ) : (
          <StickerSlot number={sheet} accessibilityLabel={t.guide.detailSlotA11y(sheet)} style={styles.guideSlot}>
            <LeafPlate speciesId={species.id} size={56} ink={color.outline} wash={color.outlineVariant} />
          </StickerSlot>
        )}
        <View style={styles.guideText}>
          <Text variant="titleSmall">{inGuide ? t.guide.detailCollectedTitle : t.guide.detailTitle}</Text>
          <Text variant="bodyMedium" tone="onSurfaceVariant">
            {inGuide ? t.guide.detailCollectedBody(inGuide.addedAt) : t.guide.detailBody}
          </Text>
          {inGuide
            ? <Tag label={t.guide.demoTag} background="demo" ink="onDemo" mark="ring" markColor="accent" tilt="right" />
            : <Tag label={t.pending.tag} background="demo" ink="onDemo" mark="dash" tilt="right" />}
        </View>
      </Ledge>

      <View style={styles.notes}>
        <Text variant="titleLarge" accessibilityRole="header">
          {t.detail.traitsTitle}
        </Text>
        {/* El aviso de borrador va junto a las notas que califica, no en un banner aparte. */}
        <View style={styles.draft}>
          <InfoIcon color={color.onSurfaceVariant} size={16} />
          <Text variant="bodyMedium" tone="onSurfaceVariant" style={styles.draftText}>{t.detail.traitsDraft}</Text>
        </View>
        {/* Rasgos como en una guía impresa: rótulo en versalitas y texto, entre filetes finos. */}
        <View style={[styles.marks, { borderColor: color.outlineVariant }]}>
          {notes.map(({ label, value, marker }) => (
            <View key={label} style={[styles.note, { borderColor: color.outlineVariant }]} accessible
              accessibilityLabel={`${label}. ${value}${marker ? ` ${t.detail.leafMarkerHint}` : ''}`}>
              <View style={styles.noteLabel}>
                {marker ? <NoteBadge label={marker} color={color.accent} ink={color.onAccent} /> : null}
                <Text variant="overline" tone="leafInk">{label}</Text>
              </View>
              <Text variant="bodyLarge">{value}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* La etiqueta de procedencia se fija en la esquina inferior derecha, como en un pliego real. */}
      <View style={styles.labelCorner}>
        <HerbariumLabel heading={t.detail.labelHeading} name={species.scientificName} rows={labelRows} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Página del cuaderno: sin caja; la lámina se pinta directo sobre el papel.
  sheet: { paddingHorizontal: space.xs },
  plateArea: { width: '100%', aspectRatio: 1 },
  caption: { paddingTop: space.lg, gap: 2 },
  captionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md, marginBottom: space.md },
  captionStrong: { fontWeight: '600' },
  identity: { paddingTop: space.lg, gap: space.xs },
  entryRule: { height: 1.5, marginTop: space.md },
  statusBlock: { marginTop: space.md, gap: space.sm },
  guide: { marginTop: space.xl },
  guideFace: { flexDirection: 'row', alignItems: 'center', gap: space.lg, padding: space.md },
  guideSlot: { width: 84 },
  guideCromo: { aspectRatio: 1, borderRadius: radius.lg, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  guideNumber: { position: 'absolute', top: 4, left: 10, fontVariant: ['tabular-nums'] },
  guideText: { flex: 1, gap: space.xs, alignItems: 'flex-start' },
  notes: { paddingTop: space.xxl, gap: space.md },
  draft: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' },
  draftText: { flex: 1, marginTop: -2 },
  marks: { borderTopWidth: StyleSheet.hairlineWidth },
  note: { paddingVertical: space.md, gap: space.xs, borderBottomWidth: StyleSheet.hairlineWidth },
  noteLabel: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 22 },
  labelCorner: { marginTop: space.xxl, alignSelf: 'flex-end', width: '92%' },
});
