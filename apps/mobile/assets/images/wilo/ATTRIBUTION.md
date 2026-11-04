# Wilo, el huillín (mascota)

Recortes de una sola hoja de arte de personaje (cuatro poses) aportada por el equipo (José) el 02-11-2026 para la presentación del primer inicio. Cada pose se separó con fondo transparente y se redujo a 720 px de ancho como máximo; el trazo no se editó.

| Archivo | Pose | Uso |
| --- | --- | --- |
| `wilo-greet.png` | De pie, mirando hacia arriba | Paso Identificar (saludo) |
| `wilo-swim.png` | Nadando | Paso Mapa |
| `wilo-sniff.png` | Olfateando una piedra | Paso Especies |
| `wilo-happy.png` | Sentado, contento | Paso Diario |

**Splash** (03-11-2026): `assets/images/splash-wilo.png` es `wilo-greet.png` reducido al 66 % de un lienzo transparente de 1024 × 1024, centrado, para que quepa en el círculo con que Android 12+ recorta el ícono del splash; el trazo no se editó. El splash animado (`src/features/splash/splash-overlay.tsx`) usa `wilo-greet.png` directamente. El morado de la marca WiloQuest (`wilo` #8E4EC0 y `wiloDeep` #61239C en `src/ui/tokens/theme.ts`) se muestreó de este arte.

Pendiente: registrar el origen y la licencia del arte original (autoría o herramienta de generación) antes de publicar la app. No es material de Hepta ni un dato del proyecto.
