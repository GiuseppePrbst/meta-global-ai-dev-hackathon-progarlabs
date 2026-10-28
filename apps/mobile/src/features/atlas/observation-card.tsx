import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import type { Observation } from '@/domain/observation';
import { SyntheticTag, UnverifiedMark } from '@/features/atlas/status-marks';
import { useSpeciesNames } from '@/features/atlas/use-species-names';
import { LeafPlate, speciesWash } from '@/features/species-art/leaf-plate';
import { formatDate, t } from '@/i18n/es-CL';
import { ChevronIcon, CloseIcon, IconButton, seedOf, space, Surface, Tape, Text, TextButton, useLayoutSize, useTheme, WashThumb } from '@/ui';

const CARD_THUMB = 64;
// Renglón de la papeleta y distancia de la línea por sobre el pie del renglón (bajo la línea base).
const RULE = 24;
const RULE_DROP = 3;

type ObservationCardProps = { observation: Observation; onClose: () => void };

/** Papeleta de la observación tocada en el mapa: una hoja de libreta de campo dejada sobre la carta. */
export function ObservationCard({ observation, onClose }: ObservationCardProps) {
  const { color } = useTheme();
  const { common, scientific } = useSpeciesNames(observation.speciesId);
  const speciesId = observation.speciesId;

  return (
    <View style={styles.slip}>
      <Surface paper elevation="floating" style={styles.card}>
        <View style={styles.header}>
          <View style={styles.thumb}>
            <WashThumb size={CARD_THUMB} inset={[4, 6]} seed={seedOf(observation.id)}
              color={speciesId ? speciesWash(speciesId) : color.accent} opacity={speciesId ? 0.24 : 0.16} wobble={0.22} grain={5} />
            {/* La lámina se entinta al abrir la papeleta; sin especie elegida queda el círculo abierto. */}
            {speciesId ? <LeafPlate speciesId={speciesId} size={52} draw delay={120} /> : <UnverifiedMark />}
          </View>
          <View style={styles.names}>
            <Text variant="titleMedium">{common}</Text>
            {scientific ? <Text variant="scientific" tone="onSurfaceVariant">{scientific}</Text> : null}
          </View>
          <IconButton label={t.atlas.closeCard} onPress={onClose} style={styles.close}>
            <CloseIcon color={color.onSurfaceVariant} />
          </IconButton>
        </View>
        {/* Línea de cabecera de la libreta: separa el encabezado de los renglones. */}
        <View style={[styles.headRule, { backgroundColor: color.accent }]} />
        <Ruled>
          <View style={styles.meta}>
            <View style={styles.onRuleBox}>
              <SyntheticTag />
            </View>
            <Text variant="handBold" tone="onSurfaceVariant" style={styles.onRule}>{formatDate(observation.createdAt)}</Text>
          </View>
          <Text variant="bodyMedium" style={styles.onRule}>{observation.notes}</Text>
          {speciesId ? (
            <TextButton label={t.atlas.openSpecies} role="link" labelStyle={styles.onRule} style={styles.action}
              onPress={() => router.push({ pathname: '/species/[id]', params: { id: speciesId } })}
              trailing={<ChevronIcon color={color.primary} />} />
          ) : null}
        </Ruled>
      </Surface>
      {/* Cinta que la sujeta al mapa. */}
      <Tape style={styles.tape} />
    </View>
  );
}

/** Renglones de la libreta: una línea fina bajo cada renglón de `RULE` dp; el texto de dentro escribe sobre ellas. */
function Ruled({ children }: { children: React.ReactNode }) {
  const { color } = useTheme();
  const { height, onLayout } = useLayoutSize();
  return (
    <View onLayout={onLayout}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none" accessible={false}>
        {Array.from({ length: Math.floor(height / RULE) }, (_, i) => (
          <View key={i} style={[styles.rule, { top: (i + 1) * RULE - RULE_DROP, backgroundColor: color.outlineVariant }]} />
        ))}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  slip: { paddingTop: 9 },
  // Papeleta: hoja de libreta con filo fino y esquinas casi rectas.
  card: {
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    paddingBottom: space.sm,
    borderRadius: 2,
  },
  tape: { top: 0, left: 28, width: 64, transform: [{ rotate: '-5deg' }] },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingBottom: space.sm },
  thumb: { width: CARD_THUMB, height: CARD_THUMB, alignItems: 'center', justifyContent: 'center', marginLeft: -space.xs },
  names: { flex: 1, gap: 2 },
  close: { alignSelf: 'flex-start', marginRight: -space.md, marginTop: -space.xs },
  headRule: { height: 1, marginHorizontal: -space.lg, opacity: 0.45 },
  rule: { position: 'absolute', left: -space.lg, right: -space.lg, height: StyleSheet.hairlineWidth },
  // Todo lo que va sobre los renglones ocupa renglones enteros, para que el texto calce con las líneas.
  onRule: { lineHeight: RULE },
  onRuleBox: { height: RULE, justifyContent: 'center' },
  meta: { flexDirection: 'row', alignItems: 'center', columnGap: space.md, flexWrap: 'wrap' },
  // Un renglón en blanco antes de la acción; el área de toque sigue siendo de 48 dp.
  action: { minHeight: 2 * RULE, paddingTop: RULE },
});
