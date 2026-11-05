# Final video script

`bosque-vivo-hackathon-human-final.mp4`: 2:38, 1920×1080, 30 fps, H.264 and AAC, −16.2 LUFS, English subtitles burned in.

**Narration:** one real presenter, continuous take `WIN_20261104_22_07_09_Pro.mp4`. The audio is unedited apart from filtering and loudness. Details are in [HUMAN_AUDIO_EDIT.md](../../submission-video/HUMAN_AUDIO_EDIT.md).

**Footage:** real software except for a 5-second end card. Recorded on 04-11-2026 against the public API. Waits are cut and labelled. SAM clips are saved results from earlier real runs, labelled as such. The sample voice sent to Muse Voice is a synthetic test voice, labelled on screen. No music.

| Start | Narration | Footage |
| --- | --- | --- |
| 0:00 | We are ProGarLabs from southern Chile. This is Bosque Vivo. | Presenter on camera |
| 0:05 | This is the mobile experience we're building. Visitors can explore national parks, discover species and learn about the environment, with Wilo as their nature companion. | Mobile recording: welcome, species, park, map. Labelled `Mobile UI prototype` |
| 0:25 | Now let's try the real AI-powered experience. We start with a sample voice question. | Wilo Lab status and recording, labelled as a synthetic test voice |
| 0:31 | Muse Voice Transcribe converts the audio into text, which we can review and edit. Then we ask Muse Spark about the trails in Puyehue National Park. | Real transcript, edited question, send |
| 0:41 | What's the actual response? Instead of relying only on its own knowledge, Wilo uses our environmental atlas and retrieves documented information. | Real Muse Spark answer, wait shortened |
| 0:53 | It shows the trails, provides the sources and makes something important clear. | Sources panel |
| 0:57 | The current opening conditions are not verified. When the evidence is missing, Wilo doesn't pretend to know. | Answer text, then trail list with "not verified" |
| 1:05 | We also explored Meta SAM 3.1. These are genuine results from our visual research lab. SAM segments organisms such as ferns, fungi and trees, and can track objects across video frames. | Original photo, then saved masks and tracking |
| 1:26 | Segmentation tells us where an organism is. Identifying its species is a separate challenge. | SAM and Muse comparison |
| 1:33 | Here we send a licensed photograph to Muse Spark. Bosque Vivo analyzes visible characteristics and suggests possible tree species. | Ulmo photo, real result |
| 1:41 | In this example, the evidence for ulmo is insufficient, so the system requests a better photograph. | Exploratory candidate and recommended photo |
| 1:50 | We also tested a fungus outside our tree catalog, where the system can abstain. These are suggestions, not scientifically verified identifications. | Fungus photo, real result |
| 1:58 | The intelligence is grounded in real environmental information. Our atlas organizes 46 national parks, 190 reviewed trails and sourced biodiversity records. | Atlas panel, Puyehue map, documented trails |
| 2:10 | Behind the scenes, we connect Meta models with geographic data and a production API. That means visitors can explore information with its sources, while the system remains transparent about its limitations. | Trails, web catalog, mobile species sources |
| 2:23 | We built Bosque Vivo because discovering nature should be engaging, accessible and responsible. | Presenter on camera |
| 2:28 | From southern Chile, we're bringing artificial intelligence closer to the ecosystems around us. This is Bosque Vivo, by ProGarLabs. | Mobile app, then end card |

**Figures:** see [SUBMISSION_EVIDENCE.md](SUBMISSION_EVIDENCE.md).

**Media rights:**
- Identify photos: Lin linao (CC BY-SA 4.0), Robert Motecinos Holda (CC0).
- SAM media: credited in each clip footer; sources are CC BY, CC BY 2.0, CC BY 4.0, CC BY-SA 4.0 and CC0.
- CC BY-SA sources mean the masks over them are derivatives under the same license terms.
