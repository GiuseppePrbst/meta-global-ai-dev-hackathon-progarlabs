# Contribuir a Bosque Vivo Chile

Leer primero [README](README.md), [AGENTS.md](AGENTS.md), [equipo](docs/TEAM_AND_GOVERNANCE.md) y [gobernanza de datos](docs/DATA_GOVERNANCE.md). Los roles funcionales no restringen qué archivos puede modificar una persona; sí requieren coordinar contratos y decisiones.

## Flujo de trabajo

1. Revisar el backlog y acordar un criterio de aceptación pequeño. José puede trabajar en web con fixtures mientras Giuseppe desarrolla servicios contra OpenAPI.
2. Partir de `main` actualizada y crear una rama; `chore/project-bootstrap` es la excepción de nombre solicitada para la inicialización. Para nuevas ramas usar el prefijo acordado en AGENTS.
3. Cambiar código, sus callers y tests necesarios. No añadir paquetes vacíos, dependencias pesadas ni opciones sin uso. Para cambios de contrato incluir ejemplo válido, error y actualización de clientes.
4. Ejecutar los checks aplicables del README, indicar qué no se pudo ejecutar y por qué. No declarar una prueba por estar escrita o configurada en CI.
5. Revisar archivos staged y permisos/licencias antes de cada publicación; nunca incluir `.env`, dumps, imágenes privadas ni datos Hepta/derivados.
6. Usar Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`), PR hacia `main`, revisión y tests antes de integrar; preferir squash merge. No force-push a `main`, merges sin revisar ni reescrituras destructivas.

## Identidad Git

Solo cuentas personales autorizadas de ProGarLabs, con correo Git verificable contra la cuenta autenticada. En esta inicialización la cuenta autorizada es `GiuseppePrbst`. Si la cuenta/correo no coincide o no puede verificarse, detener escrituras Git y corregir la configuración; no inventar correos ni autores. No usar bots ni añadir coautores que no realizaron el trabajo. Declarar asistencia automatizada sin atribuir a otra persona implementación manual.

No crear CODEOWNERS ni asignar usuarios GitHub deducidos de nombres. Fabiana es Product Designer/cofundadora en el ámbito empresarial, pero su participación competitiva sigue pendiente de autorización; no integrar/atribuir aportes directos a la entrega sin resolverlo.

## Contenido de un PR

Describir problema, comportamiento resultante, aceptación, comandos/resultados, límites y riesgos. Identificar lo desarrollado durante la hackatón y lo preexistente, fuentes/licencias y cualquier permiso requerido. Para datos añadir manifiesto; para resultados IA añadir modo real/mock, modelo/version, protocolo y evidencia sin secretos. Documentar decisiones transversales en `docs/ARCHITECTURE.md`.

Los fixtures deben estar rotulados; un mock nunca es una llamada real. Una fuente pública no permite copiar cualquier fotografía, y una sugerencia botánica no es una identificación confirmada. Ante incertidumbre, consultar una fuente primaria, documentar la duda y conservar el comportamiento explícitamente incompleto.
