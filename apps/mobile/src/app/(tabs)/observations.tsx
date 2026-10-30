import { router } from 'expo-router';

import { FieldNotebook, NotebookCover } from '@/features/observations/notebook-art';
import { t } from '@/i18n/es-CL';
import { PendingFeature, useTheme } from '@/ui';

export default function ObservationsScreen() {
  const { color } = useTheme();
  return (
    <PendingFeature
      title={t.pending.observationsTitle}
      subtitle={t.pending.observationsSubtitle}
      heading={t.pending.observationsHeading}
      body={t.pending.observationsBody}
      tag={t.pending.tag}
      action={t.pending.observationsAction}
      onAction={() => router.navigate('/atlas')}
      art={<FieldNotebook ink={color.leafInk} paper={color.surface} accent={color.accent} />}
      cover={<NotebookCover ink={color.onTopBar} wash={color.lime} />}
    />
  );
}
