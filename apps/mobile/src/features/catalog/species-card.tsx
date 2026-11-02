import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Svg from 'react-native-svg';

import type { Species } from '@/domain/species';
import { ProvisionalTag } from '@/features/catalog/provisional-tag';
import { LeafPlate, speciesWash } from '@/features/species-art/leaf-plate';
import { t } from '@/i18n/es-CL';
import { Ledge, radius, seedOf, space, Text, useLayoutSize, useTheme, Wash } from '@/ui';

const PLATE_HEIGHT = 128;

type SpeciesCardProps = {
  species: Species;
  /** Número de pliego ya calculado sobre el catálogo. */
  sheet: string;
  index: number;
  /** Entrar escalonada: solo al abrir el catálogo, no en cada búsqueda. */
  enter: boolean;
};

/** Cromo del álbum: la lámina en su ventana de papel, el número a mano, nombres y estado. Abre la ficha. */
export function SpeciesCard({ species, sheet, index, enter }: SpeciesCardProps) {
  const { color } = useTheme();
  const plate = useLayoutSize();

  return (
    <Animated.View style={styles.slot} entering={enter ? FadeInDown.delay(80 + index * 55).duration(340) : undefined}>
      <Ledge face="surface" radius={radius.card} style={styles.card} faceStyle={styles.face} accessibilityRole="button"
        accessibilityLabel={t.species.rowA11y(species.commonName, species.scientificName)}
        onPress={() => router.push({ pathname: '/species/[id]', params: { id: species.id } })}>
        <View style={[styles.plate, { backgroundColor: color.background }]} onLayout={plate.onLayout}>
          {plate.width > 0 ? (
            <Svg width={plate.width} height={PLATE_HEIGHT} style={StyleSheet.absoluteFill} accessible={false}>
              <Wash seed={seedOf(species.id)} cx={plate.width / 2} cy={PLATE_HEIGHT / 2} rx={plate.width * 0.42}
                ry={PLATE_HEIGHT * 0.4} color={speciesWash(species.id)} opacity={0.28} wobble={0.2} grain={8} />
            </Svg>
          ) : null}
          <LeafPlate speciesId={species.id} size={108} />
          <Text variant="handBold" tone="accent" style={styles.sheet}>{t.species.sheet(sheet)}</Text>
        </View>
        <View style={styles.text}>
          <Text variant="titleMedium" numberOfLines={2}>{species.commonName}</Text>
          <Text variant="scientific" tone="onSurfaceVariant" numberOfLines={2}>{species.scientificName}</Text>
          <View style={styles.tag}>
            <ProvisionalTag />
          </View>
        </View>
      </Ledge>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  slot: { flex: 1 },
  card: { flex: 1 },
  face: { flex: 1, padding: space.sm },
  // Ventana de papel donde se pinta la lámina, con las esquinas del cromo.
  plate: {
    height: PLATE_HEIGHT,
    borderRadius: radius.card - space.sm,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  sheet: { position: 'absolute', top: space.xs, left: space.md, fontVariant: ['tabular-nums'] },
  text: { flex: 1, paddingHorizontal: space.xs, paddingTop: space.sm, gap: 2 },
  tag: { marginTop: 'auto', paddingTop: space.sm, paddingBottom: space.xs },
});
