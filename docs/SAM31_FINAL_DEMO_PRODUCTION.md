# SAM 3.1 — producción de la demo final, 03-11-2026

Material privado en `D:/data/bosque-vivo/sam31/exports-v2`, fuera de Git, con
`provenance.json`.

- Solo contiene máscaras reales de SAM 3.1.
- Los videos se infirieron a 10 o 15 FPS y se exportan a 30 FPS repitiendo el frame inferido
  anterior, **sin interpolar**.
- Las fotos fijas no llevan movimiento sintético.

## Piezas

| Archivo | Uso | Contenido |
| --- | --- | --- |
| `BOSQUE_VIVO_SAM31_PITCH_SEGMENT.mp4` (1920×1080, ~32 s) | Bloque para el video competitivo de 3 min | Helechos (concepto de Muse), troncos, choroyes, tracking del queltehue, 99 *Cyttaria*, SAM + Muse |
| `BOSQUE_VIVO_SAM31_SHOWCASE_v2.mp4` (~42 s) | Video principal ampliado | El pitch más helechos chilenos y hongos en video |
| `BOSQUE_VIVO_SAM31_TECHNICAL.mp4` (~70 s) | Revisión técnica | Barras de IoU, fallo del cañón de helechos, falso positivo frente a caja, corrección en el frame 80, *Cyttaria* no concluyente |
| `BOSQUE_VIVO_SAM31_SHOWCASE_v2_vertical.mp4` (1080×1920) | Móvil y redes | Mismo guion que el pitch |
| `stills/*.png` (10) | Diapositivas, README privado, pitch | Frondas, *Cyttaria*, choroyes, carpinteros, bandurrias, troncos, flores |

Las piezas de la campaña 1 (`exports/`) se conservan sin cambios.

## Guion narrativo (no presentar propuestas como implementadas)

| Escena | Qué se ve | Estado real |
| --- | --- | --- |
| 1. Bosque Vivo y Puyehue | Título; territorio piloto | Contenido real del catálogo (PR #25); los medios de SAM **no son de Puyehue** |
| 2. El usuario explora | — | **Prototipo de UI** (apps de José); no está en este material |
| 3. SAM encuentra organismos | Helechos, troncos, aves, *Cyttaria* con máscaras por instancia | **Real** (inferencias guardadas) |
| 4. Seguimiento en video | Queltehue y hongos con ID estable | **Real**; IoU por frame 0,89 frente a la referencia del agente |
| 5. El visitante selecciona un organismo | Instancia aislada con recorte | Real en el laboratorio; en la app, **propuesta** |
| 6. Muse propone una identificación | «Muse (candidato): Carpintero negro», estado experimental | Real (Spark); fauna y hongos sin endpoint productivo |
| 7. El catálogo informa | Taxón y estado RCE | Real en `/taxa`; la integración con la captura es **propuesta** |
| 8. Colección y aprendizaje | — | Capturas privadas reales (`/captures`); la experiencia integrada es **prototipo** |

Narración sugerida para el bloque SAM:

> SAM 3.1 encuentra y delimita organismos. Cuando una palabra no basta, Muse describe lo que
> ve y SAM lo vuelve a buscar. Muse sugiere una especie y Bosque Vivo la presenta como
> candidata, con su ficha científica y su incertidumbre.

## Procedencia y derechos

- Cada bloque muestra en pantalla el autor o título, la licencia y la URL. `provenance.json`
  lista bloque → resultado → tiempos.
- Material CC BY-SA en el montaje: las derivadas se distribuyen con la misma licencia.
- **Excluido:**
  - Hepta;
  - el video con nido;
  - el video de referencia de Meta;
  - las fotos de Codex con GPS, todavía no entregadas.

## Visor para la demo en vivo

```bash
uv run --project services/api --frozen python -m tools.meta_sam_api_lab serve --output <lab> --config <cfg> --showcase D:/data/bosque-vivo/sam31
```

Abre `http://127.0.0.1:8876/showcase`. Novedades:

- **Etiquetas de galería:** Éxito, Limitación, Comparación, Multiinstancia, Tracking,
  Muse + SAM y Sin coincidencias.
- **Panel de métricas:** IoU, Dice, Boundary F1, omisiones y falsos positivos, siempre con el
  estado de la referencia.
- **Identificaciones:** Spark y Wonder por variante.
