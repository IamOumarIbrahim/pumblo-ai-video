import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { chatGPTSignInPath, getChatGPTUser } from "@/app/chatgpt-auth";
import { Avatar } from "@/app/components/Avatar";
import { DeleteVideoButton } from "@/app/components/DeleteVideoButton";
import { Engagement } from "@/app/components/Engagement";
import { ReportButton } from "@/app/components/ReportButton";
import { RankBadge } from "@/app/components/RankBadge";
import { SocialLinks } from "@/app/components/SocialLinks";
import { VideoCard } from "@/app/components/VideoCard";
import { WatchPlayer } from "@/app/components/WatchPlayer";
import { compactNumber, relativeTime } from "@/app/lib/format";
import {
  getLikeState,
  getCreatorTier,
  getProfileByEmail,
  getProfileSettings,
  getWatchLaterState,
  getWatchProgress,
  getVideo,
  incrementViews,
  listComments,
  listVideos,
} from "@/db";

export const dynamic = "force-dynamic";
const base = "https://pumblo-ai-video.oumaribrahim123.chatgpt.site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const video = await getVideo(id);
  if (!video) return { title: "Video not found" };
  return {
    title: video.title,
    description:
      video.description || `AI video created with ${video.generationTool}.`,
    alternates: { canonical: `/watch/${video.id}` },
    openGraph: {
      title: `${video.title} by ${video.ownerDisplayName}`,
      description:
        video.description ||
        `Watch this AI video and see the ${video.generationTool} process behind it.`,
      type: "video.other",
      url: `/watch/${video.id}`,
    },
  };
}

export default async function WatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ uploaded?: string }>;
}) {
  const { id } = await params;
  const video = await getVideo(id);
  if (!video) notFound();

  const viewer = await getChatGPTUser();
  await incrementViews(id);
  const [profile, comments, liked, saved, related, query, viewerSettings, progress, seriesEpisodes, ownerProfile, ownerSettings, ownerTier] = await Promise.all([
    viewer ? getProfileByEmail(viewer.email) : Promise.resolve(null),
    listComments(id, viewer?.email),
    viewer ? getLikeState(id, viewer.email) : Promise.resolve(false),
    viewer ? getWatchLaterState(id, viewer.email) : Promise.resolve(false),
    listVideos({ category: video.category, sort: "community", limit: 5 }),
    searchParams,
    viewer ? getProfileSettings(viewer.email) : Promise.resolve(null),
    viewer ? getWatchProgress(id, viewer.email) : Promise.resolve(null),
    video.seriesId ? listVideos({ seriesId: video.seriesId, limit: 100 }) : Promise.resolve([]),
    getProfileByEmail(video.ownerEmail),
    getProfileSettings(video.ownerEmail),
    getCreatorTier(video.ownerEmail),
  ]);
  const relatedVideos = related.filter((item) => item.id !== id).slice(0, 4);
  const isOwner = viewer?.email === video.ownerEmail;
  const episodeIndex = seriesEpisodes.findIndex((episode) => episode.id === video.id);
  const previousEpisode = episodeIndex > 0 ? seriesEpisodes[episodeIndex - 1] : null;
  const nextEpisode = episodeIndex >= 0 ? seriesEpisodes[episodeIndex + 1] ?? null : null;
  const interactionPath = !viewer
    ? chatGPTSignInPath(`/watch/${video.id}`)
    : !profile
      ? `/settings/profile?next=${encodeURIComponent(`/watch/${video.id}`)}`
      : null;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: video.title,
    description:
      video.description || `AI video created with ${video.generationTool}.`,
    uploadDate: video.createdAt,
    contentUrl: `${base}/media/${video.id}`,
    embedUrl: `${base}/watch/${video.id}`,
    creator: {
      "@type": "Person",
      name: video.ownerDisplayName,
      url: `${base}/profile/${video.ownerHandle}`,
    },
  };

  return (
    <main className="watch-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replaceAll("<", "\\u003c"),
        }}
      />
      {query.uploaded === "1" ? (
        <div className="success-banner">
          <span>✓</span>
          Your video is live. Share the link or keep exploring the feed.
        </div>
      ) : null}

      <div className="watch-layout">
        <section className="watch-main">
          <WatchPlayer
            videoId={video.id}
            autoPlay={query.uploaded === "1"}
            canPersist={Boolean(profile)}
            initialProgress={progress?.progressSeconds ?? 0}
            autoplayNext={viewerSettings?.autoplayNext ?? true}
            nextEpisode={nextEpisode ? { id: nextEpisode.id, title: nextEpisode.title } : null}
          />

          <div className="watch-copy">
            <div className="film-flags">
              <span>{video.category}</span>
              <span>{video.generationTool}</span>
              {video.seriesId ? (
                <Link href={`/series/${video.seriesId}`}>
                  {video.seriesTitle} · S{video.seasonNumber} E{video.episodeNumber}
                </Link>
              ) : null}
              <span className="provenance-flag">Creator-declared AI process</span>
            </div>
            <h1>{video.title}</h1>
            {ownerProfile && ownerSettings.socialPlacement === "under-title" ? (
              <SocialLinks profile={ownerProfile} settings={ownerSettings} compact />
            ) : null}
            <p className="watch-meta">
              {compactNumber(video.views + 1)} views · {relativeTime(video.createdAt)}
            </p>

            <div className="creator-strip">
              <Link href={`/profile/${video.ownerHandle}`}>
                <Avatar
                  name={video.ownerDisplayName}
                  color={video.ownerAvatarColor}
                  src={video.ownerAvatarUrl || undefined}
                  size="lg"
                />
              </Link>
              <div>
                <Link href={`/profile/${video.ownerHandle}`}>
                  {video.ownerDisplayName}
                </Link>
                <RankBadge rank={ownerTier.grade} />
                <p>@{video.ownerHandle}</p>
              </div>
              <Link
                className="button button-ghost"
                href={`/profile/${video.ownerHandle}`}
              >
                View channel
              </Link>
            </div>

            {video.description ? (
              <div className="film-description">
                <h2>About this video</h2>
                <p>{video.description}</p>
              </div>
            ) : null}
            {ownerProfile && ownerSettings.socialPlacement === "under-description" ? (
              <SocialLinks profile={ownerProfile} settings={ownerSettings} compact />
            ) : null}

            {video.seriesId ? (
              <nav className="episode-navigation" aria-label="Series episodes">
                <div><span>Part of</span><Link href={`/series/${video.seriesId}`}>{video.seriesTitle}</Link></div>
                <div>
                  {previousEpisode ? <Link className="button button-ghost" href={`/watch/${previousEpisode.id}`}>← Previous</Link> : null}
                  {nextEpisode ? <Link className="button button-primary" href={`/watch/${nextEpisode.id}`}>Next episode →</Link> : null}
                </div>
              </nav>
            ) : null}

            <div className="provenance-panel">
              <div>
                <span className="section-kicker">Optional creator feature</span>
                <h2>Behind the render</h2>
              </div>
              <dl>
                <div><dt>Tool</dt><dd>{video.generationTool}</dd></div>
                <div><dt>Mode</dt><dd>{video.generationMode.replaceAll("-", " ")}</dd></div>
                <div><dt>License</dt><dd>{video.license.replaceAll("-", " ")}</dd></div>
                <div><dt>Provenance</dt><dd>creator declared</dd></div>
              </dl>
              {video.prompt ? (
                <details>
                  <summary>Open prompt and process notes</summary>
                  <p>{video.prompt}</p>
                </details>
              ) : null}
              {video.sourceCreditUrl ? (
                <p className="source-credit">
                  Creator credit: <a href={video.sourceCreditUrl} rel="nofollow ugc noreferrer" target="_blank">open source or inspiration ↗</a>
                </p>
              ) : null}
            </div>

            <Engagement
              videoId={video.id}
              initialLikeCount={video.likeCount}
              initialLiked={liked}
              initialSaved={saved}
              initialComments={comments}
              signedIn={Boolean(viewer)}
              hasProfile={Boolean(profile)}
              signInPath={chatGPTSignInPath(`/watch/${video.id}`)}
            />

            {isOwner ? (
              <DeleteVideoButton
                videoId={video.id}
                returnTo={`/profile/${video.ownerHandle}`}
              />
            ) : (
              <ReportButton videoId={video.id} actionPath={interactionPath} />
            )}
          </div>
        </section>

        <aside className="watch-sidebar">
          <div className="sidebar-heading">
            <span className="section-kicker">Next up</span>
            <h2>Related videos</h2>
          </div>
          {relatedVideos.length ? (
            relatedVideos.map((item) => (
              <VideoCard key={item.id} video={item} />
            ))
          ) : (
            <p className="sidebar-empty">
              More videos in this category will appear here.
            </p>
          )}
        </aside>
      </div>
    </main>
  );
}
