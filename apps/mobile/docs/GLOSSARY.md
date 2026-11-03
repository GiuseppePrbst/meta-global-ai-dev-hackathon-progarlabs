# Bosque Vivo Chile

Lenguaje del dominio botánico y territorial que usa la app móvil. El dominio es compartido con la API y la web; este glosario vive aquí de forma provisional y se propone promoverlo a la raíz del repositorio cuando el equipo lo acuerde.

Los términos se escriben en español en la documentación y la interfaz. En el código (rutas, componentes, tipos, funciones) se usa siempre el nombre en inglés de la línea _En código_; ver [convenciones de nombres](ARQUITECTURA.md#convenciones-de-nombres).

## Catálogo

**Especie**:
Entrada del catálogo botánico con identificador estable, nombre científico, nombre común, estado taxonómico y procedencia. Mientras no se valide contra una fuente taxonómica versionada es siempre *provisional*.
_Evitar_: Taxón (salvo en contexto de validación científica), planta, árbol
_En código_: `Species`

## Descubrimiento

**Identificación**:
Resultado efímero de analizar una fotografía: contiene candidatos o una abstención, junto con el proveedor que la produjo. No es un registro ni confirma ninguna especie.
_Evitar_: Reconocimiento, predicción, resultado IA
_En código_: `Identification`

**Candidato**:
Especie del catálogo propuesta por una identificación, acompañada de la evidencia que la justifica. El orden entre candidatos no es una probabilidad.
_Evitar_: Coincidencia, match, sugerencia confirmada
_En código_: `Candidate`

**Abstención**:
Identificación que declara evidencia insuficiente y no propone candidatos.
_Evitar_: Error, fallo, sin resultado
_En código_: `Abstention`

## Registro

**Borrador de observación**:
Registro que existe solo en el dispositivo y todavía no se ha enviado.
_Evitar_: Observación local, pendiente
_En código_: `ObservationDraft`

**Observación**:
Registro persistido de que una persona vio algo, con especie opcional elegida por una persona, notas y ubicación opcional. Nace *no verificada*.
_Evitar_: Avistamiento, hallazgo, reporte
_En código_: `Observation`

**Guía de campo** (personal):
Colección de especies que una persona ya identificó con una foto y eligió sumar. Guarda solo la especie y la fecha; no guarda la foto ni la ubicación. No es un borrador ni una observación. Mientras no se pueda sumar desde Identificar, la app muestra datos de prueba rotulados.
_Evitar_: Colección de observaciones, álbum (como término de dominio), logros
_En código_: `GuideEntry`

**Diario**:
Pestaña personal que reúne la guía de campo, los recorridos y las insignias. Es una vista, no un registro de datos propio.
_Evitar_: Perfil, journal
_En código_: `JournalScreen`

**Recorrido**:
Constancia de que una persona completó un sendero: qué sendero, cuándo y su largo. La app no sigue la ubicación; el largo es el del trazado, no una distancia caminada.
_Evitar_: Ruta, track, actividad
_En código_: `Walk`

**Insignia**:
Reconocimiento que se deriva de la guía de campo y los recorridos según una regla fija. No se guarda ni se otorga a mano.
_Evitar_: Logro (como sinónimo de la guía), medalla, trofeo
_En código_: `Badge`

## Territorio

**Elevación del terreno**:
Altura del suelo sobre el nivel del mar, proveniente de un modelo digital de elevación con fuente y licencia registradas.
_Evitar_: Altura, relieve (como término técnico), heights
_En código_: `TerrainElevation`

**Altura de copa**:
Altura estimada de la vegetación sobre el suelo, en metros, derivada de CHMv2. Es una estimación, no una medición directa ni una tasa de crecimiento.
_Evitar_: Altura de árboles, altura medida, crecimiento
_En código_: `CanopyHeight`

**Sendero de demostración**:
Trazado sintético que la app dibuja para mostrar cómo se vería un recorrido. No es un sendero real ni sirve para orientarse; se rotula como demostración donde aparece.
_Evitar_: Ruta oficial, sendero del parque
_En código_: `DemoTrail`

## Consentimiento

**Confirmación de mayoría de edad**:
Declaración de la persona de que es adulta, hecha una vez y revocable.
_Evitar_: Verificación de edad
_En código_: `AgeConfirmation`

**Confirmación de derechos**:
Declaración, hecha para cada fotografía, de que la persona tiene derecho a usarla y consiente su procesamiento.
_Evitar_: Licencia, permiso de imagen
_En código_: `RightsConfirmation`
