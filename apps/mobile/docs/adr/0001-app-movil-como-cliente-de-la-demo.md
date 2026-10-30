---
status: accepted
fecha: 2026-10-27
---

# La app móvil React Native es el cliente de la demo competitiva

El público prioritario (turista adulto y quien aprende botánica) usa el producto en terreno, con cámara, luz variable y conectividad irregular, y la demo debe mostrar ese recorrido. Por eso se decidió que una app React Native (Expo) en `apps/mobile` reemplace a la web como interfaz principal de la entrega del 4 de noviembre de 2026. `apps/web` queda congelada como banco de pruebas y no se elimina. La decisión revierte explícitamente la restricción «no añadir app nativa» de `docs/product/FEATURE_PRIORITIZATION.md`; el modo offline completo sigue fuera de alcance (la app solo tolera desconexión).

## Opciones consideradas

- **Web responsive como cliente de la demo**: ya existía y era más barata, pero la cámara, la ubicación y la experiencia en terreno quedan limitadas por el navegador, y no representa el producto buscado.
- **App y web en paralelo, demo web**: duplica el trabajo de frontend con una sola persona responsable durante la hackatón.

## Consecuencias

- Todo el trabajo de frontend del 28-oct al 4-nov se concentra en `apps/mobile`; la web no recibe funcionalidades nuevas.
- La demo depende de una API alcanzable desde un dispositivo físico (BV-09), no de `localhost`.
- `docs/DEMO_SCRIPT.md` debe reescribirse para el recorrido móvil cuando éste exista.
- Criterio para reconsiderar: si el 31-oct el recorrido P0 (Descubrimiento) no funciona de punta a punta en un Android físico, la demo vuelve a la web y la app se documenta como trabajo en curso.
