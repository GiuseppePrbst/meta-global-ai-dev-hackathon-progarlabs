import { describe, expect, it } from '@jest/globals';

import type { Species } from '@/domain/species';
import { pickDemoSpecies, questionsFor } from '@/features/identify/wilo-chat';

// Especies SINTÉTICAS: nombres y rasgos inventados, solo ejercitan la selección y las preguntas.
const provenance: Species['provenance'] = {
  sourceName: 'Fixture sintético de pruebas',
  sourceUrl: 'https://example.invalid',
  accessedAt: '2026-11-03',
  version: 'test',
  license: 'CC0-1.0',
  attribution: 'Sintético',
  validationOwner: 'Nadie',
  status: 'pending_validation',
};
const tree = (id: string): Species => ({
  id, commonName: id, scientificName: id, taxonomicStatus: 'provisional', provenance, group: 'tree',
  traits: { family: 'Testaceae', habit: 'Porte X', whereToLook: 'Lugar X', leaf: 'Hoja X', bark: 'Corteza X' },
});
const fungus: Species = {
  id: 'f', commonName: 'f', scientificName: 'f', taxonomicStatus: 'provisional', provenance, group: 'fungus',
  traits: { family: 'Testaceae', habit: 'Temporada Y', whereToLook: 'Lugar Y', fruitingBody: 'Seta Y', substrate: 'Sustrato Y' },
};

describe('pickDemoSpecies', () => {
  const all = [tree('a'), tree('b'), tree('c')];
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

describe('questionsFor', () => {
  it('da tres preguntas con respuestas de los rasgos del árbol', () => {
    const qs = questionsFor(tree('a'));
    expect(qs).toHaveLength(3);
    expect(qs.map((q) => q.answer).join(' ')).toEqual(expect.stringMatching(/hoja x/i));
    expect(qs.map((q) => q.answer).join(' ')).toEqual(expect.stringMatching(/corteza x/i));
  });

  it('usa los rasgos del hongo', () => {
    const answers = questionsFor(fungus).map((q) => q.answer).join(' ');
    expect(answers).toEqual(expect.stringMatching(/seta y/i));
    expect(answers).toEqual(expect.stringMatching(/sustrato y/i));
  });
});
