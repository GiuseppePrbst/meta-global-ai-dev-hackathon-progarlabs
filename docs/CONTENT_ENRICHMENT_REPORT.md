# Informe de enriquecimiento de contenido y medios

Estado: 02-11-2026. Pública. Resume lo realizado, lo verificado y lo pendiente. No contiene
rutas privadas, coordenadas, hashes ni identificadores de archivos propios.

## A. Git

- Rama de trabajo: `feat/biodiversity-content-media-enrichment`, creada desde `origin/main`
  (commit `660e872`) en un worktree separado del de Opus.
- Cuenta verificada: `GiuseppePrbst` (`gh api user`). Correo de commit `giuseppe.proboste12@gmail.com`,
  verificado en la cuenta.
- Commits y PR: ver la sección N.

## B. Inventario propio

- Archivo: ZIP de fotos de iCloud aportado por el usuario (`Fotos en iCloud … (1).zip`, ~173 MB).
- Contenido: **83 fotografías** JPEG/MPO y **2 videos** MP4. Todos sin duplicados exactos (SHA-256).
- Fotografías: 82 de 1536×2048 px y una de 2048×1536 px. Orientación EXIF normal (1).
- Fechas de captura: dos días consecutivos de octubre de 2026 (fechas exactas en el manifiesto privado).
- GPS EXIF presente en las 83 fotografías. Solo se usó en análisis privado (sección C).
- Videos: H.264, 1280×720 codificado con rotación de −90° → **presentación vertical 720×1280**.
  Duración ~39,5 s y ~76,7 s; 30 FPS; audio AAC (retirado de los derivados).
- Ingesta reproducible: `evaluations/content_library_ingest.py`. Valida el ZIP, rechaza rutas
  inseguras y extensiones no admitidas, calcula SHA-256 y escribe el manifiesto solo en la
  carpeta privada. Rechazados: 0.

## C. Curaduría

Revisión visual directa de las 83 fotografías y de fotogramas de los dos videos.

- **Revisadas:** 85 de 85 (83 fotografías + 2 videos).
- **Aceptadas para investigación privada:** 85. Ninguna con permiso de publicación.
- **Excluidas de fichas por no diagnósticas:** 4 (copas o vistas sin órgano claro).
- **Con riesgo de uso:** 13 de contexto urbano (parques con árboles ornamentales o no nativos);
  4 con personas visibles; 4 con carteles visibles (dos con nombres de árboles legibles);
  2 con el pie del fotógrafo en el encuadre.
- **Calidad (una foto puede tener varias etiquetas):** 3 portada; 31 con valor diagnóstico o de
  ficha; 5 aptas para segmentación sin personas ni carteles; resto contexto.
- **Candidatas a demostración privada:** ver [DEMO_MEDIA_SHOTLIST.md](DEMO_MEDIA_SHOTLIST.md).

### Geografía (análisis privado)

El titular informó Osorno y Lago Ranco. Se comparó la ubicación de cada fotografía con el
polígono simplificado del Parque Nacional Puyehue (referencia BCN SNASPE, WGS84 supuesto):

- Dentro del polígono: **0 de 83**.
- Entre 5 y 20 km del límite: 72. A más de 20 km: 11.

Conclusión: las fotografías no pueden presentarse como registro dentro de Puyehue. El
resultado es una estimación con un polígono simplificado; no sustituye una verificación
oficial. Las coordenadas quedan en el informe privado.

### Videos

- `own-img-5097` (~39,5 s): parque urbano con árboles, cesped y persona en un banco hacia 25 s.
- `own-img-5098` (~76,7 s): parque urbano con árboles, farola y pinos; posible figura al borde
  cerca de 60 s.
- Intervalos elegidos tras revisar fotogramas cada 5 s: 3–13 s (5097), 48–58 s (5098, revisar
  personas) y 2–12 s (5098, troncos de pino).

## D. Taxonomía

- **Confirmadas por especialista:** ninguna. La inspección del agente no es validación botánica.
- **Candidatas (sin confirmar):** flores tubulares rojas colgantes, propuestas como género
  *Fuchsia* para revisión. No se añade a ninguna ficha.
- **No identificadas:** helechos, hojas, brotes, cañas y troncos. Ningún nombre inventado.
- Los rótulos «CANELO» y «ULMO» son etiquetas contextuales. No identifican el ejemplar.

## E. Contenido de fichas

- Los 20 taxones y sus identificadores se conservan. Los ocho árboles siguen derivados de
  `species.json`.
- **No se completó el enriquecimiento científico** de las fichas en esta sesión. La matriz
  [SPECIES_CONTENT_MATRIX.md](SPECIES_CONTENT_MATRIX.md) muestra qué campos están vacíos:
  la ecología está vacía en los 20; la distribución solo en 4; los hongos y los mamíferos
  sensibles carecen de rasgos. Completarlo requiere fuentes nuevas y revisión humana.
- No se alteraron nombres aceptados ni la lógica RCE.

## F. Medios externos

- 45 registros externos ya existentes en `taxa.json`, con licencia y autor:
  CC0, CC BY 2.0/4.0, CC BY y CC BY-SA. Ninguno NC ni ND.
- Ninguna fotografía nueva externa fue incorporada: no hubo búsqueda de licencias en esta sesión.
- Atribución y fuente se conservan en cada registro.

## G. Biblioteca

- Arquitectura y decisiones en [MEDIA_LIBRARY_ARCHITECTURE.md](MEDIA_LIBRARY_ARCHITECTURE.md).
- Tipo `MediaAsset` (Pydantic, campos cerrados) con `publication_status` restringido a
  `public_approved`.
- Catálogo versionado: enlaces externos y `resources/media-assets.json`, vacío hasta aprobar.
- Almacenamiento: fuente privada fuera de Git; binarios no van a PostgreSQL.

## H. Backend

- Nuevos endpoints: `GET /taxa/{taxon_id}/media` (paginado, filtros `media_type` y
  `visual_role`) y `GET /media/{asset_id}`.
- Compatibilidad: los endpoints existentes y sus esquemas no cambian.
- `/media` se incluye en las rutas públicas del modo demo, como `/taxa`.

## I. Wilo

No se modificaron las herramientas de Wilo. El contenido multimedia nuevo queda disponible para
futuras consultas, pero no se generó contenido educativo nuevo para Wilo en esta sesión.

## J. SAM

- Paquete de intercambio privado: 15 escenas (helechos y hojas 5, árboles 5, vegetación
  compleja 5), 9 clips (3, 5 y 10 s en tres intervalos) y 2 videos de presentación.
- Formato: JPEG orientado y sin EXIF; clips H.264 720×1280, 30 FPS, sin audio ni metadatos.
- **Procesamiento externo no confirmado.** No se han enviado medios a Meta. No hay máscaras
  ni inferencias de este trabajo.
- Faltan fauna y hongos en el material entregado; se declaran como ausencias.
- Contrato público: [SAM_MEDIA_HANDOFF.md](SAM_MEDIA_HANDOFF.md).

## K. Demo

- Hoy: 45 medios externos con atribución visible.
- Propios: solo tras confirmación escrita del titular para la presentación. Ver
  [DEMO_MEDIA_SHOTLIST.md](DEMO_MEDIA_SHOTLIST.md).

## L. Seguridad

- EXIF y GPS: retirados de todos los derivados; el GPS vive solo en el manifiesto privado.
- Ninguna coordenada, ruta local, hash de archivo propio ni identificador de archivo aparece
  en el repositorio ni en las respuestas de la API. Hay pruebas que lo verifican.
- Revisión de secretos y datos personales sobre el diff del PR: ver sección M.
- Personas: no se publican fotografías con personas identificables.

## M. Validación

Comandos ejecutados en el worktree de contenido:

- `uv run --project services/api --extra dev --frozen ruff check services evaluations/content_library_*.py` → sin errores.
- `uv run --project services/api --extra dev --frozen ruff format --check services` → formato correcto.
- `uv run --project services/api --extra dev --frozen pytest -c services/api/pyproject.toml services -q` → 271 pasaron, 21 omitidas (requieren PostgreSQL/PostGIS; no ejecutadas aquí).
- `services/api/tests/test_media.py` → 16 pruebas nuevas, todas pasan.
- Clips y escenas verificados con ffprobe y PIL: orientación, sin audio, sin EXIF.
- `python scripts/check_repository.py` → rutas publicables y enlaces Markdown correctos.
- Revisión del diff: búsqueda de patrones de claves, tokens, coordenadas, nombres del titular
  y rutas locales. No hay un escáner de secretos dedicado en el repositorio; esta
  revisión es manual y por patrones, no sustituye a una herramienta de escaneo.

No ejecutado: `npm run lint`, `typecheck`, `build` y Playwright. El PR no cambia `apps/web` ni
`apps/mobile`. No hay llamadas a Meta ni a servicios externos en CI.

## N. GitHub

Ver la descripción del PR. No se hizo merge.

## O. Próximas cinco acciones

1. Titular: confirmar por escrito el uso de las fotos y los videos en la presentación y, aparte, el procesamiento externo.
2. Enriquecer las ocho fichas de árboles y las seis especies prioritarias con fuentes oficiales o científicas, con versión y fecha.
3. Buscar fotografías externas con licencia CC BY o CC BY-SA para los taxones sin medios: cyttaria-espinosae, boletus-chilensis y amanita-gayana.
4. Revisar los 3 clips de 5098 con personas en el encuadre antes de cualquier inferencia.
5. Aprobar medios propios en `resources/media-assets.json` solo tras la confirmación de derechos, con atribución y revisión visual registrada.
