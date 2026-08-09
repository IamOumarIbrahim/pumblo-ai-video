# HTTP Route Reference

Pumblo's browser client uses same-origin routes. The open beta does not expose API keys or promise a stable public SDK.

| Route | Method | Auth | Purpose |
| :--- | :--- | :--- | :--- |
| `/api/profile` | GET | Required | Return the caller's profile |
| `/api/profile` | POST JSON | Required | Create/update profile text, privacy-controlled links, and color |
| `/api/profile/media/:kind` | POST image body | Required profile | Create/replace a cropped `avatar` or `banner` |
| `/api/profile/media/:kind` | DELETE | Required profile | Remove profile media |
| `/api/profiles?q=` | GET | Public | Query privacy-filtered creator profiles |
| `/api/profiles/:handle/follow` | POST | Required profile | Toggle follow |
| `/api/settings` | GET, POST JSON | Required profile | Read/update playback, content, notification, and privacy settings |
| `/api/series?handle=` | GET | Public | List a creator's series without exposing owner email |
| `/api/series?mine=1` | GET | Required | List caller-owned series |
| `/api/series` | POST JSON | Required profile | Create a series |
| `/api/series/:id` | PATCH, DELETE | Owner only | Update series or detach its videos and delete it |
| `/api/videos?q=&category=&sort=` | GET | Public | Query videos with `community` or `newest` sorting |
| `/api/videos` | POST video body | Required profile | Validate and publish one MP4/WebM |
| `/api/videos/:id` | DELETE | Owner only | Delete media and dependent activity |
| `/api/videos/:id/like` | POST | Required profile | Toggle like |
| `/api/videos/:id/comments` | POST JSON | Required profile | Save a 1–500-character comment |
| `/api/videos/:id/view` | POST | Public | Count a Quick becoming active |
| `/api/videos/:id/save` | POST | Required profile | Toggle Watch Later |
| `/api/videos/:id/progress` | POST JSON | Required profile | Save bounded playback progress/completion |
| `/api/videos/:id/report` | POST JSON | Required profile | Create/update one report by this profile/video |
| `/api/quicks?offset=` | GET | Public | Page videos with runtime below 60 seconds |
| `/api/notifications/read` | POST | Required profile | Mark caller notifications read |
| `/api/account/export` | GET | Required profile | Download caller-owned JSON data |
| `/media/:id` | GET | Public | Serve source video, including byte ranges |
| `/profile-media/:handle/:kind` | GET | Public | Serve current cropped profile media |
| `/api/dev-session?email=…` | GET | Development only | Switch local test identity |

## Raw video upload contract

The request body is the final MP4/WebM. URL-encoded JSON in `X-Pumblo-Metadata` carries title, description, generation tool/mode, category, license, optional prompt/process notes, optional series/episode/source credit, disclosure acknowledgement, byte length, browser-read duration, and local-optimizer source size.

Generation-tool attribution is optional. A blank value is stored as `Not specified`; the upload form also suggests current tools while accepting any custom pipeline.

Comment creation accepts optional `parentId` JSON. The server verifies that the parent belongs to the same video, keeps replies one level deep, and notifies the creator and replied-to commenter without duplicating the same notification.

The route:

1. caps the metadata header at 12 KB;
2. requires an existing profile and an available slot;
3. enforces 40 MiB per object, 80 MiB total video storage, and 12 active videos;
4. streams the request body to R2 and checks the stored size;
5. reads the capped object to verify a supported video track and container runtime;
6. requires browser/server runtime agreement within `max(2 seconds, 3%)`;
7. computes SHA-256 and rejects duplicate bytes on the same channel;
8. validates series ownership/status and relies on a unique series/season/episode index;
9. publishes the D1 row or deletes the R2 object on failure.

Only the final stored size counts toward quota. `originalSizeBytes` and the displayed local savings are uploader-side estimates; they do not affect Story Tier, ranking, or quota.

## Public object boundary

Public video objects omit owner email, R2 object key, and content hash. Public profile objects omit email and apply the owner's visibility settings to location, creator links, and follower counts. Public series objects omit owner email.

Production identity is supplied by the Sites dispatcher. Do not trust `oai-authenticated-user-*` headers from an origin that bypasses it.
