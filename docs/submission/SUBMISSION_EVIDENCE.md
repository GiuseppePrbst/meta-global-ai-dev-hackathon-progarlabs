# Submission evidence

No secrets or private data. Each claim used in the README, video or form appears here with its denominator.

| Claim | Technology | Evidence | PR or commit | Validation | Limitation |
| --- | --- | --- | --- | --- | --- |
| 46 national parks | Knowledge Atlas | [PROJECT_DELIVERY_STATUS](../PROJECT_DELIVERY_STATUS.md), `GET /parks` | #32 | Checked against the CONAF index | Covers what official pages publish |
| 190 trails reviewed | Knowledge Atlas | [PROJECT_DELIVERY_STATUS](../PROJECT_DELIVERY_STATUS.md) | #32 | Reviewed against official pages | 199 records in total, including 3 named and 6 from a tourist guide. 0 licensed geometries |
| 20 taxa with sources | Atlas | `GET /taxa`, [README](../../README.md) | Atlas PRs | Agent review | No specialist review |
| 79 real recordings, WER about 0.10 | Muse Voice Transcribe 1.0 | [WILO_ASR_REAL_EVALUATION](../WILO_ASR_REAL_EVALUATION.md) | #33 | Real recordings | One speaker |
| 16 of 18 scenarios semantically correct | Muse Spark + voice | [WILO_DEMO_SCENARIOS](../WILO_DEMO_SCENARIOS.md) | #33 | End to end with real audio | Answers about 20–37 s |
| Wrongly accepted negatives 25/37 to 3/37 | Muse Spark, verify strategy | [OPEN_SET_IDENTIFICATION_REPORT](../OPEN_SET_IDENTIFICATION_REPORT.md) | Report | 56 fixed cases, weak labels | Not certified botanical accuracy |
| Dombeyi accepted as betuloides, 2 of 2 | Public `/identify` | [PUBLIC_DEMO](../PUBLIC_DEMO.md) | #53 | Observed 04-11-2026 | Single cases; cause unproven |
| SAM median mask IoU 0.79–0.83 | SAM 3.1 | [SAM31_EXTENDED_RESEARCH_REPORT](../SAM31_EXTENDED_RESEARCH_REPORT.md) | Report | Experimental | Agent-made references, not specialists. Don't extrapolate to nature in general |
| Anonymous real inference works | Public API | [META_CLOUD_ACTIVATION](../META_CLOUD_ACTIVATION.md) section 9 | #50, #53 | Real calls through the public domain | Campaign closes 2026-11-10T05:00:00Z |
| Spending and expiry controls | PostgreSQL ledger | `services/api/tests/test_public_demo.py` | #50 | Tests with real PostgreSQL and simulated provider, threads and processes | The ledger doesn't cap external billing |
| Video results are authentic | Wilo Lab + public API | [VIDEO_SCRIPT_FINAL](VIDEO_SCRIPT_FINAL.md) | `feat/submission-package` | Recorded live 04-11-2026; shortened waits are labelled | Narration is a synthetic voice |
