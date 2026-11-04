---
status: accepted
fecha: 2026-11-02
---

# El visor 3D de especies usa three.js dentro de un Expo DOM component

La ficha de especie abre un visor 3D a pantalla completa (`src/app/model/[id].tsx`). Mientras no existan modelos de especies, muestra un modelo de prueba: el trofeo de la hackatón, aportado por el equipo como OBJ el 02-11-2026 y rotulado «Modelo de prueba» en el visor. Se renderiza con **three.js 0.186.1** (`OBJLoader`, `OrbitControls`, `RoomEnvironment`) dentro de un Expo DOM component (`src/model-viewer/model-viewer.tsx`), el mismo mecanismo que el mapa ([ADR 0002](0002-atlas-con-maplibre-gl-js-en-dom-component.md)).

## Opciones consideradas

- **`expo-gl` + `expo-three`**: render nativo por GL, pero exige un módulo nativo y recompilar el dev client y el APK de la demo, a dos días del cierre.
- **`@google/model-viewer`**: carga glTF/GLB, no OBJ; habría que convertir cada modelo y el control de cámara y estilo es más limitado.
- **three.js en DOM component (elegida)**: JavaScript puro, sin recompilar; reutiliza el WebView ya probado del mapa; carga OBJ directamente y permite cambiar a glTF con `GLTFLoader` cuando lleguen modelos reales.

## Consecuencias

- El modelo de prueba viaja dentro del bundle del WebView (`src/model-viewer/test-model.ts`, ~218 KB de OBJ compactado: coordenadas a 0,01 mm, sin coordenadas de textura) para no depender de cómo Metro sirve archivos `.obj` dentro del WebView ni de la red. Los modelos de especies deberían llegar por URL desde la API, en glTF/GLB comprimido, y no al bundle.
- No vino el `.mtl`: el visor pone el color de cada material por nombre. La lámina `textos` llevaba sus letras en una textura; sin ella era un plano blanco que tapaba la placa, así que se oculta.
- El bundle del visor pesa ~1,5 MB (three.js incluido) y solo se carga al abrir el visor.
- Accesibilidad: el lienzo 3D no es navegable por lector de pantalla; el WebView lleva una etiqueta que dice qué es el modelo y cómo moverlo, y el visor no contiene información que no esté en la ficha.
- Con movimiento reducido no hay giro automático ni animación de entrada. En segundo plano no se dibuja.
- Verificado el 02-11-2026: render del bundle exportado (`expo export --platform android`) en Chromium sin GPU (SwiftShader). **No ejecutado:** prueba en Android físico (fluidez, gestos, memoria).

Fuentes: [three.js OBJLoader](https://threejs.org/docs/#examples/en/loaders/OBJLoader), [OrbitControls](https://threejs.org/docs/#examples/en/controls/OrbitControls), [Expo DOM components](https://docs.expo.dev/guides/dom-components/).
