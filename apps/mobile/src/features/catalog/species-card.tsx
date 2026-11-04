import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withSpring, withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import type { Species } from '@/domain/species';
import { openSpecies } from '@/features/catalog/open-species';
import { getReferencePhoto } from '@/features/catalog/reference-photos';
import { toggleSaved } from '@/features/catalog/saved';
import { speciesTagLabels, SpeciesTags } from '@/features/catalog/species-tags';
import { SpeciesSilhouette } from '@/features/species-art/species-silhouette';
import { t } from '@/i18n/es-CL';
import { BookmarkIcon, CheckIcon, ChevronIcon, CoverImage, easeOutExpo, elevation, radius, space, Text, useTheme } from '@/ui';

type SpeciesCardProps = { species: Species; saved: boolean; /** Ya está en la guía de campo (dato de prueba). */ inGuide: boolean };

const PHOTO_HEIGHT = 188;

/**
 * Tarjeta de espécimen: la foto de referencia a sangre con el nombre encima, como la portada de una
 * lámina, y debajo una franja con la silueta de la especie, su familia y su porte. Toda la tarjeta
 * abre la ficha; el marcador flota aparte para seguir siendo su propio botón.
 */
export function SpeciesCard({ species, saved, inGuide }: SpeciesCardProps) {
  const { color } = useTheme();
  const reducedMotion = useReducedMotion();
  const photo = getReferencePhoto(species.id);
  const press = useSharedValue(0);

  const pressTo = (value: number) => {
    if (!reducedMotion) press.set(withTiming(value, { duration: value ? 120 : 420, easing: easeOutExpo }));
  };
  // Al presionar, la tarjeta se hunde apenas y la foto se acerca, como si uno se inclinara a mirar.
  const cardStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 - 0.015 * press.get() }] }));
  const photoStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + 0.06 * press.get() }] }));

  const label = [
    `${species.commonName}, ${species.scientificName}`,
    speciesTagLabels(species).join(', '),
    inGuide ? t.species.inGuideA11y : null,
    species.traits.habit,
  ].filter(Boolean).join('. ');

  return (
    <Animated.View style={[styles.card, { backgroundColor: color.surface, borderColor: color.outlineVariant }, cardStyle]}>
      <Pressable onPress={() => openSpecies(species.id)} onPressIn={() => pressTo(1)} onPressOut={() => pressTo(0)}
        accessibilityRole="link" accessibilityLabel={label} accessibilityHint={t.species.openA11y(species.commonName)}
        android_ripple={{ color: color.ripple, foreground: true }}>
        <View style={[styles.photo, { backgroundColor: color.dark }]}>
          <Animated.View style={[StyleSheet.absoluteFill, photoStyle]}>
            {photo ? (
              <CoverImage source={photo.source} />
            ) : (
              <View style={styles.fallback}>
                <SpeciesSilhouette speciesId={species.id} size={132} color={color.darkSurfaceHigh} />
              </View>
            )}
          </Animated.View>
          <Scrim id={species.id} color={color.dark} />

          <View style={styles.topRow}>
            <SpeciesTags species={species} hidden />
            {inGuide ? (
              <View style={[styles.stamp, { backgroundColor: color.lime }]}>
                <CheckIcon color={color.onLime} size={12} />
                <Text variant="tag" tone="onLime">{t.species.inGuide}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.names}>
            <Text variant="headline" tone="onDark" numberOfLines={1}>{species.commonName}</Text>
            <Text variant="scientific" style={{ color: color.onDark }} numberOfLines={1}>{species.scientificName}</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <View style={[styles.glyph, { backgroundColor: color.limeSoft }]}>
            <SpeciesSilhouette speciesId={species.id} size={30} color={color.onLimeSoft} />
          </View>
          <View style={styles.footerText}>
            <Text variant="labelMedium" tone="onSurfaceVariant" numberOfLines={1}>{species.traits.family}</Text>
            <Text variant="bodySmall" numberOfLines={2}>{species.traits.habit}</Text>
          </View>
          <View style={[styles.go, { backgroundColor: color.dark }]}>
            <ChevronIcon color={color.lime} size={20} />
          </View>
        </View>
      </Pressable>

      <SaveButton species={species} saved={saved} />
    </Animated.View>
  );
}

/** Degradado oscuro de abajo hacia arriba para que el nombre se lea sobre cualquier foto. */
function Scrim({ id, color }: { id: string; color: string }) {
  const gradient = `scrim-${id}`;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity={0.35} />
            <Stop offset="0.3" stopColor={color} stopOpacity={0} />
            <Stop offset="0.45" stopColor={color} stopOpacity={0} />
            <Stop offset="1" stopColor={color} stopOpacity={0.88} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${gradient})`} />
      </Svg>
    </View>
  );
}

/** Marcador sobre la foto: salta al guardar y se encoge al quitar; con movimiento reducido solo cambia el relleno. */
function SaveButton({ species, saved }: { species: Species; saved: boolean }) {
  const { color } = useTheme();
  const reducedMotion = useReducedMotion();
  const pop = useSharedValue(0);
  const previous = useRef(saved);

  useEffect(() => {
    if (previous.current === saved) return;
    previous.current = saved;
    if (reducedMotion) return;
    pop.set(saved
      ? withSequence(withTiming(1, { duration: 120 }), withSpring(0, { damping: 6, stiffness: 220 }))
      : withSequence(withTiming(-0.5, { duration: 90 }), withSpring(0, { damping: 12, stiffness: 260 })));
  }, [pop, reducedMotion, saved]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -4 * Math.max(pop.get(), 0) }, { scale: 1 + 0.3 * pop.get() }, { rotate: `${-10 * pop.get()}deg` }],
  }));

  return (
    <Pressable onPress={() => toggleSaved(species.id)} hitSlop={4} accessibilityRole="button"
      accessibilityLabel={saved ? t.species.unsave(species.commonName) : t.species.save(species.commonName)}
      accessibilityState={{ selected: saved }}
      android_ripple={{ color: color.onDarkRipple, borderless: true, radius: 24 }}
      style={({ pressed }) => [
        styles.save, elevation.card,
        { shadowColor: color.shadow, opacity: pressed ? 0.85 : 1 },
        saved ? { backgroundColor: color.lime, borderColor: color.lime } : { backgroundColor: color.darkScrim, borderColor: color.darkOutline },
      ]}>
      <Animated.View style={iconStyle}>
        <BookmarkIcon color={saved ? color.onLime : color.onDark} fill={saved ? color.onLime : 'none'} size={20} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: 1, overflow: 'hidden' },
  photo: { height: PHOTO_HEIGHT, overflow: 'hidden', justifyContent: 'space-between' },
  fallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  // Deja libre la esquina derecha para el marcador.
  topRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: space.xs, padding: space.md, paddingRight: 64 },
  stamp: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingLeft: 5, paddingRight: 7, paddingVertical: 2, borderRadius: radius.full,
  },
  names: { paddingHorizontal: space.lg, paddingBottom: space.md, gap: 0 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, paddingLeft: space.md },
  glyph: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  footerText: { flex: 1, gap: 1 },
  go: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  save: {
    position: 'absolute', top: space.sm, right: space.sm,
    width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },
});
