const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Número con coma decimal, como se escribe en Chile. */
export function formatDecimal(value: number, digits = 1): string {
  return value.toFixed(digits).replace('.', ',');
}

/** Minutos a «1 h 15 min», «45 min». */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export const t = {
  tabs: {
    identify: 'Identificar',
    map: 'Mapa',
    species: 'Especies',
    journal: 'Diario',
  },
  pending: {
    tag: 'No implementado',
    identifyTitle: 'Identificar',
    identifyHeading: 'La identificación todavía no está disponible.',
    identifyBody:
      'Aquí podrás fotografiar un árbol y recibir candidatos del catálogo, o una abstención si la foto no basta. Mientras tanto, recorre las fichas en Especies.',
    identifySteps: ['Fotografía hojas o corteza', 'Revisa candidatos o la abstención', 'Elige la especie y súmala a tu diario'],
    identifyAction: 'Ver especies',
  },
  map: {
    title: 'Entorno de Puyehue',
    mapA11y: 'Mapa interactivo de referencia del entorno de Puyehue con un sendero de demostración. La misma información está en la vista Lista.',
    loading: 'Cargando mapa base…',
    layersLabel: 'Capas del mapa',
    layerSpecies: 'Especies',
    layerTrail: 'Sendero',
    layerStops: 'Puntos de interés',
    layerA11y: (name: string, on: boolean) => `${name}: ${on ? 'visible' : 'oculta'}. Tocar para ${on ? 'ocultar' : 'mostrar'}.`,
    openList: 'Ver como lista',
    openInfo: 'Sobre este mapa',
    recenter: 'Volver al sendero',
    attribution: '© OpenStreetMap',
    attributionA11y: 'Datos del mapa © colaboradores de OpenStreetMap. Abrir la página de derechos de autor.',
    tileError: 'Parte del mapa no cargó. Revisa tu conexión; las fichas siguen disponibles.',
    failedTitle: 'El mapa no está disponible en este dispositivo.',
    failedBody: 'Puedes usar la vista Lista y consultar las fichas de especies.',
    failedAction: 'Ver como lista',
    observationsErrorBanner: 'No se pudieron cargar las observaciones. La vista Lista permite reintentar.',
  },
  trail: {
    demoTag: 'Demostración',
    syntheticNote: 'Trazado sintético: no es un sendero real ni sirve para orientarse.',
    meta: (km: string, duration: string) => `${km} km · ~${duration}`,
    metaA11y: (km: string, duration: string) => `${km} kilómetros, unos ${duration} a 3 km/h. Estimación sobre un trazado sintético.`,
    start: 'Iniciar sendero',
    startA11y: 'Iniciar el recorrido de demostración por las paradas. No usa tu ubicación.',
    walkingTag: 'Recorrido de demostración · sin GPS',
    stopOf: (n: number, total: number) => `Parada ${n} de ${total}`,
    previous: 'Parada anterior',
    next: 'Siguiente parada',
    finish: 'Salir',
    finishA11y: 'Salir del recorrido de demostración sin guardarlo',
    complete: 'Completar recorrido',
    completeA11y: 'Completar el recorrido y sumarlo al diario como dato de demostración',
    completed: 'Recorrido sumado a tu diario como dato de demostración.',
  },
  observation: {
    syntheticTag: 'Sintética',
    unverified: 'Sin verificar',
    noSpecies: 'Especie sin elegir',
    speciesLoading: 'Cargando especie…',
    speciesUnavailable: 'Especie no disponible',
    note: 'Observación sintética de demostración; no es un registro de terreno.',
    close: 'Cerrar observación',
    openSpecies: 'Ver ficha',
    noLocation: 'Sin ubicación: no aparece en el mapa',
    rowA11y: (common: string, date: string, located: boolean) =>
      `${common}, observación sintética del ${formatDate(date)}. ${located ? 'Mostrar en el mapa.' : 'Sin ubicación.'}`,
  },
  mapList: {
    title: 'Lista del mapa',
    close: 'Volver al mapa',
    trailHeading: 'Sendero de demostración',
    stopA11y: (n: number, name: string) => `Parada ${n}, ${name}. Mostrar en el mapa.`,
    observationsHeading: 'Observaciones',
    observationsLoading: 'Cargando observaciones…',
    observationsErrorTitle: 'No se pudieron cargar las observaciones.',
    observationsErrorBody: 'Revisa tu conexión e inténtalo de nuevo. El mapa base sigue disponible.',
    emptyTitle: 'Todavía no hay observaciones en el mapa.',
    emptyBody: 'Un mapa vacío no significa que falte biodiversidad: nadie ha registrado una observación aquí todavía.',
    demoBanner:
      'Observaciones y sendero sintéticos de demostración: no son registros de terreno ni indican dónde crece una especie.',
  },
  mapInfo: {
    title: 'Sobre este mapa',
    close: 'Cerrar',
    disclaimer:
      'Es un mapa de referencia: no es una guía de rutas ni garantiza la seguridad de ningún sendero. El sendero es sintético y el encuadre no es un límite oficial del parque.',
    basemap: 'Mapa base',
    basemapValue: 'OpenStreetMap, teselas raster del servicio estándar, oscurecidas en la app',
    license: 'Licencia',
    licenseValue: 'Datos ODbL; uso de teselas sujeto a la política de la OSMF',
    satellite: 'Satelital',
    satelliteValue: 'Pendiente: requiere un proveedor con licencia y clave configurada',
    framing: 'Encuadre',
    framingValue: 'Rango de coordenadas publicado por CONAF; no es un polígono oficial',
    accessed: 'Consultado',
    status: 'Estado',
    statusValue: 'Demostración · proveedor de producción pendiente',
    showFrame: 'Ver todo el entorno de Puyehue',
    copyright: 'Derechos de OpenStreetMap',
  },
  species: {
    title: 'Especies',
    loading: 'Cargando catálogo…',
    errorTitle: 'No se pudo cargar el catálogo.',
    errorBody: 'Revisa tu conexión e inténtalo de nuevo.',
    openSearch: 'Buscar especie',
    closeSearch: 'Cerrar búsqueda',
    searchPlaceholder: 'Nombre común o científico',
    searchLabel: 'Buscar especie',
    clearSearch: 'Borrar búsqueda',
    filterLabel: 'Filtrar especies',
    filterAll: 'Todas',
    filterSaved: 'Guardadas',
    demoBanner: 'Catálogo de demostración, sin conexión con la API. Fotos de referencia de Wikimedia Commons, no tomadas en Puyehue; créditos en cada ficha.',
    emptyTitle: (query: string) => `Ninguna especie coincide con «${query}».`,
    emptyHint: 'Prueba con el nombre común o con parte del nombre científico.',
    emptyFilterTitle: 'Ninguna especie en este grupo.',
    emptySavedTitle: 'Todavía no guardas especies.',
    emptySavedBody: 'Toca el marcador de una especie para tenerla a mano mientras la app está abierta.',
    showAll: 'Ver todas',
    groupTree: 'Árbol',
    open: 'Ver ficha',
    openA11y: (common: string) => `Ver ficha de ${common}`,
    save: (common: string) => `Guardar ${common}`,
    unsave: (common: string) => `Quitar ${common} de guardadas`,
    savedNote: 'Las guardadas se pierden al cerrar la app.',
    count: (shown: number, total: number) => (shown === total ? plural(total, 'especie', 'especies') : `${shown} de ${total} especies`),
    sourceFooter: (version: string, date: string) => `Catálogo ${version} · consultado ${date}`,
  },
  common: {
    retry: 'Reintentar',
  },
  status: {
    provisional: 'Provisional',
    provisionalNote: 'Estado taxonómico provisional: pendiente de validación contra una fuente taxonómica versionada.',
  },
  detail: {
    screenTitle: 'Ficha de especie',
    back: 'Volver',
    photoCaption: 'Foto de referencia, no tomada en Puyehue.',
    photoCredit: (author: string, license: string) => `${author} · ${license} · Wikimedia Commons`,
    photoSource: 'Ver fuente y licencia',
    photoA11y: (common: string) => `Fotografía de referencia de ${common}, de Wikimedia Commons. No fue tomada en Puyehue.`,
    noPhoto: 'Sin foto de referencia',
    family: (family: string) => `Familia ${family}`,
    traitsTitle: 'Rasgos para reconocerla',
    traitsDraft: 'Texto de demostración, pendiente de validación botánica.',
    leaf: 'Hoja',
    bark: 'Corteza',
    habit: 'Porte',
    whereToLook: 'Dónde mirar',
    provenanceTitle: 'Procedencia',
    source: 'Fuente',
    version: 'Versión',
    license: 'Licencia',
    accessed: 'Consultado',
    attribution: 'Atribución',
    validation: 'Validación',
    pendingValidation: 'Pendiente',
    validated: 'Validada',
    notFoundTitle: 'Esta especie no está en el catálogo.',
    notFoundAction: 'Ver todas las especies',
    errorTitle: 'No se pudo cargar esta ficha.',
    errorBody: 'Revisa tu conexión e inténtalo de nuevo.',
    inGuideTitle: 'En tu guía de campo',
    inGuideBody: (date: string) => `La sumaste el ${formatShortDate(date)}. Dato de prueba.`,
    notInGuideTitle: 'Aún no está en tu guía',
    notInGuideBody: 'Cuando Identificar esté disponible, fotografíala en terreno para sumarla.',
  },
  journal: {
    title: 'Mi diario',
    tabsLabel: 'Secciones del diario',
    tabDiscoveries: 'Descubrimientos',
    tabTrails: 'Senderos',
    tabBadges: 'Insignias',
    loading: 'Cargando el diario…',
    demoTag: 'Datos de demostración',
    demoNote: 'Las especies, recorridos e insignias del diario son datos de demostración: aún no se pueden sumar desde Identificar ni registrar recorridos.',
    statSpecies: 'Especies',
    statTrails: 'Senderos',
    statKm: 'km de senderos',
    statBadges: 'Insignias',
    statsA11y: (species: number, trails: number, km: string, badges: number) =>
      `Datos de demostración: ${plural(species, 'especie', 'especies')}, ${plural(trails, 'sendero recorrido', 'senderos recorridos')}, ${km} kilómetros de senderos, ${plural(badges, 'insignia', 'insignias')}.`,
    guideTitle: 'Guía de campo',
    guideProgress: (n: number, max: number) => `${n} de ${max} descubiertas`,
    guideProgressA11y: (n: number, max: number) => `Guía de campo: ${n} de ${max} especies descubiertas`,
    filterLabel: 'Filtrar la guía',
    collectedA11y: (common: string, date: string) => `${common}, en tu guía desde el ${formatDate(date)}. Dato de prueba. Abrir la ficha.`,
    lockedA11y: (common: string) => `${common}, aún no descubierta. Abrir la ficha.`,
    locked: 'Por descubrir',
    emptyFilter: 'Ninguna especie del catálogo en este grupo.',
    trailsTitle: 'Recorridos',
    trailsBody: 'Recorridos del sendero de demostración. La distancia es el largo del trazado, no una medición.',
    walkA11y: (date: string, km: string) => `Sendero de demostración, ${formatDate(date)}, ${km} kilómetros. Dato de prueba.`,
    trailsEmptyTitle: 'Todavía no recorres senderos.',
    trailsEmptyBody: 'Inicia el sendero de demostración desde el Mapa.',
    badgesTitle: 'Insignias',
    badgesBody: 'Se ganan con tu guía de campo y tus recorridos.',
    badgeEarned: 'Ganada',
    badgeProgress: (progress: string, goal: string) => `${progress} de ${goal}`,
    badgeA11y: (name: string, rule: string, earned: boolean, progress: string) =>
      `${name}. ${rule}. ${earned ? 'Ganada.' : `Avance: ${progress}.`}`,
    badges: {
      'first-species': { name: 'Primer hallazgo', rule: 'Suma tu primera especie' },
      'half-guide': { name: 'Media guía', rule: 'Suma la mitad del catálogo' },
      'full-guide': { name: 'Guía completa', rule: 'Suma todas las especies del catálogo' },
      'all-nothofagus': { name: 'Los Nothofagus', rule: 'Suma todos los Nothofagus del catálogo' },
      'first-walk': { name: 'Primer sendero', rule: 'Completa un recorrido' },
      'ten-km': { name: '10 km', rule: 'Recorre 10 km de senderos' },
    },
  },
};

/** Fecha ISO (AAAA-MM-DD) a formato es-CL sin depender de la zona horaria. */
export function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-');
  return `${day}-${month}-${year}`;
}

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'];

/** Fecha ISO (AAAA-MM-DD) corta, p. ej. «28 oct 2026». */
export function formatShortDate(iso: string): string {
  const [year, month, day] = iso.split('-');
  return `${Number(day)} ${MONTHS[Number(month) - 1]} ${year}`;
}
