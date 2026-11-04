import type { AtlasSource, ParkProfile, ParkTrail } from '@/domain/park';
import { formatDate, formatDecimal, formatDuration, t } from '@/i18n/es-CL';

// Textos de la ficha del parque y de los senderos, armados solo con lo que entrega la API: si un dato
// no vino, no se estima ni se completa con otra fuente.

/** Entero con punto de miles, como se escribe en Chile: 112755 → «112.755». */
export function formatThousands(value: number): string {
  return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** «Región de Los Lagos», «Regiones de Los Lagos y Los Ríos»; un slug desconocido se muestra tal cual. */
export function regionLabel(regions: string[]): string | null {
  if (!regions.length) return null;
  return t.parks.regions(regions.map((slug) => t.parks.regionNames[slug] ?? slug));
}

export type ParkFact = { value: string; label: string };

/** Cifras destacadas de la ficha. */
export function parkFacts(park: ParkProfile): ParkFact[] {
  const facts: ParkFact[] = [];
  if (park.areaHa !== null) facts.push({ value: formatThousands(park.areaHa), label: t.parks.hectares });
  if (park.sectors.length) facts.push({ value: String(park.sectors.length), label: t.parks.sectorsCount(park.sectors.length) });
  return facts;
}

/** Fuente principal de una ficha: título y fecha de consulta. */
export function sourceLabel(source: AtlasSource): string {
  return t.parks.sourceValue(source.title ?? t.parks.sourceUnnamed, formatDate(source.accessedAt));
}

function distance(trail: ParkTrail): { text: string; a11y: string } | null {
  const m = trail.distanceM;
  if (m === null) return null;
  if (m < 1000) return { text: t.trail.meters(m), a11y: t.trail.metersA11y(m) };
  const km = formatDecimal(m / 1000);
  return { text: t.trail.km(km), a11y: t.trail.kmA11y(km) };
}

/** Duración publicada: fija, o un rango si la fuente da mínimo y máximo. */
export function trailDuration(trail: ParkTrail): string | null {
  if (trail.durationMinutes !== null) return formatDuration(trail.durationMinutes);
  const { durationMinMinutes: min, durationMaxMinutes: max } = trail;
  if (min !== null && max !== null) return t.trail.durationRange(formatDuration(min), formatDuration(max));
  if (min !== null) return formatDuration(min);
  if (max !== null) return formatDuration(max);
  return null;
}

/** Línea corta del sendero: distancia, dificultad y duración que trae la API, o «sin datos». */
export function trailMeta(trail: ParkTrail): { meta: string; metaA11y: string } {
  const d = distance(trail);
  const duration = trailDuration(trail);
  const parts = [d?.text, trail.difficulty, duration].filter((part): part is string => Boolean(part));
  const a11y = [d?.a11y, trail.difficulty, duration].filter((part): part is string => Boolean(part));
  if (!parts.length) return { meta: t.trail.noData, metaA11y: t.trail.noData };
  return { meta: parts.join(' · '), metaA11y: a11y.join(', ') };
}

/** Segunda línea del sendero: cierre publicado, si hay, o el tipo de fuente. */
export function trailNote(trail: ParkTrail): string {
  if (trail.openingStatus === 'published_closure' && trail.publishedClosure) return t.trail.closure(trail.publishedClosure);
  return t.trail.sourceStatus[trail.sourceStatus];
}

/** Filas de la ficha del sendero; las que no tienen dato se omiten. */
export function trailRows(trail: ParkTrail): [label: string, value: string][] {
  const d = distance(trail);
  const rows: [string, string | null][] = [
    [t.trail.sector, trail.sector],
    [t.trail.kind, trail.kind ? (t.trail.kinds[trail.kind] ?? trail.kind) : null],
    [t.trail.distance, d?.text ?? null],
    [t.trail.difficulty, trail.difficulty],
    [t.trail.winterDifficulty, trail.winterDifficulty],
    [t.trail.duration, trailDuration(trail)],
    [t.trail.opening, trail.openingStatus === 'published_closure'
      ? t.trail.closure(trail.publishedClosure ?? t.trail.unknown)
      : t.trail.openingNotVerified],
    [t.trail.risks, trail.risks],
    [t.trail.conditions, trail.conditions.length ? trail.conditions.join(' · ') : null],
    [t.trail.sourceLabel, trail.sources[0] ? `${t.trail.sourceStatus[trail.sourceStatus]}. ${sourceLabel(trail.sources[0])}` : t.trail.sourceStatus[trail.sourceStatus]],
  ];
  return rows.filter((row): row is [string, string] => row[1] !== null);
}
