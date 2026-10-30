import { t } from '@/i18n/es-CL';
import { Tag } from '@/ui';

/** Estado taxonómico provisional: círculo abierto, «aún sin validar». */
export function ProvisionalTag() {
  return <Tag label={t.status.provisional} background="provisional" ink="onProvisional" mark="ring" tilt="left" />;
}
