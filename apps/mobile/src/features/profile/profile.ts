// Perfil local, sin cuenta: lo que la persona decide mostrar de sí en este dispositivo. No identifica
// a nadie ante un servidor; no hay autenticación ni sincronización.

/** Color de fondo del avatar de iniciales; la pantalla lo traduce a tokens del tema. */
export type AvatarTone = 'lime' | 'moss' | 'forest' | 'stone';

export const AVATAR_TONES: readonly AvatarTone[] = ['lime', 'moss', 'forest', 'stone'];

/** Etiqueta bajo el nombre: cómo se describe la persona en el bosque. Se elige entre tres. */
export type ProfileTag = 'forest' | 'trails' | 'fungi';

export const PROFILE_TAGS: readonly ProfileTag[] = ['forest', 'trails', 'fungi'];

export type Profile = {
  /** Nombre visible; vacío muestra el nombre por defecto. */
  alias: string;
  /** Frase corta bajo el nombre; vacía no se muestra. */
  bio: string;
  avatarTone: AvatarTone;
  tag: ProfileTag;
};

export const ALIAS_MAX = 24;
export const BIO_MAX = 80;

export const DEFAULT_PROFILE: Profile = { alias: '', bio: '', avatarTone: 'lime', tag: 'forest' };

export type ProfileErrors = { alias?: 'tooLong'; bio?: 'tooLong' };

export type ProfileValidation = { ok: true; profile: Profile } | { ok: false; errors: ProfileErrors };

/** Quita caracteres de control, junta espacios repetidos y recorta los bordes. */
function clean(text: string): string {
  return text.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Limpia y valida lo que se escribió en el formulario. El largo se cuenta en caracteres, no en bytes. */
export function validateProfile(draft: Profile): ProfileValidation {
  const alias = clean(draft.alias);
  const bio = clean(draft.bio);
  const errors: ProfileErrors = {};
  if ([...alias].length > ALIAS_MAX) errors.alias = 'tooLong';
  if ([...bio].length > BIO_MAX) errors.bio = 'tooLong';
  if (errors.alias || errors.bio) return { ok: false, errors };
  const avatarTone = AVATAR_TONES.includes(draft.avatarTone) ? draft.avatarTone : DEFAULT_PROFILE.avatarTone;
  const tag = PROFILE_TAGS.includes(draft.tag) ? draft.tag : DEFAULT_PROFILE.tag;
  return { ok: true, profile: { alias, bio, avatarTone, tag } };
}

/** Hasta dos iniciales en mayúscula, de las dos primeras palabras; vacío si no hay alias. */
export function initials(alias: string): string {
  return clean(alias)
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => [...word][0].toLocaleUpperCase('es-CL'))
    .join('');
}

/**
 * Perfil leído del almacenamiento. Un valor ausente, corrupto o de otra forma da el perfil por
 * defecto: un perfil roto nunca impide abrir la pestaña.
 */
export function parseStoredProfile(raw: string | null): Profile {
  if (!raw) return DEFAULT_PROFILE;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object') return DEFAULT_PROFILE;
    // Un perfil guardado antes de existir la etiqueta la recibe por defecto.
    const { alias, bio, avatarTone, tag } = value as Record<string, unknown>;
    const result = validateProfile({
      alias: typeof alias === 'string' ? alias : '',
      bio: typeof bio === 'string' ? bio : '',
      avatarTone: avatarTone as AvatarTone,
      tag: tag as ProfileTag,
    });
    return result.ok ? result.profile : DEFAULT_PROFILE;
  } catch {
    return DEFAULT_PROFILE;
  }
}
