# Laboratorio privado Meta SAM 3.1

Inferencia alojada exclusivamente en Meta. Herramienta de investigación independiente;
no cambia web, móvil ni contratos públicos de Bosque Vivo. Reutiliza cliente Meta,
preparación de imágenes, parser oficial y ledger PostgreSQL existentes. No instala
modelos, PyTorch, checkpoints ni SDK nuevos.

## Preparación

Desde la raíz, Python 3.12, uv, PostgreSQL y FFmpeg/FFprobe en PATH:

```powershell
uv sync --project services/api --extra dev --frozen
```

Crea un directorio privado **fuera de Git/worktrees y carpetas sincronizadas**.
Los ejemplos usan `<PRIVATE_ROOT>` como sustitución, no como ruta literal.
Configura una base/schema exclusivo persistente con `001_init.sql` y
`003_execution.up.sql` de `services/api/sql`, usando el procedimiento PostgreSQL
del proyecto. No reutilices ni borres reservas de otra misión. Conserva la base
entre reinicios: cambiar schema para eludir el límite no está autorizado.

Archivo privado `config.json`, nunca versionado:

```json
{
  "database_url": "<DSN_PRIVADO_CON_SEARCH_PATH_EXCLUSIVO>",
  "key_file": "<ARCHIVO_LOCAL_CON_UNA_CLAVE>",
  "budget_usd": 1,
  "rights_confirmed": true,
  "external_processing_authorized": true
}
```

Las banderas representan permisos realmente obtenidos, no los conceden. La clave solo
se lee en backend y no llega al navegador. Standard Mode; no variantes contributor.
El techo acumulado máximo admitido es USD 1. Las reservas son conservadoras y no
reembolsables, incluso ante errores. No significan un cargo del proveedor.

## CLI

Prefijo común: `uv run --project services/api --frozen python -m tools.meta_sam_api_lab`.
Añade los argumentos de una operación:

```text
inventory --source <ZIP_AUTORIZADO> --output <PRIVATE_ROOT>/inventory
prepare --source <ZIP_AUTORIZADO> --output <PRIVATE_ROOT>/prepared-run --start 5
image --source <FOTO> --output <PRIVATE_ROOT>/outputs/image-run --config <CONFIG> --concept vegetation --authorize-meta
video --source <CLIP_PREPARADO> --output <PRIVATE_ROOT>/outputs/video-run --config <CONFIG> --concept tree --authorize-meta
video --source <CLIP_PREPARADO> --output <PRIVATE_ROOT>/outputs/box-run --config <CONFIG> --box 10.2 20.4 100.8 150.1 --authorize-meta
cleanup --output <PRIVATE_ROOT>/outputs/video-run --config <CONFIG>
serve --output <PRIVATE_ROOT> --config <CONFIG> --port 8876
```

`prepare` extrae el primer MP4 del ZIP validado y genera cinco segundos, ancho 640,
10 FPS, H.264, sin audio/telemetría; no sobrescribe. `inventory` no extrae. Para otro
clip usa `media.prepare_clip(source, output, start=..., seconds=...)`, máximo diez segundos.
Consulta `preparation.json` para transformación, orientación y tiempos relativos.
No hay georreferenciación ni correspondencia entre píxeles y distancias físicas.

Imagen: hasta 10 MiB, formato real validado y EXIF eliminado por la preparación existente.
Video: MP4/H.264 preparado, hasta diez segundos, 300 frames, 20 MiB y 1920 píxeles
por dimensión. El prompt conceptual es uno de `tree`, `tree crown`, `vegetation`,
`bush`, `branches`. La caja reemplaza el concepto, usa píxeles preparados y se valida
con el constructor oficial **antes de reservar o subir**; bordes enteros floor/ceil.

El helper explícito `lab.scene_advisory(config, sources, output)` admite hasta tres
imágenes y Muse 1.3 con JSON Schema y esfuerzo `minimal`; reserva presupuesto y nunca
se llama automáticamente desde SAM. Su propuesta visual no es ground truth.

## Visor

Abre [127.0.0.1:8876](http://127.0.0.1:8876). El servidor escucha solo en loopback;
no uses túneles ni enlaces públicos. Espera `photos/`, `prepared/`, `outputs/` y
`uploads/` dentro de la raíz privada. Resultados son directorios con `result.json`.
Seleccionar un resultado guardado no hace inferencia. Permite máscaras, contornos,
cajas/IDs, opacidad, instancia, reproducción, avance por frame y videos exportados.
Solo «Enviar a Meta» crea una solicitud; la configuración privada debe autorizarla.
Los estados de error y sin coincidencias conservan su significado; no aparecen máscaras
ficticias. El servidor no expone JSON privado, claves, hashes ni `file_id`.

## Limpieza y fallos

Los videos se suben con `purpose=user_data` y caducidad de 3600 segundos, mínimo
documentado. Se solicita DELETE en `finally`, también ante error; se guarda su acuse.
`cleanup` reintenta solo la eliminación, sin inferencia ni reserva nueva. Si la subida
termina sin ID conocido, el estado lo indica: no se inventa una confirmación de borrado;
la caducidad es el respaldo. Un cierre forzado del proceso requiere revisar manifiestos.
No se borra el original. `store:false` no sustituye la limpieza de Files ni implica ZDR.

## Pruebas

```powershell
uv run --project services/api --extra dev --frozen pytest -c services/api/pyproject.toml services/botanical-ai/tests/test_visual_lab.py -q
uv run --project services/api --extra dev --frozen ruff check services evaluations tools
uv run --project services/api --extra dev --frozen ruff format --check services evaluations tools
node tools/meta_sam_api_lab/viewer.test.cjs
```

CI usa datos sintéticos y MockTransport, nunca medios restringidos ni claves reales.
La prueba de navegador necesita `npm ci` y Chromium de Playwright del proyecto.
La prueba de ledger acumulado está en `services/api/tests/test_execution.py` y necesita
`TEST_DATABASE_URL` de una base de pruebas. [Resultados reales y límites](../../docs/META_SAM_API_RESEARCH.md).
