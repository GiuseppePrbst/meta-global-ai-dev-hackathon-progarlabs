import { router } from 'expo-router';
import { type ReactNode, useEffect, useState } from 'react';
import { type ImageSourcePropType, Linking, Pressable, StyleSheet, View } from 'react-native';
import Animated, { interpolate, type SharedValue, useAnimatedStyle, useReducedMotion } from 'react-native-reanimated';

import type { SourceRef, Taxon } from '@/domain/taxon';
import { getReferencePhoto } from '@/features/catalog/reference-photos';
import { conservationSummary } from '@/features/catalog/taxon';
import { useTaxonConservation } from '@/features/catalog/use-taxon';
import { useGuideEntry } from '@/features/guide/use-guide';
import { SpeciesSilhouette } from '@/features/species-art/species-silhouette';
import { formatDate, rceCategory, t } from '@/i18n/es-CL';
import {
  CheckIcon, CoverImage, CubeIcon, DataRows, ExternalIcon, InfoIcon, LeafIcon, LoadingState, LockIcon, radius, space,
  Tag, Text, TextButton, type, useTheme, elevation,
} from '@/ui';

// Ficha completa de GET /taxa/{id} (ver src/api/taxa.ts) y su estado RCE. Cada bloque se omite si la
// API no trae el dato, salvo Conservación, que dice explícitamente lo que falta.

/** Dónde queda el nombre dentro del scroll: la barra superior lo recibe cuando sale de la vista. */
export type NameLayout = { top: number; height: number };

/**
 * Cabecera oscura de la ficha: foto y, bajo ella sobre bosque nocturno, la identidad del taxón y su
 * lugar en la guía personal. Es el momento fuerte de la pantalla.
 *
 * El scroll la mueve de forma continua en el hilo de UI: la foto avanza a menos de la mitad de la
 * velocidad (parallax) y se apaga bajo un velo de bosque; al tirar hacia abajo (rebote de iOS) se
 * estira desde arriba; el nombre se encoge y se apaga justo cuando pasa bajo la barra superior,
 * que lo recibe. Con movimiento reducido, nada de esto se mueve.
 */
export function SpeciesHero({ taxon, scrollY, barBottom, onNameLayout }: {
  taxon: Taxon;
  scrollY: SharedValue<number>;
  /** Borde inferior de la barra superior en pantalla (inset + alto). */
  barBottom: number;
  onNameLayout: (layout: NameLayout) => void;
}) {
  const { color } = useTheme();
  // Foto: la primera de la API; si no hay o no carga, la local de referencia (solo hay de los árboles).
  // Se guarda la URL que falló: si cambia la foto, se vuelve a intentar sin un efecto.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const remote = taxon.media[0];
  const useRemote = Boolean(remote) && remote.url !== failedUrl;
  const photo: ImageSourcePropType | undefined = useRemote ? { uri: remote.url } : getReferencePhoto(taxon.id)?.source;
  const entry = useGuideEntry(taxon.id);
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
            // Si la foto remota no carga (sin red, enlace caído), se pasa a la local.
            <CoverImage source={photo} onError={useRemote ? () => setFailedUrl(remote.url) : undefined}
              accessible accessibilityLabel={t.detail.photoA11y(taxon.commonName)} />
          ) : (
            <View style={styles.heroEmpty} accessible accessibilityLabel={t.detail.noPhoto}>
              <View style={styles.heroSilhouette}><SpeciesSilhouette speciesId={taxon.id} color={color.darkSurfaceHigh} /></View>
            </View>
          )}
          <Animated.View pointerEvents="none" style={[styles.photo, { backgroundColor: color.dark }, veilStyle]} />
        </Animated.View>

        {/* Abre el visor 3D a pantalla completa; por ahora muestra un modelo de prueba y lo dice. */}
        <Pressable accessibilityRole="button" accessibilityLabel={t.detail.model3dA11y(taxon.commonName)} hitSlop={6}
          onPress={() => router.push({ pathname: '/model/[id]', params: { id: taxon.id } })}
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
          <Text variant="display" tone="onDark" accessibilityRole="header" style={styles.name}>{taxon.commonName}</Text>
        </Animated.View>
        <Text variant="scientificLarge" tone="onDarkVariant">{taxon.scientificName}</Text>
        <View style={[styles.tags, styles.row]}>
          <Tag label={t.detail.group[taxon.group]} tone="lime" />
          {taxon.taxonomy.status !== 'source_checked' ? <Tag label={t.detail.taxonomyInReview} tone="provisional" /> : null}
        </View>
        {taxon.classification.family ? (
          <Text variant="labelMedium" tone="onDarkVariant">{t.detail.family(taxon.classification.family)}</Text>
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

/** Cuerpo de la ficha sobre la hoja clara. */
export function SpeciesDetail({ taxon }: { taxon: Taxon }) {
  const { color } = useTheme();
  const { profile, taxonomy, classification } = taxon;
  const cardStyle = [styles.card, { backgroundColor: color.surface, borderColor: color.outlineVariant }];
  const local = getReferencePhoto(taxon.id);

  const aboutRows = ([
    [t.detail.habitat, profile.habitat],
    [t.detail.distribution, profile.distribution],
    [t.detail.ecology, profile.ecology],
  ] as [string, string | null][]).filter((row): row is [string, string] => Boolean(row[1]));

  const taxonomyRows = ([
    [t.detail.acceptedName, taxonomy.authorship ? `${taxonomy.acceptedName} ${taxonomy.authorship}` : taxonomy.acceptedName],
    [t.detail.familyLabel, classification.family],
    [t.detail.genus, classification.genus],
    [t.detail.order, classification.order],
    [t.detail.taxonomyStatusLabel, t.detail.taxonomyStatus[taxonomy.status]],
    [t.detail.checklist, taxonomy.checklist],
  ] as [string, string | null][]).filter((row): row is [string, string] => Boolean(row[1]));

  return (
    <View style={styles.body}>
      {profile.description ? (
        <Section title={t.detail.descriptionTitle}>
          <Text variant="bodyLarge">{profile.description}</Text>
        </Section>
      ) : null}

      {profile.traits.length ? (
        <Section title={t.detail.traitsTitle}>
          <Note text={t.detail.traitStatus[profile.traitValidationStatus]} />
          <View style={cardStyle}>
            {profile.traits.map((trait, i) => (
              <View key={trait} accessible
                style={[styles.note, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: color.outlineVariant }]}>
                <View style={[styles.noteIcon, { backgroundColor: color.limeSoft }]}>
                  <LeafIcon color={color.onLimeSoft} size={22} />
                </View>
                <Text variant="bodyMedium" style={styles.noteText}>{trait}</Text>
              </View>
            ))}
          </View>
        </Section>
      ) : null}

      {aboutRows.length ? (
        <View style={[cardStyle, styles.cardPad]}>
          <DataRows rows={aboutRows} />
        </View>
      ) : null}

      <Section title={t.detail.puyehueTitle}>
        <Text variant="bodyMedium">{t.detail.puyehueStatus[taxon.puyehueStatus]}</Text>
        {taxon.parkEvidence.map((evidence) => (
          <View key={`${evidence.type}-${evidence.source.url}`} style={[cardStyle, styles.cardInner]}>
            <View style={styles.row}>
              <Text variant="titleSmall" style={styles.grow}>{t.detail.evidence[evidence.type]}</Text>
              {evidence.reviewStatus === 'pending_review' ? <Tag label={t.detail.evidencePendingReview} tone="provisional" /> : null}
            </View>
            {/* `sensitivity: location_sensitive` nunca llega a mostrar ubicación: la evidencia no trae coordenadas. */}
            <Text variant="bodySmall" tone="onSurfaceVariant">{t.detail.precision[evidence.precision]}</Text>
            <SourceLink source={evidence.source} />
          </View>
        ))}
      </Section>

      <ConservationSection taxonId={taxon.id} />

      <Section title={t.detail.taxonomyTitle}>
        <View style={[cardStyle, styles.cardPad]}>
          <DataRows rows={taxonomyRows} />
        </View>
        {taxonomy.gbifId ? (
          <TextButton label={t.detail.openGbif} role="link" onPress={() => Linking.openURL(`https://www.gbif.org/species/${taxonomy.gbifId}`)}
            trailing={<ExternalIcon color={color.onSurface} size={16} />} />
        ) : null}
      </Section>

      {taxon.media.length ? (
        <Section title={t.detail.photosTitle}>
          {taxon.media.map((media) => (
            <View key={media.id} style={[cardStyle, styles.photoCard]}>
              <View style={styles.thumb}>
                <CoverImage source={{ uri: media.url }} accessible accessibilityLabel={t.detail.photoA11y(taxon.commonName)} />
              </View>
              <View style={styles.photoText}>
                <Text variant="bodySmall">{t.detail.photoCredit(media.author, media.license)}</Text>
                <Text variant="bodySmall" tone="onSurfaceVariant">{t.detail.photoReview[media.reviewStatus]}</Text>
                <TextButton label={t.detail.photoSource} role="link" onPress={() => Linking.openURL(media.sourceUrl)}
                  trailing={<ExternalIcon color={color.onSurface} size={16} />} />
              </View>
            </View>
          ))}
        </Section>
      ) : local ? (
        // Sin fotos de la API, la cabecera usa la foto local: su crédito va aquí.
        <Section title={t.detail.photosTitle}>
          <Text variant="bodySmall" tone="onSurfaceVariant">{t.detail.localPhotoNote}</Text>
          <Text variant="bodySmall">{t.detail.localPhotoCredit(local.author, local.license)}</Text>
          <TextButton label={t.detail.photoSource} role="link" onPress={() => Linking.openURL(local.sourceUrl)}
            trailing={<ExternalIcon color={color.onSurface} size={16} />} />
        </Section>
      ) : null}

      {profile.sources.length || profile.limitations.length ? (
        <Section title={t.detail.sourcesTitle}>
          {profile.sources.map((source) => (
            <View key={source.url} style={styles.sourceRow}>
              <Tag label={t.detail.sourceKind[source.kind]} tone={source.kind === 'official' ? 'lime' : 'neutral'} />
              <View style={styles.grow}><SourceLink source={source} /></View>
            </View>
          ))}
          {profile.limitations.length ? (
            <View style={styles.limitations}>
              <Text variant="titleSmall">{t.detail.limitationsTitle}</Text>
              {profile.limitations.map((limitation) => (
                <Text key={limitation} variant="bodySmall" tone="onSurfaceVariant">{`• ${limitation}`}</Text>
              ))}
            </View>
          ) : null}
        </Section>
      ) : null}

      <Section title={t.detail.identificationTitle}>
        <Text variant="bodyMedium">{t.detail.identificationStatus[taxon.identification.status]}</Text>
      </Section>
    </View>
  );
}

/** Estado RCE en las regiones de Puyehue. Su propia consulta: si falla, solo esta sección lo dice. */
function ConservationSection({ taxonId }: { taxonId: string }) {
  const { color } = useTheme();
  const { data, isPending, error, refetch } = useTaxonConservation(taxonId);
  const cardStyle = [styles.card, { backgroundColor: color.surface, borderColor: color.outlineVariant }];

  let body: ReactNode;
  if (data) {
    const summary = conservationSummary(data);
    body = (
      <>
        {summary.kind === 'by_region' ? (
          <>
            <Text variant="bodyMedium">{t.detail.conservationByRegion}</Text>
            <View style={[cardStyle, styles.cardPad]}>
              <DataRows rows={summary.regions.map(({ region, category }) => [t.detail.region[region], category ? rceCategory(category) : t.detail.noCategory])} />
            </View>
          </>
        ) : (
          <Text variant="bodyMedium">
            {summary.kind === 'same' ? t.detail.conservationSame(summary.category)
              : summary.kind === 'no_record' ? t.detail.conservationNoRecord : t.detail.conservationNotForPark}
          </Text>
        )}
        {data.notes.map((note) => <Note key={note} text={note} />)}
        <Text variant="bodySmall" tone="onSurfaceVariant">
          {t.detail.conservationSource(data.source.title, data.source.versionText, formatDate(data.source.accessedAt))}
        </Text>
      </>
    );
  } else if (isPending) {
    body = <LoadingState label={t.detail.conservationLoading} />;
  } else {
    body = (
      <>
        <Text variant="bodyMedium" tone="onSurfaceVariant">{t.detail.conservationError}</Text>
        {error ? <TextButton label={t.common.retry} onPress={refetch} /> : null}
      </>
    );
  }
  return <Section title={t.detail.conservationTitle}>{body}</Section>;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="headline" accessibilityRole="header">{title}</Text>
      {children}
    </View>
  );
}

/** Aviso discreto sobre el estado del dato (fuente, revisión). */
function Note({ text }: { text: string }) {
  const { color } = useTheme();
  return (
    <View style={styles.draft}>
      <InfoIcon color={color.onSurfaceVariant} size={16} />
      <Text variant="bodySmall" tone="onSurfaceVariant" style={styles.grow}>{text}</Text>
    </View>
  );
}

function SourceLink({ source }: { source: SourceRef }) {
  const { color } = useTheme();
  return (
    <View>
      <TextButton label={source.title} role="link" onPress={() => Linking.openURL(source.url)}
        trailing={<ExternalIcon color={color.onSurface} size={16} />} />
      <Text variant="bodySmall" tone="onSurfaceVariant">{`${hostOf(source.url)} · ${formatDate(source.accessedAt)}`}</Text>
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
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.xs },
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
  cardInner: { padding: space.md, gap: space.xs },
  note: { flexDirection: 'row', gap: space.lg, padding: space.lg, alignItems: 'flex-start' },
  noteIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  noteText: { flex: 1, gap: space.xxs, paddingTop: space.xxs },
  photoCard: { flexDirection: 'row', gap: space.md, padding: space.sm, alignItems: 'center' },
  thumb: { width: 88, height: 88, borderRadius: radius.md, overflow: 'hidden' },
  photoText: { flex: 1, gap: space.xxs },
  sourceRow: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' },
  limitations: { gap: space.xs, paddingTop: space.sm },
});
