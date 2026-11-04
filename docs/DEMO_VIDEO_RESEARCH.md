# Investigación: video demo de tres minutos

Estado: 04-11-2026. Complementa el [guion de demo](DEMO_SCRIPT.md) y la
[lista de planos](DEMO_MEDIA_SHOTLIST.md). Cierre de entrega: **hoy, 21:00 ET = 23:00 Santiago**.

## 1. Lo que dice el evento (fuente oficial)

Texto extraído del HTML público de la
[página del evento](https://cerebralvalley.ai/e/meta-ai-developer-hackathon/details), consultada el 04-11-2026:

| Criterio | Peso | Texto oficial (resumido) |
| --- | --- | --- |
| Impact | 30 % | Potencial real, quién se beneficia, cuánto importa, si podría usarse y si encaja en un tema |
| Use of Meta AI Tooling | 25 % | Uso creativo, **más allá de una integración básica**, capacidades inesperadas |
| Technical Depth & Execution | 20 % | Ingeniería sólida y refinada, «real craft» |
| Demo | 25 % | Demo funcional e impresionante, que **resista en vivo**, y **la calidad del video demo** |

- El Startup Track se juzga en «technical execution and whether it holds up in production».
- La entrega se hace en el portal de Cerebral Valley (`/hackathon/submit`), que requiere sesión.
  El límite de tres minutos **no aparece** en la página pública; viene del encargo y hay que
  confirmarlo en el formulario.
- Final en vivo y ganadores: 9 de noviembre. Los jueces deciden entre el 4 y el 8 de noviembre.
  Podría haber un premio por voto del público o al proyecto más viral, anunciado hacia el 10 de noviembre.
  Un video claro también sirve para eso.
- **Licencia:** al enviar, se concede a los organizadores una licencia perpetua para publicar y
  modificar la entrega, incluido su uso en marketing. Además, se declara que la entrega es obra
  propia y no infringe derechos de terceros. Conclusión: **todo lo que aparezca en el video
  debe ser publicable**.

## 2. Estructura habitual en las guías

Las guías coinciden. Las fuentes están al final.

1. **0:00–0:20, problema y gancho.** El usuario y el dolor, no la tecnología. Pitch en una frase
   en los primeros segundos.
2. **0:20–2:15, demo del producto funcionando con entrada real.** Es la parte más larga. Mostrar
   3–5 funciones, no diapositivas.
3. **2:15–2:40, cómo funciona.** Arquitectura y herramientas del patrocinador nombradas en pantalla.
4. **2:40–3:00, impacto y siguiente paso.** Quién lo usaría y qué falta. Agradecer.

Reglas prácticas recurrentes:

- Escribir el guion a mano. Devpost desaconseja el texto genérico de un LLM.
- No acelerar el audio para entrar en el tiempo. Mejor recortar contenido.
- Horizontal, 1080p, buen micrófono. Graba quien tenga mejor audio. Probar niveles antes.
- Cerrar apps, notificaciones y pestañas personales.
- La pulcritud de edición importa menos que una demo que funciona y se entiende. Aun así, este
  evento puntúa explícitamente «quality of the demo video».
- Subir con horas de margen. YouTube **no listado**, marcado «no es para niños». Comprobar
  desde una sesión sin iniciar que el enlace abre.
- Mantener la misma narrativa en el video, la descripción escrita y el README.

## 3. Ejemplos verificados

Todos los enlaces y duraciones se comprobaron el 04-11-2026 con YouTube oEmbed y la página del
video. **No se vio el contenido**: la estructura de cada video no está verificada.

### Hackatones de Meta (LlamaCon, San Francisco, mayo de 2025)

Fuente: [blog de Meta AI](https://ai.meta.com/blog/llamacon-hackathon/). 44 proyectos, 6 finalistas.

| Puesto | Proyecto | Qué hace | Video | Duración |
| --- | --- | --- | --- | --- |
| 1.º | OrgLens | Grafo de expertos a partir de Jira, GitHub y documentos | [YouTube](https://www.youtube.com/watch?v=8OmMnODOyLw) | 1:18 |
| 2.º | Compliance Wizards | Fraude en transacciones con asistente de voz y búsqueda multimodal | [YouTube](https://youtu.be/JgZQ6XJXBhE) | 2:46 |
| 3.º | Llama CCTV Operator | Eventos de vigilancia definidos en lenguaje natural, con visión de Llama 4 | [YouTube](https://youtu.be/4YaZe4Gbt1g) | 0:55 |
| Mejor uso de Llama API | Geo-ML | Informes geológicos → DSL → modelos 3D del subsuelo | [YouTube](https://youtu.be/U1fDn1C3DJA) | 3:07 (demo desde 2:07) |

Geo-ML es el ejemplo más cercano a Bosque Vivo, por su dominio científico y geoespacial.
Su propio título avisa de que la demo empieza en 2:07, es decir, dedica dos tercios del video al
contexto. **Es el patrón que hay que evitar** cuando el jurado puntúa la demo.

Otros ganadores de Meta, sin video enlazado en la fuente oficial:
[Llama 3 Hackathon con Cerebral Valley](https://ai.meta.com/blog/llama-3-hackathon-recap-cerebral-valley/)
(1.º OpenGlass, gafas de 20 USD que describen lo que ves, con [Devpost](https://devpost.com/software/openglass))
y [Llama Impact Hackathon](https://lablab.ai/blog/llama-impact-hackathon-sf-summary)
(Farmipole, Compllama y BrightStart, centrados en impacto social).

### Gemini API Developer Competition (Google, 2024), formato de 3 minutos

Fuente: [anuncio de ganadores](https://developers.googleblog.com/en/announcing-the-winners-of-the-gemini-api-developer-competition/).
Competición en línea juzgada por video, como esta.

| Premio | Proyecto | Por qué sirve de referencia | Video | Duración |
| --- | --- | --- | --- | --- |
| Best Overall | Jayu | Asistente en el escritorio. El autor cortó más de 10 min de demo para llegar a 3 | [YouTube](https://www.youtube.com/watch?v=shnW3VerkiM) | 3:00 |
| Most Impactful + People's Choice | Vite Vere | Autonomía para personas con discapacidad intelectual. Historia centrada en el usuario | [YouTube](https://www.youtube.com/watch?v=yul0L5YWBp0) | 3:00 |
| Best Android | Gaze Link | Escritura con la mirada para pacientes de ELA | [YouTube](https://www.youtube.com/watch?v=y_U1vkEC9PA) | 2:13 |
| Best Web | ViddyScribe | Audiodescripción automática de videos | [YouTube](https://www.youtube.com/watch?v=MsN_YbwviUU) | 2:38 |
| Most Useful | Prospera | Coach de ventas en tiempo real | [YouTube](https://www.youtube.com/watch?v=ZTFKbhmGcUo) | 2:59 |
| Most Creative | Outdraw AI | Juego de dibujo contra la IA | [YouTube](https://www.youtube.com/watch?v=e16IQA1GGw4) | 2:06 |

Patrón observable en los metadatos: los ganadores juzgados solo por video usan casi todo el
límite (2:59–3:00). Los ganadores de eventos presenciales, donde hubo pitch en vivo, usan videos
cortos (0:55–1:18).

## 4. Implicaciones para el guion vigente

Revisión del [guion vigente](DEMO_SCRIPT.md) frente a los criterios:

1. **Impact (30 %) no aparece al inicio.** El guion abre con «46 parques CONAF» y una API.
   Recomendación: abrir con el visitante en Puyehue y el problema (qué es lo que veo, si está
   amenazado, qué puedo hacer). Mover `GET /parks/puyehue` a la sección técnica o eliminarlo.
2. **Tiempo muerto de Wilo (20–30 s).** Equivale a cerca del 15 % del video. Recomendación:
   corte de tiempo rotulado en pantalla («respuesta real, 24 s recortados»). Es honesto y cumple
   la regla de no simular otra llamada.
3. **Meta Tooling (25 %): hacer visible el «más allá de lo básico».** Rotular en pantalla el
   modelo en cada paso (Muse Spark, SAM 3.1, ASR) y destacar lo no obvio. Por ejemplo, la
   verificación de conjunto abierto que **se abstiene**, y la combinación de SAM y Muse en el
   segmento de 32 s ([producción SAM](SAM31_FINAL_DEMO_PRODUCTION.md)).
4. **Cierre.** El guion termina con tres limitaciones. Conviene una sola frase de límites con
   rótulo y terminar con impacto y siguiente paso (otros parques, guardaparques, ciencia
   ciudadana). La honestidad se mantiene, pero no es el último mensaje.
5. **«Holds up live» / Startup Track.** Mostrar al menos una vez la app móvil real en un
   dispositivo, no solo `/docs`. Enlazar el repositorio y las instrucciones de ejecución en la
   descripción para que el jurado pueda probarla.

## 5. Checklist de derechos antes de subir

- **Sin Hepta.** El segmento SAM de 32 s ya lo excluye según su `provenance.json`.
- **Sin fotos o videos propios** sin permiso escrito de publicación ([planos 3–7](DEMO_MEDIA_SHOTLIST.md)).
  La licencia del evento permite a Meta reutilizar el video.
- **Material CC BY y CC BY-SA:** atribución visible en pantalla. Revisar con el representante si
  la declaración «solely owned» es compatible con incluir obras de terceros bajo CC. Las reglas
  permiten código abierto, pero no mencionan medios. Este punto queda **pendiente**: no es una
  opinión legal.
- **Ningún dato personal en pantalla:** sin correos, tokens, coordenadas privadas, EXIF ni
  pestañas personales.
- **Música:** solo con licencia que permita uso comercial, o ninguna.
- **Subtítulos o rótulos en inglés.** El evento es global. Si la narración va en español,
  añadir subtítulos en inglés.

## Fuentes

- [Página del evento, criterios y reglas](https://cerebralvalley.ai/e/meta-ai-developer-hackathon/details)
- [Devpost: 6 tips for making a hackathon demo video](https://info.devpost.com/blog/6-tips-for-making-a-hackathon-demo-video)
- [AI Tinkerers: Video Production Guide for Hackathons](https://aitinkerers.org/docs/public/video_production_guide.md?markdown=1)
- [Reskilll: How to pitch in 3 minutes](https://blogs.reskilll.com/hackathon-demo-presentation-tips-pitch-3-minutes-win-2026/)
- [AngelHack: 10 tips for your hackathon demo](https://angelhack.com/blog/10-tips-to-help-you-rock-your-next-hackathon-demo/)
- [RevenueCat: pitching your app (Shipaton)](https://www.revenuecat.com/blog/engineering/how-to-win-shipaton-part-4-pitching-your-app)
- [Meta AI: ganadores de LlamaCon Hackathon](https://ai.meta.com/blog/llamacon-hackathon/)
- [Meta AI: recap de Llama 3 Hackathon](https://ai.meta.com/blog/llama-3-hackathon-recap-cerebral-valley/)
- [lablab.ai: Llama Impact Hackathon](https://lablab.ai/blog/llama-impact-hackathon-sf-summary)
- [Google: ganadores de Gemini API Developer Competition](https://developers.googleblog.com/en/announcing-the-winners-of-the-gemini-api-developer-competition/)
