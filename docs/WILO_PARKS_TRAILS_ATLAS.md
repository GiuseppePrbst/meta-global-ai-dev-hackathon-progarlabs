# Wilo: parques, senderos y mapas (03-11-2026)

Los datos fuente y la auditoría del parser viven en [data/public/conaf/README.md](../data/public/conaf/README.md), que corresponde al PR #32. Este documento resume qué recibe Wilo y qué puede afirmar.

## Cobertura

| Medida | Valor |
| --- | ---: |
| Parques nacionales del índice CONAF | 46/46, con ficha consultada y estructurada |
| Fichas que publican la tabla «Senderos habilitados» | 23 |
| Senderos oficiales extraídos y revisados contra la ficha | 190 (`source_status: official_reviewed`) |
| Senderos oficiales nombrados sin métricas (Puyehue: El Indio, Repucura, La Princesa) | 3 (`official_named_only`) |
| Candidatos de una guía turística (Puyehue) | 6 (`secondary_reference`), entre ellos Antillanca, que es un camino vehicular |
| **Registros `Trail` en el Atlas** | **199 = 190 + 3 + 6.** No son 199 senderos oficiales |
| Senderos con cierre publicado | 2 (Villarrica, hasta el 31-12-2026) |
| Geometrías de sendero | 0 |
| Encuadres de parque (BCN SNASPE, geometrías válidas) | 33/46 |
| Conflictos de fuentes | 4 (superficie de Puyehue frente a la guía turística y SIMBIO, dificultad contradictoria y una página secundaria descartada) |

No es un catálogo exhaustivo de los senderos de Chile. 23 fichas no publican senderos, y eso no significa que esos parques no los tengan.

## Qué responde Wilo sobre senderos

| Situación | Respuesta |
| --- | --- |
| Sendero oficial documentado | Nombre, distancia, duración y su base (ida o total), dificultad y riesgos, citando la ficha CONAF |
| Referencia turística | Se presenta como **no oficial**: regla `wilo-guide-v3` y `type: secondary` en la fuente |
| Información incompleta | Solo lo publicado; los campos que faltan quedan `null` y no se estiman |
| Sin geometría | `geometry_available: false`, sin trazado ni navegación |
| Apertura | Nunca afirma que esté abierto. Con `published_closure` menciona el cierre y su fecha; en los demás casos, «no verificada: consultar el aviso CONAF vigente» |

## Mapas

| Fuente | Uso |
| --- | --- |
| BCN SNASPE | Solo el encuadre WGS84 (`bbox`); los polígonos no se redistribuyen y `boundary_geometry` es `null`, con su motivo |
| SIT CONAF | No documenta una capa de senderos y tiene todos los derechos reservados. No se usa |
| IDE MMA (ArcGIS) | Exige token. No se usa |
| Fichas CONAF | Enlace a la ficha (`official_profile_page`). No tienen mapa descargable |

Pendiente: conseguir de CONAF/SBAP geometrías de senderos con licencia. Sin ellas no se puede ofrecer navegación.
