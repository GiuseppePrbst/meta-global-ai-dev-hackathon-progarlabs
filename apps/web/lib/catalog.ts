export type Species = {
  id: string;
  scientific_name: string;
  common_name: string;
  taxonomic_status: string;
  provenance: { source_name: string; source_url: string; license: string; status: string };
};

// shortcut: propuesta del usuario sin validación taxonómica, sustituir por catálogo curado al validar M01.
export const demoSpecies: Species[] = [
  ["nothofagus-dombeyi", "Nothofagus dombeyi", "Coigüe"],
  ["eucryphia-cordifolia", "Eucryphia cordifolia", "Ulmo"],
  ["aextoxicon-punctatum", "Aextoxicon punctatum", "Olivillo"],
  ["weinmannia-trichosperma", "Weinmannia trichosperma", "Tineo"],
  ["laureliopsis-philippiana", "Laureliopsis philippiana", "Tepa"],
  ["podocarpus-nubigenus", "Podocarpus nubigenus", "Mañío"],
  ["nothofagus-betuloides", "Nothofagus betuloides", "Coigüe de Magallanes"],
  ["nothofagus-pumilio", "Nothofagus pumilio", "Lenga"],
].map(([id, scientific_name, common_name]) => ({
  id,
  scientific_name,
  common_name,
  taxonomic_status: "provisional",
  provenance: {
    source_name: "ProGarLabs, lista candidata del prompt de inicialización",
    source_url: "https://github.com/GiuseppePrbst/meta-global-ai-dev-hackathon-progarlabs",
    license: "LicenseRef-ProGarLabs-Pending",
    status: "pending_validation",
  },
}));

export function filterSpecies(species: Species[], query: string): Species[] {
  const term = query.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es");
  return species.filter((item) => `${item.common_name} ${item.scientific_name}`
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es").includes(term));
}
