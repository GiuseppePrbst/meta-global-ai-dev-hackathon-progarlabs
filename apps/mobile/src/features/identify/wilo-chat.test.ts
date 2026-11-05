import { describe, expect, it } from '@jest/globals';

import type { DemoTraits } from '@/features/identify/demo-traits';
import { cannedAnswerFor, pickDemoSpecies, questionsFor } from '@/features/identify/wilo-chat';
import { syntheticSpecies } from '@/test/synthetic-species';

// Especies y rasgos SINTÉTICOS: inventados, solo ejercitan la selección y las preguntas.
const tree: DemoTraits = { group: 'tree', traits: { habit: 'Porte X', whereToLook: 'Lugar X', leaf: 'Hoja X', bark: 'Corteza X' } };
const fungus: DemoTraits = {
  group: 'fungus',
  traits: { habit: 'Temporada Y', whereToLook: 'Lugar Y', fruitingBody: 'Seta Y', substrate: 'Sustrato Y' },
};

describe('pickDemoSpecies', () => {
  const all = ['a', 'b', 'c'].map((id) => syntheticSpecies({ id }));
  const photo = (id: string) => id !== 'c';

  it('solo elige especies con foto', () => {
    expect(pickDemoSpecies(all, photo, null, () => 0.99)?.id).toBe('b');
  });

  it('no repite la anterior si hay otra', () => {
    expect(pickDemoSpecies(all, photo, 'a', () => 0)?.id).toBe('b');
  });

  it('repite si es la única con foto, y no devuelve nada sin fotos', () => {
    expect(pickDemoSpecies(all, (id) => id === 'a', 'a')?.id).toBe('a');
    expect(pickDemoSpecies(all, () => false, null)).toBeUndefined();
  });
});

const named = { commonName: 'Árbol sintético', scientificName: 'Arbor syntheticus' };

describe('questionsFor', () => {
  it('da tres preguntas con respuestas de los rasgos del árbol', () => {
    const qs = questionsFor(named, tree);
    expect(qs).toHaveLength(3);
    expect(qs.map((q) => q.answer).join(' ')).toEqual(expect.stringMatching(/hoja x/i));
    expect(qs.map((q) => q.answer).join(' ')).toEqual(expect.stringMatching(/corteza x/i));
  });

  it('usa los rasgos del hongo', () => {
    const answers = questionsFor(named, fungus).map((q) => q.answer).join(' ');
    expect(answers).toEqual(expect.stringMatching(/seta y/i));
    expect(answers).toEqual(expect.stringMatching(/sustrato y/i));
  });

  it('sin rasgos de demostración no sugiere preguntas', () => {
    expect(questionsFor(named, undefined)).toEqual([]);
  });

  it('la pregunta enviada nombra la especie; el chip queda corto', () => {
    const [leaf] = questionsFor(named, tree);
    expect(leaf.question).toContain('Árbol sintético');
    expect(leaf.question).toContain('Arbor syntheticus');
    expect(leaf.label).not.toContain('Árbol sintético');
  });
});

describe('cannedAnswerFor', () => {
  it('responde solo a una pregunta sugerida exacta', () => {
    const qs = questionsFor(named, tree);
    const canned = cannedAnswerFor(qs);
    expect(canned(qs[0].question)).toBe(qs[0].answer);
    expect(canned(`  ${qs[1].question} `)).toBe(qs[1].answer);
    expect(canned('¿Otra cosa?')).toBeUndefined();
    expect(canned(qs[0].label)).toBeUndefined();
  });
});
