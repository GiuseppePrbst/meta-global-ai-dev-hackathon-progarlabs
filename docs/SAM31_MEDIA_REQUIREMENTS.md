# SAM 3.1 — requisitos de material audiovisual, 03-11-2026

Pedido de Opus (Meta Visual Intelligence) a Codex (Content & Media Intelligence). Opus
**consume** el manifiesto de escenas de Codex ([SAM_MEDIA_HANDOFF.md](SAM_MEDIA_HANDOFF.md),
fusionado el 03-11-2026) y no lo reescribe. Bloqueo actual: el titular todavía no confirmó el
procesamiento externo de ese material. Hasta entonces no se envía a Meta.

## Reglas para cada medio

- Licencia del medio individual compatible con el procesamiento en Meta y con derivados
  (CC0, CC BY o CC BY-SA, o material propio autorizado). Se registran autor y URL.
- Sin EXIF, GPS ni personas identificables en la versión que se envía a Meta. Los originales
  quedan intactos en el worktree de Codex.
- **Créditos gratuitos.** El contenido puede usarse para mejorar productos de Meta, así que
  no se envía material confidencial ni Hepta.
- Procedencia declarada. Las fotos de Osorno y Lago Ranco se rotulan como «Bosques y
  vegetación del sur de Chile», no como Puyehue.

## Escenarios que faltan (prioridad)

| Prioridad | Escenario | Por qué | Formato deseado |
| --- | --- | --- | --- |
| 1 | Helechos en primer plano nítido, varias plantas separadas | `fern` funciona así (7/9); falta material chileno de sotobosque | Foto ≥ 1280 px, frondas completas |
| 1 | Video de ave en movimiento en bosque chileno (chucao, rayadito, carpintero) | Ningún video actual es de bosque nativo | MP4 H.264, 10–30 s, cámara estable |
| 2 | Árbol aislado y grupo de árboles desde sendero | Medir caja frente a concepto con referencias | Foto con cielo visible, sin contraluz extremo |
| 2 | Hongos sobre tronco o suelo, fuera de *Cyttaria* | Ampliar la morfología probada | Foto cercana y otra a 1–2 m |
| 3 | Video lento de sotobosque o sendero (los `IMG_5097`/`IMG_5098` de Codex) | Tracking de plantas con cámara en movimiento | MP4, ≤ 30 s, sin GPS en metadatos |
| 3 | Vista aérea autorizada | Copas desde arriba, con material público y licencia | Ortofoto o dron con licencia explícita |

## Entrega esperada

Un manifiesto privado JSON con una entrada por medio:

- `scene_id`;
- `file`: ruta privada de la versión preparada y sin metadatos;
- `license`, `author` y `source_url`;
- `domain`: plantas, árboles, aves u hongos;
- `provenance_text`;
- `exif_removed: true`.

Opus añade sus propias referencias de segmentación sin tocar los originales.
