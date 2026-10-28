import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { LeafPlate } from '@/features/catalog/leaf-plate';
import { t } from '@/i18n/es-CL';
import { PendingFeature } from '@/ui/pending-feature';
import { useTheme } from '@/ui/theme';

export default function IdentifyScreen() {
  const { color } = useTheme();
  return (
    <PendingFeature
      title={t.pending.identifyTitle}
      subtitle={t.pending.identifySubtitle}
      heading={t.pending.identifyHeading}
      body={t.pending.identifyBody}
      action={t.pending.identifyAction}
      onAction={() => router.navigate('/species')}
      art={<Viewfinder ink={color.leafInk} />}
    />
  );
}

/** Un visor que encuadra una hoja: la toma que todavía no se puede hacer. */
function Viewfinder({ ink }: { ink: string }) {
  return (
    <View style={styles.frame}>
      <Svg width={168} height={168} viewBox="0 0 168 168" style={StyleSheet.absoluteFill}>
        <Path d="M4 40V12a8 8 0 0 1 8-8h28M128 4h28a8 8 0 0 1 8 8v28M164 128v28a8 8 0 0 1-8 8h-28M40 164H12a8 8 0 0 1-8-8v-28"
          stroke={ink} strokeWidth={2} strokeLinecap="round" fill="none" />
      </Svg>
      <LeafPlate speciesId="eucryphia-cordifolia" size={128} draw delay={200} />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { width: 168, height: 168, alignItems: 'center', justifyContent: 'center' },
});
