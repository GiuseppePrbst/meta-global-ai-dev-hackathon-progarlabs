# Final video script

`bosque-vivo-hackathon-final.mp4`: 2:54.7, 1920×1080, 30 fps, H.264 and AAC, burned-in English subtitles. Real software footage is about 97 % of the running time; the only graphic is the 5-second end card.

Narration uses synthetic Windows voices, disclosed on the end card, because human recordings weren't available. Waits are cut and labelled "Real response · waiting time shortened". No music.

| Start | Block | Narration | Footage |
| --- | --- | --- | --- |
| 0:00 | Intro | Hi, we're ProGarLabs from southern Chile, and this is Bosque Vivo. | Wilo Lab with live `/demo/status`, recorded 04-11-2026 |
| 0:07 | Mobile | We built a new way to explore Chile's biodiversity. In Bosque Vivo, visitors discover national parks, explore species, and learn about the ecosystems around them. This is our mobile experience, with Wilo as your nature companion. | Real phone recording of WiloQuest, 04-11-2026, labelled "Mobile UI prototype". The identify screen is excluded |
| 0:35 | Wilo | Let's ask Wilo a real question. Muse Voice Transcribe turns speech into text, and we refine it, asking about Puyehue National Park. Muse Spark then uses our Knowledge Atlas to find grounded information about the park. Here are the real results. Wilo names documented trails, shows the sources, and explains that today's opening conditions are not verified. Instead of guessing, it makes uncertainty visible. | Wilo Lab against the public API: status, consent, recording, transcript, edited question, Muse Spark answer, sources. Input audio is a synthetic test voice. About 14 s of waiting cut |
| 1:13 | SAM 3.1 | We also explored Meta SAM 3.1 for visual segmentation. These are real results from our research lab: the model isolates organisms in images and tracks them across video frames. This is segmentation, not automatic species identification. Combined with other models, it opens new possibilities for studying biodiversity. | Originals, then saved results of earlier real runs, checked against `provenance.json`. Labelled as real results and experimental research. Not a live call |
| 1:42 | Identification | With Muse Spark, Bosque Vivo can also analyze photographs and suggest possible tree species. But an AI suggestion is not a verified identification. When the evidence is insufficient, the system can abstain and ask for another photograph. Our goal is to help people observe nature more carefully, not to replace scientific expertise. | Wilo Lab `/identify` with licensed ulmo and *Cyttaria* photos. Real results: insufficient evidence, and probably outside the catalog. Waits shortened |
| 2:15 | Atlas | Behind the experience, we've built a public API connecting Meta models with a versioned environmental atlas, geographic data and reliable sources. Our current atlas includes forty-six national parks and one hundred ninety reviewed trails. We also developed evaluations, privacy controls and safeguards for real-world use. | Wilo Lab Atlas panel, official web Atlas, real `GET /taxa` response |
| 2:41 | Close | We believe exploring nature should be accessible, engaging and responsible. Built in southern Chile, this is Bosque Vivo. Technology rooted in nature. | Mobile app, then end card with credits |

**Figures:** see [SUBMISSION_EVIDENCE.md](SUBMISSION_EVIDENCE.md).

**Media rights:**
- Identify photos: Lin linao (CC BY-SA 4.0), Robert Motecinos Holda (CC0).
- SAM media: credited in each clip footer; sources are CC BY, CC BY 2.0, CC BY 4.0, CC BY-SA 4.0 and CC0.
- CC BY-SA sources mean the masks over them are derivatives under the same license terms.
