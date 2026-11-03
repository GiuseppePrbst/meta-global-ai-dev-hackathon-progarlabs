import { apiUrl, bearer, parseLabError } from "./api";

// Contrato real de POST /identify (services/api + bosque_ai/contracts.py).
// El pipeline NO emite puntajes numericos ni probabilidades: emite candidatos
// con evidencia textual y un estado de aceptacion. La UI nunca inventa cifras.
export type Candidate = {
  species_id: string;
  evidence: string;
  contradictory_evidence: string[];
};
export type Identification = {
  status: "candidates" | "insufficient_evidence";
  provider: "mock" | "meta";
  model: string | null;
  candidates: Candidate[];
  message: string;
  limitations: string[];
  catalog_assessment: "supported_candidate" | "insufficient_evidence" | "out_of_catalog_suspected" | "non_diagnostic_photo" | "not_assessed";
  acceptance: "accepted" | "not_accepted" | "not_applicable";
  accepted_species_id: string | null;
  exploratory_candidates: Candidate[];
  similar_out_of_catalog: string[];
  observed_traits: string[];
  missing_traits: string[];
  recommended_next_photo: string | null;
  sources: string[];
  strategy: string | null;
};
export type SpeciesInfo = { id: string; scientific_name: string; common_name: string };

export function validatePhoto(file: Pick<File, "type" | "size">): string | null {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return "Elige una imagen JPEG, PNG o WebP.";
  if (file.size === 0 || file.size > 10 * 1024 * 1024) return "La imagen debe tener contenido y pesar como maximo 10 MiB.";
  return null;
}

// Sin Authorization por defecto, como el cliente oficial: en modo local con token el
// backend intenta guardar evidencia privada y exige PostGIS (migracion 004). Solo en
// SERVICE_MODE=demo se envia el token, porque alli /identify reserva en el ledger por
// identidad (local+Meta exige META_ACCESS_TOKEN y no reserva en el ledger).
export async function identifyPhoto(file: File, opts: { signal?: AbortSignal; token?: string } = {}): Promise<Identification> {
  const form = new FormData();
  form.append("file", file);
  form.append("adult_confirmed", "true");
  form.append("rights_confirmed", "true");
  const response = await fetch(`${apiUrl}/identify`, {
    method: "POST", body: form, headers: bearer(opts.token ?? ""),
    signal: opts.signal ?? AbortSignal.timeout(95000),
  });
  if (!response.ok) throw await parseLabError(response);
  return (await response.json()) as Identification;
}

export async function fetchSpeciesCatalog(signal?: AbortSignal): Promise<SpeciesInfo[]> {
  const response = await fetch(`${apiUrl}/species`, { signal: signal ?? AbortSignal.timeout(15000) });
  if (!response.ok) throw await parseLabError(response);
  return (await response.json()) as SpeciesInfo[];
}

export async function fetchTaxonLink(speciesId: string, signal?: AbortSignal): Promise<{ id: string; demo_status?: string } | null> {
  const response = await fetch(`${apiUrl}/taxa/${speciesId}`, { signal: signal ?? AbortSignal.timeout(15000) });
  if (!response.ok) return null;
  const body = (await response.json()) as { id: string };
  return { id: body.id };
}

export function assessmentLabel(value: Identification["catalog_assessment"]): string {
  switch (value) {
    case "supported_candidate": return "Candidato con respaldo en el catalogo";
    case "out_of_catalog_suspected": return "Probablemente fuera del catalogo de 8 arboles";
    case "non_diagnostic_photo": return "La foto no muestra rasgos diagnosticos";
    case "insufficient_evidence": return "Evidencia insuficiente";
    default: return "Sin evaluar";
  }
}
