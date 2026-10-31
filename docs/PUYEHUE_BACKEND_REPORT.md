# Informe backend e investigación — biodiversidad de Puyehue, 31-10-2026

Rama `feat/puyehue-biodiversity-meta-evaluation`, creada desde `main` `4aff721` (CI
[41207011812](https://github.com/GiuseppePrbst/meta-global-ai-dev-hackathon-progarlabs/actions/runs/41207011812)
en verde). PR abierto para revisión, **sin fusionar**. El informe separa hechos medidos,
inferencias, fixtures y limitaciones.

## Qué se implementó

| Componente | Archivo | Estado |
| --- | --- | --- |
| Catálogo multirreino tipado (20 taxones) | `services/api/src/bosque_api/biodiversity.py`, `resources/taxa.json` | Implementado, solo lectura |
| Conservación RCE regional (11 registros, 9 no encontrados explícitos) | `resources/conservation.json`, `evaluations/rce_import.py` | Implementado |
| Rutas `/taxa`, `/taxa/{id}`, `/taxa/{id}/conservation` y `/parks/{id}/biodiversity` | `biodiversity.py`, `main.py` | Implementadas, públicas y sin coordenadas |
| Herramientas de Wilo `get_taxon_profile` y `get_taxon_conservation` | `guide_tools.py` | Implementadas |
| Pipeline experimental de fauna y hongos | `services/botanical-ai/src/bosque_ai/multikingdom.py` | Solo evaluación, sin endpoint |
| Registro de medios, priorización, conteo GBIF y campaña | `evaluations/biodiversity_*.py`, `multikingdom_campaign.py`, `puyehue_occurrences.py` | Ejecutados |
| Ejemplos de contrato | `evaluations/biodiversity/contract-examples.json` | GET en vivo; identificación y captura como fixtures |

Compatibilidad:

- Los 8 IDs arbóreos no cambian y sus datos se derivan de `species.json`.
- `/species`, `/identify` (`verify-v2`), `/captures/*` y `/observations` no cambian.
- No hay migraciones.
- `apps/web` y `apps/mobile` no se tocaron.

## Hallazgos principales

1. **Taxonomía.**
   - La «bandurria» del encargo (*T. caudatus*) corresponde en Chile a *T. melanopis*; RCE
     lista *caudatus* como sinónimo.
   - *Amanita gayana* no resuelve en COL XR.
   - En el chercán puede haber una separación pendiente (*T. musculus*).
2. **Licencias.** La licencia del medio decide. La mayoría de las fotos de iNaturalist son
   NC aunque el registro sea CC BY, así que solo entre el 6 % y el 30 % son procesables.
3. **Presencia.**
   - CONAF documenta árboles y fauna a escala de parque.
   - Dentro del polígono BCN no hay ningún hongo que pase los filtros. Los 4 hongos siguen
     como candidatos regionales o sin evaluar.
   - El polígono BCN asigna el parque solo a Los Ríos: la categoría RCE no se resuelve por
     el nombre del parque.
4. **IA.**
   - `verify` se confirma en flora con datos nuevos: negativos aceptados 23/48 → 8/48.
   - En fauna no hay confusiones entre especies del catálogo, pero entre el 31 % y el 58 %
     de los negativos difíciles se aceptan.
   - Los hongos *Cyttaria* no se distinguen entre sí (riesgo selectivo 30–53 %).
   - Muse Wonder no supera a Spark y cuesta unas 3,2 veces más.
   - La segunda vista no mejora con n = 30.
5. **Capacidades.**
   - Nivel 2 provisional: olivillo, ulmo, mañío, carpintero negro y chercán.
   - Nivel 3: ninguno.
   - Mamíferos sensibles restringidos por política.

Detalle:

- [selección del catálogo](BIODIVERSITY_CATALOG_SELECTION.md);
- [evaluación multirreino](MULTIKINGDOM_AI_EVALUATION.md);
- [contratos](API_INTEGRATION.md#catálogo-multirreino-implementado--31-10-2026);
- [piloto](PILOT_PUYEHUE.md#evidencia-y-catálogo-en-el-backend--31-10-2026).

## Seguridad y datos

- No se publicaron fotos, máscaras ni respuestas crudas de Meta. Los originales están en
  `D:/data/bosque-vivo`, fuera de Git.
- No se usó material Hepta en esta misión ni se asoció al parque.
- Ninguna ruta devuelve coordenadas. Los conteos GBIF de mamíferos sensibles no incluyen
  claves de registro.
- Las credenciales siguen en la configuración privada; Standard Mode.
- No se usaron eBird ni Macaulay como fuente de medios.

## Validaciones

Comandos y resultados en el cuerpo del PR. Las pruebas PostGIS se ejecutan en CI con una base
dedicada. Las llamadas reales a Meta no se ejecutan en GitHub Actions.

## Próximas acciones para el MVP del 4-11

1. **José** consume `/taxa` y `/parks/puyehue/biodiversity` en Enciclopedia y Mapa, con los
   estados de capacidad, presencia y sensibilidad visibles.
2. **Revisión de especialista** de los casos de test de los 5 taxones de nivel 2 antes de
   mostrarlos en la demo como sugerencia aceptada.
3. **Conjunto de hojas de coigüe y tepa** para corregir el sesgo por paisajes, evaluado sin
   tocar `verify`.
4. **Fichas con fuente primaria** de los mamíferos (MMA/RCE) y revisión de los rasgos
   secundarios de aves.
5. **Límites regionales oficiales en PostGIS** para resolver la región RCE desde la
   ubicación permitida (BV-13.1).
