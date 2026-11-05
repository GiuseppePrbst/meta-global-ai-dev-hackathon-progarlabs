import { type FetchLike, requestJson } from '@/api/client';
import type { components } from '@/api/schema.gen';
import type { DemoAvailability } from '@/domain/wilo';

// GET /demo/status: si la demo pública está abierta y qué funciones tiene. Pública. La pide cada
// feature de IA con su propio transporte (Wilo o Identificar), así queda simulada o real junto con
// esa feature.

export type DemoStatus = components['schemas']['DemoStatus'];

export async function fetchDemoStatus(send: FetchLike, baseUrl: string, signal?: AbortSignal): Promise<DemoAvailability> {
  const status = await requestJson<DemoStatus>(baseUrl, '/demo/status', { signal, fetchImpl: send });
  return {
    active: status.status === 'active',
    features: status.features,
    notice: status.notice,
    expiresAt: status.expires_at,
    territoryEligible: status.territory_eligible,
  };
}
