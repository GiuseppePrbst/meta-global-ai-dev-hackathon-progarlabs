import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import Animated, { interpolate, type SharedValue, useAnimatedStyle, useReducedMotion } from 'react-native-reanimated';

import type { Species } from '@/domain/species';
import { getReferencePhoto } from '@/features/catalog/reference-photos';
import { SpeciesTags } from '@/features/catalog/species-tags';
import { useGuideEntry } from '@/features/guide/use-guide';
import { SpeciesSilhouette } from '@/features/species-art/species-silhouette';
import { formatDate, t } from '@/i18n/es-CL';
import {
  CheckIcon, ChevronIcon, CubeIcon, CoverImage, DataRows, ExternalIcon, InfoIcon, LeafIcon, LockIcon, radius, space,
  Tag, Text, TextButton, type, useTheme, elevation,
} from '@/ui';

/** Dónde queda el nombre dentro del scroll: la barra superior lo recibe cuando sale de la vista. */
export type NameLayout = { top: number; height: number };

/**
 * Cabecera oscura de la ficha: foto de referencia y, bajo ella sobre bosque nocturno, la identidad
 * de la especie y su lugar en la guía personal. Es el momento fuerte de la pantalla.
 *
 * El scroll la mueve de forma continua en el hilo de UI: la foto avanza a menos de la mitad de la
 * velocidad (parallax) y se apaga bajo un velo de bosque; al tirar hacia abajo (rebote de iOS) se
 * estira desde arriba; el nombre se encoge y se apaga justo cuando pasa bajo la barra superior,
 * que lo recibe. Con movimiento reducido, nada de esto se mueve.
 */
export function SpeciesHero({ species, scrollY, barBottom, onNameLayout }: {
  species: Species;
  scrollY: SharedValue<number>;
  /** Borde inferior de la barra superior en pantalla (inset + alto). */
  barBottom: number;
  onNameLayout: (layout: NameLayout) => void;
}) {
  const { color } = useTheme();
  const photo = getReferencePhoto(species.id);
  const entry = useGuideEntry(species.id);
  const reducedMotion = useReducedMotion();
  const [photoHeight, setPhotoHeight] = useState(0);
  // Posición del nombre dentro de la identidad; sumada al alto de la foto da su lugar en el scroll.
  const [nameBox, setNameBox] = useState({ y: 0, height: 0 });
  // La identidad monta la foto con su radio superior, así que empieza `radius.xl` antes de su borde.
  const nameTop = photoHeight - radius.xl + nameBox.y;
  // El nombre se apaga mientras cruza el borde inferior de la barra.
  const handoffStart = nameTop - barBottom;
  const handoffEnd = handoffStart + nameBox.height;

  useEffect(() => {
    if (photoHeight > 0 && nameBox.height > 0) onNameLayout({ top: nameTop, height: nameBox.height });
  }, [photoHeight, nameTop, nameBox.height, onNameLayout]);

  const photoStyle = useAnimatedStyle(() => {
    const y = scrollY.get();
    if (reducedMotion || photoHeight === 0) return { transform: [] };
    // Arriba de cero solo hay rebote: la foto se fija al borde y crece hasta cubrirlo.
    if (y < 0) return { transform: [{ translateY: y }, { scale: (photoHeight - y) / photoHeight }] };
    return { transform: [{ translateY: y * 0.45 }, { scale: 1 }] };
  });

  const veilStyle = useAnimatedStyle(() => ({
    opacity: reducedMotion ? 0 : interpolate(scrollY.get(), [0, photoHeight || 1], [0, 0.7], 'clamp'),
  }));

  const nameStyle = useAnimatedStyle(() => {
    if (reducedMotion) return { opacity: 1, transform: [] };
    return {
      opacity: interpolate(scrollY.get(), [handoffStart, handoffEnd], [1, 0], 'clamp'),
      transform: [{ scale: interpolate(scrollY.get(), [handoffStart - 40, handoffEnd], [1, 0.86], 'clamp') }],
    };
  });

  return (
    <View style={{ backgroundColor: color.dark }}>
      <View style={styles.hero} onLayout={(event) => setPhotoHeight(event.nativeEvent.layout.height)}>
        <Animated.View style={[styles.photo, photoStyle]}>
          {photo ? (
            <CoverImage source={photo.source} accessible accessibilityLabel={t.detail.photoA11y(species.commonName)} />
          ) : (
            <View style={styles.heroEmpty} accessible accessibilityLabel={t.detail.noPhoto}>
              <View style={styles.heroSilhouette}><SpeciesSilhouette speciesId={species.id} color={color.darkSurfaceHigh} /></View>
            </View>
          )}
          <Animated.View pointerEvents="none" style={[styles.photo, { backgroundColor: color.dark }, veilStyle]} />
        </Animated.View>

        {/* Abre el visor 3D a pantalla completa; por ahora muestra un modelo de prueba y lo dice. */}
        <Pressable accessibilityRole="button" accessibilityLabel={t.detail.model3dA11y(species.commonName)} hitSlop={6}
          onPress={() => router.push({ pathname: '/model/[id]', params: { id: species.id } })}
          android_ripple={{ color: color.onDarkRipple, foreground: true }}
          style={({ pressed }) => [styles.model3d, elevation.card,
            { backgroundColor: color.darkScrim, borderColor: color.darkOutline, shadowColor: color.shadow, opacity: pressed ? 0.85 : 1 }]}>
          <CubeIcon color={color.onDark} size={18} />
          <Text variant="labelLarge" tone="onDark">{t.detail.model3d}</Text>
        </Pressable>
      </View>

      {/* Opaca: tapa la foto que baja más lenta que el contenido. */}
      <View style={[styles.identity, { backgroundColor: color.dark }]}>
        <Animated.View style={[styles.nameBox, nameStyle]} onLayout={(event) => {
          const { y, height } = event.nativeEvent.layout;
          setNameBox({ y, height });
        }}>
          <Text variant="display" tone="onDark" accessibilityRole="header" style={styles.name}>{species.commonName}</Text>
        </Animated.View>
        <Text variant="scientificLarge" tone="onDarkVariant">{species.scientificName}</Text>
        <View style={styles.tags}>
          <SpeciesTags species={species} />
        </View>
        {species.family ? <Text variant="labelMedium" tone="onDarkVariant">{t.detail.family(species.family)}</Text> : null}
        {species.taxonomicStatus === 'provisional' ? (
          <Text variant="bodySmall" tone="onDarkVariant">{t.status.provisionalNote}</Text>
        ) : null}

        {/* Su lugar en la guía personal: descubierta (check lima) o por descubrir (candado). */}
        <View style={[styles.guide, { borderColor: color.darkOutline }]}
          accessible accessibilityLabel={entry ? `${t.detail.inGuideTitle}. ${t.detail.inGuideBody(entry.addedAt)}` : `${t.detail.notInGuideTitle}. ${t.detail.notInGuideBody}`}>
          <View style={[styles.guideIcon, { backgroundColor: entry ? color.lime : color.darkSurfaceHigh }]}>
            {entry ? <CheckIcon color={color.onLime} size={26} /> : <LockIcon color={color.onDarkVariant} size={22} />}
          </View>
          <View style={styles.grow}>
            <Text variant="titleMedium" tone="onDark">{entry ? t.detail.inGuideTitle : t.detail.notInGuideTitle}</Text>
            <Text variant="bodySmall" tone="onDarkVariant">
              {entry ? t.detail.inGuideBody(entry.addedAt) : t.detail.notInGuideBody}
            </Text>
          </View>
          {entry ? null : <Tag label={t.pending.tag} tone="demo" />}
        </View>
      </View>
    </View>
  );
}

/** Dominio de una URL para rotular un enlace («florayfauna.udec.cl»). Sin `URL`: Hermes no la implementa completa. */
const hostOf = (url: string) => url.replace(/^https?:\/\/(www\.)?/, '').split(/[/?#]/)[0];

/** Cuerpo de la ficha sobre la hoja clara: rasgos y taxonomía de la API, crédito de la foto y procedencia. */
export function SpeciesDetail({ species }: { species: Species }) {
  const { color } = useTheme();
  const { provenance, taxonomy } = species;
  const photo = getReferencePhoto(species.id);
  const [showProvenance, setShowProvenance] = useState(false);
  const cardStyle = [styles.card, { backgroundColor: color.surface, borderColor: color.outlineVariant }];

  // Las filas sin dato no se muestran; origen y conservación sí, para decir que falta el dato.
  const taxonomyRows = ([
    [t.detail.acceptedName, species.acceptedName],
    [t.detail.familyLabel, species.family],
    [t.detail.genus, species.genus],
    [t.detail.synonyms, species.synonyms.join('; ')],
    [t.detail.gbifStatus, taxonomy && (taxonomy.status === 'ACCEPTED' ? t.detail.gbifAccepted : t.detail.gbifSynonym)],
    [t.detail.origin, t.detail.originPending],
    [t.detail.conservation, species.conservationStatus ?? t.detail.conservationUnknown],
  ] as [string, string | null][]).filter((row): row is [string, string] => Boolean(row[1]));

  return (
    <View style={styles.body}>
      <View style={styles.section}>
        <Text variant="headline" accessibilityRole="header">{t.detail.traitsTitle}</Text>
        {species.morphology.length ? (
          <>
            <View style={styles.draft}>
              <InfoIcon color={color.onSurfaceVariant} size={16} />
              <Text variant="bodySmall" tone="onSurfaceVariant" style={styles.grow}>
                {species.traitValidationStatus === 'source_checked' ? t.detail.traitsSourceChecked : t.detail.traitsPending}
              </Text>
            </View>
            <View style={cardStyle}>
              {species.morphology.map((trait, i) => (
                <View key={trait} accessible
                  style={[styles.note, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: color.outlineVariant }]}>
                  <View style={[styles.noteIcon, { backgroundColor: color.limeSoft }]}>
                    <LeafIcon color={color.onLimeSoft} size={22} />
                  </View>
                  <Text variant="bodyMedium" style={styles.noteText}>{trait}</Text>
                </View>
              ))}
            </View>
            {species.traitSources.map((url, i) => (
              <TextButton key={url} label={`${t.detail.traitSource(i + 1)} · ${hostOf(url)}`} role="link"
                onPress={() => Linking.openURL(url)} trailing={<ExternalIcon color={color.onSurface} size={16} />} />
            ))}
            {species.traitSourcesAccessedAt ? (
              <Text variant="bodySmall" tone="onSurfaceVariant">{t.detail.traitSourcesAccessed(formatDate(species.traitSourcesAccessedAt))}</Text>
            ) : null}
          </>
        ) : (
          <Text variant="bodyMedium" tone="onSurfaceVariant">{t.detail.traitsEmpty}</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text variant="headline" accessibilityRole="header">{t.detail.taxonomyTitle}</Text>
        <View style={[cardStyle, styles.cardPad]}>
          <DataRows rows={taxonomyRows} />
        </View>
        {taxonomy ? (
          <>
            <Text variant="bodySmall" tone="onSurfaceVariant">{`${taxonomy.attribution} · ${taxonomy.license}`}</Text>
            <TextButton label={t.detail.openGbif} role="link" onPress={() => Linking.openURL(`https://www.gbif.org/species/${taxonomy.gbifId}`)}
              trailing={<ExternalIcon color={color.onSurface} size={16} />} />
          </>
        ) : (
          <Text variant="bodySmall" tone="onSurfaceVariant">{t.detail.noTaxonomy}</Text>
        )}
      </View>

      {photo ? (
        <View style={styles.section}>
          <Text variant="titleSmall">{t.detail.photoCaption}</Text>
          <Text variant="bodySmall" tone="onSurfaceVariant">{t.detail.photoCredit(photo.author, photo.license)}</Text>
          <TextButton label={t.detail.photoSource} role="link" onPress={() => Linking.openURL(photo.sourceUrl)}
            trailing={<ExternalIcon color={color.onSurface} size={16} />} />
        </View>
      ) : null}

      {/* Procedencia del dato: discreta, al final, se despliega a pedido. */}
      <View style={styles.section}>
        <TextButton label={showProvenance ? t.detail.hideProvenance : t.detail.showProvenance} tone="onSurfaceVariant"
          expanded={showProvenance} onPress={() => setShowProvenance((v) => !v)}
          trailing={<View style={{ transform: [{ rotate: showProvenance ? '-90deg' : '90deg' }] }}>
            <ChevronIcon color={color.onSurfaceVariant} size={14} />
          </View>} />
        {showProvenance ? (
          <View style={[styles.card, styles.cardPad, { backgroundColor: color.surface, borderColor: color.outlineVariant }]}>
            <DataRows rows={[
              [t.detail.source, provenance.sourceName],
              [t.detail.version, provenance.version],
              [t.detail.license, provenance.license],
              [t.detail.accessed, formatDate(provenance.accessedAt)],
              [t.detail.attribution, provenance.attribution],
              [t.detail.redistribution, provenance.redistribution],
              [t.detail.processing, provenance.processing],
              [t.detail.validation, `${provenance.status === 'validated' ? t.detail.validated : t.detail.pendingValidation} · ${provenance.validationOwner}`],
            ]} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Sin recorte: al estirarse, la foto sube por encima de su caja; la identidad opaca tapa lo de abajo.
  // Sin zIndex: el orden de dibujo (foto → identidad → hoja clara) ya apila bien, y un zIndex aquí
  // sube la identidad sobre la hoja en Android y esconde sus esquinas redondeadas.
  hero: { width: '100%', aspectRatio: 1 / 0.92, maxHeight: 520 },
  photo: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, transformOrigin: 'top' },
  // Sobre la foto, por encima del borde redondeado de la identidad que la monta.
  model3d: {
    position: 'absolute', right: space.lg, bottom: radius.xl + space.md, flexDirection: 'row', alignItems: 'center',
    gap: space.sm, height: 36, paddingHorizontal: space.md, borderRadius: radius.full, borderWidth: 1, overflow: 'hidden',
  },
  heroEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heroSilhouette: { width: '50%', aspectRatio: 1 },
  // Monta la foto con radio 28, como la hoja clara monta la identidad; abajo deja el radio de la hoja
  // más el mismo aire que arriba (24).
  identity: {
    marginTop: -radius.xl, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    paddingHorizontal: space.lg, paddingTop: space.xl, paddingBottom: radius.xl + space.xl, gap: space.xs,
  },
  // Figtree 800 apretado: el peso de títulos y cifras del sistema, a escala de cabecera.
  nameBox: { transformOrigin: 'left' },
  name: { fontFamily: type.number.fontFamily, fontSize: 44, lineHeight: 46, letterSpacing: -1.2 },
  tags: { marginTop: space.sm, marginBottom: space.xs },
  guide: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.lg, paddingTop: space.lg, borderTopWidth: StyleSheet.hairlineWidth },
  guideIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  // Más aire sobre el primer título que entre secciones: la curva de las esquinas se come parte del
  // margen, y la hoja tiene que leerse como un comienzo, no como continuación del bloque oscuro.
  body: { padding: space.lg, paddingTop: space.xxl + space.lg, gap: space.xxl },
  section: { gap: space.md },
  draft: { flexDirection: 'row', gap: space.sm, alignItems: 'center' },
  grow: { flex: 1 },
  card: { borderRadius: radius.lg, borderWidth: 1, overflow: 'hidden' },
  cardPad: { paddingHorizontal: space.md, paddingVertical: space.xs },
  note: { flexDirection: 'row', gap: space.lg, padding: space.lg, alignItems: 'flex-start' },
  noteIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  noteText: { flex: 1, gap: space.xxs, paddingTop: space.xxs },
});
