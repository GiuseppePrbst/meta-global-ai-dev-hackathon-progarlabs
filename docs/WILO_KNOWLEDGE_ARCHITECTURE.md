# Wilo: arquitectura del Knowledge Atlas (03-11-2026)

Wilo responde desde un **snapshot versionado y cacheado**. No consulta páginas web, no envía el repositorio a Muse y no modifica pesos de ningún modelo. Muse Spark elige herramientas de solo lectura con argumentos validados, y cada respuesta lleva las fuentes que esas herramientas devolvieron.

```text
audio WAV / PCM ─► Muse Voice Transcribe 1.0 ─► texto
                                                  │
                                                  ▼
                               Muse Spark 1.3 (≤ 4 herramientas; 2.ª ronda solo tras búsqueda)
                                                  │  argumentos Pydantic, IDs en enum
                                                  ▼
             Knowledge Atlas (resources/knowledge-atlas.json, en memoria)
             Park · ParkSector · Trail · MapResource · Taxon · ParkTaxonEvidence
             ConservationAssessment · KnowledgeSource · DocumentPassage
                                                  │  fuentes, entidades, mapa
                                                  ▼
             respuesta estructurada (answer, speech_text, claims[], source_ids)
             ► control de citas y cifras ► WiloAnswer para José
```

## Snapshot

`python -m bosque_api.atlas_build` lee solo archivos del repositorio y no hace llamadas de red:

- `data/public/conaf/*.json`: parques, senderos, encuadres BCN, fuentes secundarias y conflictos.
- El catálogo multirreino y las evaluaciones RCE.
- La capa de elegibilidad para la demo.
- Ocho documentos aprobados: `PILOT_PUYEHUE`, `ECOSYSTEM_DATA_MODEL`, `RCE_CONSERVATION_2026`, `BIODIVERSITY_CATALOG_SELECTION`, `SAM31_EXTENDED_RESEARCH_REPORT`, `DATA_GOVERNANCE`, `DATASET_LICENSES` y `SOURCES`.

Las rutas privadas y los correos se reemplazan por `[omitido]`. No se indexa código, logs, medios ni nada RESTRICTED.

Cada entidad lleva:

- `id`, `type` y `name`;
- `source {title, url, kind}`;
- `accessed_at`, `updated_at`, `version` y `license`;
- `review_status` y `confidence`;
- `coverage`, `limitations` y `content_sha256`.

`knowledge_version` es el SHA-256 de todas las entidades. Reconstruir con las mismas entradas da la misma versión; la prueba `test_snapshot_is_reproducible_from_repository_sources` lo verifica.

| Tipo | Entidades | Origen |
| --- | ---: | --- |
| Park | 46 | Fichas CONAF |
| ParkSector | 9 | Sectores declarados (Puyehue) o publicados en las descripciones de sendero |
| Trail | 199 | 190 de tablas CONAF revisadas, 3 curados de Puyehue y 6 candidatos secundarios |
| TrailGeometry | 0 | Ninguna fuente revisada autoriza trazados |
| MapResource | 79 | 46 enlaces a fichas oficiales y 33 encuadres BCN |
| Taxon | 20 | Catálogo multirreino con `demo_status` |
| ParkTaxonEvidence | 163 | Catálogo más nombres científicos citados en fichas CONAF, a escala de parque |
| ConservationAssessment | 11 | RCE (el resto de los taxones tiene un «sin registro» explícito) |
| KnowledgeSource | 4 | CONAF, BCN, RCE/MMA y guías turísticas |
| DocumentPassage | 106 | Secciones de los ocho documentos, hasta 700 caracteres cada una |

TaxonTrait y TaxonMedia no son entidades aparte: van dentro del perfil del taxón, con su fuente y licencia. Así se evita duplicarlos.

## Índices y caché

`bosque_api/atlas.py` carga el snapshot una sola vez (`lru_cache`) y arma cuatro índices:

- por ID;
- por tipo;
- por parque, que cubre senderos, sectores, mapas y evidencia;
- un índice de tokens sin tildes sobre nombre y términos de búsqueda: nombres comunes, científicos, sinónimos, sectores y familia.

La región se filtra por slug (`los-lagos`) y el grupo biológico, en la herramienta de biodiversidad.

No se añadió una base vectorial. La búsqueda estructurada y por tokens alcanza para unas 700 entidades, y PostgreSQL de texto completo queda como mejora si el snapshot deja de caber en memoria (`ponytail:` en el módulo).

Cada herramienta recibe solo el contexto pertinente. Por ejemplo, «senderos de Puyehue» consulta los `Trail` con `park_id=puyehue`, nunca los 46 parques.

**Invalidación.** `GET /knowledge/status` informa la versión, los conteos, la fecha de los datos y `stale`, que se activa a los 30 días. Para reconstruir:

1. Sincronizar CONAF (`scripts/sync_conaf_parks.py --review`).
2. Ejecutar `atlas_build`.
3. Correr las pruebas.

## Jerarquía de fuentes

Orden de autoridad:

1. CONAF/SBAP.
2. SIG gubernamental (BCN).
3. Fuentes científicas.
4. Operadores y concesionarios.
5. Guías turísticas.
6. Plataformas colaborativas.

Una fuente secundaria nunca se eleva sobre la oficial. Se registra como `Trail` con `source_status: secondary_reference` o como conflicto (`data.conflicts`) con `resolution: official_preferred`.

## Herramientas de Wilo

Son 13, todas de solo lectura y definidas en `bosque_api/guide_tools.py`:

| Herramienta | Uso |
| --- | --- |
| `search_knowledge` | Búsqueda por nombre en todo el Atlas. Devuelve IDs y un resumen (sendero: distancia, estado y cierre) |
| `list_parks` | Los 46 parques, con filtro por región |
| `get_park_profile` | Ficha CONAF: superficie, provincias, sectores, aviso de visita, acceso y conflictos |
| `get_park_trails` | Senderos del parque, con sector opcional; máximo 30 |
| `get_trail_profile` | Detalle de un sendero: riesgos, condiciones y cierre publicado |
| `get_park_map` | Encuadre y recursos de mapa; `boundary_geometry: null` con su motivo |
| `get_park_biodiversity` | Taxones del catálogo con evidencia en el parque |
| `get_taxon_profile` | Ficha multirreino con elegibilidad demo y aviso de sensibilidad |
| `compare_taxa` | Rasgos con fuente de dos taxones |
| `get_taxon_conservation` | RCE por región: sin región queda indeterminado, y ausencia de registro nunca equivale a LC |
| `get_source_details` | Metadatos de una cita `atlas:*` |
| `get_forest_context` | Contexto de una captura propia; las coordenadas no salen del backend |
| `get_user_capture_progress` | Conteos de la propia colección |

Reemplazan a las anteriores `get_park_context` (solo Puyehue), `get_verified_trail_information` (siempre «no disponible»), `get_public_species_observations` (stub) y las tres herramientas limitadas a los ocho árboles.

Reglas de seguridad:

- Los IDs son enum o un patrón `^[a-z0-9-]+$`, y se prohíben campos extra.
- No hay SQL, código ni rutas de archivo.
- Los resultados están acotados.
- La identidad la fija el servidor.

## Anclaje (grounding)

`bosque_ai/guide.py` (`wilo-guide-v3`) aplica estos controles:

1. Responde con un esquema estricto: `answer`, `speech_text`, `claims[{text, source_ids}]`, `source_ids` e `insufficient_evidence`.
2. Toda cita, también las de cada afirmación, debe pertenecer a las fuentes devueltas por herramientas en ese turno. Si no, la respuesta falla con `llm_error`.
3. Si `insufficient_evidence` es falso, se exige al menos una afirmación y una fuente.
4. **Control de cifras.** Si una cifra mayor que 10 de la respuesta no aparece en los datos consultados (con conversiones m→km y min→h o días), Wilo se abstiene con un mensaje explícito y deja la cifra en `limitations`. Esto bloquea, por ejemplo, «130 especies de aves» si ninguna herramienta lo devolvió.
5. Las entidades y el mapa los arma el servidor a partir de las llamadas reales, nunca el modelo.
6. El texto de herramientas, catálogo y transcripción es dato, no instrucción. La prueba de *prompt injection* comprueba que una cita inyectada se rechaza.

Una cita válida no prueba que todo el texto sea correcto. Por eso existen los controles 2 a 4 y la evaluación de escenarios ([WILO_DEMO_SCENARIOS.md](WILO_DEMO_SCENARIOS.md)).
