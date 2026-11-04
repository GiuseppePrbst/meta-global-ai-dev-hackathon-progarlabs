import type { Species } from '@/domain/species';
import type { DemoTraits } from '@/features/identify/demo-traits';
import { t } from '@/i18n/es-CL';

// DEMO: no hay identificación real. Tras la foto se elige una especie del catálogo que tenga foto de
// referencia y Wilo responde con rasgos de demostración (demo-traits.ts, sin validación botánica).
// Al conectar la identificación, `pickDemoSpecies` se reemplaza por la respuesta del servicio y las
// respuestas deben salir de fuentes registradas, no del mock.

export type WiloQuestion = { id: string; question: string; answer: string };

/**
 * Especie a mostrar tras la captura: al azar entre las que tienen foto, sin repetir la anterior
 * mientras haya otra. `random` se inyecta para las pruebas.
 */
export function pickDemoSpecies(
  species: readonly Species[],
  hasPhoto: (id: string) => boolean,
  previousId: string | null,
  random: () => number = Math.random,
): Species | undefined {
  const withPhoto = species.filter((s) => hasPhoto(s.id));
  const pool = withPhoto.length > 1 ? withPhoto.filter((s) => s.id !== previousId) : withPhoto;
  if (pool.length === 0) return undefined;
  return pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))];
}

/** Tres preguntas sugeridas con su respuesta, según el grupo; sin rasgos de demostración, ninguna. */
export function questionsFor(demo: DemoTraits | undefined): WiloQuestion[] {
  const q = t.identify.questions;
  if (!demo) return [];
  if (demo.group === 'tree') {
    return [
      { id: 'leaf', question: q.leaf, answer: q.leafAnswer(demo.traits.leaf) },
      { id: 'bark', question: q.bark, answer: q.barkAnswer(demo.traits.bark) },
      { id: 'where', question: q.where, answer: q.whereAnswer(demo.traits.whereToLook) },
    ];
  }
  return [
    { id: 'body', question: q.body, answer: q.bodyAnswer(demo.traits.fruitingBody) },
    { id: 'substrate', question: q.substrate, answer: q.substrateAnswer(demo.traits.substrate) },
    { id: 'season', question: q.season, answer: q.seasonAnswer(demo.traits.habit) },
  ];
}
