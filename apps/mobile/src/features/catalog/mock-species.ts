import type { Provenance, Species, SpeciesTraits } from '@/domain/species';

// Mock local: los nombres y la procedencia copian services/api/src/bosque_api/resources/species.json.
// Los rasgos son texto de demostración sin validación botánica; se reemplazan cuando la API los entregue.
const bootstrapProvenance: Provenance = {
  sourceName: 'ProGarLabs, lista candidata del prompt de inicialización',
  sourceUrl: 'https://github.com/GiuseppePrbst/meta-global-ai-dev-hackathon-progarlabs',
  accessedAt: '2026-10-27',
  version: 'bootstrap-1',
  license: 'LicenseRef-ProGarLabs-Pending',
  attribution: 'ProGarLabs SpA, catálogo candidato 2026',
  validationOwner: 'Giuseppe Proboste (validación pendiente)',
  status: 'pending_validation',
};

const entries: [id: string, scientificName: string, commonName: string, traits: SpeciesTraits][] = [
  [
    'nothofagus-dombeyi',
    'Nothofagus dombeyi',
    'Coigüe',
    {
      family: 'Nothofagaceae',
      leaf: 'Pequeñas, ovado-lanceoladas y coriáceas, con el borde finamente aserrado.',
      bark: 'Gris oscura; en ejemplares viejos se agrieta en placas.',
      habit: 'Árbol siempreverde de gran tamaño, con la copa dispuesta en estratos.',
      whereToLook: 'Bosques húmedos templados del sur de Chile.',
    },
  ],
  [
    'eucryphia-cordifolia',
    'Eucryphia cordifolia',
    'Ulmo',
    {
      family: 'Cunoniaceae',
      leaf: 'Simples y opuestas, oblongas, de borde aserrado-ondulado y verde oscuro brillante.',
      bark: 'Gris, relativamente lisa en ejemplares jóvenes.',
      habit: 'Árbol siempreverde; flores blancas grandes y vistosas a fines del verano.',
      whereToLook: 'Bosque siempreverde de baja y media altitud.',
    },
  ],
  [
    'aextoxicon-punctatum',
    'Aextoxicon punctatum',
    'Olivillo',
    {
      family: 'Aextoxicaceae',
      leaf: 'Opuestas y de borde entero; el envés tiene escamas pardas diminutas que lo hacen ver punteado.',
      bark: 'Gris, más bien lisa.',
      habit: 'Árbol siempreverde de copa densa.',
      whereToLook: 'Bosques húmedos, a menudo cerca de la costa.',
    },
  ],
  [
    'weinmannia-trichosperma',
    'Weinmannia trichosperma',
    'Tineo',
    {
      family: 'Cunoniaceae',
      leaf: 'Compuestas: foliolos pequeños y aserrados, en pares a lo largo de un eje alado.',
      bark: 'Gris parda y delgada.',
      habit: 'Árbol siempreverde; los frutos jóvenes tiñen la copa de rojizo.',
      whereToLook: 'Bosque siempreverde húmedo.',
    },
  ],
  [
    'laureliopsis-philippiana',
    'Laureliopsis philippiana',
    'Tepa',
    {
      family: 'Atherospermataceae',
      leaf: 'Opuestas, elípticas y de borde aserrado; aromáticas al estrujarlas.',
      bark: 'Gris parda.',
      habit: 'Árbol siempreverde de tronco recto, tolerante a la sombra.',
      whereToLook: 'Sotobosque y dosel de bosques húmedos y sombríos.',
    },
  ],
  [
    'podocarpus-nubigenus',
    'Podocarpus nubigenus',
    'Mañío',
    {
      family: 'Podocarpaceae',
      leaf: 'Lineares, rígidas y de punta aguda; el envés muestra dos bandas claras.',
      bark: 'Pardo rojiza; se desprende en láminas delgadas.',
      habit: 'Conífera siempreverde.',
      whereToLook: 'Bosques muy húmedos, a veces en suelos mal drenados.',
    },
  ],
  [
    'nothofagus-betuloides',
    'Nothofagus betuloides',
    'Coigüe de Magallanes',
    {
      family: 'Nothofagaceae',
      leaf: 'Muy pequeñas y ovadas, de borde crenado-aserrado, algo pegajosas.',
      bark: 'Gris oscura, agrietada con la edad.',
      habit: 'Árbol siempreverde.',
      whereToLook: 'Bosques fríos y húmedos, más frecuente hacia el sur.',
    },
  ],
  [
    'nothofagus-pumilio',
    'Nothofagus pumilio',
    'Lenga',
    {
      family: 'Nothofagaceae',
      leaf: 'Elípticas, con el borde en lóbulos redondeados que se agrupan de a dos.',
      bark: 'Gris oscura; se agrieta en ejemplares maduros.',
      habit: 'Árbol caducifolio; el follaje se vuelve rojo y amarillo en otoño.',
      whereToLook: 'Zonas altas y frías, hasta el límite de la vegetación arbórea.',
    },
  ],
];

export const mockSpecies: Species[] = entries.map(([id, scientificName, commonName, traits]) => ({
  id,
  scientificName,
  commonName,
  taxonomicStatus: 'provisional',
  provenance: bootstrapProvenance,
  traits,
}));

export function getMockSpecies(id: string): Species | undefined {
  return mockSpecies.find((species) => species.id === id);
}

/** Número de pliego: posición estable en el catálogo, solo para orientarse. */
export function sheetNumber(id: string): string {
  const index = mockSpecies.findIndex((species) => species.id === id);
  return String(index + 1).padStart(2, '0');
}

function fold(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('es-CL');
}

export function filterSpecies(species: Species[], query: string): Species[] {
  const term = fold(query.trim());
  if (!term) return species;
  return species.filter((item) => fold(`${item.commonName} ${item.scientificName}`).includes(term));
}
