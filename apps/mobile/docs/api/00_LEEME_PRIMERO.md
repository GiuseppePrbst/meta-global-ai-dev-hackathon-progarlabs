# Entrega técnica para José — Bosque Vivo

**Fecha de corte:** 4 de noviembre de 2026  
**Responsable de frontend oficial:** José  
**Repositorio:** https://github.com/GiuseppePrbst/meta-global-ai-dev-hackathon-progarlabs  
**API HTTPS:** https://api-bosquevivo.progarlabs.com

## 1. Qué puedes integrar hoy

El backend de producción ofrece consultas de parques, senderos, especies y Atlas, así como sesiones temporales por invitación (`/sessions/exchange`, `/sessions/me`, `/sessions/refresh`, `/sessions/logout`). Los clientes autenticados disponen de Wilo, transcripción e identificación a nivel contractual; sin embargo, **Meta Model API está deshabilitado**: Wilo retorna 503 e identificación 501, sin generar llamadas pagadas. Esto no es un defecto del frontend.

**Producción reportada por el agente local:** Cloud Run `bosque-vivo-api-00011-don`, imagen del commit `9e70ed22d90b`, migraciones 001–007 aplicadas. Este dato procede del informe de despliegue del agente; el estado exacto debe comprobarse antes de la integración final.

## 2. Qué NO está disponible todavía para usuarios reales

- **Inicio de sesión Facebook/Firebase:** implementado y probado en el **PR #42**, pero el PR continúa abierto. Aún faltan configurar Firebase Authentication, crear la app de Meta for Developers, habilitar el proveedor Facebook y validar el acceso público. En producción no debes asumir que funciona `POST /sessions/federated/exchange`.
- **Cuota por usuario / cohorte:** implementada en el **PR #42**, sin migración 008 aplicada ni activación cloud. No asumir disponibilidad productiva de `GET /me/quota` y `GET /me/permissions`.
- **Nuevas reservas de costo por operación:** PR #43, no fusionado. El cálculo propuesto para Wilo cambia a USD 0,10 de reserva. No fijar estas cantidades en el cliente.
- **Inferencia real Meta:** apagada hasta terminar configuración, migraciones y verificaciones económicas. La autorización total del propietario es hasta USD 100; eso **no** significa que la IA esté ya encendida.
- **URL del frontend web productivo:** pendiente. Debe informarse a backend para agregarla a CORS. iOS/Android nativos no dependen de CORS.

## 3. Archivos incluidos

1. `01_ESTADO_Y_MATRIZ_API.md` — qué rutas funcionan, cuáles son futuras y cómo manejar estados.
2. `02_LOGIN_FACEBOOK_FIREBASE.md` — flujo federado, requerimientos web/Expo, configuración faltante.
3. `03_SESIONES_CUOTAS.md` — sesiones BVS, cuota individual, errores, privacidad y límites.
4. `04_WILO_VOZ_IDENTIFICACION.md` — contratos funcionales de texto, audio, WebSocket y fotografía.
5. `05_CHECKLIST_JOSE.md` — plan de implementación y criterios de aceptación sin tocar backend.
6. `06_REFERENCIAS_OFICIALES.md` — enlaces al OpenAPI y documentos fuente en GitHub, anclados a commits.
7. `ejemplos/bosque-vivo-client.ts` — cliente TypeScript de referencia, independiente de React Native/Firebase.
8. `ejemplos/facebook-login-web.ts` — ejemplo web conceptual con Firebase SDK (se compila cuando esté instalado `firebase`).
9. `ejemplos/solicitudes-api.http` — peticiones de ejemplo sin secretos reales.
10. `ejemplos/.env.example` — variables públicas, nunca claves administrativas.
11. `descargar_contratos_originales.ps1` — descarga las versiones *completas* de documentación y OpenAPI desde GitHub, ancladas al commit de PR #42.

## 4. Orden recomendado para José

1. Leer `01`, `03` y `04`; integrar Atlas y el flujo de invitaciones que sí funcionan ahora.
2. Diseñar la interfaz para mostrar estados `401`, `403`, `429`, `501`, `502` y `503` sin tratarlos todos como errores genéricos.
3. Preparar el botón Facebook Login con bandera de funcionalidad, pero **no** habilitarlo hasta que la configuración externa, PR #42 y migración 008 estén listos.
4. Incorporar una pantalla de cuota que consulte el servidor, sin calcular saldos en el frontend.
5. Implementar el flujo de Wilo y cámara respetando consentimiento, abstención y ausencia de cobertura GIS.
6. Ejecutar las pruebas del checklist con una identidad de desarrollo autorizada; no incrustar `cloud-demo`.

## 5. Seguridad

**Nunca introducir** en `EXPO_PUBLIC_*`, `NEXT_PUBLIC_*`, JS, archivos del repositorio o capturas: `MODEL_API_KEY`, `ORIGIN_AUTH_TOKEN`, `DEMO_TOKENS`, tokens administrativos, `DATABASE_URL`, Facebook App Secret o claves de servicio. Solo se admite la configuración *pública* de Firebase, URL de API y los tokens temporales obtenidos legítimamente por el cliente.

**Importante:** este paquete es una guía de transferencia. La fuente de verdad ejecutable siempre es la especificación OpenAPI del SHA que está desplegado, no un ejemplo redactado a mano.
