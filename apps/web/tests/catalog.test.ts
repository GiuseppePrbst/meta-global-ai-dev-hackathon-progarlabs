import { describe, expect, it } from "vitest";
import { demoSpecies, filterSpecies } from "../lib/catalog";
import { validatePhoto } from "../lib/api";

describe("catálogo provisional", () => {
  it("encuentra nombres comunes sin exigir tildes y nombres científicos", () => {
    expect(filterSpecies(demoSpecies, " coigue ").map((item) => item.common_name)).toEqual(["Coigüe", "Coigüe de Magallanes"]);
    expect(filterSpecies(demoSpecies, "CORDIFOLIA")[0].common_name).toBe("Ulmo");
    expect(filterSpecies(demoSpecies, "especie ausente")).toEqual([]);
  });
  it("no presenta la propuesta inicial como taxonomía validada", () => {
    expect(demoSpecies).toHaveLength(8);
    expect(demoSpecies.every((item) => item.taxonomic_status === "provisional" && item.provenance.status === "pending_validation")).toBe(true);
  });
});

describe("preparación de fotografía", () => {
  it("permite formatos previstos y rechaza archivos vacíos, grandes o no admitidos", () => {
    expect(validatePhoto({ type: "image/jpeg", size: 10 * 1024 * 1024 })).toBeNull();
    expect(validatePhoto({ type: "image/png", size: 1 })).toBeNull();
    expect(validatePhoto({ type: "image/webp", size: 1 })).toBeNull();
    expect(validatePhoto({ type: "image/jpeg", size: 0 })).toContain("contenido");
    expect(validatePhoto({ type: "image/jpeg", size: 10 * 1024 * 1024 + 1 })).toContain("10 MiB");
    expect(validatePhoto({ type: "image/svg+xml", size: 1 })).toContain("JPEG");
  });
});
