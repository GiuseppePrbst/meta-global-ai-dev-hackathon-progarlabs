# Expediciones y capturas privadas

Incremento del 29-10-2026. `observations` es la única fuente de verdad del hallazgo.
Migración 004 añade identificación, expedición, fecha observada, clave idempotente, hash
de petición y estado espacial a esa tabla. `identifications` conserva la respuesta tipada
del servidor, propietario y fecha; nunca fotografías, máscaras o rutas de archivos.
No se agrega otro servicio ni una tabla de hallazgos duplicada.

## Flujo

1. Obtener la expedición `puyehue`. Es una referencia educativa, sin rutas verificadas,
   navegación a individuos ni acceso vigente confirmado. Las ocho especies son de interés,
   no una afirmación de presencia. La finalización educativa requiere un registro personal.
2. Identificar con credencial individual en modo demo (mock permitido). El servidor guarda
   el resultado y devuelve `identification_id`. En local mock, Bearer individual también
   habilita este flujo; la identificación local anónima conserva el contrato anterior y
   devuelve ID nulo. Meta local con token compartido no produce evidencia personal reutilizable.
3. Enviar `/captures/attempts` con ese ID, `observed_at` ISO con zona horaria, expedición y
   clave idempotente. `species_id` es opcional y debe pertenecer a los candidatos de esa
   identificación. Omitirlo registra sin taxón. El mock nunca respalda un taxón.
4. Consultar `/captures/me`, colección paginada y totales completos por propietario.
   Cada `capture_id` coincide con `observation_id`; no crear además una observación desde UI.

`capture_status: registered` indica registro sin selección taxonómica;
`identification_suggested` indica candidato seleccionado, siempre `unverified`.
No existe ruta/campo de entrada para convertirlo a `verified`; el procedimiento independiente
de revisión científica queda pendiente. No hay puntos competitivos ni ranking global.

## Ubicación y duplicados

Point WGS84 usa `[longitud, latitud]`, opcional. Al enviarlo se exige `location_consent`.
`accuracy_m` es opcional, finito, 0–200 m y requiere ubicación; >50 m añade una advertencia,
sin inferir fraude ni certeza GPS. Ausencia de coordenadas es un registro válido.
No se guardan EXIF, referencias públicas de imagen ni coordenadas en ledger/logs.

Con ubicación, PostGIS comprueba `ST_Covers` sobre la referencia BCN 2826, capa
`bcn_snaspe_pilot`, hash `44dfa8b84b707d7301b93dcb5b69fc79d2bf003a2909bede8cad7302a850d7ea`.
Hash/capa ausentes dan `not_checked`; borde se incluye; exterior da `outside_reference`.
No se descarta el hallazgo ni se modifica su taxón. La referencia no verifica acceso legal
actual ni geolocalización del individuo visible. No se inventó un límite nuevo de Puyehue.

Se serializa por propietario con advisory lock y hay índices únicos por propietario/clave
y propietario/identificación. Petición idéntica (excepto clave) devuelve 200 y el registro
existente; una clave/identificación repetida con contenido diferente devuelve 409.
Los IDs propios expirados no resurgen por reintentos (410). El hash incluye los campos
normalizados Pydantic; conservar el mismo `observed_at` y cuerpo al reintentar.
Este control evita duplicados de la misma identificación; no detecta fotos repetidas en
intentos distintos ni certifica presencia física. No se envía la foto nuevamente a Meta.

## Privacidad, retención y eliminación

Capturas y evidencia son privadas para su propietario en ambos modos. IDs ajenos o ausentes
devuelven el mismo 404. Todas las especies reciben esta protección, aunque su conservación
esté pendiente; no existe feed público ni generalización de coordenadas públicas.
La ruta local heredada `/observations` oculta registros con dueño. Una captura expira en su
vista cuando su fecha de creación o la de la evidencia supera `OBSERVATION_RETENTION_DAYS`
(30 por defecto). La vista heredada de observaciones mantiene su retención por creación.

DELETE `/captures/{id}` elimina observación y evidencia; DELETE `/observations/{id}` hace
lo mismo si es una captura. DELETE `/identifications/{id}` borra evidencia propia y cualquier
captura vinculada. DELETE no comparte datos ni envía contenido a Meta. Ledger técnico se
conserva sin fotos, transcripciones ni coordenadas. No hay cascadas sobre datos de otro dueño.

Purga física explícita, con configuración backend privada y mantenimiento autorizado:

```powershell
uv run --project services/api --frozen python -c "from bosque_api.config import Settings; from bosque_api.capture_store import CaptureStore; c=Settings(); print(CaptureStore(c.database_url.get_secret_value(),c.observation_retention_days).purge_expired())"
```

Ejecutar también la purga de observaciones descrita en el README de API. No se instaló un
scheduler. Rollback 004 bloquea pérdida de evidencia/capturas y operaciones nuevas del ledger;
requiere archivado/revisión antes de ejecutarse. Ninguna migración se aplicó a la base demo real
en esta misión: las pruebas usan esquemas temporales de la base de pruebas existente.
