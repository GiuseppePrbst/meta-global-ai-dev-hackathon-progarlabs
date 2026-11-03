// Recorrido completado del sendero de demostración. Solo guarda qué sendero, cuándo y cuánto: la app
// no sigue la ubicación, así que la distancia es la del trazado, no la caminada.
export type Walk = { trailId: string; completedAt: string; km: number };
