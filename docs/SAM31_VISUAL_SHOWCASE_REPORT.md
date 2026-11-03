# Showcase visual de SAM 3.1 — Bosque Vivo, 02-11-2026

Demostración construida **solo con máscaras reales de `sam-3.1`** (Meta Model API, Standard
Mode) sobre medios con licencia compatible. Las exportaciones son privadas y están fuera de
Git, en `D:/data/bosque-vivo/sam31/exports`, con `provenance.json`. Método y métricas en la
[evaluación](SAM31_BIODIVERSITY_VISUAL_EVALUATION.md).

## Exportaciones

| Archivo | Formato | Contenido |
| --- | --- | --- |
| `BOSQUE_VIVO_SAM31_SHOWCASE.mp4` | 1920×1080, H.264, 30 FPS | Video principal (14 bloques) |
| `BOSQUE_VIVO_SAM31_SHOWCASE_vertical.mp4` | 1080×1920, H.264, 30 FPS | Mismo guion en formato vertical |
| `clip-plantas.mp4`, `clip-arboles.mp4`, `clip-animales.mp4`, `clip-hongos.mp4` | 1920×1080 | Bloques por categoría |
| `provenance.json` | JSON | Bloque → resultado, tiempos y fuentes |

**Honestidad del montaje:**

- Los videos de SAM se infirieron a 10 FPS. En la exportación a 30 FPS cada máscara se repite
  durante 3 cuadros: es el frame inferido anterior más cercano, sin interpolación.
- Los frames sin máscara se muestran sin máscara.
- Las fotos fijas no se animan con movimiento sintético.
- La única animación es el desvanecimiento de entrada y el pulso del contorno sobre máscaras
  reales.

## Guion y motivo de selección

| Bloque | Resultado | Prompt exacto | Por qué se eligió |
| --- | --- | --- | --- |
| Flora 1 | `plants-flora-246--c-flower` | `flower` | 12 inflorescencias individualizadas (tineo) |
| Flora 2 | `plants-asteranthera--muse-c` | `red tubular flower` (propuesto por Muse) | Muse elige el prompt y SAM segmenta 26 flores |
| Sotobosque | `plants-fern-a--c-plant` | `plant` | Regiones de helecho; el rótulo declara que `fern` dio 0 |
| Árboles | `trees-flora-213--c-tree` frente a `--box` | `tree` frente a una caja | Comparación concepto / selección espacial |
| Fauna 1 | `vid-vanellus--c-bird` | `bird` (video) | Queltehue, especie presente en Chile: 100/100 frames con ID estable |
| Fauna 2 | `vid-sanderlings640--c-bird` | `bird` (video) | Dos aves pequeñas con dos IDs persistentes |
| Límite | `birds-fauna-95--c-bird` | `bird` | 8 máscaras para ~13 aves: muestra una omisión |
| Hongos 1 | `vid-fungi--c-mushroom` | `mushroom` (video) | Dos hongos seguidos durante 100 frames |
| Hongos 2 | `fungi-fungi-24--c-fungus` | `fungus` | 30 cuerpos de *Cyttaria* sobre un tronco |
| Hongos 3 | `fungi-fungi-20--muse-c` | `orange bumpy sphere` (Muse) | Donde `mushroom` y `fungus` dieron 0 |
| SAM + Muse 1 | `birds-fauna-7--c-bird` | `bird` + identificación | Máscara, recorte, candidato y estado, separados |
| SAM + Muse 2 | `fungi-fungi-36--box` | Cajas + identificación | Hongo bien segmentado; la especie cambia entre foto y recorte, así que no es concluyente |

Los bloques de SAM + Muse muestran cuatro capas que nunca se mezclan:

1. «SAM: objeto segmentado»;
2. «Muse (candidato)»;
3. el taxón del catálogo;
4. «Estado: experimental, no verificado».

## Derechos de los medios

| Medio | Licencia | Fuente |
| --- | --- | --- |
| Queltehue | CC BY 2.0 | [Commons](https://commons.wikimedia.org/wiki/File:Vanellus_chilensis_Southern_Lapwing._video.webm) |
| Playeros | CC BY-SA 4.0 | [Commons](https://commons.wikimedia.org/wiki/File:Sanderlings-1014334,_Dingle_Peninsula,_Co._Kerry,_Ireland.webm) |
| Hongos bajo la lluvia | CC BY-SA 4.0 | [Commons](https://commons.wikimedia.org/wiki/File:Mushroom_forest_video.webm) |
| Fotograma del cañón de helechos | CC0 | [Commons](https://commons.wikimedia.org/wiki/File:Fern_Canyon_in_Prairie_Creek_Redwoods_State_Park.webm) |
| Fotos de flora, aves y hongos | CC BY / CC BY-SA por medio (iNaturalist, Commons) | Autor y URL en cada bloque y en [`scenes.json`](../evaluations/sam31/scenes.json) |

- **Atribución.** Cada bloque lleva en pantalla el autor o título, la licencia y la URL.
- **Share-alike.** Las obras derivadas de material CC BY-SA deben distribuirse con la misma
  licencia.
- **Excluido:**
  - el video del queltehue con nido (privado);
  - el material Hepta;
  - el video de referencia de Meta, que sirvió solo como referencia de estilo, sin copiar
    fotogramas, máscaras ni montaje.

## Visor privado

`python -m tools.meta_sam_api_lab serve --output <lab> --config <cfg> --showcase D:/data/bosque-vivo/sam31`
abre `http://127.0.0.1:8876/showcase`:

- dominio y resultado;
- 8 modos de visualización y comparación A/B;
- línea de tiempo y confianza por frame;
- instancias con visibilidad y aislamiento;
- panel Muse separado.

Abrir un resultado nunca vuelve a llamar a Meta.

## Guion de demostración en vivo (2 min)

1. **Visor `/showcase`.** Abrir `birds-fauna-209--c-bird`: 4 bandurrias, 4 colores. Pasar a
   «fondo oscurecido» y aislar una.
2. **Video del queltehue.** Reproducir y avanzar frame a frame. Mostrar la curva de confianza
   y el objeto de borde del frame 84: «no verificable».
3. ***Cyttaria*, fallo y solución.** Comparar A/B `fungi-fungi-20--c-mushroom` (0 máscaras)
   con `--muse-c` (6) y con `--box` (4).
4. **Identificación.** Mostrar el panel Muse de `fungi-fungi-36--box`: foto completa
   *C. espinosae*, recorte *C. hariotii*, conclusión «no concluyente».
5. **Cierre.** SAM localiza y delimita; Muse sugiere; Bosque Vivo verifica y declara la
   incertidumbre.

## Actualización 03-11-2026

Las nuevas piezas (pitch, principal ampliado, técnico y vertical) y el guion narrativo están
en [SAM31_FINAL_DEMO_PRODUCTION.md](SAM31_FINAL_DEMO_PRODUCTION.md). Las exportaciones de
esta página no cambian.
