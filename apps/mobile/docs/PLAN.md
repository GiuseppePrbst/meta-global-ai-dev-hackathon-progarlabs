# Plan de la app móvil

Versión 27-10-2026. Plan de trabajo, no registro de tareas completadas. La app React Native (Expo) es el cliente de la demo competitiva ([ADR 0001](adr/0001-app-movil-como-cliente-de-la-demo.md)). Los contratos de la API son una propuesta y pueden cambiar; el diseño visual no está decidido. El vocabulario está en el [glosario](GLOSSARY.md).

## Objetivo

Que una persona adulta en terreno pueda fotografiar un árbol, recibir candidatos o una abstención honesta, consultar la ficha de la especie, registrar una observación trazable y ubicarla en el territorio, viendo en todo momento qué es provisional, estimado, mock o no configurado.

## Alcance y prioridades

| Prioridad | Recorrido | Contenido | Condición de aceptación |
| --- | --- | --- | --- |
| P0 | Descubrimiento | Cámara o galería → confirmación de derechos → identificación → candidatos o abstención → ficha → borrador → observación enviada | Funciona de punta a punta en un Android físico contra la API desplegada; el mock se rotula como tal; cada error 4xx/5xx/501/503 tiene un mensaje propio. |
| P0 | Catálogo | Lista y ficha de Especie con nombre científico/común, estado *provisional* y procedencia | Funciona sin red con el último catálogo en caché, indicando su fecha. |
| P1 | Atlas 2D | Mapa de observaciones persistidas, selección → ficha, estado vacío honesto y lista textual equivalente | El mapa vacío dice que no hay observaciones registradas, no que no haya biodiversidad. |
| P1 | Registro | Borradores locales y observaciones enviadas desde este dispositivo | Un borrador sobrevive al cierre de la app; el envío es manual y reintentable. |
| P2 | Atlas 3D | Interruptor 3D: elevación del terreno + imagen satelital; si el backend lo sirve, superficie terreno + altura de copa CHMv2 | Solo si el spike 3D pasa y las fuentes están desbloqueadas (ver bloqueos). Toda exageración vertical se rotula. |
| P2 | Panel Bosque | Fuente, licencia, interpretación y estado de CHMv2 dentro del Atlas | Muestra «no configurado» mientras `/forest/*` responda 501. |
| Stretch 1 | Sincronización automática | Cola de envío de borradores al recuperar red y precarga del catálogo | Solo si P0–P1 están cerrados; requiere idempotencia en la API (P-06 en [contratos](CONTRATOS_API.md)). |
| Fuera | Mapa offline (Stretch 2), cuentas, interacción por voz | Documentados, no se implementan para la demo | Voz: ver [funcionalidad opcional](OPCIONAL_INTERACCION_POR_VOZ.md). |

«Acerca de» y Ajustes (incluida la revocación de la mayoría de edad) viven en un menú secundario. Navegación principal de cuatro pestañas: **Identificar**, **Especies**, **Atlas**, **Registro**.

## Cronograma

Alineado con [el roadmap del proyecto](../../../docs/ROADMAP.md). Reservar el último tercio de cada jornada para integración y errores.

| Fecha | Trabajo móvil | Dependencia de backend (Giuseppe) | Salida verificable |
| --- | --- | --- | --- |
| 28 oct | Scaffold Expo en el workspace, CI móvil, tipos desde OpenAPI, capa `api/`, tokens y primitivas, Catálogo con caché. **Spike 3D** (medio día) en Android físico. | Contrato `/species` estable. | Catálogo navegable en dev build; informe del spike. |
| 29 oct | Identificar: cámara/galería, recodificación sin EXIF, confirmaciones, petición multipart, estados de carga/mock/abstención/error. | `/identify` con Meta real o mock. | Prueba de EXIF eliminado; todos los errores visibles. |
| 30 oct | Candidatos → ficha, borradores en SQLite, envío de observación con ubicación opcional, pestaña Registro. | PostGIS desplegado; `/observations` operativo. | Observación creada desde el dispositivo y listada. |
| 31 oct | Atlas 2D con observaciones, lista textual, selección → ficha. **Punto de control del ADR 0001.** | Decisión sobre exposición/generalización de ubicaciones (BV-09). | P0 de punta a punta en Android físico. |
| 1 nov | Interruptor 3D y panel Bosque, si el spike pasó y las fuentes están desbloqueadas. | Teselas DSM (P-01) si existen. | 3D rotulado o decisión documentada de no incluirlo. |
| 2 nov | Accesibilidad, estados vacíos/error, latencia percibida, flujos Maestro manuales. Stretch 1 si sobra tiempo. | Errores API estables. | Registro de pruebas en [PRUEBAS.md](PRUEBAS.md). |
| 3 nov | Release candidate: build *preview* EAS, smoke en dispositivo, congelar UI. | API desplegada con HTTPS. | APK instalable y verificado. |
| 4 nov | Grabar video en Android físico; evidencia técnica. | Evidencia Meta. | Video sin datos privados ni claves. |

## Bloqueos y dependencias

1. **API alcanzable desde el dispositivo** (BV-09): la demo no puede usar `localhost`. Exponerla exige autenticación, HTTPS, límites y política de ubicaciones ([SECURITY.md](../../../docs/SECURITY.md)).
2. **Exposición de ubicaciones**: el Atlas muestra observaciones de todas las personas. La generalización de ubicaciones sensibles debe decidirse en el backend antes de exponer la API.
3. **Fuentes de elevación e imagen satelital**: ninguna está registrada en [DATASET_LICENSES.md](../../../docs/DATASET_LICENSES.md). Antes de usarlas se requiere (a) registrar licencia, atribución y condiciones de caché, y (b) confirmación escrita de Giuseppe de que el *streaming* de teselas satelitales licenciadas no cae bajo la regla RESTRICTED de «imágenes aéreas de terceros» de AGENTS.md. Mientras tanto, mapa base vectorial OSM (proveedor también por registrar).
4. **Capa de altura de copa**: depende del pipeline CHMv2 y de la propuesta de teselas DSM (P-01).
5. **Uso real de Meta**: la app muestra lo que `/identify` devuelva; el mock nunca se presenta como inferencia.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Rendimiento del 3D en WebView en Android de gama media | Spike el 28-oct; el 2D usa el mismo motor y siempre está disponible. |
| Cambios de contrato durante la semana | Tipos generados desde OpenAPI y mapeo a tipos de dominio en un solo lugar (`src/api/`). |
| Cuota o cola de builds EAS | `eas build --local` como alternativa; generar el APK *preview* antes del 3-nov. |
| Una sola persona en frontend | Prioridades estrictas; recortar P2 antes de comprometer P0. |
