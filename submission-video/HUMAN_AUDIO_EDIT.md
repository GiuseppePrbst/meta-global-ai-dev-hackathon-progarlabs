# Human audio edit

**Takes reviewed:** `WIN_20261104_21_48_32`, `21_51_40`, `22_00_42`, `22_01_20` and `22_07_09`, all showing the same presenter. The first two were not transcribed; the owner's later, cleaner takes replaced them.

**Take used:** `WIN_20261104_22_07_09_Pro.mp4`, continuous from 0:00 to 2:38. It is the shortest complete read, and it has no voice edits, no synthesis and no second speaker.

**Method:** Muse Voice Transcribe, in chunks of up to 48 s, because no local speech recognition was available. Phrase timing comes from pause detection and four short slices, so times are approximate.

**Not verified by ear.** The machine transcript had errors such as "SIM" for SAM, "Mrs. Park" for Muse Spark and "forest six" for forty-six. Subtitles fix those from the script. Repeated words in the transcript may be recognition artifacts. A person must watch the video once to confirm the subtitles match.

| Spoken phrase | File | Original time | Visual section | Editorial action |
| --- | --- | --- | --- | --- |
| We are ProGarLabs from southern Chile. This is Bosque Vivo. | `22_07_09` | 0:00 | Presenter on camera | Kept |
| This is the mobile experience we're building. Visitors can explore national parks, discover species and learn about the environment, with Wilo as their nature companion. | `22_07_09` | 0:05 | Mobile recording: welcome, species, park, map. Labelled `Mobile UI prototype` | Kept |
| Now let's try the real AI-powered experience. We start with a sample voice question. | `22_07_09` | 0:25 | Wilo Lab status and recording, labelled as a synthetic test voice | Kept |
| Muse Voice Transcribe converts the audio into text, which we can review and edit. Then we ask Muse Spark about the trails in Puyehue National Park. | `22_07_09` | 0:31 | Real transcript, edited question, send | Zoom |
| What's the actual response? Instead of relying only on its own knowledge, Wilo uses our environmental atlas and retrieves documented information. | `22_07_09` | 0:41 | Real Muse Spark answer, wait shortened | Zoom |
| It shows the trails, provides the sources and makes something important clear. | `22_07_09` | 0:53 | Sources panel | Zoom |
| The current opening conditions are not verified. When the evidence is missing, Wilo doesn't pretend to know. | `22_07_09` | 0:57 | Answer text, then trail list with "not verified" | Zoom |
| We also explored Meta SAM 3.1. These are genuine results from our visual research lab. SAM segments organisms such as ferns, fungi and trees, and can track objects across video frames. | `22_07_09` | 1:05 | Original photo, then saved masks and tracking | Labelled as saved runs |
| Segmentation tells us where an organism is. Identifying its species is a separate challenge. | `22_07_09` | 1:26 | SAM and Muse comparison | Kept |
| Here we send a licensed photograph to Muse Spark. Bosque Vivo analyzes visible characteristics and suggests possible tree species. | `22_07_09` | 1:33 | Ulmo photo, real result | Zoom |
| In this example, the evidence for ulmo is insufficient, so the system requests a better photograph. | `22_07_09` | 1:41 | Exploratory candidate and recommended photo | Zoom |
| We also tested a fungus outside our tree catalog, where the system can abstain. These are suggestions, not scientifically verified identifications. | `22_07_09` | 1:50 | Fungus photo, real result | Zoom |
| The intelligence is grounded in real environmental information. Our atlas organizes 46 national parks, 190 reviewed trails and sourced biodiversity records. | `22_07_09` | 1:58 | Atlas panel, Puyehue map, documented trails | Replaces the raw JSON shot |
| Behind the scenes, we connect Meta models with geographic data and a production API. That means visitors can explore information with its sources, while the system remains transparent about its limitations. | `22_07_09` | 2:10 | Trails, web catalog, mobile species sources | Kept |
| We built Bosque Vivo because discovering nature should be engaging, accessible and responsible. | `22_07_09` | 2:23 | Presenter on camera | Kept |
| From southern Chile, we're bringing artificial intelligence closer to the ecosystems around us. This is Bosque Vivo, by ProGarLabs. | `22_07_09` | 2:28 | Mobile app, then end card | Kept |
