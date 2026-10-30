# Funcionalidad opcional: interacción por voz

Estado: **propuesta, fuera de la demo**. Versión 27-10-2026. Nada de esto está implementado ni acordado con el backend.

## Qué resuelve

En terreno, con las manos ocupadas o con la cámara apuntando a un árbol, la persona pregunta en voz alta sobre la especie que tiene abierta (por ejemplo, tras una identificación: «¿en qué se diferencia de un coigüe?», «¿qué altura suele alcanzar?») y escucha la respuesta. También mejora la accesibilidad para personas con baja visión.

## Recomendación

Separar voz y conocimiento: la voz se procesa en el dispositivo y solo viaja texto; la respuesta se construye en el backend **exclusivamente** con el contenido autorizado de la ficha y sus fuentes.

```text
[micrófono, pulsar para hablar] → reconocimiento de voz en el dispositivo → texto (editable)
   → POST /species/{id}/questions (propuesta) → respuesta con citas o abstención
   → texto en pantalla + síntesis de voz en el dispositivo
```

1. **Reconocimiento de voz en el dispositivo**: con un módulo Expo que envuelva los reconocedores nativos de Android e iOS (candidato a evaluar: `expo-speech-recognition`, comunitario). Forzar el modo en el dispositivo cuando el sistema lo permita: según la plataforma y el idioma, el reconocedor nativo puede enviar el audio a servidores de Apple o Google. Si no hay modo local para `es-CL`, avisar a la persona y ofrecer entrada de texto. Verificar comportamiento real por plataforma antes de habilitarlo.
2. **Pulsar para hablar**: sin palabra de activación ni escucha continua. Permiso de micrófono solo al primer uso.
3. **Texto siempre editable y entrada por teclado equivalente**: en el bosque hay viento y ruido, y la transcripción falla; la persona corrige antes de enviar.
4. **Respuesta acotada a la ficha** (endpoint propuesto, P-10 en [contratos](CONTRATOS_API.md)):
   - Entrada: `species_id`, texto de la pregunta.
   - Salida: `status: answered | insufficient_evidence`, `answer`, `citations[]` (fuentes de la ficha), `provider`, `model`.
   - El backend usa un modelo de lenguaje de Meta habilitado, cuyo nombre, versión y límites se toman de la documentación oficial vigente al implementarlo y se registran en `docs/SOURCES.md`. La clave vive solo en backend.
   - Si la ficha no contiene la respuesta, el modelo se **abstiene**; no completa con conocimiento general no citado. El mock se rotula y se abstiene, igual que en `/identify`.
5. **Síntesis de voz en el dispositivo** (`expo-speech`): lee la respuesta; el texto y las citas siempre se muestran en pantalla.

## Por qué no enviar audio al backend

Enviar audio agrega datos personales (voz), costo, latencia y un contrato multimedia nuevo, y obliga a revisar términos de otro proveedor. Enviar solo texto mantiene la privacidad proporcional y reutiliza el patrón de abstención existente.

## Requisitos antes de implementarla

- Fichas con contenido autorizado y fuentes (P-05 / BV-04); sin ellas no hay sobre qué responder.
- Acceso real a un modelo Meta, términos revisados y uso solo por personas adultas.
- Evaluación de respuestas con preguntas permitidas: tasa de respuestas con cita correcta, abstenciones y respuestas no sustentadas, siguiendo [AI_EVALUATION.md](../../../docs/AI_EVALUATION.md).
- Privacidad: las preguntas no se registran en logs con texto completo; definir retención antes de un despliegue público.

## Esfuerzo estimado

Medio en la app (micrófono, transcripción, estados, síntesis y accesibilidad) y medio-alto en el backend (endpoint, recuperación desde la ficha, abstención y evaluación). La dependencia crítica es el contenido autorizado de las fichas, no la voz.
