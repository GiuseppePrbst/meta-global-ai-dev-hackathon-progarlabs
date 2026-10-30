# Arquitectura de la app móvil

Versión 27-10-2026. Las versiones exactas de Expo SDK y librerías están **por verificar** al crear el proyecto y se fijarán en el lockfile; no se citan de memoria.

## Stack

| Área | Elección | Motivo |
| --- | --- | --- |
| Base | Expo con dev client (prebuild), TypeScript estricto | Ruta recomendada por React Native; permite módulos nativos. Expo Go no sirve por los módulos nativos. |
| Plataformas | Android (referencia de pruebas y demo) e iOS (simulador) | Ver [distribución](DISTRIBUCION.md). |
| Navegación | expo-router | Rutas por archivo; pestañas y pila de fichas. |
| Datos remotos | TanStack Query con persistencia | Caché del catálogo y tolerancia a desconexión. |
| Datos locales | expo-sqlite | Borradores e IDs de observaciones enviadas; base para la futura cola de sincronización. |
| Preferencias | Almacenamiento clave-valor local | Confirmación de mayoría de edad, vista 2D/3D. |
| Imagen | expo-camera / expo-image-picker / expo-image-manipulator | Captura, galería y recodificación a JPEG sin EXIF. |
| Ubicación | expo-location, solo primer plano | Ubicación opcional por observación. |
| Mapa | MapLibre GL JS en un Expo DOM component | Única forma de tener 2D y 3D con el mismo motor abierto ([ADR 0002](adr/0002-atlas-con-maplibre-gl-js-en-dom-component.md)). |
| Contratos | `openapi-typescript` sobre el OpenAPI de FastAPI | Los contratos son una propuesta; un cambio se absorbe en `src/api/`. |
| Textos | Catálogo i18n, solo `es-CL` | Strings externalizados desde el inicio. |
| Pruebas | Jest (`jest-expo`) + React Native Testing Library; Maestro manual | Ver [pruebas](PRUEBAS.md). |

No se usa telemetría ni crash reporting de terceros en el MVP. Los logs existen solo en desarrollo y nunca incluyen imágenes, coordenadas, notas ni cuerpos de respuesta. Se reconsidera antes de un despliegue público.

## Estructura propuesta

```text
apps/mobile/
├── src/
│   ├── app/                  # rutas expo-router (nombres en inglés)
│   │   ├── _layout.tsx
│   │   ├── (tabs)/
│   │   │   ├── _layout.tsx
│   │   │   ├── identify.tsx
│   │   │   ├── species/index.tsx
│   │   │   ├── atlas.tsx
│   │   │   └── observations.tsx
│   │   ├── species/[id].tsx  # ficha de especie
│   │   ├── about.tsx
│   │   └── settings.tsx
│   ├── api/                  # cliente HTTP, schema.gen.ts, mapeo a dominio, errores
│   ├── domain/               # tipos del glosario: Species, Identification, Observation…
│   ├── features/             # identification, catalog, observations, atlas; species-art compartido
│   ├── storage/              # SQLite de borradores y preferencias
│   ├── map/                  # DOM component MapLibre GL JS y su puente de props
│   ├── ui/                   # librería de diseño: tokens/, art/, components/, hooks/ e index.ts
│   └── i18n/es-CL.ts
├── assets/
├── docs/
├── app.json                  # pasa a app.config.ts si se necesita configuración dinámica
└── eas.json
```

## Convenciones de nombres

**Todo nombre en el código va en inglés; todo texto visible para la persona va en español (`es-CL`).**

- **Rutas** (archivos y carpetas de `src/app/`) en inglés y `kebab-case`: `identify.tsx`, `species/[id].tsx`, `settings.tsx`. Las URLs y deep links (`bosquevivo://species/...`) heredan esos nombres. Los parámetros dinámicos también van en inglés (`[id]`, no `[especie]`).
- **Componentes y vistas** en inglés y `PascalCase`: `SpeciesDetailScreen`, `IdentifyScreen`, `StatusBanner`. Los archivos de componentes, hooks y utilidades fuera de `src/app/` van en `kebab-case` (`status-banner.tsx`, `use-species.ts`).
- **Carpetas, tipos, funciones, variables, hooks, claves de i18n, tablas y columnas de SQLite** en inglés.
- **Textos de la interfaz** (títulos de pestañas, encabezados, botones, mensajes, etiquetas de accesibilidad) en español, siempre desde el catálogo `src/i18n/es-CL.ts`; nunca se derivan del nombre de la ruta o del componente.
- La documentación y los mensajes de commit siguen en español; los identificadores citados en ella se escriben tal como están en el código.
- La traducción de cada término del dominio está en el [glosario](GLOSSARY.md) (línea _En código_). Si un término nuevo no está, se agrega ahí antes de usarlo en el código.

| Concepto (glosario) | En código |
| --- | --- |
| Especie / Catálogo | `Species` / `catalog` |
| Ficha de especie | `SpeciesDetailScreen`, ruta `species/[id]` |
| Identificación / Candidato / Abstención | `Identification` / `Candidate` / `Abstention` |
| Borrador de observación / Observación | `ObservationDraft` / `Observation` |
| Elevación del terreno / Altura de copa | `TerrainElevation` / `CanopyHeight` |
| Confirmación de mayoría de edad / de derechos | `AgeConfirmation` / `RightsConfirmation` |
| Acerca de / Ajustes | ruta `about` / ruta `settings` |

`apps/mobile` se agrega a los workspaces npm de la raíz con scripts propios (`lint`, `typecheck`, `test`). No se crea un paquete compartido con la web: OpenAPI sigue siendo el contrato.

**Estado (27-10-2026, scaffold):** creado con `create-expo-app` (Expo SDK 58, React Native 0.88, React 19.3.0) y su propio `package-lock.json`, **fuera** de los workspaces de la raíz. Motivo: la web fija React 19.3.1 y React Native exige la versión exacta de React que trae su renderer; en un workspace compartido se arriesga una copia duplicada de React. Pendiente decidir si se alinean versiones o se mantiene separado.

**Estado (27-10-2026, Atlas 2D y navegación):**

- Navegación de cuatro pestañas con las pestañas sin estilo de `expo-router/ui` (`Tabs`, `TabList`, `TabTrigger`) y una barra Material 3 propia (`src/ui/components/navigation-bar.tsx`). Las rutas viven en `src/app/(tabs)/` (`identify`, `species`, `atlas`, `observations`); la ficha `species/[id]` queda fuera del grupo para cubrir la barra. Identificar y Registro muestran el estado «No implementado» hasta que existan.
- Atlas 2D en `src/map/atlas-map.tsx` (DOM component con `@expo/dom-webview`, ver ADR 0002). **MapLibre GL JS 5.24.0**, no la 6.x que usa la web: la 6.x solo publica ESM y carga su worker como archivo aparte (`maplibre-gl-worker.mjs`, resuelto con `import.meta.url`), que Metro no empaqueta ni sirve dentro del WebView; la 5.x trae el worker embebido en su build UMD. Revisar al subir de versión.
- Mapa base: teselas raster del servicio estándar de OpenStreetMap, el mismo que la web, solo para la demo; la política de teselas de la OSMF no admite uso intensivo y el proveedor de producción sigue pendiente ([DATASET_LICENSES.md](../../../docs/DATASET_LICENSES.md)). La atribución es visible sobre el mapa y enlaza a la página de copyright. Las teselas se tiñen con propiedades `raster-*` de MapLibre (solo render).
- El encuadre inicial es el mismo rango de coordenadas CONAF que usa la web ([SOURCES.md](../../../docs/SOURCES.md)); no se dibuja como límite.
- Observaciones **sintéticas** de demostración (`src/features/atlas/mock-observations.ts`) hasta conectar `GET /observations`: coordenadas elegidas a mano dentro del encuadre CONAF, no son registros de terreno ni indican presencia de especies. El chip del mapa, cada fila de la lista, la tarjeta de la observación y el banner las rotulan «sintética»; los puntos son círculos abiertos (sin verificar). Una observación sin ubicación aparece solo en la lista. El DOM component recibe los puntos y la selección como props y devuelve el punto tocado (`onSelect`). Los puntos son marcadores HTML de MapLibre y no una fuente GeoJSON: con una fuente GeoJSON el mapa no llegaba a `load` en el WebView de Android, probablemente porque esa fuente depende del Web Worker de MapLibre (hipótesis no confirmada). Revisar antes de dibujar muchas observaciones o capas vectoriales.
- En web con `output: "server"`, el DOM component se monta solo en el cliente (necesita `window`).

**Estado (28-10-2026, librería de diseño y estados de datos):**

- `src/ui/` es la librería de diseño de la app, sin paquete aparte: `tokens/` (color, tipografía, espaciado, elevación, movimiento), `art/` (acuarela y tinta generadas en código), `components/` (primitivas accesibles) y `hooks/`. Pantallas y features importan desde `@/ui`; dentro de `ui/` se importa por ruta directa. `ui/` no importa `features/` ni `i18n`: los textos llegan por props. El DOM component del mapa importa solo `@/ui/art/brush`, porque el índice carga React Native.
- Los patrones repetidos en las features pasaron a `ui/components/`: `ListItem`, `TextButton`, `Divider`, `Chip`, `SearchField` y `LoadingState`, más la variante tipográfica `overline` (versalitas).
- `LeafPlate` y `speciesWash` viven en `src/features/species-art/` porque los usan el catálogo, el Atlas e Identificar; ninguna feature importa el interior de otra. Los hooks de datos de una feature (p. ej. `useSpecies` de `catalog/`) sí se usan desde otras: son su interfaz pública hasta que pasen a `src/api/`.
- `QueryResult` incluye `refetch`, igual que TanStack Query. Las pantallas distinguen la carga y el error de una lista vacía: el catálogo, la lista del Atlas y la ficha muestran «Cargando…» o un error con «Reintentar»; el mapa no dice «0 observaciones» mientras cargan o si fallaron. Con los mocks actuales esos estados no se ven; quedan listos para la API.
- ESLint (`eslint-config-expo`, `eslint.config.js`) y Jest (`jest-expo`) instalados con `expo install`; los resultados están en [pruebas](PRUEBAS.md).

## Capas y reglas

1. **`src/api/`** es el único lugar que conoce el JSON de la API. Expone funciones que devuelven tipos de `src/domain/` o un error tipado. La UI nunca importa `schema.gen.ts`.
2. **`src/domain/`** usa el lenguaje del [glosario](GLOSSARY.md), con los nombres en inglés de su línea _En código_. Un Candidato nunca se convierte por sí solo en la especie de una Observación: la persona la elige.
3. **`src/map/`** recibe datos ya resueltos como props serializables y devuelve eventos (p. ej. observación seleccionada). No hace peticiones HTTP propias, para evitar CORS dentro del WebView y no duplicar el cliente.
4. **Credenciales**: la capa `api/` reserva un punto para inyectar credenciales cuando BV-09 defina la autenticación. Ninguna clave de Meta ni de proveedor privado existe en la app; las variables `EXPO_PUBLIC_*` son públicas.

## Estados visibles

Cada vista distingue estos estados, con texto y no solo con color:

| Estado | Origen | Presentación |
| --- | --- | --- |
| Provisional | `taxonomic_status: provisional` | Etiqueta en ficha y lista. |
| Modo demostración | `provider: mock` en una identificación | Banner: imagen recibida sin inferencia; no hay evidencia de IA. |
| Abstención | `status: insufficient_evidence` | Sugerir otra toma; no se muestra como error. |
| Estimado | Altura de copa CHMv2 | Rótulo «estimada», unidad en metros, fuente y fecha; factor de exageración vertical si existe. |
| No configurado | 503 por falta de configuración, fuente `not_configured` | Explica qué falta; no simula datos. |
| No implementado | 501 | Explica que la capacidad está pendiente. |
| Sin conexión | Error de red | Muestra caché con su fecha o pide conexión; nunca se convierte en abstención. |
| Datos en caché | Catálogo persistido | Fecha de la última actualización. |

## Manejo de errores HTTP

| Respuesta | Interpretación en la app |
| --- | --- |
| 413 | La imagen supera 10 MiB tras recodificar: reducir y reintentar (no debería ocurrir). |
| 415 | Formato o contenido no coincide: mensaje sobre el formato. |
| 422 | Validación: confirmaciones faltantes, imagen inválida, `species_id` fuera del catálogo o geometría inválida. El cuerpo puede ser un texto (`HTTPException`) o una lista de errores de Pydantic; la capa `api/` normaliza ambos. |
| 501 | No implementado (Meta pendiente, CHMv2 sin raster). |
| 503 | No configurado o no disponible (Meta sin clave, PostGIS caído). |
| Red / timeout | Sin conexión; los borradores quedan intactos. |

Un error nunca se transforma en un resultado de identificación.

## Atlas 2D y 3D

- **2D** es la vista por defecto y siempre está disponible: mapa base vectorial, observaciones como puntos con atribución visible y lista textual equivalente.
- **3D** es un interruptor que activa el terreno (fuente `raster-dem`) e inclina la cámara. MapLibre usa una sola fuente de terreno, por lo que la superficie terreno + altura de copa (DSM) la compone el backend ([P-01](CONTRATOS_API.md)).
- **Cadena de degradación**: superficie terreno + copa → terreno + imagen satelital → 2D. Cada nivel indica qué fuentes usa.
- La altura de copa se representa como parte de la geometría 3D; si hay exageración vertical, se rotula el factor junto al mapa y en la leyenda con fuente, fecha y la aclaración de que es una estimación.
- El mapa no es una guía de rutas ni garantía de seguridad de senderos; ningún encuadre se presenta como límite oficial.

## Conectividad

La app **tolera desconexión**, no es offline-first:

- El catálogo se persiste y se muestra con su fecha.
- Los borradores viven en SQLite y se envían manualmente, con reintento.
- La identificación exige red y lo dice antes de capturar.
- **Stretch 1**: cola de sincronización automática de borradores y precarga del catálogo. Requiere una clave de idempotencia en la API para no duplicar observaciones (P-06).
- **Stretch 2** (solo documentado): mapa offline del área de Puyehue; depende de que la licencia del proveedor de teselas permita caché y de cómo se resuelva en el WebView.

## Diseño

El diseño visual no está decidido. La implementación usa una capa de tokens (color, tipografía, espaciado, radios) con valores provisionales y primitivas propias (botón, campo, banner de estado, etiqueta de estado). [DESIGN_PRINCIPLES.md](../../../docs/product/DESIGN_PRINCIPLES.md) y [DESIGN_SYSTEM.md](../../../docs/product/DESIGN_SYSTEM.md) son insumo, no decisión. Requisitos de accesibilidad no negociables: etiquetas accesibles, objetivos táctiles amplios, contraste suficiente, texto escalable, anuncios de carga y error para lectores de pantalla, respeto de movimiento reducido y alternativa textual al mapa.
