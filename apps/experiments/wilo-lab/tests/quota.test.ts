import { describe, expect, it } from "vitest";
import { QUOTA_TEXT, quotaSummary, type Quota } from "../src/lib/session";

const quota = (over: Partial<Quota>): Quota => ({
  identity: "u-x", plan: "Prueba gratuita", status: "available", reason: null, features: ["guide"],
  units_limit: 300_000, units_reserved: 100_000, units_available: 200_000,
  daily_requests_limit: 8, daily_requests_used: 1, ...over,
});

describe("cuota visible", () => {
  it("distingue cada estado y marca el saldo como estimado", () => {
    expect(new Set(Object.values(QUOTA_TEXT)).size).toBe(6);
    expect(quotaSummary(quota({}))).toBe("Prueba gratuita: IA disponible · disponible ~USD 0.20 (estimado) · hoy 1/8");
    expect(quotaSummary(quota({ status: "trial_exhausted", units_available: 0 }))).toContain("no se renueva");
    expect(quotaSummary(quota({ status: "daily_limit" }))).toContain("Limite diario");
    expect(quotaSummary(quota({ plan: null, status: "no_cohort", units_available: null, daily_requests_limit: null })))
      .toBe("Sin plan: Sin grupo asignado");
  });
});
