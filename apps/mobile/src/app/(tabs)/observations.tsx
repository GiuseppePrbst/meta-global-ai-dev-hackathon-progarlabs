import { router } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';

import { useSpeciesCatalog } from '@/features/catalog/use-species';
import { GuidePreview } from '@/features/guide/guide-preview';
import { useGuide } from '@/features/guide/use-guide';
import { NotebookCover } from '@/features/observations/notebook-art';
import { t } from '@/i18n/es-CL';
import { BAND_EDGE, Button, LoadingState, Paper, ScreenHeader, space, useTheme } from '@/ui';

export default function ObservationsScreen() {
  const { color } = useTheme();
  const { data: catalog } = useSpeciesCatalog();
  const { data: entries } = useGuide();

  return (
    <Paper style={styles.screen}>
      <ScreenHeader title={t.pending.observationsTitle} subtitle={t.pending.observationsSubtitle}
        cover={<NotebookCover ink={color.onTopBar} wash={color.lime} />} />
      <ScrollView contentContainerStyle={styles.content}>
        {catalog && entries ? <GuidePreview catalog={catalog} entries={entries} /> : <LoadingState label={t.guide.loading} />}
        <Button label={t.guide.explore} onPress={() => router.navigate('/species')} style={styles.button} />
      </ScrollView>
    </Paper>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: space.lg, paddingTop: BAND_EDGE + space.lg, paddingBottom: space.xxl, gap: space.xl },
  button: { alignSelf: 'stretch' },
});
