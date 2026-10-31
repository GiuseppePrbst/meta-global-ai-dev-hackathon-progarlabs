# Guion de demo de tres minutos

Este guion distingue una demo del **bootstrap** de la futura demo competitiva. No presentar mocks, fixtures ni metadatos como inferencias, observaciones o alturas reales. El video final de tres minutos es un requisito del encargo, pendiente de confirmar en el formulario oficial; ver [fuentes](SOURCES.md).

| Tiempo | Acción | Mensaje verificable |
| --- | --- | --- |
| 0:00–0:20 | Inicio Bosque Vivo | ProGarLabs conecta botánica, observación y territorio para personas adultas y equipos ambientales, con Puyehue como referencia piloto. |
| 0:20–0:45 | Abrir `/especies`, filtrar y revisar ficha | Ocho especies candidatas; mostrar estado provisional y procedencia. No afirmar validación taxonómica ni presencia de un árbol concreto. |
| 0:45–1:25 | `/identificar`, elegir foto permitida y revisar confirmaciones | Mostrar preview y estado de petición. En bootstrap, enseñar abstención explícita del mock; explicar que no se llamó a Meta. Si la API falla, mostrar el error real. |
| 1:25–1:45 | Guardar borrador | Explicar que es un borrador local de la respuesta/notas; no una observación científica publicada ni foto guardada en servidor. |
| 1:45–2:15 | `/atlas`, navegación y ficha de fuente | Mapa base con atribución, contexto territorial y estados vacíos. El encuadre no es un límite oficial ni una ruta. |
| 2:15–2:40 | Consultar información CHMv2 | Mostrar procedencia/licencia y limitaciones. No hay raster cargado ni altura medida en la base. |
| 2:40–3:00 | `/proyecto` y evidencia | Mostrar estado, arquitectura y pruebas reales; explicar próximos pasos Meta/evaluación y que Hepta está excluido. |

## Sustituciones necesarias para el video competitivo

Antes de grabar el video final, integrar y probar al menos una herramienta elegible Meta con entradas permitidas; sustituir el tramo mock por una llamada real y mostrar modelo/versión/fecha y abstención si corresponde. Añadir resultados evaluados con tamaño de muestra y límites, nunca una cifra inventada. Si CHMv2 todavía no funciona, decirlo y concentrar el recorrido en la capacidad realmente operativa.

El bootstrap sin uso real de Meta no demuestra el requisito de integración de la entrega. No ocultar errores cortando el video como si un resultado distinto proviniera de la misma llamada.

## Checklist de grabación/envío

Foto propia/autorizada y sin EXIF sensible; sin claves, coordenadas privadas, cuentas personales abiertas ni datos Hepta. UI legible en móvil, atribución de mapas visible, narración en tres minutos y enlaces accesibles desde una sesión sin privilegios. Revisar admisiones, representante, licencia del código, contribuciones preexistentes y reglas actualizadas. Solo el representante autorizado envía y guarda el comprobante de recepción.

## Guion propuesto para la demo competitiva — 31-10-2026

Narrativa alineada con la [visión de ecosistema](PRODUCT_VISION_ECOSYSTEM.md) y el
[piloto Puyehue](PILOT_PUYEHUE.md). Cada tramo usa solo capacidades implementadas o se
rotula «propuesto». Las pantallas dependen de la integración de José; si una no está lista,
se omite y no se simula.

| Tiempo | Pantalla | Mensaje verificable |
| --- | --- | --- |
| 0:00–0:20 | Descubrir | Bosque Vivo Chile: aventura y aprendizaje sobre biodiversidad, con un gemelo digital verificable. Piloto en el PN Puyehue, sector Anticura. Wilo presenta la misión «Exploradores del Bosque Siempreverde» |
| 0:20–1:10 | Descubrir → cámara | Foto propia o con licencia de una de las 8 especies: `verify` acepta o se abstiene. Mostrar también una abstención ante una especie fuera del catálogo. Cifras solo con su contexto: 3/37 negativos aceptados frente a 25/37 del baseline, etiquetas débiles, sin especialista |
| 1:10–1:35 | Mi diario | Captura privada, sugerencia `unverified` y registro sin taxón para un hallazgo de fauna u hongo |
| 1:35–2:05 | Mapa | Límite de referencia y contexto forestal real (CONAF/CIREN, CHMv2 como altura estimada). Sin senderos ni puntos de fauna: explicar por qué |
| 2:05–2:35 | Enciclopedia + Wilo | Ficha de olivillo con categoría RCE por ámbito (LC en Los Lagos y Los Ríos, VU al norte). Wilo responde con fuente |
| 2:35–3:00 | Perfil / cierre | Progresión educativa sin cifras ficticias; P1 (gemelo territorial) presentado como propuesta. Reglas del parque: no salir del sendero, no recolectar, no drones |

No mostrar identificación de fauna ni de hongos, senderos, puntos de especies sensibles ni
«Ver en 3D». No usar material Hepta.
