import { StyleSheet, View } from 'react-native';

import type { IdentifyAttempt } from '@/features/identify/use-identify';
import { Wilo } from '@/features/onboarding/wilo';
import { t } from '@/i18n/es-CL';
import { Button, radius, space, Tag, Text, useTheme } from '@/ui';

type Miss = Exclude<IdentifyAttempt, { kind: 'species' }>;

/**
 * Tarjeta sobre la cámara cuando POST /identify no propone una especie del catálogo: se abstiene, la
 * foto no sirve para decidir, la especie parece fuera del catálogo o la app no la conoce. Muestra
 * qué foto tomar después, si la API lo dice. Nunca inventa una especie.
 */
export function IdentifyMiss({ result, onDismiss }: { result: Miss; onDismiss: () => void }) {
  const { color } = useTheme();
  const { outcome } = result;
  const reason = result.kind === 'not_in_catalog'
    ? t.identify.photoNotInCatalog
    : result.outcome.reason === 'out_of_catalog'
      ? t.identify.outOfCatalog
      : result.outcome.reason === 'non_diagnostic' ? t.identify.nonDiagnostic : outcome.message;
  const next = result.kind === 'insufficient' && result.outcome.nextPhoto
    ? t.identify.nextPhoto[result.outcome.nextPhoto]
    : null;
  return (
    <View style={[styles.card, { backgroundColor: color.surface, shadowColor: color.shadow }]}
      accessibilityLiveRegion="polite">
      <View style={styles.head}>
        <Wilo pose="sniff" width={56} height={48} accessibilityLabel={t.identify.wiloA11y} />
        <View style={styles.headText}>
          <Text variant="titleMedium" accessibilityRole="header">{t.identify.insufficientTitle}</Text>
          {outcome.simulated ? <Tag label={t.identify.foundSimulated} tone="provisional" /> : null}
        </View>
      </View>
      <Text variant="bodyMedium">{reason}</Text>
      {next ? <Text variant="bodyMedium" tone="onSurfaceVariant">{next}</Text> : null}
      {outcome.limitations.map((limit) => (
        <Text key={limit} variant="labelSmall" tone="onSurfaceVariant">{limit}</Text>
      ))}
      <Button label={t.identify.tryAgain} onPress={onDismiss} size="compact" />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl, padding: space.md, gap: space.sm,
    elevation: 6, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 1, shadowRadius: 24,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  headText: { flex: 1, gap: space.xxs },
});
