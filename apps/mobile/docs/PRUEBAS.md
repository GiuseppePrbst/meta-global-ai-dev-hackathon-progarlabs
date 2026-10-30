# Estrategia de pruebas

Versión 27-10-2026. Las pruebas verifican comportamiento del software, no exactitud científica. Registrar comandos y resultados reales; lo que requiera infraestructura ausente se marca **no ejecutado**.

## Niveles

| Nivel | Herramienta | Qué cubre | Dónde corre |
| --- | --- | --- | --- |
| Estático | ESLint, TypeScript estricto | Lint y tipos | CI |
| Contrato | Regeneración de `openapi.json` y `schema.gen.ts` + `git diff --exit-code` | Que la app y la API declaran el mismo contrato | CI |
| Unitarias | Jest (`jest-expo`) | Mapeo API → dominio, normalización de errores (texto y listas de Pydantic), reglas de estado (mock, abstención, provisional), borradores | CI |
| Componentes | React Native Testing Library | Estados de carga/vacío/error, confirmaciones, etiquetas accesibles, banner de modo demostración | CI |
| Imagen | Jest con fixture sintético que contiene EXIF y GPS | Que la recodificación elimina metadatos y respeta 10 MiB | CI si el módulo puede simularse; si no, prueba manual en dispositivo registrada |
| Recorridos | Maestro | Descubrimiento, Catálogo sin red, Registro, Atlas 2D | Manual/local en Android físico; **no se ejecuta en CI** |
| Spike 3D | Manual | Fluidez del terreno 3D en Android de gama media | Una vez, el 28-oct, con resultado registrado |

Los servicios externos se simulan en la capa `api/` durante las pruebas; ninguna prueba llama a Meta ni a proveedores de teselas. Todo fixture es sintético y se rotula como tal; no se usan fotos de terceros ni coordenadas reales de individuos.

## Casos mínimos

- Mock: `provider: mock` muestra «Modo demostración» y nunca candidatos.
- Abstención: sugiere otra toma y no se muestra como error.
- Errores 413/415/422/501/503 y sin red: cada uno con su mensaje; ninguno se convierte en identificación.
- Sin confirmación de mayoría de edad no se puede identificar; sin confirmación de derechos no se envía la foto.
- Un candidato no fija la especie de la observación sin acción de la persona.
- Ubicación apagada por defecto; la observación sin ubicación se envía sin `location`.
- Coordenadas enviadas en orden `[longitud, latitud]`.
- El catálogo en caché se muestra sin red con su fecha.
- El mapa vacío muestra un estado vacío y la lista textual equivalente.

## Cambios de contrato

Un cambio de contrato se prueba en ambos extremos: pruebas de la API en `services/api` y regeneración de tipos más pruebas de mapeo en la app, en el mismo PR o en PRs enlazados.

## Registro de ejecución

| Fecha | Comando / prueba | Resultado | Notas |
| --- | --- | --- | --- |
| 28-10-2026 | `npm run typecheck` | Pasa | Sin errores. |
| 28-10-2026 | `npm run lint` | Pasa con avisos | 0 errores, 4 avisos `react-hooks/exhaustive-deps` en `src/map/atlas-map.tsx` (efectos del mapa que corren una sola vez a propósito; pendiente revisarlos). |
| 28-10-2026 | `npm test` | Pasa | 7 pruebas en `src/features/catalog/catalog.test.ts` (búsqueda sin tildes ni mayúsculas, número de pliego) con especies sintéticas. |
| — | Componentes, recorridos Maestro, Android físico | No ejecutado | React Native Testing Library aún no está instalado; los estados de carga y error no se han visto en pantalla porque los mocks nunca cargan ni fallan. |
