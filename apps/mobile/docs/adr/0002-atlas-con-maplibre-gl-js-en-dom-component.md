---
status: accepted
fecha: 2026-10-27
---

# El Atlas usa MapLibre GL JS dentro de un Expo DOM component, no un SDK de mapas nativo

El Atlas debe ofrecer siempre una vista 2D y, como opción, una vista 3D con elevación del terreno, imagen satelital y, si el backend lo permite, altura de copa CHMv2 como superficie. MapLibre Native (base de `@maplibre/maplibre-react-native`) no soporta terreno 3D en Android ni iOS según la especificación de estilos consultada el 27-10-2026, mientras que MapLibre GL JS sí. Se decidió renderizar el mapa con MapLibre GL JS dentro de un Expo DOM component (WebView), de modo que 2D y 3D sean el mismo motor y el 3D sea un interruptor (activar terreno e inclinar la cámara).

## Opciones consideradas

- **`@maplibre/maplibre-react-native`**: rendimiento y gestos nativos, sin terreno 3D. Queda como alternativa si el 3D se abandona.
- **`@rnmapbox/maps`**: terreno 3D nativo, pero SDK propietario, token, precios por uso y términos de Mapbox.

## Consecuencias

- Un spike de medio día en un Android físico valida la fluidez del 3D antes de comprometerlo. Si falla, el 3D se desactiva y el 2D sigue en el mismo motor.
- Las peticiones a la API se hacen desde el lado React Native y se pasan al mapa como props serializables, para no depender de CORS dentro del WebView ni duplicar el cliente HTTP.
- La accesibilidad del mapa es menor que la de componentes nativos; se compensa con una lista textual de observaciones equivalente al mapa.
- Un futuro mapa offline (paquetes de teselas) debe resolverse en el WebView o en un SDK nativo; se reevalúa cuando sea prioridad.

Fuentes: [Terrain – MapLibre Style Spec](https://maplibre.org/maplibre-style-spec/terrain/), [Sources – MapLibre Style Spec](https://maplibre.org/maplibre-style-spec/sources/), [3D Terrain – MapLibre GL JS](https://maplibre.org/maplibre-gl-js/docs/examples/3d-terrain/).
