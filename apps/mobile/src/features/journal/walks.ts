// Recorrido de demostración completado. Solo guarda qué sendero, cuándo y cuánto: la app no sigue la
// ubicación, así que la distancia es la del trazado de demostración, no la caminada. El nombre se
// guarda con el recorrido porque el sendero viene de la API y el Diario no la consulta.
export type Walk = { trailId: string; trailName: string; completedAt: string; km: number };
