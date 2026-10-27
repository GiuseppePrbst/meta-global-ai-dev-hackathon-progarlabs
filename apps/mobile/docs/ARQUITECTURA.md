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
├── app/                      # rutas expo-router
│   ├── (tabs)/
│   │   ├── identificar.tsx
│   │   ├── especies/index.tsx
│   │   ├── atlas.tsx
│   │   └── registro.tsx
│   ├── especies/[id].tsx     # ficha
│   ├── acerca.tsx
│   └── ajustes.tsx
├── src/
│   ├── api/                  # cliente HTTP, schema.gen.ts, mapeo a dominio, errores
│   ├── domain/               # tipos del glosario: Especie, Identificación, Observación…
│   ├── features/             # identificacion, catalogo, registro, atlas
│   ├── storage/              # SQLite de borradores y preferencias
│   ├── map/                  # DOM component MapLibre GL JS y su puente de props
│   ├── ui/                   # tokens provisionales y primitivas accesibles
│   └── i18n/es-CL.ts
├── docs/
├── app.config.ts
└── eas.json
```

`apps/mobile` se agrega a los workspaces npm de la raíz con scripts propios (`lint`, `typecheck`, `test`). No se crea un paquete compartido con la web: OpenAPI sigue siendo el contrato.

**Estado (27-10-2026, scaffold):** creado con `create-expo-app` (Expo SDK 58, React Native 0.88, React 19.3.0) y su propio `package-lock.json`, **fuera** de los workspaces de la raíz. Motivo: la web fija React 19.3.1 y React Native exige la versión exacta de React que trae su renderer; en un workspace compartido se arriesga una copia duplicada de React. Pendiente decidir si se alinean versiones o se mantiene separado.

## Capas y reglas

1. **`src/api/`** es el único lugar que conoce el JSON de la API. Expone funciones que devuelven tipos de `src/domain/` o un error tipado. La UI nunca importa `schema.gen.ts`.
2. **`src/domain/`** usa el lenguaje del [glosario](GLOSSARY.md). Un Candidato nunca se convierte por sí solo en la especie de una Observación: la persona la elige.
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
