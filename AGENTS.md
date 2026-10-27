# Bosque Vivo Chile: instrucciones para agentes

## Objetivo y alcance

Base reproducible para inteligencia botánica y geoespacial, piloto de referencia Puyehue. Completar recorridos de descubrimiento, atlas y análisis forestal con evidencia verificable. Predicción de crecimiento, invasoras e infraestructura queda fuera del MVP. Lee README, docs/ARCHITECTURE.md y el módulo antes de editar. Elige la menor solución completa; no crees paquetes vacíos.

## Módulos y colaboración

- `apps/web`: Next.js/TypeScript/Tailwind/MapLibre; José lidera la responsabilidad funcional.
- `services/api`: FastAPI/Pydantic y PostGIS; `services/botanical-ai` y `services/geospatial` contienen contratos y lógica ligera; Giuseppe lidera GIS/ML.
- `docs/product`: visión y requisitos. Fabiana lidera diseño de producto empresarial; **no está confirmada como participante admitida**. No atribuirle entregables competitivos sin permiso de organizadores.
- Todos pueden colaborar en cualquier módulo. El responsable funcional no determina quién hace commits ni concede permisos Git. No inventar usuarios ni CODEOWNERS.

## Contratos y calidad

La API documenta contratos en OpenAPI. Valida entradas en el backend, conserva errores y valida coordenadas WGS84, tamaño/tipo de imagen y derechos de uso. No presentes puntuaciones como probabilidades sin calibración. El mock debe identificarse y abstenerse; una integración no implementada debe fallar explícitamente. No añadas endpoints/modelos Meta de memoria: consulta documentación oficial actual y registra fuente, versión y límites. No activar llamadas reales sin credenciales válidas y permiso para la imagen.

Antes de un PR ejecuta lint, formato, tests, typecheck y build descritos en README, más la prueba mínima que demuestre la nueva lógica. Prueba cambios de contratos en ambos extremos. Usa mocks para servicios externos en CI. Ejecuta Playwright si cambian recorridos. Registra comandos y resultados reales, y marca como no ejecutado lo que requiera infraestructura ausente. No uses logs con imágenes, coordenadas personales, claves ni respuestas sensibles.

## Datos y ciencia

Lee docs/DATA_GOVERNANCE.md y docs/DATASET_LICENSES.md. Hepta, LiDAR, imágenes aéreas de terceros, infraestructura y sus derivados son RESTRICTED: no descargar, publicar, procesar externamente, entrenar ni almacenar en el repositorio/worktrees sin autorización específica. No construir fixtures de ellos. Usa datos sintéticos inequívocos o públicos con licencia, fuente, fecha, versión, atribución, redistribución, procesamiento y responsable de validación. No inventar presencia de especies, coordenadas de individuos, rutas oficiales ni métricas. CHMv2 estima altura de copa; no mide crecimiento anual.

## Git y publicación

Cuenta autorizada para este bootstrap: `GiuseppePrbst`. Antes de cualquier escritura Git verifica `gh api user --jq .login`, identidad local y pertenencia del correo a la cuenta mediante correos verificados. Si no puede verificarse, detén operaciones Git y solicita corrección; continúa solo trabajo local seguro. No usar autorías de bots, agentes o terceros. No agregar coautores ficticios. El uso de asistencia se documenta en docs/HACKATHON_CONTRIBUTIONS.md.

`main` estable, ramas de trabajo, Conventional Commits y PR revisado, preferencia squash. No force push, no reescritura destructiva, no merge automático ni borrado de trabajo ajeno. Este bootstrap se desarrolla en `chore/project-bootstrap` después del commit raíz. Antes de cada push inspecciona todos los archivos staged/versionados y ejecuta el escáner de secretos. No publiques con cuenta externa diferente ni ante cambios remotos inesperados.

## Trazabilidad y decisiones

Documenta decisiones que afecten contratos, versiones, licencias o arquitectura en docs/ARCHITECTURE.md y las fuentes en docs/SOURCES.md. Separa implementado, mock, investigado y pendiente. Mantén docs/HACKATHON_CONTRIBUTIONS.md con fechas del evento, código nuevo y dependencias/datasets preexistentes; nunca deduzcas elegibilidad del mero historial Git. Ante incertidumbre consulta fuentes oficiales y deja un bloqueo verificable; no finjas una prueba, una autorización o una integración funcional. Lee docs/BOOTSTRAP_REPORT.md para el estado de entrega.
