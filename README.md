<div align="center">

# Pumblo

### A public home for AI video after the render.

Watch AI-made videos, follow creators, publish connected stories, and keep work discoverable beyond a single generation tool.

[**Try Pumblo**](https://pumblo-ai-video.oumaribrahim123.chatgpt.site) · [See what it does](#what-you-can-do) · [View the roadmap](ROADMAP.md)

[![Live site](https://img.shields.io/badge/Live-Try_Pumblo-a7ff1f?style=for-the-badge&labelColor=111318)](https://pumblo-ai-video.oumaribrahim123.chatgpt.site)
[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-ffffff?style=for-the-badge&labelColor=111318)](LICENSE)

</div>

![Pumblo social preview](public/og.png)

## What is Pumblo?

Pumblo is a video-sharing network made specifically for AI-created work.

Generation tools are great at making a video, but they are not always a good place to build an audience or keep a body of work organized. Pumblo gives creators one public channel where viewers can discover their videos, follow connected series, and return for future episodes.

Pumblo is **not another video generator**. It is the place your work can live after it has been rendered.

Watching is open to everyone. You only need to sign in when you want to publish or take part in the community.

## Try it in a minute

1. [Open the live site](https://pumblo-ai-video.oumaribrahim123.chatgpt.site).
2. Browse the main feed, creator channels, or the short-form Quicks feed.
3. Open a video to see its story, creator, generation details, reactions, and discussion.

No account is required to look around.

> **Creator?** Sign in, create a channel, and upload your first AI-made video. Pumblo keeps the publishing flow simple and shows your available storage before you import files.

## Why creators might use it

| What creators need | What Pumblo provides |
| --- | --- |
| One link for their work | A public creator channel with videos, series, and selected social links |
| A way to tell longer stories | Numbered episodes, series pages, and next-episode playback |
| An audience that can return | Follows, comments, replies, reactions, and notifications |
| Credit beyond the final clip | Optional tool, workflow, source, and process details |
| A quick publishing path | Multi-file selection, still-image previews, preserved titles, and a clear storage meter |

## What you can do

### As a viewer

- Watch the latest, trending, and short-form AI videos.
- Follow creators and continue connected stories in order.
- Like or dislike videos, comments, and nested replies.
- See a creator's rank and any social profiles they have chosen to share.
- Report content that needs review.

### As a creator

- Build a public channel for your AI-video work.
- Upload one video or select several original files at once.
- Review still previews and storage use before importing.
- Keep titles and descriptions organized, then edit generation details from your profile.
- Group related videos into numbered series.
- Choose which linked social profiles appear beside your videos.
- Track views, followers, engagement, and upload capacity.

## Creator ranks

Pumblo has three simple ranks. They reward consistent publishing structure, not popularity or artistic taste.

| Rank | Meaning |
| --- | --- |
| **Rising** | A new creator beginning their channel |
| **Active** | A creator who has published several videos |
| **Storyteller** | A creator who has built qualifying, connected video series over time |

Ranks appear on creator profiles and beside names in discussions, so viewers can quickly understand a creator's publishing history.

## Launch limits

Pumblo is intentionally small and practical for its first 100 creators:

- Up to **40 MB per video** and **80 MB per creator channel**.
- Up to **12 active videos** per channel.
- MP4 and WebM uploads are supported.
- Videos under 60 seconds can appear in Quicks.
- Browsing is public; publishing and community actions require sign-in.

The original-file importer does not scrape or download videos from YouTube, X, or other platforms. Creators select files they own, which keeps the launch architecture safer, simpler, and free from paid import services.

## A few honest beta notes

- Pumblo is an open beta, so limits and features may change as real creators use it.
- AI tools and production details are supplied by creators; they are not independently verified.
- Reporting is available, but the project does not yet claim full-scale automated moderation.
- The current limits are designed to keep the first 100-creator launch within free hosting allowances under normal use, not to promise free hosting forever.

## For developers and contributors

You do not need any of this section to use Pumblo. It is here for people who want to run, inspect, or improve the project.

<details>
<summary><strong>Run Pumblo locally</strong></summary>

### Requirements

- Node.js 22.13 or newer
- npm

### Setup

```powershell
git clone https://github.com/IamOumarIbrahim/pumblo-ai-video.git
cd pumblo-ai-video
npm ci
npm run verify
npm run dev
```

Open `http://localhost:3000` in your browser.

The local app can fall back to seeded demo data when hosted database or storage bindings are unavailable. See [`.env.example`](.env.example) for optional configuration.

</details>

<details>
<summary><strong>Architecture and project documentation</strong></summary>

Pumblo is a TypeScript web app built for Cloudflare's free-tier services. The interface runs on Next.js/Vinext, structured data is stored in D1, and uploaded video files are stored in R2.

- [Architecture](docs/architecture.md)
- [API reference](docs/api.md)
- [Hosting the first 100 users](docs/HOSTING-100-USERS.md)
- [Product gates](docs/PRODUCT-GATES.md)
- [Fact-check and limitations](docs/FACT-CHECK.md)
- [Roadmap](ROADMAP.md)

Before opening a change, run:

```powershell
npm run verify
```

</details>

## Contributing

Feedback and focused improvements are welcome. Check the [roadmap](ROADMAP.md), open an [issue](https://github.com/IamOumarIbrahim/pumblo-ai-video/issues), or submit a pull request with a clear explanation of what changed and why.

If Pumblo feels useful, [star the repository](https://github.com/IamOumarIbrahim/pumblo-ai-video) or share the live site with an AI-video creator. Both help more than you might think.

## License

Pumblo is open-source software licensed under the [GNU Affero General Public License v3.0](LICENSE).
