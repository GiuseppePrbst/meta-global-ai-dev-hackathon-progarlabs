import { StyleSheet } from 'react-native';

import type { Observation } from '@/domain/observation';
import { UnverifiedMark } from '@/features/atlas/status-marks';
import { useSpeciesNames } from '@/features/atlas/use-species-names';
import { formatDate, t } from '@/i18n/es-CL';
import { ChevronIcon, ListItem, Text, useTheme } from '@/ui';

type ObservationRowProps = { observation: Observation; onPress: (observation: Observation) => void };

/** Fila de la lista del Atlas; si la observación tiene ubicación, tocarla la muestra en el mapa. */
export function ObservationRow({ observation, onPress }: ObservationRowProps) {
  const { color } = useTheme();
  const { common, scientific } = useSpeciesNames(observation.speciesId);
  const located = observation.location !== null;
  const meta = `${t.atlas.syntheticTag} · ${formatDate(observation.createdAt)}`;

  // Sin ubicación no hay nada que mostrar en el mapa: la fila no es un botón.
  return (
    <ListItem
      onPress={located ? () => onPress(observation) : undefined}
      accessibilityLabel={t.atlas.rowA11y(common, observation.createdAt, located)}
      style={[styles.row, { borderColor: color.outlineVariant }]}
      leading={<UnverifiedMark />}
      trailing={located ? <ChevronIcon color={color.onSurfaceVariant} /> : null}>
      <Text variant="titleMedium">{common}</Text>
      {scientific ? <Text variant="scientific" tone="onSurfaceVariant">{scientific}</Text> : null}
      <Text variant="labelMedium" tone="onSurfaceVariant">
        {located ? meta : `${meta} · ${t.atlas.noLocation}`}
      </Text>
    </ListItem>
  );
}

const styles = StyleSheet.create({
  row: { borderBottomWidth: StyleSheet.hairlineWidth },
});
