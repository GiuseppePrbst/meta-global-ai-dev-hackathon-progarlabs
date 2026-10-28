import { router } from 'expo-router';

import { Viewfinder, ViewfinderCover } from '@/features/identification/viewfinder-art';
import { t } from '@/i18n/es-CL';
import { PendingFeature, useTheme } from '@/ui';

export default function IdentifyScreen() {
  const { color } = useTheme();
  return (
    <PendingFeature
      title={t.pending.identifyTitle}
      subtitle={t.pending.identifySubtitle}
      heading={t.pending.identifyHeading}
      body={t.pending.identifyBody}
      tag={t.pending.tag}
      action={t.pending.identifyAction}
      onAction={() => router.navigate('/species')}
      art={<Viewfinder ink={color.accent} />}
      cover={<ViewfinderCover ink={color.onTopBar} wash={color.lime} />}
    />
  );
}
