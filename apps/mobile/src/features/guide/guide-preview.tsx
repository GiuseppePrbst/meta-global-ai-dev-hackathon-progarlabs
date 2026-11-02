import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import type { GuideEntry } from '@/domain/guide';
import type { Species } from '@/domain/species';
import { sheetNumber } from '@/features/catalog/catalog';
import { collectedCount } from '@/features/guide/guide';
import { LeafPlate } from '@/features/species-art/leaf-plate';
import { t } from '@/i18n/es-CL';
import { Ledge, ProgressMeter, radius, space, StickerSlot, Tag, Text, useTheme } from '@/ui';

// Huecos por fila de la guía.
const COLUMNS = 4;

type GuidePreviewProps = { catalog: Species[]; entries: GuideEntry[] };

/**
 * Guía de campo personal: el avance real y un hueco por cada especie del catálogo. Las especies ya
 * sumadas son cromos pintados con canto; las que faltan, huecos punteados con la silueta de su hoja.
 */
export function GuidePreview({ catalog, entries }: GuidePreviewProps) {
  const { color } = useTheme();
  const added = new Map(entries.map((entry) => [entry.speciesId, entry]));
  const collected = collectedCount(catalog, entries);
  const rows = Array.from({ length: Math.ceil(catalog.length / COLUMNS) }, (_, i) => catalog.slice(i * COLUMNS, (i + 1) * COLUMNS));
  const open = (id: string) => router.push({ pathname: '/species/[id]', params: { id } });

  return (
    <Ledge face="surface" radius={radius.card} faceStyle={styles.card}>
      <View style={styles.head}>
        <Text variant="headlineSmall" accessibilityRole="header">{t.guide.title}</Text>
        {entries.length > 0 ? <Tag label={t.guide.demoTag} background="demo" ink="onDemo" mark="ring" markColor="accent" tilt="right" /> : null}
      </View>
      <ProgressMeter label={t.guide.progressLabel} value={collected} max={catalog.length}
        valueLabel={t.guide.progress(collected, catalog.length)} />
      <View style={styles.grid}>
        {rows.map((row, r) => (
          <View key={r} style={styles.row}>
            {row.map((species) => {
              const number = sheetNumber(catalog, species.id);
              const entry = added.get(species.id);
              return entry ? (
                <Ledge key={species.id} face="surface" radius={radius.lg} style={styles.slot} faceStyle={styles.cromo}
                  accessibilityRole="button" accessibilityLabel={t.guide.collectedA11y(number, species.commonName, entry.addedAt)}
                  onPress={() => open(species.id)}>
                  <LeafPlate speciesId={species.id} size={56} draw delay={200} />
                  <Text variant="handBold" tone="accent" style={styles.number}>{number}</Text>
                </Ledge>
              ) : (
                <StickerSlot key={species.id} number={number} accessibilityLabel={t.guide.slotA11y(number)} style={styles.slot}
                  onPress={() => open(species.id)}>
                  <LeafPlate speciesId={species.id} size={52} ink={color.outline} wash={color.outlineVariant} />
                </StickerSlot>
              );
            })}
            {/* La última fila conserva el ancho de los huecos aunque quede incompleta. */}
            {Array.from({ length: COLUMNS - row.length }, (_, i) => <View key={`pad-${i}`} style={styles.slot} />)}
          </View>
        ))}
      </View>
      <View style={styles.copy}>
        <Text variant="bodyMedium" tone="onSurfaceVariant">{t.guide.body}</Text>
        {entries.length > 0 ? <Text variant="bodyMedium" tone="onSurfaceVariant">{t.guide.demoNote}</Text> : null}
      </View>
    </Ledge>
  );
}

const styles = StyleSheet.create({
  card: { padding: space.lg, gap: space.lg },
  head: { gap: space.sm, alignItems: 'flex-start' },
  grid: { gap: space.sm },
  row: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' },
  slot: { flex: 1 },
  // Cromo ya pegado: mismo cuadrado que el hueco, con la lámina a color.
  cromo: { aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  number: { position: 'absolute', top: 2, left: 8, fontVariant: ['tabular-nums'] },
  copy: { gap: space.sm },
});
