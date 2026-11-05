import { stripQuestionContext } from '@/api/wilo';
import type { Species } from '@/domain/species';
import type { DemoTraits } from '@/features/identify/demo-traits';
import { t } from '@/i18n/es-CL';

// DEMO: la identificación (POST /identify) y Wilo (POST /guide/query) están simulados por defecto.
// `pickDemoSpecies` elige la «candidata» del mock de identificación (use-identify.ts) y las respuestas
// de demostración de las preguntas (demo-traits.ts, sin validación botánica) solo las usa el mock de
// Wilo. Con la API real, la especie y las respuestas vienen del servicio.

/**
 * Pregunta sugerida. `label` es el texto corto del chip; `question` es lo que se envía a
 * POST /guide/query, con el nombre de la especie, porque la API no recibe contexto de la foto
 * (`capture_id: null`). `answer` solo lo usa el mock (texto de demostración).
 */
export type WiloQuestion = { id: string; label: string; question: string; answer: string };

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
export function questionsFor(species: Pick<Species, 'commonName' | 'scientificName'>, demo: DemoTraits | undefined): WiloQuestion[] {
  const q = t.identify.questions;
  if (!demo) return [];
  const name = { common: species.commonName, scientific: species.scientificName };
  const make = (id: string, label: string, ask: (n: typeof name) => string, answer: string): WiloQuestion =>
    ({ id, label, question: ask(name), answer });
  if (demo.group === 'tree') {
    return [
      make('leaf', q.leaf, q.leafFull, q.leafAnswer(demo.traits.leaf)),
      make('bark', q.bark, q.barkFull, q.barkAnswer(demo.traits.bark)),
      make('where', q.where, q.whereFull, q.whereAnswer(demo.traits.whereToLook)),
    ];
  }
  return [
    make('body', q.body, q.bodyFull, q.bodyAnswer(demo.traits.fruitingBody)),
    make('substrate', q.substrate, q.substrateFull, q.substrateAnswer(demo.traits.substrate)),
    make('season', q.season, q.seasonFull, q.seasonAnswer(demo.traits.habit)),
  ];
}

/** Respuesta de demostración solo para una pregunta sugerida exacta; el resto no tiene. */
export function cannedAnswerFor(questions: readonly WiloQuestion[]): (question: string) => string | undefined {
  const byQuestion = new Map(questions.map((q) => [q.question, q.answer]));
  return (question) => byQuestion.get(stripQuestionContext(question).trim());
}
