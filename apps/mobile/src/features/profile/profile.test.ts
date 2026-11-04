import { describe, expect, it } from '@jest/globals';

import type { GuideEntry } from '@/domain/guide';
import type { Species } from '@/domain/species';
import type { Walk } from '@/features/journal/walks';
import { badgeDates, buildActivity } from '@/features/profile/activity';
import { countDiscoveries, levelFor } from '@/features/profile/levels';
import { ALIAS_MAX, DEFAULT_PROFILE, initials, parseStoredProfile, validateProfile } from '@/features/profile/profile';

// Datos SINTÉTICOS: especies y recorridos inventados solo para probar la lógica.
const catalog = [
  ['a', 'Nothofagus prima'],
  ['b', 'Nothofagus secunda'],
  ['c', 'Fictus tertius'],
  ['d', 'Fictus quartus'],
].map(([id, scientificName]) => ({ id, scientificName }) as Species);

const entry = (speciesId: string, addedAt: string): GuideEntry => ({ speciesId, addedAt });
const walk = (completedAt: string, km = 3): Walk => ({ trailId: 't', trailName: 'T', completedAt, km });

describe('validateProfile', () => {
  it('limpia espacios y caracteres de control', () => {
    const result = validateProfile({ alias: '  Ana \n  María ', bio: ' hola\tbosque ', avatarTone: 'moss', tag: 'fungi' });
    expect(result).toEqual({ ok: true, profile: { alias: 'Ana María', bio: 'hola bosque', avatarTone: 'moss', tag: 'fungi' } });
  });

  it('acepta un alias vacío (perfil anónimo)', () => {
    expect(validateProfile(DEFAULT_PROFILE)).toEqual({ ok: true, profile: DEFAULT_PROFILE });
  });

  it('rechaza textos demasiado largos, contando caracteres y no bytes', () => {
    expect(validateProfile({ ...DEFAULT_PROFILE, alias: 'ñ'.repeat(ALIAS_MAX) }).ok).toBe(true);
    expect(validateProfile({ ...DEFAULT_PROFILE, alias: 'a'.repeat(ALIAS_MAX + 1), bio: 'b'.repeat(200) }))
      .toEqual({ ok: false, errors: { alias: 'tooLong', bio: 'tooLong' } });
  });

  it('cambia un color desconocido por el de defecto', () => {
    const result = validateProfile({ ...DEFAULT_PROFILE, avatarTone: 'neon' as never });
    expect(result.ok && result.profile.avatarTone).toBe(DEFAULT_PROFILE.avatarTone);
  });

  it('cambia una etiqueta desconocida por la de defecto', () => {
    const result = validateProfile({ ...DEFAULT_PROFILE, tag: 'pirata' as never });
    expect(result.ok && result.profile.tag).toBe(DEFAULT_PROFILE.tag);
  });
});

describe('initials', () => {
  it('toma hasta dos palabras', () => {
    expect(initials('ana maría soto')).toBe('AM');
    expect(initials('  Ñandú ')).toBe('Ñ');
    expect(initials('')).toBe('');
  });
});

describe('parseStoredProfile', () => {
  it('devuelve el perfil por defecto si falta, está corrupto o no valida', () => {
    expect(parseStoredProfile(null)).toEqual(DEFAULT_PROFILE);
    expect(parseStoredProfile('{no json')).toEqual(DEFAULT_PROFILE);
    expect(parseStoredProfile('42')).toEqual(DEFAULT_PROFILE);
    expect(parseStoredProfile(JSON.stringify({ alias: 'x'.repeat(99) }))).toEqual(DEFAULT_PROFILE);
  });

  it('lee un perfil guardado', () => {
    const saved = { alias: 'Wilo', bio: 'Nado', avatarTone: 'forest', tag: 'trails' };
    expect(parseStoredProfile(JSON.stringify(saved))).toEqual(saved);
  });

  it('da la etiqueta por defecto a un perfil guardado sin ella', () => {
    const old = { alias: 'Wilo', bio: '', avatarTone: 'moss' };
    expect(parseStoredProfile(JSON.stringify(old))).toEqual({ ...old, tag: DEFAULT_PROFILE.tag });
  });
});

describe('levelFor', () => {
  it('sube en los umbrales fijos', () => {
    expect(levelFor(0)).toMatchObject({ number: 1, id: 'sprout', next: { id: 'bronze', min: 5 } });
    expect(levelFor(4).id).toBe('sprout');
    expect(levelFor(5)).toMatchObject({ number: 2, id: 'bronze', next: { id: 'silver', min: 20 } });
    expect(levelFor(12).upcoming.map((l) => l.id)).toEqual(['silver', 'gold']);
    expect(levelFor(50)).toMatchObject({ number: 4, id: 'gold', next: undefined, upcoming: [] });
  });

  it('cuenta especies del catálogo y recorridos', () => {
    const entries = [entry('a', '2026-10-01'), entry('fuera', '2026-10-01')];
    expect(countDiscoveries({ catalog, entries, walks: [walk('2026-10-02')] })).toBe(2);
  });
});

describe('badgeDates', () => {
  it('fecha cada insignia con el dato que completó su meta', () => {
    const dates = badgeDates({
      catalog,
      entries: [entry('a', '2026-10-01'), entry('c', '2026-10-03'), entry('b', '2026-10-05')],
      walks: [walk('2026-10-02', 6), walk('2026-10-04', 6)],
    });
    expect(Object.fromEntries(dates)).toEqual({
      'first-species': '2026-10-01',
      'first-walk': '2026-10-02',
      'half-guide': '2026-10-03',
      'ten-km': '2026-10-04',
      'all-nothofagus': '2026-10-05',
    });
  });
});

describe('buildActivity', () => {
  it('agrupa especies por día y ordena de lo más reciente a lo más antiguo', () => {
    const activity = buildActivity({
      catalog,
      entries: [entry('a', '2026-10-01'), entry('c', '2026-10-01'), entry('a', '2026-10-09'), entry('fuera', '2026-10-09')],
      walks: [walk('2026-10-03')],
    });
    expect(activity).toEqual([
      { kind: 'badge', date: '2026-10-03', badgeId: 'first-walk' },
      { kind: 'walk', date: '2026-10-03', trailId: 't', trailName: 'T', km: 3 },
      { kind: 'badge', date: '2026-10-01', badgeId: 'first-species' },
      { kind: 'badge', date: '2026-10-01', badgeId: 'half-guide' },
      { kind: 'species', date: '2026-10-01', speciesIds: ['a', 'c'] },
    ]);
  });

  it('intercala los logros de prueba por fecha, antes de lo demás del mismo día', () => {
    const achievement = { id: 'x', date: '2026-10-03', name: 'Prueba', rule: 'Regla' };
    const activity = buildActivity({ catalog, entries: [], walks: [walk('2026-10-03'), walk('2026-10-05')], achievements: [achievement] });
    expect(activity.map((a) => [a.kind, a.date])).toEqual([
      ['walk', '2026-10-05'],
      ['badge', '2026-10-03'],
      ['achievement', '2026-10-03'],
      ['walk', '2026-10-03'],
    ]);
  });

  it('queda vacío sin datos', () => {
    expect(buildActivity({ catalog, entries: [], walks: [] })).toEqual([]);
  });
});
