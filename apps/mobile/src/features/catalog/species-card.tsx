import { Image, Pressable, StyleSheet, View } from 'react-native';

import type { Species } from '@/domain/species';
import { openSpecies } from '@/features/catalog/open-species';
import { getReferencePhoto } from '@/features/catalog/reference-photos';
import { toggleSaved } from '@/features/catalog/saved';
import { speciesTagLabels, SpeciesTags } from '@/features/catalog/species-tags';
import { t } from '@/i18n/es-CL';
import { BookmarkIcon, Button, ChevronIcon, IconButton, LeafIcon, radius, space, Text, useTheme } from '@/ui';

type SpeciesCardProps = { species: Species; saved: boolean };

/** Tarjeta del catálogo: foto de referencia cuadrada, nombres, etiquetas, descripción y acción. */
export function SpeciesCard({ species, saved }: SpeciesCardProps) {
  const { color } = useTheme();
  const photo = getReferencePhoto(species.id);
  const open = () => openSpecies(species.id);
  return (
    // La tarjeta no es un solo botón: así el marcador y «Ver ficha» siguen accesibles por separado.
    // Foto y nombres también abren la ficha al tocarlos, sin duplicar el foco del lector de pantalla.
    <View style={[styles.card, { backgroundColor: color.surface, borderColor: color.outlineVariant }]}>
      <Pressable onPress={open} focusable={false} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={[styles.photo, { backgroundColor: color.surfaceMuted }]}>
        {photo ? (
          <Image source={photo.source} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityIgnoresInvertColors />
        ) : (
          <LeafIcon color={color.outline} size={32} />
        )}
      </Pressable>
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Pressable onPress={open} style={styles.names} accessible
            accessibilityLabel={`${species.commonName}, ${species.scientificName}. ${speciesTagLabels(species).join(', ')}.`}>
            <Text variant="titleMedium" numberOfLines={1}>{species.commonName}</Text>
            <Text variant="scientific" tone="onSurfaceVariant" numberOfLines={1}>{species.scientificName}</Text>
          </Pressable>
          <IconButton label={saved ? t.species.unsave(species.commonName) : t.species.save(species.commonName)}
            selected={saved} onPress={() => toggleSaved(species.id)} style={styles.bookmark}>
            <BookmarkIcon color={color.onSurface} fill={saved ? color.lime : 'none'} size={22} />
          </IconButton>
        </View>
        <SpeciesTags species={species} hidden />
        <Text variant="bodySmall" tone="onSurfaceVariant" numberOfLines={2}>{species.traits.habit}</Text>
        <Button label={t.species.open} accessibilityLabel={t.species.openA11y(species.commonName)} onPress={open} tone="soft"
          size="compact" role="link" trailing={<ChevronIcon color={color.onLimeSoft} size={18} />} style={styles.action} />
      </View>
    </View>
  );
}

const PHOTO = 112;

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: space.md,
    padding: space.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  photo: { width: PHOTO, height: PHOTO, alignSelf: 'center', borderRadius: radius.md, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: 6, paddingVertical: space.xs, paddingRight: space.xs },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.xs },
  names: { flex: 1, gap: 1 },
  bookmark: { marginTop: -10, marginRight: -10 },
  action: { marginTop: 2 },
});
