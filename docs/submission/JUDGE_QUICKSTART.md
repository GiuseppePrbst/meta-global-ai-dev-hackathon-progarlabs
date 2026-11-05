# Judge quickstart: Bosque Vivo Chile

**Final status reference.** If an older report disagrees with this page, this page wins. Older reports are kept as historical evidence.

**What it is:** an AI-powered field companion that makes Chile's national parks and biodiversity easier to explore through grounded conversations, visual species suggestions and verifiable environmental data.

**Promise:** explore nature with AI that knows what it knows, and what it cannot verify.

**Team:** ProGarLabs, Osorno, Chile. Startup Track, theme Build for Your World.

## Try it now, no account or key

Public API, open until 2026-11-10T05:00:00Z: <https://api-bosquevivo.progarlabs.com>

| What | Link |
| --- | --- |
| Live status | [`/demo/status`](https://api-bosquevivo.progarlabs.com/demo/status) |
| Interactive API (technical surface, not a consumer app) | [`/docs`](https://api-bosquevivo.progarlabs.com/docs) |
| Parks with no AI call | [`/parks`](https://api-bosquevivo.progarlabs.com/parks) |

```bash
curl -s https://api-bosquevivo.progarlabs.com/guide/query -H "Content-Type: application/json" -d '{"question":"What trails are in Puyehue National Park? Are they open today?","adult_confirmed":true,"external_processing_confirmed":true}'
```

These calls use real Meta models. Adults only, no personal data, restricted territories refused, 2 AI calls per minute and 20 per day per IP. More examples: [PUBLIC_DEMO.md](../PUBLIC_DEMO.md).

To see a real interface, run the experimental client against the public API:

```bash
cd apps/experiments/wilo-lab && npm ci && VITE_API_URL=https://api-bosquevivo.progarlabs.com npm run dev
```

Then open <http://127.0.0.1:3001>.

## What is real today

| Status | What |
| --- | --- |
| **Real and deployed** | FastAPI on Cloud Run behind Cloudflare, PostgreSQL/PostGIS, Knowledge Atlas, Wilo text and voice, photo identification, transcription WebSocket, spending ledger, deadline, consent and territory controls |
| **Implemented, not the path shown** | Official web app (Atlas, species). Facebook Login code, whose provider isn't configured |
| **UI prototype** | Mobile identify screen: it uses demonstration data and calls no model. Never treat it as inference |
| **Experimental research** | SAM 3.1 segmentation, outside the product. Wilo Lab is an experimental test client |
| **Future work** | Licensed trail geometry, specialist botanical review, real user validation |

The demo video uses Wilo Lab with the real API, because the official web and mobile identify flows aren't connected to real public inference yet.

## Meta AI, one page

| Capability | Model | Input | Tools or transformation | Output | Limitation seen |
| --- | --- | --- | --- | --- | --- |
| Wilo | Muse Spark 1.3 | Question, Spanish or English | Read-only tools over the versioned Atlas; claims checked against consulted sources | Grounded answer with sources, or abstention | Answers took about 20–37 s in documented tests |
| Voice | Muse Voice Transcribe 1.0 | WAV or live PCM stream | Atlas keywords for place and scientific names | Editable transcript | One speaker in the evaluation |
| Identification | Muse Spark 1.3 | One photo | Comparison against eight eligible trees, then a verification step | Suggestion with visible traits, or abstention | *N. dombeyi* was accepted as *N. betuloides* on the public route (2 of 2 runs): always a suggestion |
| Segmentation | SAM 3.1 | Images and video | Research lab only | Masks | Does not identify species; not deployed in the product |

**Why abstention matters:** a confident wrong species or an invented trail opening can mislead a visitor. Without verification, 25 of 37 negative cases were wrongly accepted; with it, 3 of 37.

**Flow:** user → interface → Cloudflare → FastAPI → Meta Model API, with knowledge tools and PostGIS → answer. Clients never receive a Meta key.

## Evidence and reproduction

- Claims with denominators: [SUBMISSION_EVIDENCE.md](SUBMISSION_EVIDENCE.md).
- Without keys, mock mode runs locally: see Quick start in the [README](../../README.md).

## Limits

No validated scientific accuracy, no specialist review, no users or partners yet, and no affiliation with CONAF. No licensed trail geometry, so no navigation. Trail openings are not verified in real time.

## Problem and commercial value

Chile's park and species information is spread across official pages, conservation lists and scientific databases. We see value for visitors and for park-related education and tourism, but this is a hypothesis: we have no customers or adoption data yet.
