# Final video script

Duration 2:32, 1920×1080, H.264 and AAC, English narration (synthetic Windows voice) and burned-in English subtitles. Recorded on 04-11-2026 with Playwright against the public API; José's web and Wilo Lab ran locally. No music.

| Time | Narration | Screen and capture | Figures |
| --- | --- | --- | --- |
| 0:00 | Chile has extraordinary biodiversity, but reliable information about parks and species is scattered across many sources. | Title card over a Puyehue photo (`card-problem`) | — |
| 0:09 | Bosque Vivo brings national park knowledge, biodiversity and grounded AI into one field companion. This is our web atlas, connected to our public API. | Official web, home and Atlas (`web.webm`) | — |
| 0:21 | Here is a real session on our public API, using a test client without login. A short notice and consent appear first. Wilo listens in Spanish, and Muse Voice Transcribe turns speech into editable text. | Wilo Lab status, consents, recording, transcript (`status.webm`, `wilo.webm`). Audio is a synthetic test voice fed as microphone input | — |
| 0:36 | We refine the question, and ask about Puyehue trails and whether they are open today. Muse Spark calls restricted tools over our versioned Knowledge Atlas. It names the trails from the official park page, and says their opening is not verified. It does not guess. The wait here is shortened. | Real answer (`wilo.webm`); on-screen note that about 18 s were cut | — |
| 0:57 | Every answer shows its sources and the knowledge version. The atlas lists documented trails, without pretending to offer official navigation. | Sources and Atlas panel (`wilo.webm`) | — |
| 1:07 | Now a licensed photo. Muse Spark compares visible traits against eight eligible trees, then a verification step checks the evidence. Here it offers ulmo only as an exploratory candidate, says the evidence is insufficient, and asks for a photo of the leaf underside. | Ulmo photo, real result (`identify.webm`); note that about 13 s were cut | 8 trees |
| 1:22 | A fungus is outside the catalog, so the system abstains. In our fixed test of fifty six cases, wrongly accepted negatives fell from twenty five of thirty seven to three of thirty seven. Mistakes still happen, so people verify. | Fungus photo, real result (`identify.webm`); note that about 9 s were cut | 56 cases, 25/37, 3/37: [report](../OPEN_SET_IDENTIFICATION_REPORT.md) |
| 1:39 | Knowledge stays tied to its sources. This woodpecker is flagged as location sensitive. Its evidence is at park scale, and Wilo gives no coordinates of individuals. The same care applies to trail openings, which are never inferred. | Real `GET /taxa/campephilus-magellanicus` response, selected fields (`taxon.webm`) | — |
| 1:51 | The experience reaches a FastAPI backend through Cloudflare. Meta models work with a grounded atlas and PostGIS, and no client ever receives a Meta key. Public access has spending limits and an automatic end date. The atlas covers forty six national parks and one hundred ninety reviewed trails, and sixteen of eighteen voice scenarios were semantically correct. | Architecture card (`card-arch`) | 46, 190, 16/18: [evidence](SUBMISSION_EVIDENCE.md) |
| 2:22 | Built in southern Chile, Bosque Vivo makes environmental knowledge easier to discover, while keeping scientific uncertainty visible. | End card with credits (`card-end`) | — |

**Photos:** Wikimedia Commons. Puyehue forest by Natalia Reyes Escobar (CC BY-SA 4.0), ulmo by Lin linao (CC BY-SA 4.0), *Cyttaria* by Robert Motecinos Holda (CC0).
