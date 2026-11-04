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

**Wilo articulado** (04-11-2026): `greet/` contiene `wilo-greet.png` separado en capas del mismo lienzo (720 × 688) para animarlo por partes en la presentación (`src/features/onboarding/wilo-greet-rig.tsx`): `tail`, `body`, `head`, `ear`, `nose` y `marks`. Se generan con `node scripts/slice-wilo-greet.cjs assets/images/wilo/wilo-greet.png assets/images/wilo/greet` (desde `apps/mobile`); las capas se solapan en las articulaciones para que no aparezcan huecos al girar y, recompuestas, reproducen el original sin huecos. Son recortes: el trazo no se editó. Los párpados del parpadeo se dibujan en código con colores muestreados del pelaje.
