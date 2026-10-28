import { router } from 'expo-router';
import Svg, { Path, Rect } from 'react-native-svg';

import { t } from '@/i18n/es-CL';
import { PendingFeature } from '@/ui/pending-feature';
import { useTheme } from '@/ui/theme';

export default function ObservationsScreen() {
  const { color } = useTheme();
  return (
    <PendingFeature
      title={t.pending.observationsTitle}
      subtitle={t.pending.observationsSubtitle}
      heading={t.pending.observationsHeading}
      body={t.pending.observationsBody}
      action={t.pending.observationsAction}
      onAction={() => router.navigate('/atlas')}
      art={<FieldNotebook ink={color.leafInk} fill={color.leafFill} />}
    />
  );
}

/** Libreta de terreno con renglones vacíos y una hoja punteada: el borrador que aún no existe. */
function FieldNotebook({ ink, fill }: { ink: string; fill: string }) {
  return (
    <Svg width={176} height={150} viewBox="0 0 176 150" accessible={false}>
      <Rect x={28} y={8} width={124} height={134} rx={6} stroke={ink} strokeWidth={1.5} fill={fill} />
      <Path d="M44 8v134" stroke={ink} strokeWidth={1} opacity={0.6} />
      {[34, 52, 70, 88, 106, 124].map((y) => (
        <Path key={y} d={`M54 ${y}h84`} stroke={ink} strokeWidth={1} opacity={0.35} strokeLinecap="round" />
      ))}
      {[24, 48, 72, 96, 120].map((y) => (
        <Rect key={y} x={22} y={y} width={12} height={5} rx={2.5} stroke={ink} strokeWidth={1.2} fill="none" />
      ))}
      <Path d="M112 112c-12-6-15-18-6-34 13 12 16 24 6 34Zm0 0v12" stroke={ink} strokeWidth={1.5}
        strokeDasharray={[4, 3]} strokeLinecap="round" fill="none" />
      <Path d="M58 52h50M58 70h34" stroke={ink} strokeWidth={1.5} strokeDasharray={[2, 4]} strokeLinecap="round" opacity={0.7} />
    </Svg>
  );
}
