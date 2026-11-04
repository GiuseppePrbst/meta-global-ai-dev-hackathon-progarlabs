# Wilo Lab — laboratorio web independiente de Bosque Vivo

Aplicación **experimental y autónoma**. No es el frontend oficial (`apps/web`, de José) ni lo modifica,
no importa sus componentes/rutas/estilos y no agrega dependencias allí. Vive en
`apps/experiments/wilo-lab/` con su propio `package.json`, lockfile, estilos y puerto (**3001**).

## Qué prueba

| Módulo | Capacidad real | Endpoints (sin inventar) |
| --- | --- | --- |
| A. Habla con Wilo | Voz WAV → transcripción corregible → respuesta con fuentes, historial de sesión y TTS del dispositivo | `POST /guide/transcribe`, `POST /guide/query`, `GET /parks`, `/parks/{id}`, `/trails`, `/map`, `/knowledge/status` |
| B. Explora una especie | Foto → pipeline de conjunto abierto (8 árboles) con evidencia y abstención | `POST /identify`, `GET /species`, `GET /taxa/{id}` (vínculo verificado) |

Modelos tras el backend: Muse Voice Transcribe 1.0 (voz), Muse Spark 1.3 (guía e identificación),
estrategia `verify`. **El pipeline de identificación no emite puntajes ni probabilidades**: emite
candidatos con evidencia textual, `catalog_assessment` y `acceptance` (aceptada = presentable, nunca verificada).
La clave Meta vive solo en el backend; aquí solo viaja el token demo de `DEMO_TOKENS` que pega el usuario.

Modos: `meta` (real), `mock` (siempre etiquetado, sin inferencia) y no disponible (errores 401/429/502/503 con estado propio).

## Ejecutar

Requisitos: Node 24, la API de Bosque Vivo en `http://localhost:8000`.

```bash
# API (mock sin claves, o Meta con credenciales del backend)
uv run --project services/api --extra dev --frozen uvicorn bosque_api.main:app --port 8000
```

```bash
cd apps/experiments/wilo-lab && npm ci && npm run dev
```

Abrir **http://localhost:3001**. El backend debe permitir este origen: arráncalo con
`CORS_ORIGINS='["http://localhost:3000","http://localhost:3001"]'` (por defecto solo trae el 3000 oficial).
`/identify` se llama sin token, como el cliente oficial: en modo local, enviar el token demo haría que el
backend intente guardar evidencia privada y exija PostGIS (migración 004); en modo demo sí requiere identidad + PostGIS.

Variables: `VITE_API_URL` (ver `.env.example`). Puerto fijo 3001 en `vite.config.ts`, independiente del 3000 oficial.

## Pruebas

```bash
npm test          # Vitest: WAV, bbox, contratos /guide e /identify sin puntajes
npm run typecheck # tsconfig.json (navegador: src, tests) + tsconfig.node.json (Node: e2e, configs)
npm run build     # typecheck + vite build
npm run test:e2e  # Playwright (chromium + mobile) con APIs simuladas a nivel HTTP
```

La validación contra servicios reales (API en mock, sin llamadas pagadas a Meta) está registrada en el PR:
conversación por texto, grabación/transcripción con micrófono simulado del navegador, corrección de
transcripción, historial, ficha de parque con bbox y abstención fotográfica del mock.

## Límites honestos

- Sin credenciales Meta válidas no hay respuestas ni identificaciones reales: el mock se abstiene y se etiqueta.
- La identificación por foto solo respalda 8 especies de árboles; fauna y hongos deben terminar en abstención.
- Sin geometría de senderos: el mapa solo encuadra el `bbox`; `not_verified` nunca significa abierto.
- Este laboratorio no se despliega públicamente ni reemplaza al frontend oficial.
