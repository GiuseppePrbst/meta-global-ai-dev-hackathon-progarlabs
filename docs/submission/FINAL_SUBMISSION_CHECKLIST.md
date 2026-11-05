# Final submission checklist

Status on 04-11-2026. Deadline: 21:00 EST, 23:00 Chile. Target: 22:45 Chile.

| Item | Status | Owner | Next action | Evidence to close |
| --- | --- | --- | --- | --- |
| Public API working | Done | Giuseppe | None | `/demo/status` active |
| Video recorded, 2:32 | Done | Team | None | `ffprobe`: 151.7 s, 1920×1080, H.264 |
| Video uploaded | Pending | Representative | Upload to YouTube as Unlisted | Plays in a logged-out window |
| README and documents | Pending merge | Giuseppe | Review and merge the submission PR | README visible on GitHub |
| Video link in README and form | Pending | Giuseppe | Add the link after upload | Link works logged out |
| Form text fields | Done | Agent | Filled in the signed-in form, not submitted | Team, track, theme, description, repository and Meta answers entered |
| Survey, consent, members | Pending | Representative | Answer the required opinions, accept the consent, add José if admitted | Form validates |
| Representative admitted | Pending | Team | Confirm in the portal | Name shown in the portal |
| X post or other required links | Unknown | Representative | Check the form; nothing posted without authorization | Form reviewed |
| Submission sent | Pending | Representative | Review and press submit | Portal confirmation saved |
| Tag `hackathon-2026-submission` | Pending | Giuseppe | Tag after merge | Tag visible on GitHub |

## Known restrictions

- **Code license:** none defined at the repository root. Public doesn't mean open source. The owner must decide.
- **Wilo artwork:** attribution is pending in the mobile repository. It isn't used in the video.
- **Fabiana García:** her admission isn't confirmed, so she isn't listed as a participant in the submission texts.
- **Mobile identify:** prototype with demonstration data. It is excluded from the video.

## Incident, 04-11-2026, about 20:44–20:49 Chile

While publishing the demo client, a Wrangler command run inside the proxy folder deployed a Worker named `bosque-vivo-demo` with the proxy's configuration. It took over `api-bosquevivo.progarlabs.com` and lacked the origin secret, so the API answered 403 for about five minutes.

The original proxy was redeployed with owner authorization (version `ced00531-1bab-40cd-9981-0865f1cb9897`) and the accidental Worker was deleted. Budget, deadline, secrets and Cloud Run were unchanged. Separate publication of the client was abandoned, and the video uses a local session.
