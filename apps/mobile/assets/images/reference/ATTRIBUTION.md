# Fotos de referencia (solo desarrollo)

Copias sin editar de miniaturas de 960 px de Wikimedia Commons (el original de *Podocarpus*, de 615 px, tal cual), descargadas el 28-10-2026. Se usan en la ficha de especie, en las tarjetas del catálogo, en el diario y en la tarjeta de observación del mapa (recortadas solo al mostrarse, el archivo no se edita) hasta que la API entregue fotos; entonces se eliminan. Ninguna fue tomada en Puyehue ni prueba presencia de la especie en el área. Las obras CC BY-SA conservan su licencia; la ficha muestra autor, licencia y enlace junto a la foto, y el catálogo avisa que los créditos están en cada ficha.

| Archivo | Original en Commons | Autor | Licencia |
| --- | --- | --- | --- |
| `nothofagus-dombeyi.jpg` | [Nothofagus dombeyi - Warren Bohmwald - 458885887.jpeg](https://commons.wikimedia.org/wiki/File:Nothofagus_dombeyi_-_Warren_Bohmwald_-_458885887.jpeg) | Warren Bohmwald | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `eucryphia-cordifolia.jpg` | [Hojas y brote de ulmo.jpg](https://commons.wikimedia.org/wiki/File:Hojas_y_brote_de_ulmo.jpg) | Lin linao | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| `aextoxicon-punctatum.jpg` | [Aextoxicon punctatum - Palmengarten Frankfurt - DSC01934.JPG](https://commons.wikimedia.org/wiki/File:Aextoxicon_punctatum_-_Palmengarten_Frankfurt_-_DSC01934.JPG) | Daderot | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `weinmannia-trichosperma.jpg` | [Weinmannia trichosperma kz02.jpg](https://commons.wikimedia.org/wiki/File:Weinmannia_trichosperma_kz02.jpg) | Krzysztof Ziarnek, Kenraiz | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| `laureliopsis-philippiana.jpg` | [Laureliopsis philippiana, Valdivia, Los Ríos, Chile 62188473.jpg](https://commons.wikimedia.org/wiki/File:Laureliopsis_philippiana,_Valdivia,_Los_R%C3%ADos,_Chile_62188473.jpg) | Cristian Riquelme | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |
| `podocarpus-nubigenus.jpg` | [Podocarpus nubigena-hojas.JPG](https://commons.wikimedia.org/wiki/File:Podocarpus_nubigena-hojas.JPG) | Lin linao | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) |
| `nothofagus-betuloides.jpg` | [Nothofagus betuloides kz02.jpg](https://commons.wikimedia.org/wiki/File:Nothofagus_betuloides_kz02.jpg) | Krzysztof Ziarnek, Kenraiz | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |
| `nothofagus-pumilio.jpg` | [Nothofagus pumilio, leaves.jpg](https://commons.wikimedia.org/wiki/File:Nothofagus_pumilio,_leaves.jpg) | Mlwiki | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |

## Hongos

Miniaturas de 960 px sin editar de Wikimedia Commons, descargadas el 02-11-2026, mismas reglas que las anteriores. Ninguna fue tomada en Puyehue.

| Archivo | Original en Commons | Autor | Licencia |
| --- | --- | --- | --- |
| `cyttaria-espinosae.jpg` | [Cyttaria Espinosae (Digüeñe).jpg](https://commons.wikimedia.org/wiki/File:Cyttaria_Espinosae_(Dig%C3%BCe%C3%B1e).jpg) | Robert Motecinos Holda | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `butyriboletus-loyo.jpg` | [Boletus loyo (MYCL000158).jpg](https://commons.wikimedia.org/wiki/File:Boletus_loyo_(MYCL000158).jpg) | Mycotheca | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |

## Foto del sendero (mapa)

Miniatura de 960 px sin editar de Wikimedia Commons, descargada el 02-11-2026. Se muestra en la tarjeta del sendero de demostración del mapa (recortada solo al mostrarse). Fue tomada en el PN Puyehue (río Chanleufu, sendero Rápidos de Chanleufu), pero **no muestra el sendero de demostración**, que es sintético; la app lo dice en la descripción accesible y en «Sobre este mapa».

Los otros tres senderos de prueba del mapa (también sintéticos) reutilizan como portada fotos de especies de la tabla de arriba: `nothofagus-dombeyi.jpg` (circuito), `laureliopsis-philippiana.jpg` (subida) y `nothofagus-pumilio.jpg` (travesía). No fueron tomadas en esos trazados ni prueban presencia de la especie; el crédito de cada una aparece en «Sobre este mapa» con el sendero elegido (`src/features/atlas/trail-photos.ts`).

También es la portada de la pestaña Perfil (recortada al mostrarse), con el crédito sobre la foto, en su descripción accesible y en Ajustes → Créditos de fotos. Las cuatro portadas de sendero se repiten como miniatura en el historial del Perfil, con los mismos límites.

| Archivo | Original en Commons | Autor | Licencia |
| --- | --- | --- | --- |
| `puyehue-rio-chanleufu.jpg` | [Parque Nacional Puyehue.jpg](https://commons.wikimedia.org/wiki/File:Parque_Nacional_Puyehue.jpg) | Ramirezh2019 | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |

## Galería del parque (mapa)

Miniaturas de 960 px sin editar de Wikimedia Commons, descargadas el 03-11-2026, mismas reglas que las anteriores (solo desarrollo, se reemplazan cuando la API entregue fotos). Todas fueron tomadas en el PN Puyehue según su descripción en Commons. Se muestran en la galería de la tarjeta del parque del mapa (recortadas solo al mostrarse), con autor y licencia sobre cada foto y enlace al original (`src/features/atlas/park-content.ts`). La galería también reutiliza `puyehue-rio-chanleufu.jpg` (tabla anterior). Los pies de foto describen lo que se ve; el de `puyehue-salto.jpg` y `puyehue-bosque.jpg` no nombra el lugar porque Commons no lo indica.

| Archivo | Original en Commons | Autor | Licencia |
| --- | --- | --- | --- |
| `puyehue-salto.jpg` | [Parque Nacional Puyehue 12.jpg](https://commons.wikimedia.org/wiki/File:Parque_Nacional_Puyehue_12.jpg) | Natalia Reyes Escobar | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| `puyehue-laguna-espejo.jpg` | [Laguna Espejo Parque Nacional Puyehue 21.jpg](https://commons.wikimedia.org/wiki/File:Laguna_Espejo_Parque_Nacional_Puyehue_21.jpg) | Natalia Reyes Escobar | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| `puyehue-mirador-puma.jpg` | [Parque Nacional Puyehue 10.jpg](https://commons.wikimedia.org/wiki/File:Parque_Nacional_Puyehue_10.jpg) | Natalia Reyes Escobar | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| `puyehue-bosque.jpg` | [Parque Nacional Puyehue 22.jpg](https://commons.wikimedia.org/wiki/File:Parque_Nacional_Puyehue_22.jpg) | Natalia Reyes Escobar | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| `puyehue-lago-constancia.jpg` | [Lago Constancia Parque Nacional Puyehue 32.jpg](https://commons.wikimedia.org/wiki/File:Lago_Constancia_Parque_Nacional_Puyehue_32.jpg) | Natalia Reyes Escobar | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
