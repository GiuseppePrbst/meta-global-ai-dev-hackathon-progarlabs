# Datos públicos durante el bootstrap

No se descargaron datasets de terceros. El catálogo de ocho nombres candidatos se
encuentra empaquetado en `services/api/src/bosque_api/resources/species.json` para que
el mismo archivo funcione en desarrollo, tests y contenedor. Proviene de la lista
proporcionada por ProGarLabs; los nombres son hechos, sin fichas ni imágenes copiadas.
La publicación de esta lista fue autorizada como parte del bootstrap; su licencia de
reutilización está pendiente (`LicenseRef-ProGarLabs-Pending`). No afirma validación taxonómica,
estado de conservación ni presencia en Puyehue. Cada registro incluye fecha, versión,
fuente, redistribución, procesamiento y responsable de validación pendiente.

No confundir la comprobación de sintaxis binomial con aceptación taxonómica. El paso
siguiente es contrastar cada nombre con World Flora Online/GBIF, guardar identificador
estable, sinónimos aceptados, licencia de la versión usada y evidencia de revisión.

CHMv2 solo tiene metadatos en `services/geospatial/src/bosque_geo/contracts.py`; no hay
raster, imagen, peso de modelo ni muestra espacial oficial descargada.

No agregar material RESTRICTED, originales, máscaras o derivados de Hepta. Deben
permanecer fuera del repositorio y worktrees, incluso si una herramienta los ignora.
