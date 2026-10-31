# Recorridos principales

> **Nota del 31-10-2026.** Documento del bootstrap (27-10-2026), centrado en árboles y
> conservado como registro. La definición vigente amplía el alcance a flora, fauna y hongos,
> con gemelo digital y piloto Puyehue: [visión de ecosistema](../PRODUCT_VISION_ECOSYSTEM.md).

Los recorridos objetivo no equivalen a funcionalidades completas. El bootstrap muestra explícitamente mocks, datos provisionales, errores y rutas pendientes.

## 1. Descubrimiento botánico

Abrir app → elegir/fotografiar árbol → revisar foto → confirmar mayoría de edad/derechos → analizar → conocer candidatos o abstención → revisar ficha → guardar observación.

**Base actual:** preview local, petición multipart, estado de carga/error, abstención mock y borrador local sin foto/coordenadas. Catálogo provisional disponible. **Pendiente:** pipeline real Muse/SAM, candidatos validados y vinculación entre resultado y observación persistida con permisos.

Si la imagen es inválida o demasiado grande, explicar el campo; si la evidencia no basta, pedir otra toma sin afirmar identificación. No pedir información personal ni GPS para continuar. José diseña interacción/errores; Giuseppe define validación/abstención; producto define aprendizaje buscado.

## 2. Exploración turística

Abrir atlas → seleccionar zona → explorar especies → consultar lugares de interés → visualizar información territorial.

**Base actual:** mapa interactivo, encuadre de referencia y acceso a fichas/metadata. **Pendiente:** límites oficiales con licencia, observaciones verificadas y lugares/rutas interpretativas con fuente. Mantener estados vacíos claros; mapa sin observaciones no significa ausencia de biodiversidad.

Una ruta solo se publica con fuente/fecha y advertencia de consultar información oficial vigente. José coordina legibilidad móvil y navegación; Giuseppe garantiza geometría/procedencia; Fabiana conserva visión de experiencia turística empresarial, sujeta a revisión competitiva.

## 3. Inteligencia forestal

Seleccionar área → cargar capa CHMv2 → consultar altura de copa estimada → revisar procedencia → interpretar límites.

**Base actual:** fuente/licencia consultables y contrato Polygon; análisis raster responde 501. **Pendiente:** selección de área, ventana real, capa/estadísticas y validación científica. El panel debe mostrar metros, fecha de imagen/producto, nodata, área efectiva y procedencia. No presentar crecimiento anual ni medición directa.

Giuseppe implementa/verifica el pipeline; José presenta controles y explicación accesible; producto valida que se comprende la diferencia entre estimación y medición. No bloquear los otros recorridos por investigación futura de crecimiento o invasoras.
