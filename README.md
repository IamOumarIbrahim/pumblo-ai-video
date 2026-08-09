<div align="center">

# Pumblo

### A public home for AI video after the render.

Publish AI-made videos, build connected stories, and grow an audience beyond a single generation tool.

[**Try Pumblo**](https://pumblo-ai-video.oumaribrahim123.chatgpt.site) | [Roadmap](ROADMAP.md) | [Contribute](#contributing)

[![Live site](https://img.shields.io/badge/Live-Try_Pumblo-a7ff1f?style=for-the-badge&labelColor=111318)](https://pumblo-ai-video.oumaribrahim123.chatgpt.site)
[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-ffffff?style=for-the-badge&labelColor=111318)](LICENSE)

</div>

![Pumblo social preview](public/og.png)

## Why Pumblo?

AI tools make videos. Pumblo gives those videos somewhere to live.

Creators get one public channel for their work, including standalone videos and connected series. Viewers can browse freely, follow creators, join discussions, and return for new episodes. An account is only required to publish or interact.

[**Open the live site**](https://pumblo-ai-video.oumaribrahim123.chatgpt.site)

## Highlights

- Public video feeds, creator channels, search, and short-form Quicks.
- Series pages with numbered episodes and continue-watching support.
- Likes, dislikes, follows, comments, nested replies, and notifications.
- Batch uploads with still previews and a storage meter.
- Optional generation details, social links, and three creator ranks.
- Canonical video pages that are easy to share and discover.

## Launch scope

| Limit | Allowance |
| --- | --- |
| Per video | 40 MB, MP4 or WebM |
| Per creator | 80 MB total, up to 12 active videos |
| Quicks | Videos under 60 seconds |
| Initial launch | Designed for the first 100 creators |

Pumblo is in open beta. AI and production details are creator-declared, and creators upload original files they own rather than importing videos from third-party platforms.

## Run locally

Requires Node.js 22.13 or newer.

```powershell
git clone https://github.com/IamOumarIbrahim/pumblo-ai-video.git
cd pumblo-ai-video
npm ci
npm run verify
npm run dev
```

Open `http://localhost:3000`. Local development can use seeded demo data and does not require production credentials.

Technical details: [Architecture](docs/architecture.md) | [API](docs/api.md) | [Hosting](docs/HOSTING-100-USERS.md) | [Product gates](docs/PRODUCT-GATES.md) | [Fact-check](docs/FACT-CHECK.md)

## Contributing

Feedback and focused pull requests are welcome. Check the [roadmap](ROADMAP.md) or open an [issue](https://github.com/IamOumarIbrahim/pumblo-ai-video/issues).

If the project feels useful, [star the repository](https://github.com/IamOumarIbrahim/pumblo-ai-video) or share Pumblo with an AI-video creator.

## License

[GNU Affero General Public License v3.0](LICENSE)
