export const t = {
  species: {
    title: 'Especies',
    count: (n: number) => `${n} ${n === 1 ? 'especie' : 'especies'} · piloto Puyehue`,
    searchPlaceholder: 'Buscar por nombre común o científico',
    searchLabel: 'Buscar especie',
    clearSearch: 'Borrar búsqueda',
    demoBanner: 'Datos de demostración. Catálogo local de ejemplo, todavía sin conexión con la API.',
    emptyTitle: (query: string) => `Ningún pliego coincide con «${query}».`,
    emptyHint: 'Prueba con el nombre común o con parte del nombre científico.',
    rowA11y: (common: string, scientific: string) => `${common}, ${scientific}, provisional. Abrir ficha.`,
    sheet: (n: string) => `N.º ${n}`,
    sourceFooter: (version: string, date: string) => `Catálogo ${version} · consultado ${date}`,
  },
  status: {
    provisional: 'Provisional',
    provisionalNote: 'Estado taxonómico provisional: pendiente de validación contra una fuente taxonómica versionada.',
  },
  detail: {
    screenTitle: 'Ficha de especie',
    back: 'Volver a la lista de especies',
    plateCaption: (n: string) => `Lám. ${n} · Ilustración conceptual, no es una fotografía`,
    lensHint: 'Mantén presionada la lámina y desliza para mirar el borde con lupa.',
    plateA11y: (common: string) => `Ilustración conceptual de la hoja de ${common}. No es una fotografía.`,
    family: (family: string) => `Familia ${family}`,
    traitsTitle: 'Rasgos para reconocerla',
    traitsDraft: 'Texto de demostración, pendiente de validación botánica.',
    leaf: 'Hoja',
    bark: 'Corteza',
    habit: 'Porte',
    whereToLook: 'Dónde mirar',
    provenanceTitle: 'Procedencia',
    labelHeading: 'Bosque Vivo Chile · Catálogo de especies',
    source: 'Fuente',
    version: 'Versión',
    license: 'Licencia',
    accessed: 'Consultado',
    attribution: 'Atribución',
    validation: 'Validación',
    pendingValidation: 'Pendiente',
    notFoundTitle: 'Esta especie no está en el catálogo.',
    notFoundAction: 'Ver todas las especies',
  },
};

/** Fecha ISO (AAAA-MM-DD) a formato es-CL sin depender de la zona horaria. */
export function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-');
  return `${day}-${month}-${year}`;
}
