# Ejemplos de integración

- `bosque-vivo-client.ts`: cliente HTTP/WebSocket de referencia, TypeScript sin dependencias externas. Compilado con TypeScript 5.8 en modo `strict`.
- `facebook-login-web.ts`: referencia con `firebase` JS SDK, no ejecutable hasta configurar Firebase y el proveedor Facebook. No es un componente Expo nativo.
- `solicitudes-api.http`: solicitudes manuales con placeholders, sin tokens reales.
- `.env.example`: variables públicas a configurar en el proyecto oficial; no copiar claves privadas.

**En Expo React Native**, el tipo de archivo del `FormData` nativo puede representarse mediante `{uri, name, type}` y no como `Blob` web. Adaptar `transcribeWav` e `identifyPhoto` a las APIs de archivos/cámara elegidas por José. El código de ejemplo es un punto de partida, no código ya integrado ni validado en dispositivos físicos.

**Autenticación:** solo el intercambio de invitaciones está disponible actualmente. El intercambio de Firebase está en PR #42.

**Cuotas:** el backend mide microUSD reservados; presentar `~USD` y no contabilizar precios en el cliente.
