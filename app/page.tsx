import Link from "next/link";
import { Avatar } from "@/app/components/Avatar";
import { VideoCard } from "@/app/components/VideoCard";
import { getProfileSettings, listProfiles, listVideos } from "@/db";
import { profileMediaUrl } from "@/app/lib/profile-media";
import { getChatGPTUser } from "@/app/chatgpt-auth";

export const dynamic = "force-dynamic";

const categories = [
  ["all", "All"],
  ["film", "Film"],
  ["animation", "Animation"],
  ["music", "Music"],
  ["education", "Education"],
  ["experimental", "Experimental"],
] as const;

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const query = params.q?.trim().slice(0, 80) ?? "";
  const category = params.category ?? "all";
  const sort = params.sort === "newest" ? "newest" : "community";
  const viewer = await getChatGPTUser();
  const settings = viewer ? await getProfileSettings(viewer.email) : null;
  const [videos, creators] = await Promise.all([
    listVideos({ query, category, sort, preferSeries: settings?.preferLongform }),
    query ? listProfiles({ query, limit: 6 }) : Promise.resolve([]),
  ]);

  return (
    <main>
      <section className="hero">
        <div className="hero-grid">
          <div className="eyebrow">
            <span className="live-dot" />
            AI video / open beta
          </div>
          <h1>
            Watch what AI can imagine.
            <br />
            <em>Nothing else.</em>
          </h1>
          <p className="hero-copy">
            Pumblo is an AI-only video-sharing network and the creator-owned home
            after the render: connected stories, transparent limits, and public
            work that is not trapped inside one generation tool.
          </p>
          <div className="hero-actions">
            <a className="button button-primary button-large" href="#feed">
              Explore videos <span aria-hidden="true">↓</span>
            </a>
            <Link className="button button-ghost button-large" href="/upload">
              Upload video <span aria-hidden="true">↗</span>
            </Link>
            <Link className="button button-ghost button-large" href="/quicks">
              Watch Quicks <span aria-hidden="true">ϟ</span>
            </Link>
          </div>
          <p className="hero-note">
            Free to watch · creator channels · likes, comments, and follows
          </p>
        </div>
        <aside className="hero-manifesto">
          <span className="manifesto-index">THE FEED HAS ONE RULE</span>
          <p>
            AI must materially shape every video. Creators keep the public link,
            credit their sources, and build an audience across tools—not for one vendor.
          </p>
          <div className="manifesto-rule" />
          <div className="manifesto-stats">
            <span>
              <strong>100</strong>
              creator launch
            </span>
            <span>
              <strong>40 MB</strong>
              per video
            </span>
            <span>
              <strong>AGPL</strong>
              open source
            </span>
          </div>
        </aside>
      </section>

      <section className="discovery" id="feed">
        <div className="section-heading">
          <div>
            <span className="section-kicker">AI-only feed</span>
            <h2>{query ? `Results for “${query}”` : "Trending AI videos"}</h2>
          </div>
          <div className="sort-links" aria-label="Sort videos">
            <Link
              className={sort === "community" ? "active" : ""}
              href={filterHref({ query, category, sort: "community" })}
            >
              Trending
            </Link>
            <Link
              className={sort === "newest" ? "active" : ""}
              href={filterHref({ query, category, sort: "newest" })}
            >
              Latest
            </Link>
          </div>
        </div>

        <div className="category-row" aria-label="Filter by category">
          {categories.map(([value, label]) => (
            <Link
              key={value}
              className={category === value ? "category active" : "category"}
              href={filterHref({ query, category: value, sort })}
            >
              {label}
            </Link>
          ))}
        </div>

        {creators.length ? (
          <div className="creator-results" aria-label="Matching creators">
            <span className="section-kicker">Creators</span>
            <div>
              {creators.map((creator) => (
                <Link key={creator.handle} href={`/profile/${creator.handle}`}>
                  <Avatar
                    name={creator.displayName}
                    color={creator.avatarColor}
                    src={
                      creator.avatarObjectKey
                        ? profileMediaUrl(creator.handle, "avatar", creator.updatedAt)
                        : undefined
                    }
                    size="md"
                  />
                  <span>
                    <strong>{creator.displayName}</strong>
                    <small>@{creator.handle}</small>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        {videos.length ? (
          <div className="video-grid">
            {videos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <span className="empty-glyph" aria-hidden="true">◇</span>
            <h3>
              {query ? "No AI videos matched that search" : "The feed is ready for its first AI video"}
            </h3>
            <p>
              {query
                ? "Try a title, creator, tool, or broader phrase."
                : "Upload something AI made possible. Viewers can watch without creating an account."}
            </p>
            <Link className="button button-primary" href="/upload">
              Upload the first video
            </Link>
          </div>
        )}
      </section>

      <section className="open-source-band">
        <div>
          <span className="section-kicker">Built in public</span>
          <h2>Use the platform. Inspect the code.</h2>
          <p>
            Pumblo is AGPL-licensed, openly documented, and shipped with
            executable release gates.
          </p>
        </div>
        <a
          className="button button-primary button-large"
          href="https://github.com/IamOumarIbrahim/pumblo"
          rel="noreferrer"
          target="_blank"
        >
          Star Pumblo on GitHub ↗
        </a>
      </section>
    </main>
  );
}

function filterHref({
  query,
  category,
  sort,
}: {
  query: string;
  category: string;
  sort: string;
}) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (category !== "all") params.set("category", category);
  if (sort !== "community") params.set("sort", sort);
  const value = params.toString();
  return value ? `/?${value}` : "/";
}
