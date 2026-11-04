// DEMO de Identificar: rasgos con los que Wilo conversa tras la foto (ver wilo-chat.ts). Texto de
// demostración sin validación botánica ni micológica; no es la ficha de la especie, que viene de la API
// (GET /species). Se elimina cuando Identificar y Wilo usen POST /identify y POST /guide/query.
//
// Los hongos no están en el catálogo de la API, así que hoy Identificar no llega a mostrarlos; su
// texto se conserva para cuando el catálogo los incluya. Rasgos de hongos resumidos de Wikipedia en
// español (CC BY-SA 4.0), consulta 02-11-2026.

export type TreeTraits = {
  leaf: string;
  bark: string;
  habit: string;
  whereToLook: string;
};

export type FungusTraits = {
  /** Seta o cuerpo fructífero: forma, color, superficie. */
  fruitingBody: string;
  /** Dónde y sobre qué crece: suelo, madera, ramas vivas, asociaciones. */
  substrate: string;
  /** Temporada. Sin consumo ni comestibilidad: Bosque Vivo nunca los ofrece (regla del backend). */
  habit: string;
  whereToLook: string;
};

export type DemoTraits = { group: 'tree'; traits: TreeTraits } | { group: 'fungus'; traits: FungusTraits };

const trees: Record<string, TreeTraits> = {
  'nothofagus-dombeyi': {
    leaf: 'Pequeñas, ovado-lanceoladas y coriáceas, con el borde finamente aserrado.',
    bark: 'Gris oscura; en ejemplares viejos se agrieta en placas.',
    habit: 'Árbol siempreverde de gran tamaño, con la copa dispuesta en estratos.',
    whereToLook: 'Bosques húmedos templados del sur de Chile.',
  },
  'eucryphia-cordifolia': {
    leaf: 'Simples y opuestas, oblongas, de borde aserrado-ondulado y verde oscuro brillante.',
    bark: 'Gris, relativamente lisa en ejemplares jóvenes.',
    habit: 'Árbol siempreverde; flores blancas grandes y vistosas a fines del verano.',
    whereToLook: 'Bosque siempreverde de baja y media altitud.',
  },
  'aextoxicon-punctatum': {
    leaf: 'Opuestas y de borde entero; el envés tiene escamas pardas diminutas que lo hacen ver punteado.',
    bark: 'Gris, más bien lisa.',
    habit: 'Árbol siempreverde de copa densa.',
    whereToLook: 'Bosques húmedos, a menudo cerca de la costa.',
  },
  'weinmannia-trichosperma': {
    leaf: 'Compuestas: foliolos pequeños y aserrados, en pares a lo largo de un eje alado.',
    bark: 'Gris parda y delgada.',
    habit: 'Árbol siempreverde; los frutos jóvenes tiñen la copa de rojizo.',
    whereToLook: 'Bosque siempreverde húmedo.',
  },
  'laureliopsis-philippiana': {
    leaf: 'Opuestas, elípticas y de borde aserrado; aromáticas al estrujarlas.',
    bark: 'Gris parda.',
    habit: 'Árbol siempreverde de tronco recto, tolerante a la sombra.',
    whereToLook: 'Sotobosque y dosel de bosques húmedos y sombríos.',
  },
  'podocarpus-nubigenus': {
    leaf: 'Lineares, rígidas y de punta aguda; el envés muestra dos bandas claras.',
    bark: 'Pardo rojiza; se desprende en láminas delgadas.',
    habit: 'Conífera siempreverde.',
    whereToLook: 'Bosques muy húmedos, a veces en suelos mal drenados.',
  },
  'nothofagus-betuloides': {
    leaf: 'Muy pequeñas y ovadas, de borde crenado-aserrado, algo pegajosas.',
    bark: 'Gris oscura, agrietada con la edad.',
    habit: 'Árbol siempreverde.',
    whereToLook: 'Bosques fríos y húmedos, más frecuente hacia el sur.',
  },
  'nothofagus-pumilio': {
    leaf: 'Elípticas, con el borde en lóbulos redondeados que se agrupan de a dos.',
    bark: 'Gris oscura; se agrieta en ejemplares maduros.',
    habit: 'Árbol caducifolio; el follaje se vuelve rojo y amarillo en otoño.',
    whereToLook: 'Zonas altas y frías, hasta el límite de la vegetación arbórea.',
  },
};

const fungi: Record<string, FungusTraits> = {
  'cyttaria-espinosae': {
    fruitingBody: 'Globoso, blanco a anaranjado y pegajoso; al madurar se abren hoyuelos anaranjados que le dan aspecto de panal.',
    substrate: 'Parásito de ramas de Nothofagus, sobre todo del roble (N. obliqua): brota de las agallas que forma en ellas.',
    habit: 'Brota en primavera y a comienzos del verano.',
    whereToLook: 'Bosques con roble del centro-sur de Chile; busca ramas con agallas.',
  },
  'butyriboletus-loyo': {
    fruitingBody: 'Sombrero rojo oscuro de 6 a 35 cm; debajo, poros amarillos que se vuelven azules al magullarse. Pie amarillo con la base rojiza.',
    substrate: 'Crece en el suelo, solo o en grupos pequeños, asociado a las raíces de Nothofagus (micorriza).',
    habit: 'Escaso; fructifica desde fines del verano hasta el otoño.',
    whereToLook: 'Suelo de bosques nativos del sur de Chile, entre la hojarasca.',
  },
};

/** Rasgos de demostración de una especie, si los hay. */
export function getDemoTraits(speciesId: string): DemoTraits | undefined {
  if (trees[speciesId]) return { group: 'tree', traits: trees[speciesId] };
  if (fungi[speciesId]) return { group: 'fungus', traits: fungi[speciesId] };
  return undefined;
}
