import { StyleSheet, View } from 'react-native';

import type { Species } from '@/domain/species';
import { t } from '@/i18n/es-CL';
import { space, Tag } from '@/ui';

/** Etiquetas de estado de una especie, derivadas de sus datos. */
export function speciesTagLabels(species: Species): string[] {
  return species.taxonomicStatus === 'provisional' ? [t.status.provisional] : [];
}

/** Si la taxonomía no está validada, la marca de provisional; si lo está, nada. */
export function SpeciesTags({ species, hidden = false }: { species: Species; /** Si el padre ya las anuncia. */ hidden?: boolean }) {
  if (species.taxonomicStatus !== 'provisional') return null;
  return (
    <View style={styles.tags} importantForAccessibility={hidden ? 'no-hide-descendants' : 'auto'} accessibilityElementsHidden={hidden}>
      <Tag label={t.status.provisional} tone="provisional" />
    </View>
  );
}

const styles = StyleSheet.create({
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
});
