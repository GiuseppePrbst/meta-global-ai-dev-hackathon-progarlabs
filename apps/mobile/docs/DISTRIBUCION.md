# Builds y distribución

Versión 27-10-2026. Los comandos y la configuración de EAS se verifican contra la documentación oficial de Expo al crear el proyecto; los nombres de perfil son la propuesta.

## Tipos de build

| Build | Para qué | Cómo funciona |
| --- | --- | --- |
| **Dev build** (perfil `development`) | Desarrollo diario | APK/IPA que incluye los módulos nativos (cámara, ubicación, WebView) y carga el JavaScript desde Metro en el computador. Se reconstruye solo cuando cambian dependencias nativas o `app.config.ts`. |
| **Preview** (perfil `preview`, distribución interna) | Demo y pruebas en dispositivo | APK Android firmado y autocontenido (JS incluido), compilado por EAS en la nube o con `eas build --local`. Se instala desde un enlace o QR, sin Play Store ni revisión. |
| Producción / tiendas | Fuera de alcance | No se publica en Google Play ni App Store durante la hackatón. |

Expo Go no se usa: la app depende de módulos nativos que Expo Go no incluye.

## Qué implica distribuir un APK *preview*

- **Cuenta Expo**: EAS requiere una cuenta; el plan gratuito tiene cola y cuota limitadas. Generar el APK de la demo con margen (antes del 3-nov) o compilar localmente.
- **Firma**: EAS gestiona el keystore de Android. Si se pierde, no se puede instalar una versión nueva encima de la anterior; hay que desinstalar.
- **Variables fijadas en el build**: `EXPO_PUBLIC_API_URL` queda dentro del binario. Cambiar de API requiere un build nuevo. Toda variable `EXPO_PUBLIC_*` es pública: nunca contiene claves.
- **Sin OTA en la demo**: no se usan actualizaciones remotas, para que el video corresponda exactamente al binario verificado.
- **El binario es inspeccionable**: cualquiera que reciba el APK puede extraer su JS y su configuración. Compartirlo equivale a publicarlo.
- **Red**: el dispositivo debe alcanzar la API por una URL pública con HTTPS (BV-09) o por la LAN en desarrollo. `localhost` apunta al propio teléfono. Android bloquea HTTP sin cifrar por defecto en builds de release; en desarrollo se permite solo para la IP de la LAN.
- **Instalación**: el teléfono debe permitir instalar apps de origen desconocido para el navegador o gestor de archivos usado.

## iOS

Instalar en un iPhone físico requiere una cuenta Apple Developer pagada. Durante la hackatón iOS se prueba en simulador con un build de desarrollo; no hay TestFlight.

## Perfiles propuestos (`eas.json`)

| Perfil | `developmentClient` | Distribución | API |
| --- | --- | --- | --- |
| `development` | sí | interna | IP de la LAN del computador con la API |
| `preview` | no | interna, APK | URL HTTPS de la API desplegada (BV-09) |

## Checklist del APK de la demo

1. API desplegada con HTTPS y `ai_provider` esperado en `/health`.
2. Build `preview` desde un commit etiquetado; registrar commit y fecha del build.
3. Smoke en Android físico: Catálogo, Descubrimiento completo, Registro, Atlas 2D y 3D si aplica.
4. Revisar que no aparezcan claves, coordenadas privadas ni datos Hepta en pantalla ni en la configuración.
