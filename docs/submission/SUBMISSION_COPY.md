# Submission copy

Ready to paste. **The portal requires a login, so its real fields have not been checked yet.** Match these texts to the fields that actually appear. Do not invent answers for any other field.

| Field | Value |
| --- | --- |
| Project name | Bosque Vivo Chile |
| Tagline | Explore nature with AI that knows what it knows, and what it cannot verify. |
| Track | Startup Track |
| Theme | Build for Your World |
| GitHub URL | <https://github.com/GiuseppePrbst/meta-global-ai-dev-hackathon-progarlabs> |
| Demo URL | <https://api-bosquevivo.progarlabs.com/docs> (public API; state it isn't a consumer app) |
| Status URL | <https://api-bosquevivo.progarlabs.com/demo/status> |
| Video URL | Pending upload by the representative |
| Team | José Schwerter (frontend, UI/UX), Giuseppe Proboste (GIS, ML, backend, integration). ProGarLabs SpA, Osorno, Chile |
| Representative | To be confirmed by the team; must be the admitted, authorized person |

## Problem

**Short:** Reliable information about Chile's parks and species is scattered, and AI apps often answer with more confidence than they have.

**Long:** Chile's national parks hold extraordinary biodiversity, but what a visitor needs is spread across official park pages, conservation lists, tourism guides and scientific databases, each with its own format and level of trust. Asking which trails are documented, what a species is, or whether a fact is official rarely gets a clear answer, and generic AI assistants tend to fill those gaps with confident guesses.

## Solution

**Short:** An AI field companion that answers from a versioned knowledge atlas, cites its sources, and abstains when evidence is missing.

**Long:** Bosque Vivo Chile is an AI-powered field companion that makes Chile's national parks and biodiversity easier to explore through grounded conversations, visual species suggestions and verifiable environmental data. Wilo, its guide, takes questions by voice or text and answers from a versioned Knowledge Atlas of 46 national parks. Every answer shows its sources. Photos produce suggestions with visible evidence, or an honest abstention.

## What was built

Between 26-10-2026 and 04-11-2026 we built a versioned Knowledge Atlas covering 46 national parks and 190 trails reviewed against official pages, plus 20 sourced taxa. We built Wilo with grounded tool use, real voice input, open-set photo identification with verification, and a public API on Cloud Run behind Cloudflare with PostgreSQL/PostGIS. The API has a spending ledger, consent, territory and rate controls, and a hard expiry date. We also ran reproducible evaluations and SAM 3.1 segmentation research. Public datasets, Meta's models and open-source frameworks are pre-existing; our contribution is the system around them.

## How Meta AI is used

**Short:** Muse Spark 1.3 powers Wilo's grounded answers and photo verification. Muse Voice Transcribe 1.0 handles voice. SAM 3.1 is experimental research.

**Long:** Muse Spark 1.3 interprets questions, calls restricted read-only tools over the Knowledge Atlas, and builds answers whose claims are checked against the sources consulted. It also compares photos against eight eligible tree species, followed by a verification step that can abstain. Muse Voice Transcribe 1.0 provides Spanish, English and mixed voice input, helped by Atlas keywords for place and scientific names. SAM 3.1 was evaluated for image and video segmentation as experimental research; it does not identify species and isn't part of the production flow. All calls go through our backend, so clients never receive a Meta key.

## Technical innovation

Bosque Vivo treats uncertainty as a product feature. Models reach knowledge only through deterministic tools, answers are traceable to sources, and identification includes abstention. In a fixed set of 56 cases with weak labels, wrongly accepted negatives fell from 25/37 to 3/37 with verification. Spending is admitted atomically in PostgreSQL before any model call, under one shared cap and a deadline that a stale configuration cannot extend.

## Impact and intended users

Intended users are park visitors, students and nature-curious people in Chile, starting with Puyehue National Park as the pilot. We have no users, partners or measured impact yet. The goal is to make environmental knowledge easier to discover while keeping scientific uncertainty visible.

## Limitations

Identification is a suggestion, not a confirmed result, and was not reviewed by specialists. *N. dombeyi* was confused with *N. betuloides* on the public route. Voice evaluation used one speaker. Answers can take about 20–37 seconds. Trail openings aren't verified in real time, and there is no licensed trail geometry or navigation. The official mobile identify screen is still a prototype using demonstration data. Bosque Vivo isn't affiliated with CONAF. The public demo uses promotional credits and closes on 2026-11-10T05:00:00Z.
