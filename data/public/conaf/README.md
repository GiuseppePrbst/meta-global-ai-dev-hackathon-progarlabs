# Catálogo nacional de parques y senderos CONAF

**Estado al 3 de noviembre de 2026:**

- Las 46 fichas del índice oficial fueron consultadas y estructuradas.
- Se extrajeron 190 senderos de las 23 fichas que publican la tabla «Senderos habilitados». Un agente revisó cada uno contra el texto de su ficha.
- No hay geometrías de sendero.

La [página CONAF de parques nacionales](https://www.conaf.cl/parques-nacionales/) enlaza a un [archivo oficial](https://www.conaf.cl/tipo_parque/parque-nacional/) de cuatro páginas con 46 parques nacionales. No se incluyen reservas nacionales ni monumentos naturales.

## Archivos

| Archivo | Contenido | Cobertura |
| --- | --- | --- |
| `parks.json` | Índice curado: ID estable, nombre, región orientativa y URL de la ficha | 46/46 |
| `park_profiles_synced.json` | Superficie, provincias, comunas, aviso de visita (horarios, condiciones), acceso, nombres científicos citados en flora y fauna, hash del HTML | 46/46 recuperadas |
| `trails_synced.json` | Senderos de la tabla «Senderos habilitados», con estado de revisión | 190 senderos, 23 parques |
| `trails.json` | Entradas curadas a mano para parques sin tabla de senderos | 3 senderos concesionados de Puyehue |
| `review.json` | Manifiesto de revisión por parque, ligado al SHA-256 del HTML revisado | 23 parques |
| `park_bbox_bcn.json` | Encuadre WGS84 calculado a partir de las geometrías válidas de BCN SNASPE | 33/46 |
| `secondary_sources.json` | Fuentes complementarias, candidatos de sendero y conflictos con CONAF | 2 sitios, 6 candidatos, 4 conflictos |

## Matriz de cobertura

| Medida | Valor |
| --- | ---: |
| Parques indexados en el archivo oficial | 46 |
| Fichas consultadas / recuperadas / estructuradas | 46 / 46 / 46 |
| Fichas con tabla «Senderos habilitados» | 23 |
| Senderos extraídos | 190 |
| Senderos revisados contra la ficha | 190 |
| Fichas sin tabla de senderos publicada | 23 (Puyehue nombra 3 senderos concesionados en su aviso de visita) |
| Errores de consulta | 0 |
| Senderos con cierre publicado en la ficha | 2 (Villarrica: Pichillancahue y Glaciar Pichillancahue, hasta el 31-12-2026) |
| Conflictos registrados | 4 (`secondary_sources.json`; incluye SIMBIO 1994) |
| Parques con sectores declarados explícitamente | 1 (Puyehue); otros 37 senderos traen el sector en su descripción |
| Parques con encuadre BCN | 33 |
| Geometrías de sendero | 0 |

Los 13 parques sin encuadre no aparecen en esa edición de BCN o tienen geometrías inválidas.

Fichas sin tabla de senderos:

- Melimoyu, Yendegaia, Glaciares de Santiago, Desierto Florido, Alberto de Agostini, Kawésqar, Isla Magdalena, Isla Guamblin;
- Hornopirén, Alerce Andino, Chiloé, Corcovado, Puyehue, Vicente Pérez Rosales, Pumalín Douglas Tompkins, Las Palmas de Cocalán;
- Rapa Nui, Llanos de Challe, Nevado de Tres Cruces, Morro Moreno, Salar del Huasco, Pan de Azúcar, Llullaillaco.

Que una ficha no publique senderos **no implica que el parque no los tenga**. Esto tampoco es un catálogo exhaustivo de los senderos de Chile.

## Auditoría del parser (03-11-2026)

El parser anterior se anclaba en la palabra «Sendero». Contra las 46 fichas reales tenía estas fallas, ya corregidas:

- Omitía rutas que no empiezan con «Sendero»: «Expedición Paso Marconi», «Ruta Valle Los Glaciares» y «Senderos de conexión Tamango».
- Incluía encabezados en el nombre, como «Sector Jeinimeni Sendero…» o «Región de Los Ríos Sendero…».
- Leía «1 hora (de ida)» como duración total y «2 horas y media» como 120 minutos.
- No reconocía la dificultad cuando la etiqueta decía «Dificulta de caminata» o «Dificultad de la caminata», ni cuando faltaba el punto antes de «Riesgos».
- Ignoraba los singulares «Provincia» y «Comuna», que usan 29 fichas.
- Descartaba como nombre demasiado largo el cierre publicado «➔ cerrado desde el 25 de julio…».

Ahora cada etiqueta «Longitud:» genera un sendero, cuyo nombre es el fragmento que la precede. El control de calidad exige que el número de etiquetas y el de senderos coincidan en cada ficha; se cumple en las 46.

Los 34 senderos curados antes a mano en Queulat, Conguillío y Río Clarillo coinciden con la extracción. Solo difiere la base de duración de «Los Colonos», y el parser tiene razón: la ficha no dice «total».

Los textos de contacto copiados de las fichas pierden correos y teléfonos (`[correo omitido]`, `[teléfono omitido]`). La ficha enlazada conserva el texto completo.

## Sincronización reproducible

```powershell
uv run --no-project --with requests --with beautifulsoup4 python scripts/sync_conaf_parks.py --check
uv run --no-project --with requests --with beautifulsoup4 python scripts/sync_conaf_parks.py `
    --output data/public/conaf --html-dir D:/data/bosque-vivo/conaf-sync/html --review data/public/conaf/review.json
python -m unittest discover -s scripts/tests
```

- `--html-dir` guarda o reutiliza el HTML descargado en una carpeta privada que nunca se versiona.
- `--review` marca `agent_reviewed_against_source` solo si el SHA-256 del HTML coincide con el revisado. Si CONAF cambia una ficha, sus senderos vuelven a `parsed_unreviewed`.
- `scripts/park_bbox_bcn.py` recalcula los encuadres desde el `Snaspe.zip` privado de BCN.

## Significado de los campos

- `distance_m`: longitud publicada, en metros. `distance_basis: one_way` cuando la ficha dice «de ida».
- `duration_minutes`: se completa solo si la ficha da un valor único.
  - Si publica un rango, va en `duration_min_minutes` y `duration_max_minutes`.
  - `duration_basis` toma `one_way`, `total` o `null` según la redacción.
- `difficulty` y `winter_difficulty`: texto tal como lo publica la ficha.
- `risks` y `conditions`: oraciones oficiales sobre riesgos, cierres estacionales, permisos o guía obligatorio.
- `opening_status`: `not_verified` **no** significa abierto. `published_closure` reproduce un cierre declarado en la ficha; no es una verificación en vivo.
- `geometry: null` y `geometry_available: false`: no hay trazado autorizado. No se dibujan polilíneas ni se ofrece navegación.
- `scientific_names_mentioned`: nombres citados en la ficha, para vincular taxones. No son coordenadas.

## Mapas y geometrías investigados

| Fuente | Resultado |
| --- | --- |
| BCN SNASPE (`Snaspe.zip`, libre uso con atribución) | Polígonos referenciales. Solo se publica el encuadre de las geometrías válidas |
| SIT CONAF (sit.conaf.cl) | Catastro de uso de la tierra, sin capa de senderos documentada. Lleva «Todos los derechos reservados» |
| IDE MMA, servicio Biodiversidad (ArcGIS REST) | Exige token (`499 Token Required`); no es reutilizable sin un acuerdo |
| Fichas CONAF | Sin mapas descargables (KML, GPX ni PDF). El único enlace a Google Maps se repite en las 46 páginas y apunta a la oficina de CONAF |

## Fuentes secundarias

Se contrastaron dos sitios, y ninguno se eleva al nivel de CONAF:

- [parquenacionalpuyehue.cl](https://parquenacionalpuyehue.cl/): no identifica operador ni publica términos de uso.
- [parquesnacionaleschilenos.cl](https://parquesnacionaleschilenos.cl/): directorio de difusión.

La guía turística menciona seis senderos de Puyehue que quedan como `candidate_not_official`:

- Río Anticura;
- Antillanca, que es un camino de ripio (ruta vehicular, no sendero);
- Anticura Catrué;
- Salto del Pudú;
- Volcán Puyehue;
- Cráter Raihuén – Volcán Casablanca.

La superficie de «112 hectáreas» que publica la guía contradice las 112.755 ha de CONAF. SIMBIO registra 102.521,7 ha (1994). Ambas diferencias quedan como conflictos, y la respuesta usa la cifra de CONAF.

## Fuentes

- https://www.conaf.cl/parques-nacionales/
- https://www.conaf.cl/tipo_parque/parque-nacional/ (páginas 1–4)
- Las 46 fichas `https://www.conaf.cl/parque_nacionales/parque-nacional-<id>/` listadas en `parks.json`, consultadas el 03-11-2026
- https://www.bcn.cl/siit/mapas_vectoriales/index_html (Snaspe.zip)
- https://simbio.mma.gob.cl/CbaAP/Details/971
- https://parquenacionalpuyehue.cl/actividades-experiencia/ (fuente secundaria)
