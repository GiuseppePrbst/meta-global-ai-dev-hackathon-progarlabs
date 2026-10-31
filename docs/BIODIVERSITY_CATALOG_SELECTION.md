# Selección del catálogo de biodiversidad — Puyehue, 31-10-2026

Cómo se eligieron los taxones del catálogo multirreino y cuáles entran en evaluación de
reconocimiento. Los datos están versionados:

- [`catalog-prioritization.json`](../evaluations/biodiversity/catalog-prioritization.json)
- [`media-availability.json`](../evaluations/biodiversity/media-availability.json)
- [`media-manifest.json`](../evaluations/biodiversity/media-manifest.json)
- [`puyehue-gbif-occurrences.json`](../evaluations/biodiversity/puyehue-gbif-occurrences.json)

Fecha de consulta de GBIF, iNaturalist, Pl@ntNet y Commons: **31-10-2026, 17:00 UTC**. La
nómina RCE es la versión con hash `1a1dadba…` ([RCE](RCE_CONSERVATION_2026.md)).

## Dos catálogos

- **Conocimiento** (`/taxa`): 20 taxones, cada uno con ficha, fuentes, evidencia de presencia
  y conservación. No tienen que estar completos; los campos desconocidos quedan `null`.
- **Reconocimiento**: los taxones cuyo `identification.status` está respaldado por una
  evaluación. Ver [MULTIKINGDOM_AI_EVALUATION.md](MULTIKINGDOM_AI_EVALUATION.md).

## Procedimiento ([`biodiversity_prioritization.py`](../evaluations/biodiversity_prioritization.py))

1. **Requisitos de elegibilidad, antes de los pesos.** Taxonomía resoluble en COL XR, fuentes
   identificadas, derechos de procesamiento comprobados por medio, presencia declarada y
   privacidad evaluada. Si alguno falla, el taxón queda solo como conocimiento.
2. **Pesos.**

   | Criterio | Peso | Cálculo |
   | --- | --- | --- |
   | Evidencia de presencia en Puyehue | 25 % | 1,0 con mención oficial; 0,4 si es candidato regional; 0 sin evaluar |
   | Medios reutilizables | 25 % | Fotos con licencia procesable vistas (tope 100) / 100 |
   | Diversidad visual y rasgos | 15 % | Observaciones distintas seleccionadas (tope 20) y al menos 2 rasgos con fuente |
   | Valor educativo y observación responsable | 15 % | 1,0; 0,4 si es sensible por ubicación |
   | Calidad de fuentes | 10 % | Estado taxonómico y estado de la ficha |
   | Información de conservación | 10 % | 1,0 si hay registro RCE; 0,5 si no lo hay. **La categoría nunca suma** |

3. **Reglas de decisión.**
   - Menos de 20 fotos procesables: solo conocimiento.
   - Mamífero sensible: solo conocimiento. Sus fotos se usan únicamente como negativos fuera
     del catálogo.
   - EN o CR no dan puntos: no se premia buscar especies amenazadas.

## Resultado

| Taxón | Reino | Puntuación | Fotos procesables / vistas | Observaciones seleccionadas | GBIF en polígono BCN* | Decisión |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| Olivillo | Plantae | 0,992 | 137 / 560 | 18 | 8 | Reconocimiento |
| Hued-hued del sur | Animalia | 0,988 | 95 / 578 | 22 | 4 | Reconocimiento |
| Bandurria (*T. melanopis*) | Animalia | 0,985 | 192 / 1.389 | 22 | 3 | Reconocimiento |
| Coigüe de Magallanes | Plantae | 0,943 | 115 / 564 | 18 | 0 | Reconocimiento |
| Coigüe | Plantae | 0,939 | 214 / 594 | 17 | 12 | Reconocimiento |
| Tineo | Plantae | 0,939 | 177 / 927 | 17 | 10 | Reconocimiento |
| Mañío | Plantae | 0,935 | 97 / 492 | 18 | 10 | Reconocimiento |
| Lenga | Plantae | 0,935 | 226 / 1.008 | 16 | 11 | Reconocimiento |
| Chercán | Animalia | 0,935 | 122 / 525 | 22 | 2 | Reconocimiento |
| Ulmo | Plantae | 0,931 | 210 / 1.015 | 15 | 31 | Reconocimiento |
| Tepa | Plantae | 0,927 | 143 / 639 | 14 | 16 | Reconocimiento |
| Choroy | Animalia | 0,917 | 67 / 329 | 22 | 1 | Reconocimiento |
| Carpintero negro | Animalia | 0,910 | 122 / 1.006 | 22 | 0 | Reconocimiento; nidos nunca publicados |
| *Cyttaria hariotii* | Fungi | 0,850 | 191 / 815 | 20 | 0 | Reconocimiento experimental; candidato regional |
| Puma | Animalia | 0,733 | 93 / 536 | 4 | 0 | Solo conocimiento (mamífero sensible) |
| Güiña | Animalia | 0,614 | 44 / 277 | 5 | 0 | Solo conocimiento (mamífero sensible) |
| *Cyttaria espinosae* | Fungi | 0,573 | 55 / 379 | 16 | 0 | Reconocimiento experimental; sin evaluar en Puyehue |
| Monito del monte | Animalia | 0,569 | 26 / 94 | 5 | 0 | Solo conocimiento (mamífero sensible) |
| *Amanita gayana* | Fungi | 0,375 | 0 | 0 | — | Solo conocimiento: no resuelve en COL XR y no hay fotos |
| *Boletus chilensis* | Fungi | 0,335 | 0 (1 registro con imagen en Chile) | 0 | 0 | Solo conocimiento |

\* Registros dentro del polígono referencial BCN que pasan los filtros: sin problemas
geoespaciales, incertidumbre ≤ 1.000 m y rango de especie. Se publican conteos, no puntos, y
no equivalen a presencia oficial.

- «Vistas» cuenta los candidatos que devolvieron las fuentes, incluidos los 277 del inventario
  del 30-10.
- «Procesables» son los medios con licencia CC0, CC BY o CC BY-SA **del medio**.
- Ningún conteo describe individuos distintos. Las observaciones seleccionadas son la unidad
  independiente: un máximo de dos primeras vistas por fotógrafo y taxón.

## Prioridad de captura en Anticura

La presencia oficial es a escala de parque: no ubica especies en Anticura ni en un sendero.

- Según CONAF, ulmo, olivillo y tineo están en **sectores bajos**, y el coigüe en sectores
  bajos y altos.
- Lenga y coigüe de Magallanes están **cerca del límite arbóreo**. Por eso no reciben
  prioridad de captura para Anticura aunque tengan muchas fotos; siguen en el benchmark de
  reconocimiento.

Esta prioridad es una recomendación de contenido, no una ruta.

## Fauna y hongos: decisiones

- **Aves primero.** Hay más fotos procesables y los rasgos diagnósticos son claros. El
  catálogo de evaluación de fauna tiene 5 aves y 7 aves parecidas como negativos difíciles:
  cachaña, chucao, pitío, *P. castaneus*, *T. caudatus*, *Cistothorus platensis* y
  *Veniliornis lignarius*.
- **Mamíferos sensibles.** Güiña, puma y monito del monte tienen ficha educativa sin
  ubicaciones. Sus fotos solo se usan como organismos fuera del catálogo.
- **Hongos.**
  - Las 3 especies RCE con distribución en Los Lagos se investigaron. Solo *C. hariotii*
    tiene material suficiente.
  - *Boletus chilensis* tiene 1 registro con imagen en Chile.
  - *Amanita gayana* no resuelve en COL XR. Su búsqueda devuelve el género, cuyos 233.914
    registros con imagen no son de la especie.
  - Para medir confusión se añadieron *C. espinosae* (catálogo de evaluación) y
    *C. darwinii* (negativo difícil; la nómina RCE trata parte de ella como sinonimia de
    *C. hariotii*).
  - Ninguno tiene presencia verificada en Puyehue.
- **Licencias.**
  - La mayoría de las fotos de iNaturalist son CC BY-NC y quedan fuera, aunque el registro
    sea CC BY. En la sonda inicial de 100 registros chilenos por especie, entre el 6 % y el
    30 % eran procesables.
  - eBird y Macaulay no se usaron como fuente de medios.

## Limitaciones

- Las etiquetas son de plataforma (iNaturalist research grade, Pl@ntNet, Commons), más mi
  inspección visual. No hay revisión de especialista.
- Las fichas de fauna usan sobre todo una fuente secundaria (es.wikipedia), además del Atlas
  ROC para el carpintero negro. Los mamíferos no tienen descripción con fuente.
- Los pesos son una propuesta inicial del encargo; no se calibraron con usuarios.
