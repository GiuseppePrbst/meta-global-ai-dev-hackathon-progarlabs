import { StyleSheet, View } from 'react-native';

import type { Species } from '@/domain/species';
import { t } from '@/i18n/es-CL';
import { space, Tag } from '@/ui';

/** Etiquetas de grupo y estado de una especie, derivadas de sus datos. */
export function speciesTagLabels(species: Species): string[] {
  return species.taxonomicStatus === 'provisional' ? [t.species.groupTree, t.status.provisional] : [t.species.groupTree];
}

/** Grupo en lima y, si la taxonomía no está validada, la marca de provisional. */
export function SpeciesTags({ species, hidden = false }: { species: Species; /** Si el padre ya las anuncia. */ hidden?: boolean }) {
  return (
    <View style={styles.tags} importantForAccessibility={hidden ? 'no-hide-descendants' : 'auto'} accessibilityElementsHidden={hidden}>
      <Tag label={t.species.groupTree} tone="lime" />
      {species.taxonomicStatus === 'provisional' ? <Tag label={t.status.provisional} tone="provisional" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
});
