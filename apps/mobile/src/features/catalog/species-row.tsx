import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import type { Species } from '@/domain/species';
import { ProvisionalTag } from '@/features/catalog/provisional-tag';
import { LeafPlate, speciesWash } from '@/features/species-art/leaf-plate';
import { t } from '@/i18n/es-CL';
import { ChevronIcon, ListItem, seedOf, space, Text, useTheme, WashThumb } from '@/ui';

export const SPECIES_THUMB = 72;

type SpeciesRowProps = {
  species: Species;
  /** Número de pliego ya calculado sobre el catálogo. */
  sheet: string;
  index: number;
  /** Entrar escalonada: solo al abrir el catálogo, no en cada búsqueda. */
  enter: boolean;
};

/** Fila del catálogo: miniatura de la lámina, nombres, estado y número de pliego. Abre la ficha. */
export function SpeciesRow({ species, sheet, index, enter }: SpeciesRowProps) {
  const { color } = useTheme();

  return (
    <Animated.View entering={enter ? FadeInDown.delay(80 + index * 45).duration(320) : undefined}>
      <ListItem
        size="large"
        onPress={() => router.push({ pathname: '/species/[id]', params: { id: species.id } })}
        accessibilityLabel={t.species.rowA11y(species.commonName, species.scientificName)}
        style={styles.row}
        leading={
          <View style={styles.thumb}>
            <WashThumb size={SPECIES_THUMB} inset={[8, 10]} seed={seedOf(species.id)} color={speciesWash(species.id)}
              opacity={0.22} wobble={0.2} grain={6} />
            <LeafPlate speciesId={species.id} size={60} />
          </View>
        }
        trailing={
          <View style={styles.end}>
            <Text variant="handBold" tone="accent" style={styles.sheet}>{t.species.sheet(sheet)}</Text>
            <ChevronIcon color={color.onSurfaceVariant} size={20} />
          </View>
        }>
        <Text variant="titleMedium">{species.commonName}</Text>
        <Text variant="scientific" tone="onSurfaceVariant">{species.scientificName}</Text>
        <View style={styles.tagRow}>
          <ProvisionalTag />
        </View>
      </ListItem>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: space.lg },
  thumb: { width: SPECIES_THUMB, height: SPECIES_THUMB, alignItems: 'center', justifyContent: 'center' },
  tagRow: { marginTop: space.xs },
  end: { alignItems: 'flex-end', alignSelf: 'stretch', justifyContent: 'space-between', paddingVertical: 2 },
  sheet: { fontVariant: ['tabular-nums'] },
});
