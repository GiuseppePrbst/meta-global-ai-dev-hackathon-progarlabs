# Catálogo nacional de parques y senderos CONAF

**Estado al 3 de noviembre de 2026: inventario nacional completo del índice consultado, senderos parcialmente verificados.**

La [página CONAF de parques nacionales](https://www.conaf.cl/parques-nacionales/) enlaza al [archivo oficial](https://www.conaf.cl/tipo_parque/parque-nacional/), distribuido en cuatro páginas. Este directorio registra los **46 parques nacionales incluidos en esas cuatro páginas** y vincula sus fichas individuales. No incluye reservas nacionales ni monumentos naturales.

## Archivos

| Archivo | Uso | Cobertura |
| --- | --- | --- |
| `parks.json` | ID estable, nombre, región orientativa, URL del índice y ficha, ausencia de geometrías | 46/46 unidades del índice |
| `trails.json` | Senderos nombrados en fichas CONAF consultadas directamente | 37 entradas en 4 parques |
| `park_profiles_synced.json` | Metadatos y estado de descarga para las 46 fichas | **No generado todavía**; ejecutar sincronizador |
| `trails_synced.json` | Senderos extraídos de todas las fichas descargables | **No generado todavía**; ejecutar sincronizador |

El inventario de senderos inicial contiene 3 senderos concesionados nombrados de **Puyehue** (sin distancia ni sector asignado), 12 de **Queulat**, 14 de **Conguillío** y 8 de **Río Clarillo**. En Queulat, Conguillío y Río Clarillo las fichas publican longitudes, duraciones y dificultades; en Puyehue solo hay una referencia nominal a los tres senderos concesionados. La ausencia de otros senderos en el archivo **no implica que esos senderos no existan**.

**No se ha completado la extracción de las 46 fichas.** Este PR incluye un importador reproducible para hacerlo desde un entorno con conectividad a CONAF. No representar `trails.json` como catálogo nacional exhaustivo de senderos hasta ejecutar y revisar el sincronizador.

## Sincronización reproducible

Requisitos de un entorno de investigación (sin modificar el backend):

```powershell
python -m pip install requests beautifulsoup4 pytest
python scripts/sync_conaf_parks.py --check
python -m pytest scripts/tests/test_sync_conaf_parks.py -q
python scripts/sync_conaf_parks.py --output data/public/conaf
```

El comando recorre 46 fichas oficiales con `User-Agent`, tiempos de espera, reintentos acotados y pausas. Produce archivos nuevos **sin sobreescribir el catálogo curado**. Si alguna descarga falla, conserva explícitamente `source_unavailable` y termina con código de error; el operador debe revisar las fichas no disponibles y corregir problemas de extracción antes de incorporar la salida al producto.

### Validaciones exigidas antes de publicar una nueva extracción

1. Comparar cantidad de parques procesados con el índice de CONAF.
2. Revisar encabezados, URL y fechas de consulta.
3. Revisar manualmente las secciones de senderos difíciles de parsear.
4. Confirmar que cada nombre, duración, longitud y dificultad proviene de la **misma ficha**.
5. Resolver ambigüedades entre recorrido total y solo ida.
6. Comprobar cierres, restricciones y derechos de reutilización de datos en la fuente.
7. No deduplicar por nombre de sendero entre parques: usar `park_id` y nombre.
8. Pasar el control de repositorio y tests de sincronización.
9. Nunca convertir descripciones textuales en coordenadas inferidas.

## Significado de los campos

- `distance_m`: distancia indicada por CONAF, normalizada a metros; `null` si no se publicó.
- `duration_minutes`: duración publicada en minutos, `null` si es ambigua o ausente.
- `duration_basis`: `one_way`, `total` o `null` según la redacción oficial.
- `evidence_status`: diferencia un nombre mencionado de un sendero con ficha de longitud/dificultad.
- `opening_status: not_verified`: **no** equivale a sendero abierto.
- `geometry: null`: **no** existe trazado GPS validado de ese sendero en estos datos.
- `regions`: guía administrativa orientativa; confirmar cuando cruce límites y según ficha vigente.

Para senderos con peligro de avalanchas, crecidas, cierres estacionales o restricciones particulares, consultar siempre el aviso CONAF vigente. Por ejemplo, la ficha de Conguillío puede publicar restricciones temporales que no aplican a todos los senderos listados.

## Integración con Bosque Vivo

El piloto **Parque Nacional Puyehue / Anticura** permanece prioritario (ver [PILOT_PUYEHUE.md](../../../docs/PILOT_PUYEHUE.md)). Ninguno de los senderos del catálogo debe dibujarse como polilínea de navegación ni utilizarse para confirmar capturas a lo largo de una ruta sin geometría autorizada.

Próxima integración backend, en un PR separado:

- Modelo `Park` y `Trail`, preservando la procedencia.
- Endpoints `GET /parks`, `GET /parks/{park_id}` y `GET /parks/{park_id}/trails`.
- Estados de cobertura e incertidumbre explícitos.
- Geometrías solo desde fuentes oficiales o autorizadas.
- Verificación de condiciones antes de recomendar rutas.

No almacenar contenido extenso o fotografías con derechos no aclarados. Las referencias enlazan a los textos completos en CONAF.

## Fuentes

- https://www.conaf.cl/parques-nacionales/
- https://www.conaf.cl/tipo_parque/parque-nacional/
- https://www.conaf.cl/tipo_parque/parque-nacional/page/2/
- https://www.conaf.cl/tipo_parque/parque-nacional/page/3/
- https://www.conaf.cl/tipo_parque/parque-nacional/page/4/
- https://www.conaf.cl/parque_nacionales/parque-nacional-puyehue/
- https://www.conaf.cl/parque_nacionales/parque-nacional-queulat/
- https://www.conaf.cl/parque_nacionales/parque-nacional-conguillio/
- https://www.conaf.cl/parque_nacionales/parque-nacional-rio-clarillo/
