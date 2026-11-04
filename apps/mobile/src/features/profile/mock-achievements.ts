// Mock local de PRUEBA: un logro para ver cómo luce en el historial del perfil. No sale de una regla
// real de la app (a diferencia de las insignias, que se derivan del diario); la fila lo rotula como
// prueba. Se elimina cuando existan logros de verdad.

export type Achievement = { id: string; date: string; name: string; rule: string };

export const mockAchievements: Achievement[] = [
  { id: 'forest-walker', date: '2026-11-01', name: 'Caminante del bosque', rule: 'Completa 2 senderos' },
];
