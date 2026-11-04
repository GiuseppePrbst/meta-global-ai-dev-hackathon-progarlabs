# Referencias canónicas del repositorio

**El paquete es una guía; los contratos canónicos son estos archivos en GitHub.** Para evitar desincronización, las referencias quedan ancladas a commits.

## Rama principal (post PR #39–41)

`main` verificada al preparar esta entrega: `9e70ed22d90bdd0cd06d7ed8e1f5ef73ca580d4e`.

- [FRONTEND_HANDOFF.md — main](https://github.com/GiuseppePrbst/meta-global-ai-dev-hackathon-progarlabs/blob/9e70ed22d90bdd0cd06d7ed8e1f5ef73ca580d4e/docs/FRONTEND_HANDOFF.md)
- [SESSION_AUTH_CONTRACT.md — main](https://github.com/GiuseppePrbst/meta-global-ai-dev-hackathon-progarlabs/blob/9e70ed22d90bdd0cd06d7ed8e1f5ef73ca580d4e/docs/SESSION_AUTH_CONTRACT.md)
- [WILO_VOICE_API_HANDOFF.md — main](https://github.com/GiuseppePrbst/meta-global-ai-dev-hackathon-progarlabs/blob/9e70ed22d90bdd0cd06d7ed8e1f5ef73ca580d4e/docs/WILO_VOICE_API_HANDOFF.md)
- [API_INTEGRATION.md — main](https://github.com/GiuseppePrbst/meta-global-ai-dev-hackathon-progarlabs/blob/9e70ed22d90bdd0cd06d7ed8e1f5ef73ca580d4e/docs/API_INTEGRATION.md)
- [OpenAPI 3.1 JSON — main](https://github.com/GiuseppePrbst/meta-global-ai-dev-hackathon-progarlabs/blob/9e70ed22d90bdd0cd06d7ed8e1f5ef73ca580d4e/docs/api/openapi.json)

## PR #42 — federación y cuotas (NO es producción)

Commit de revisión: `94e8bfedfefd9c494268afd3278ef65eeef1c069`.

- [FEDERATED_LOGIN.md — PR42](https://github.com/GiuseppePrbst/meta-global-ai-dev-hackathon-progarlabs/blob/94e8bfedfefd9c494268afd3278ef65eeef1c069/docs/FEDERATED_LOGIN.md)
- [FRONTEND_HANDOFF.md — PR42](https://github.com/GiuseppePrbst/meta-global-ai-dev-hackathon-progarlabs/blob/94e8bfedfefd9c494268afd3278ef65eeef1c069/docs/FRONTEND_HANDOFF.md)
- [SESSION_AUTH_CONTRACT.md — PR42](https://github.com/GiuseppePrbst/meta-global-ai-dev-hackathon-progarlabs/blob/94e8bfedfefd9c494268afd3278ef65eeef1c069/docs/SESSION_AUTH_CONTRACT.md)
- [OpenAPI completo — PR42](https://github.com/GiuseppePrbst/meta-global-ai-dev-hackathon-progarlabs/blob/94e8bfedfefd9c494268afd3278ef65eeef1c069/docs/api/openapi.json)
- [Ejemplo UI Facebook Login — PR42](https://github.com/GiuseppePrbst/meta-global-ai-dev-hackathon-progarlabs/blob/94e8bfedfefd9c494268afd3278ef65eeef1c069/apps/experiments/wilo-lab/src/components/FederatedLogin.tsx)
- [PR #42](https://github.com/GiuseppePrbst/meta-global-ai-dev-hackathon-progarlabs/pull/42)

## PR #43 — controles de costos (NO es producción)

- [PR #43](https://github.com/GiuseppePrbst/meta-global-ai-dev-hackathon-progarlabs/pull/43)
- Modifica reserva de Wilo a USD 0,10 y limita el número de senderos por respuesta. No es un contrato de UI ni debe codificarse como precio en la app.

## OpenAPI ejecutable y verificación

- [OpenAPI de la API desplegada](https://api-bosquevivo.progarlabs.com/openapi.json) — corresponde a lo que realmente está funcionando, aunque esté detrás del modo demo.
- [Documentación Swagger ejecutable](https://api-bosquevivo.progarlabs.com/docs)

**Importante:** la copia de OpenAPI PR42 no sustituye la copia de producción hasta que su PR sea fusionado, se aplique migración 008 y se despliegue la nueva revisión.

El script `descargar_contratos_originales.ps1` permite copiar esos Markdown y el JSON completo desde GitHub a una carpeta local cuando el equipo lo necesite.
