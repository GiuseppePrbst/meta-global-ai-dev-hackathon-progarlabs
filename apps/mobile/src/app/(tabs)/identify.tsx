import { router } from 'expo-router';

import { t } from '@/i18n/es-CL';
import { CameraIcon, LeafIcon, PendingFeature, SpeciesIcon } from '@/ui';

const icons = [CameraIcon, SpeciesIcon, LeafIcon];

export default function IdentifyScreen() {
  return (
    <PendingFeature
      title={t.pending.identifyTitle}
      heading={t.pending.identifyHeading}
      body={t.pending.identifyBody}
      tag={t.pending.tag}
      steps={t.pending.identifySteps.map((label, i) => ({ icon: icons[i], label }))}
      action={t.pending.identifyAction}
      onAction={() => router.navigate('/species')}
    />
  );
}
