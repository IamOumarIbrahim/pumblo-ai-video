import Link from "next/link";
import { redirect } from "next/navigation";
import { requireChatGPTUser } from "@/app/chatgpt-auth";
import { StoryTier } from "@/app/components/StoryTier";
import { compactNumber, formatDuration } from "@/app/lib/format";
import { MAX_PROFILE_VIDEO_BYTES } from "@/app/lib/limits";
import { getProfileByEmail, getStudioSnapshot } from "@/db";

export const dynamic = "force-dynamic";

export default async function StudioPage() {
  const user = await requireChatGPTUser("/studio");
  if (!(await getProfileByEmail(user.email))) redirect("/settings/profile?next=/studio");
  const snapshot = await getStudioSnapshot(user.email);
  const storagePercent = Math.min(100, (snapshot.totals.storageBytes / MAX_PROFILE_VIDEO_BYTES) * 100);
  return (
    <main className="studio-page">
      <header className="studio-heading">
        <div><span className="section-kicker">Creator studio</span><h1>Build an audience around stories.</h1><p>Performance, storage, and creator rank use persisted activity you can inspect. Episode runtime is read from the stored media container, not trusted from form metadata.</p></div>
        <div><Link className="button button-primary" href="/upload">Upload</Link><Link className="button button-ghost" href="/studio/series">Manage series</Link></div>
      </header>
      <section className="studio-metrics">
        <article><span>Views</span><strong>{compactNumber(snapshot.totals.views)}</strong></article>
        <article><span>Likes</span><strong>{compactNumber(snapshot.totals.likes)}</strong></article>
        <article><span>Comments</span><strong>{compactNumber(snapshot.totals.comments)}</strong></article>
        <article><span>Published runtime</span><strong>{formatDuration(snapshot.videos.reduce((sum, video) => sum + video.durationSeconds, 0))}</strong></article>
      </section>
      <section className="studio-grid">
        <div className="studio-panel">
          <span className="section-kicker">Structural creator rank</span>
          <h2>Your creator rank</h2>
          <StoryTier tier={snapshot.tier} />
          <p className="tier-proof">Rising is the starting rank. Three published videos earns Active. A qualifying season with at least three consecutive numbered episodes, each at least 60 seconds, earns Storyteller. Duplicate files and duplicate episode slots are rejected. Rank measures publishing structure—not artistic quality, identity, or popularity.</p>
        </div>
        <div className="studio-panel">
          <span className="section-kicker">No-card storage</span>
          <h2>{(snapshot.totals.storageBytes / 1024 / 1024).toFixed(1)} / {MAX_PROFILE_VIDEO_BYTES / 1024 / 1024} MB</h2>
          <div className="storage-meter"><span style={{ width: `${storagePercent}%` }} /></div>
          <p>Only final published bytes count here. Use the optional local optimizer before upload when a source is too large.</p>
        </div>
      </section>
      <section className="studio-videos">
        <div className="section-heading"><div><span className="section-kicker">Per-video performance</span><h2>Published work</h2></div></div>
        {snapshot.videos.length ? <div className="studio-table">{snapshot.videos.map((video) => (
          <Link href={`/watch/${video.id}`} key={video.id}>
            <span><strong>{video.title}</strong><small>{video.seriesTitle ? `${video.seriesTitle} · S${video.seasonNumber} E${video.episodeNumber}` : "Standalone"}</small></span>
            <b>{compactNumber(video.views)} views</b><b>{compactNumber(video.likeCount)} likes</b><b>{compactNumber(video.commentCount)} comments</b>
          </Link>
        ))}</div> : <div className="empty-state compact"><p>Your first upload will start the dashboard.</p></div>}
      </section>
    </main>
  );
}
