# Checklist de implementación y pruebas para José

Este archivo es una lista de entrega, no una orden para modificar automáticamente el frontend. José conserva la responsabilidad de diseño, estructura y UI/UX.

## Fase 1 — Hoy, sin depender de Facebook ni de Meta activo

- [ ] Configurar la URL pública de API como variable de entorno **no secreta**.
- [ ] Integrar `GET /parks`, `/species`, `/taxa` y `/knowledge/status`.
- [ ] Implementar estados vacíos, `loading`, error de red y sin cobertura.
- [ ] Implementar la autenticación BVS por invitación para evaluadores actuales.
- [ ] Guardar el token temporal con almacenamiento seguro en iOS/Android o memoria web.
- [ ] Implementar `GET /sessions/me`, renovación y logout.
- [ ] Usar `X-Correlation-ID` en reportes sin filtrar credenciales.
- [ ] Mostrar Wilo/identificación como indisponibles cuando Meta responde 503/501.
- [ ] Respetar que `opening_status=not_verified` no implica que los senderos estén abiertos.

## Fase 2 — Preparación para PR #42 (no habilitar aún al público)

- [ ] Preparar botón Facebook Login con una bandera de funcionalidad.
- [ ] Solicitar Firebase web config (público), App ID público y redirecciones aprobadas.
- [ ] Implementar el flujo Facebook → Firebase ID token → BVS `POST /sessions/federated/exchange`.
- [ ] Implementar `GET /me/quota` y `GET /me/permissions` como fuente de verdad.
- [ ] Mostrar cuota en USD **estimados por reservas**, nunca como saldo bancario.
- [ ] Mostrar `available`, `daily_limit`, `trial_exhausted`, `ai_disabled`, `suspended`, `no_cohort`.
- [ ] Probar `DELETE /me` con confirmación explícita y explicar los datos mínimos retenidos.
- [ ] Para Expo iOS/Android, preparar development build y configuración del SDK nativo.
- [ ] Revisar alternativa de Sign in with Apple y el manejo iOS Limited Login.
- [ ] Entregar URL web de producción a backend para configuración CORS.

## Fase 3 — Una vez activada Meta dentro del presupuesto

- [ ] Probar Wilo texto y mostrar fuentes, latencia e insuficiencia de evidencia.
- [ ] Probar transcripción PCM16 y revisión del texto antes de preguntar.
- [ ] Probar WebSocket con token válido, expirado, sin permiso y revocado.
- [ ] Probar reconocimiento de imagen dentro del catálogo y abstención fuera de catálogo.
- [ ] No convertir candidatos en identificaciones verificadas ni inventar confianza.
- [ ] No reintentar automáticamente solicitudes que puedan generar gasto.
- [ ] Probar límite 429 e interpretar `Retry-After`.
- [ ] Confirmar el consentimiento para procesamiento externo de texto/audio e imágenes.

## Casos de aceptación mínimos

| Caso | Resultado esperado |
| --- | --- |
| Sin sesión, petición protegida | 401 y pantalla de acceso |
| Token revocado o expirado | 401 y limpiar token |
| Usuario sin `identify` | 403, no subir imagen a Meta |
| Rate limit / presupuesto agotado | 429; mensaje comprensible y espera |
| Meta apagado para Wilo | 503; ofrecer Atlas, no respuesta inventada |
| Meta apagado para foto | 501; mostrar indisponible |
| Contradicción de especie | Mostrar evidencia y opción de otra foto |
| Parque sin geometría | Solo encuadre/ficha, sin ruta inventada |
| Cierre de sesión | Revocar en backend y borrar token local |
| Login Facebook antes de activación | Botón oculto/deshabilitado, sin credenciales de prueba incrustadas |

## Evidencia a entregar al backend

- URL web de producción (origen CORS exacto).
- Plataformas que se publicarán (web/iOS/Android) y Bundle ID/Package ID, solo cuando estén definidos.
- SHA de integración, capturas de UI sin tokens, resultados de pruebas y `X-Correlation-ID` de errores.
- Registro de qué endpoints efectivamente se probaron y bajo qué revisión del backend.
