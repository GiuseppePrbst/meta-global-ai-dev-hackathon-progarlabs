# Sistema visual inicial

**Propuesta provisional**, no manual oficial ProGarLabs. La referencia solicitada es blanco/púrpura; la web pública de la empresa no aportó un manual de marca verificado. No presentar estos HEX como colores corporativos oficiales.

| Token | Propuesta | Uso |
| --- | --- | --- |
| `ink` | `#192c27` | Texto principal. |
| `muted` | `#586b63` | Texto secundario legible. |
| `purple` | `#6943a5` | Acción primaria y vínculo con marca. |
| `purple-dark` | `#51317f` | Estado activo/hover. |
| `forest` | `#295044` | Acento natural y contexto. |
| `line` | `#dce4dd` | Divisores y bordes. |
| `paper` | `#f8faf6` | Fondo base. |
| `sage` | `#eaf0e8` | Superficies de contexto. |
| `white` | `#ffffff` | Tarjetas y contraste. |

Tipografía inicial del sistema: Arial/Helvetica para lectura y UI; Georgia en titulares cursivos como acento editorial. No requiere fuentes remotas ni redistribuye archivos tipográficos. Utilizar tamaños fluidos y ancho de lectura moderado; evitar texto pequeño sobre cartografía/fotografía.

## Componentes y estados

- Navegación principal responsive, enlace de salto al contenido, botones/enlaces con foco visible y etiquetas claras.
- Tarjeta/ficha de especie con nombre científico, común, estado y procedencia; filtro accesible.
- Captura/selector de imagen con preview, confirmaciones y estados listo/cargando/error/abstención; borrador local claramente explicado.
- Atlas MapLibre con atribución visible, alternativa textual y aviso de WebGL/red. Panel CHMv2 muestra fuente y limitaciones.
- Avisos de demo/provisional/no configurado; no depender solo del color para transmitir estado.

Espaciado consistente, radios moderados, bordes suaves y transiciones discretas; respetar `prefers-reduced-motion`. El mapa y sus controles no deben tapar atribuciones ni impedir navegación por teclado. Verificar contraste y uso móvil/zoom al cambiar tokens; un color de esta tabla no garantiza por sí solo accesibilidad.

No se distribuyen fotos de terceros: la ilustración CSS es conceptual y no representa el parque. Incorporar fotografía protagonista cuando haya derechos y atribución comprobados. José mantiene componentes/tokens; Giuseppe valida contenido científico/espacial; Fabiana orienta coherencia empresarial con elegibilidad competitiva pendiente.
