import type { FungusTraits, Provenance, Species, TreeTraits } from '@/domain/species';

// Mock local. Árboles: los nombres y la procedencia copian services/api/src/bosque_api/resources/species.json.
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

const trees: [id: string, scientificName: string, commonName: string, traits: TreeTraits][] = [
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

// Hongos: solo existen en este mock móvil, todavía no en la API (services/api). Nombres aceptados y
// familia según GBIF Backbone Taxonomy; rasgos resumidos de Wikipedia en español. Sin validación micológica.
const fungusProvenance = (gbifId: number): Provenance => ({
  sourceName: 'GBIF Backbone Taxonomy (nombre y familia); Wikipedia en español (rasgos)',
  sourceUrl: `https://www.gbif.org/species/${gbifId}`,
  accessedAt: '2026-11-02',
  version: 'mobile-fungi-1',
  license: 'CC BY 4.0 (GBIF) · CC BY-SA 4.0 (Wikipedia)',
  attribution: 'GBIF Secretariat, GBIF Backbone Taxonomy; colaboradores de Wikipedia',
  validationOwner: 'Sin responsable asignado (validación micológica pendiente)',
  status: 'pending_validation',
});

const fungi: [id: string, scientificName: string, commonName: string, gbifId: number, traits: FungusTraits][] = [
  [
    'cyttaria-espinosae',
    'Cyttaria espinosae',
    'Digüeñe',
    2580236,
    {
      family: 'Cyttariaceae',
      fruitingBody: 'Globoso, blanco a anaranjado y pegajoso; al madurar se abren hoyuelos anaranjados que le dan aspecto de panal.',
      substrate: 'Parásito de ramas de Nothofagus, sobre todo del roble (N. obliqua): brota de las agallas que forma en ellas.',
      habit: 'Hongo comestible; brota en primavera y a comienzos del verano.',
      whereToLook: 'Bosques con roble del centro-sur de Chile; busca ramas con agallas.',
    },
  ],
  [
    'butyriboletus-loyo',
    'Butyriboletus loyo',
    'Loyo',
    7919198,
    {
      family: 'Boletaceae',
      fruitingBody: 'Sombrero rojo oscuro de 6 a 35 cm; debajo, poros amarillos que se vuelven azules al magullarse. Pie amarillo con la base rojiza.',
      substrate: 'Crece en el suelo, solo o en grupos pequeños, asociado a las raíces de Nothofagus (micorriza).',
      habit: 'Hongo comestible y escaso; fructifica desde fines del verano hasta el otoño.',
      whereToLook: 'Suelo de bosques nativos del sur de Chile, entre la hojarasca.',
    },
  ],
];

export const mockSpecies: Species[] = [
  ...trees.map(([id, scientificName, commonName, traits]): Species => ({
    id,
    scientificName,
    commonName,
    taxonomicStatus: 'provisional',
    provenance: bootstrapProvenance,
    group: 'tree',
    traits,
  })),
  ...fungi.map(([id, scientificName, commonName, gbifId, traits]): Species => ({
    id,
    scientificName,
    commonName,
    taxonomicStatus: 'provisional',
    provenance: fungusProvenance(gbifId),
    group: 'fungus',
    traits,
  })),
];
