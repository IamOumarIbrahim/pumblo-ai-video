import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { chatGPTSignInPath, getChatGPTUser } from "@/app/chatgpt-auth";
import { Avatar } from "@/app/components/Avatar";
import { FollowButton } from "@/app/components/FollowButton";
import { VideoCard } from "@/app/components/VideoCard";
import { StoryTier } from "@/app/components/StoryTier";
import { SocialLinks } from "@/app/components/SocialLinks";
import { profileMediaUrl } from "@/app/lib/profile-media";
import {
  getFollowState,
  getProfileByEmail,
  getProfileByHandle,
  getProfileSettings,
  getCreatorTier,
  listSeries,
  listVideos,
} from "@/db";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  const profile = await getProfileByHandle(handle);
  if (!profile) return { title: "Channel not found" };
  return {
    title: `@${profile.handle}`,
    description:
      profile.bio || `Watch AI videos by ${profile.displayName} on Pumblo.`,
    alternates: { canonical: `/profile/${profile.handle}` },
    openGraph: {
      title: `${profile.displayName} on Pumblo`,
      description: profile.bio || `AI video channel by @${profile.handle}.`,
      url: `/profile/${profile.handle}`,
      type: "profile",
    },
  };
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const profile = await getProfileByHandle(handle);
  if (!profile) notFound();

  const viewer = await getChatGPTUser();
  const viewerProfile = viewer ? await getProfileByEmail(viewer.email) : null;
  const [videos, following, settings, series, tier] = await Promise.all([
    listVideos({ ownerEmail: profile.email, sort: "newest" }),
    viewer && viewer.email !== profile.email
      ? getFollowState(profile.email, viewer.email)
      : Promise.resolve(false),
    getProfileSettings(profile.email),
    listSeries({ ownerEmail: profile.email, limit: 100 }),
    getCreatorTier(profile.email),
  ]);
  const isOwner = viewer?.email === profile.email;
  const followActionPath = !viewer
    ? chatGPTSignInPath(`/profile/${profile.handle}`)
    : !viewerProfile
      ? `/settings/profile?next=${encodeURIComponent(`/profile/${profile.handle}`)}`
      : null;

  return (
    <main className="profile-page">
      <section
        className={profile.bannerObjectKey ? "profile-banner has-media" : "profile-banner"}
        style={{
          background: `linear-gradient(120deg, ${profile.avatarColor} 0%, #15171b 48%, #0a0b0d 100%)`,
        }}
      >
        {profile.bannerObjectKey ? (
          <Image
            src={profileMediaUrl(profile.handle, "banner", profile.updatedAt)}
            alt={`${profile.displayName}'s profile banner`}
            width={1600}
            height={480}
            priority
            unoptimized
          />
        ) : null}
        <span>PUMBLO / AI VIDEO CREATOR</span>
      </section>
      <section className="profile-intro">
        <Avatar
          name={profile.displayName}
          color={profile.avatarColor}
          src={
            profile.avatarObjectKey
              ? profileMediaUrl(profile.handle, "avatar", profile.updatedAt)
              : undefined
          }
          size="xl"
        />
        <div className="profile-identity">
          <div className="profile-name-row">
            <div>
              <h1>{profile.displayName}</h1>
              <p>@{profile.handle}</p>
            </div>
            {isOwner ? (
              <Link className="button button-ghost" href="/settings/profile">
                Edit channel
              </Link>
            ) : (
              <FollowButton
                handle={profile.handle}
                initialFollowing={following}
                initialCount={settings.showFollowerCounts ? profile.followerCount : 0}
                actionPath={followActionPath}
                showCount={settings.showFollowerCounts}
              />
            )}
          </div>
          <p className="profile-bio">
            {profile.bio || "This creator is letting the videos speak first."}
          </p>
          <StoryTier tier={tier} compact />
          <div className="profile-details">
            <span>
              <b>{videos.length}</b> {videos.length === 1 ? "video" : "videos"}
            </span>
            {settings.showFollowerCounts ? <span><b>{profile.followerCount}</b> followers</span> : null}
            {settings.showFollowerCounts ? <span><b>{profile.followingCount}</b> following</span> : null}
            {settings.showLocation && profile.location ? <span>{profile.location}</span> : null}
            {profile.website ? (
              <a href={profile.website} rel="nofollow ugc noreferrer" target="_blank">
                Website ↗
              </a>
            ) : null}
          </div>
          <SocialLinks profile={profile} settings={settings} />
        </div>
      </section>

      {series.length ? (
        <section className="profile-series">
          <div className="section-heading"><div><span className="section-kicker">Connected stories</span><h2>Series</h2></div></div>
          <div className="series-card-grid">
            {series.map((item) => (
              <Link href={`/series/${item.id}`} key={item.id}>
                <span>{item.status} · {item.episodeCount} episodes</span>
                <h3>{item.title}</h3>
                <p>{item.description || "Open the series and watch in order."}</p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="profile-films">
        <div className="section-heading">
          <div>
            <span className="section-kicker">Channel</span>
            <h2>AI videos</h2>
          </div>
          {isOwner ? (
            <Link className="button button-primary" href="/upload">
              Upload video
            </Link>
          ) : null}
        </div>
        {videos.length ? (
          <div className="video-grid">
            {videos.map((video) => (
              <div className="owner-video-wrap" key={video.id}>
                <VideoCard video={video} />
                {isOwner ? (
                  <Link className="owner-video-edit" href={`/studio/videos/${video.id}`}>
                    Edit video
                  </Link>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state compact">
            <h3>No videos yet</h3>
            <p>
              {isOwner
                ? "Your channel is ready. Upload the AI video you want people to discover."
                : "This creator has not uploaded a video yet."}
            </p>
            {isOwner ? (
              <Link className="button button-primary" href="/upload">
                Upload video
              </Link>
            ) : null}
          </div>
        )}
      </section>
    </main>
  );
}
