import { NO_CONSENTS, type WiloConsents } from '@/domain/wilo';
import { createMemoryStore } from '@/features/memory-store';

// Consentimientos para hablar con Wilo y para identificar una foto, válidos mientras la app siga
// abierta. Empiezan sin marcar y solo cambian por una acción de la persona en la hoja de
// consentimiento (docs/PUBLIC_DEMO.md).

export const PRIVACY_URL = 'https://progarlabs.com/privacidad#bosque-vivo';

export const wiloConsentStore = createMemoryStore<WiloConsents>(NO_CONSENTS);

/** Qué se envía: texto, audio o foto. El audio y la foto piden además los derechos de uso. */
export type ConsentNeed = 'text' | 'voice' | 'photo';

export function needsRights(need: ConsentNeed): boolean {
  return need !== 'text';
}

/** ¿Faltan declaraciones para este tipo de envío? */
export function missingConsents(consents: WiloConsents, need: ConsentNeed): boolean {
  if (!consents.adult || !consents.externalProcessing) return true;
  return needsRights(need) && !consents.rights;
}
