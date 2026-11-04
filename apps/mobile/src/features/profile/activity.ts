import type { GuideEntry } from '@/domain/guide';
import type { Species } from '@/domain/species';
import { type BadgeId, computeBadges } from '@/features/journal/badges';
import type { Walk } from '@/features/journal/walks';
import type { Achievement } from '@/features/profile/mock-achievements';

// Historial del perfil, derivado de la guía y de los recorridos: no se guarda nada nuevo. Una
// insignia lleva la fecha del dato que completó su meta, reconstruida al repasar los hechos en orden.

export type Activity =
  | { kind: 'walk'; date: string; trailId: string; km: number }
  | { kind: 'species'; date: string; speciesIds: string[] }
  | { kind: 'badge'; date: string; badgeId: BadgeId }
  /** Logro de prueba (ver `mock-achievements.ts`): no se deriva del diario. */
  | { kind: 'achievement'; date: string; achievement: Achievement };

type Inputs = { catalog: Species[]; entries: GuideEntry[]; walks: Walk[] };

/** En un mismo día, lo que se ganó va primero y luego lo que lo causó. */
const RANK: Record<Activity['kind'], number> = { achievement: 0, badge: 0, species: 1, walk: 2 };

/** Primera entrada de cada especie del catálogo; las repetidas o ajenas al catálogo no cuentan. */
function catalogEntries(catalog: Species[], entries: GuideEntry[]): GuideEntry[] {
  const known = new Set(catalog.map((species) => species.id));
  const seen = new Set<string>();
  return entries.filter((entry) => {
    if (!known.has(entry.speciesId) || seen.has(entry.speciesId)) return false;
    seen.add(entry.speciesId);
    return true;
  });
}

/** Fecha en que cada insignia quedó ganada, repasando especies y recorridos en orden de fecha. */
export function badgeDates({ catalog, entries, walks }: Inputs): Map<BadgeId, string> {
  type Event = { date: string; entry?: GuideEntry; walk?: Walk };
  const events: Event[] = [
    ...catalogEntries(catalog, entries).map((entry) => ({ date: entry.addedAt, entry })),
    ...walks.map((walk) => ({ date: walk.completedAt, walk })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  const dates = new Map<BadgeId, string>();
  const soFarEntries: GuideEntry[] = [];
  const soFarWalks: Walk[] = [];
  for (const event of events) {
    if (event.entry) soFarEntries.push(event.entry);
    if (event.walk) soFarWalks.push(event.walk);
    for (const badge of computeBadges({ catalog, entries: soFarEntries, walks: soFarWalks })) {
      if (badge.earned && !dates.has(badge.id)) dates.set(badge.id, event.date);
    }
  }
  return dates;
}

/** Todo el historial, lo más reciente primero. Las especies sumadas el mismo día van juntas. */
export function buildActivity(inputs: Inputs & { achievements?: Achievement[] }): Activity[] {
  const byDay = new Map<string, string[]>();
  for (const entry of catalogEntries(inputs.catalog, inputs.entries)) {
    byDay.set(entry.addedAt, [...(byDay.get(entry.addedAt) ?? []), entry.speciesId]);
  }
  const items: Activity[] = [
    ...inputs.walks.map((walk): Activity => ({ kind: 'walk', date: walk.completedAt, trailId: walk.trailId, km: walk.km })),
    ...[...byDay].map(([date, speciesIds]): Activity => ({ kind: 'species', date, speciesIds })),
    ...[...badgeDates(inputs)].map(([badgeId, date]): Activity => ({ kind: 'badge', date, badgeId })),
    ...(inputs.achievements ?? []).map((achievement): Activity => ({ kind: 'achievement', date: achievement.date, achievement })),
  ];
  // `sort` es estable: dentro del mismo día y tipo se conserva el orden de origen.
  return items.sort((a, b) => b.date.localeCompare(a.date) || RANK[a.kind] - RANK[b.kind]);
}
