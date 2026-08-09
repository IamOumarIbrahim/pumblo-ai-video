import { env } from "cloudflare:workers";
import { COMMUNITY_ORDER_SQL } from "@/app/lib/community-ranking";
import { creatorTier, type CreatorTier } from "@/app/lib/creator-tier";
export { MAX_VIDEO_BYTES } from "@/app/lib/limits";

type RuntimeBindings = {
  DB: D1Database;
  MEDIA: R2Bucket;
};

export type Profile = {
  email: string;
  handle: string;
  displayName: string;
  bio: string;
  location: string;
  website: string;
  chatgptUrl: string;
  discordUrl: string;
  xUrl: string;
  githubUrl: string;
  youtubeUrl: string;
  avatarColor: string;
  avatarObjectKey: string;
  bannerObjectKey: string;
  followerCount: number;
  followingCount: number;
  createdAt: string;
  updatedAt: string;
};

export type ProfileSettings = {
  autoplayPreviews: boolean;
  previewSound: boolean;
  dataSaver: boolean;
  reducedMotion: boolean;
  autoplayNext: boolean;
  preferLongform: boolean;
  notifyLikes: boolean;
  notifyComments: boolean;
  notifyFollows: boolean;
  notifySeries: boolean;
  showLocation: boolean;
  showSocials: boolean;
  showFollowerCounts: boolean;
  updatedAt: string;
};

export type Series = {
  id: string;
  ownerEmail: string;
  ownerHandle: string;
  ownerDisplayName: string;
  title: string;
  description: string;
  status: "ongoing" | "completed";
  episodeCount: number;
  totalSeconds: number;
  createdAt: string;
  updatedAt: string;
};

export type Video = {
  id: string;
  ownerEmail: string;
  title: string;
  description: string;
  generationTool: string;
  generationMode: string;
  category: string;
  license: string;
  prompt: string;
  objectKey: string;
  contentType: string;
  sizeBytes: number;
  durationSeconds: number;
  seriesId: string | null;
  seriesTitle: string;
  seriesStatus: string;
  seasonNumber: number;
  episodeNumber: number;
  sourceCreditUrl: string;
  originalSizeBytes: number;
  storageSavingsBytes: number;
  contentHash: string;
  provenanceStatus: string;
  views: number;
  createdAt: string;
  ownerHandle: string;
  ownerDisplayName: string;
  ownerAvatarColor: string;
  ownerAvatarUrl: string;
  likeCount: number;
  commentCount: number;
};

export type WatchProgress = {
  videoId: string;
  progressSeconds: number;
  completed: boolean;
  updatedAt: string;
};

export type Notification = {
  id: string;
  type: "like" | "comment" | "reply" | "follow" | "series";
  videoId: string;
  seriesId: string;
  read: boolean;
  createdAt: string;
  actorHandle: string;
  actorDisplayName: string;
  actorAvatarColor: string;
  actorAvatarUrl: string;
};

export type Comment = {
  id: string;
  videoId: string;
  parentId: string | null;
  content: string;
  createdAt: string;
  authorHandle: string;
  authorDisplayName: string;
  authorAvatarColor: string;
  authorAvatarUrl: string;
};

function bindings(): RuntimeBindings {
  return env as unknown as RuntimeBindings;
}

let schemaReady: Promise<void> | undefined;

export async function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = initializeSchema().catch((error) => {
      schemaReady = undefined;
      throw error;
    });
  }
  return schemaReady;
}

async function initializeSchema(): Promise<void> {
  const db = bindings().DB;
  await db.batch([
    db.prepare(`
      CREATE TABLE IF NOT EXISTS profiles (
        email TEXT PRIMARY KEY,
        handle TEXT NOT NULL UNIQUE,
        display_name TEXT NOT NULL,
        bio TEXT NOT NULL DEFAULT '',
        location TEXT NOT NULL DEFAULT '',
        website TEXT NOT NULL DEFAULT '',
        chatgpt_url TEXT NOT NULL DEFAULT '',
        discord_url TEXT NOT NULL DEFAULT '',
        x_url TEXT NOT NULL DEFAULT '',
        github_url TEXT NOT NULL DEFAULT '',
        youtube_url TEXT NOT NULL DEFAULT '',
        avatar_color TEXT NOT NULL DEFAULT '#b8ff3d',
        avatar_object_key TEXT NOT NULL DEFAULT '',
        banner_object_key TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS profile_settings (
        user_email TEXT PRIMARY KEY,
        autoplay_previews INTEGER NOT NULL DEFAULT 1,
        preview_sound INTEGER NOT NULL DEFAULT 1,
        data_saver INTEGER NOT NULL DEFAULT 0,
        reduced_motion INTEGER NOT NULL DEFAULT 0,
        autoplay_next INTEGER NOT NULL DEFAULT 1,
        prefer_longform INTEGER NOT NULL DEFAULT 1,
        notify_likes INTEGER NOT NULL DEFAULT 1,
        notify_comments INTEGER NOT NULL DEFAULT 1,
        notify_follows INTEGER NOT NULL DEFAULT 1,
        notify_series INTEGER NOT NULL DEFAULT 1,
        show_location INTEGER NOT NULL DEFAULT 1,
        show_socials INTEGER NOT NULL DEFAULT 1,
        show_follower_counts INTEGER NOT NULL DEFAULT 1,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (user_email) REFERENCES profiles(email)
      )
    `),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS series (
        id TEXT PRIMARY KEY,
        owner_email TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'ongoing',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (owner_email) REFERENCES profiles(email)
      )
    `),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS videos (
        id TEXT PRIMARY KEY,
        owner_email TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        generation_tool TEXT NOT NULL,
        generation_mode TEXT NOT NULL,
        category TEXT NOT NULL,
        license TEXT NOT NULL,
        prompt TEXT NOT NULL DEFAULT '',
        object_key TEXT NOT NULL UNIQUE,
        content_type TEXT NOT NULL,
        size_bytes INTEGER NOT NULL,
        duration_seconds REAL NOT NULL DEFAULT 0,
        series_id TEXT,
        season_number INTEGER NOT NULL DEFAULT 1,
        episode_number INTEGER NOT NULL DEFAULT 0,
        source_credit_url TEXT NOT NULL DEFAULT '',
        original_size_bytes INTEGER NOT NULL DEFAULT 0,
        storage_savings_bytes INTEGER NOT NULL DEFAULT 0,
        content_hash TEXT NOT NULL DEFAULT '',
        provenance_status TEXT NOT NULL,
        sqs_score INTEGER NOT NULL,
        views INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        FOREIGN KEY (owner_email) REFERENCES profiles(email)
      )
    `),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS watch_later (
        video_id TEXT NOT NULL,
        user_email TEXT NOT NULL,
        created_at TEXT NOT NULL,
        PRIMARY KEY (video_id, user_email),
        FOREIGN KEY (video_id) REFERENCES videos(id),
        FOREIGN KEY (user_email) REFERENCES profiles(email)
      )
    `),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS watch_progress (
        video_id TEXT NOT NULL,
        user_email TEXT NOT NULL,
        progress_seconds REAL NOT NULL DEFAULT 0,
        completed INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (video_id, user_email),
        FOREIGN KEY (video_id) REFERENCES videos(id),
        FOREIGN KEY (user_email) REFERENCES profiles(email)
      )
    `),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        recipient_email TEXT NOT NULL,
        actor_email TEXT NOT NULL,
        type TEXT NOT NULL,
        video_id TEXT NOT NULL DEFAULT '',
        series_id TEXT NOT NULL DEFAULT '',
        read INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        FOREIGN KEY (recipient_email) REFERENCES profiles(email)
      )
    `),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS reports (
        id TEXT PRIMARY KEY,
        reporter_email TEXT NOT NULL,
        video_id TEXT NOT NULL,
        reason TEXT NOT NULL,
        details TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'open',
        created_at TEXT NOT NULL,
        UNIQUE (video_id, reporter_email),
        FOREIGN KEY (reporter_email) REFERENCES profiles(email),
        FOREIGN KEY (video_id) REFERENCES videos(id)
      )
    `),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS likes (
        video_id TEXT NOT NULL,
        user_email TEXT NOT NULL,
        created_at TEXT NOT NULL,
        PRIMARY KEY (video_id, user_email),
        FOREIGN KEY (video_id) REFERENCES videos(id),
        FOREIGN KEY (user_email) REFERENCES profiles(email)
      )
    `),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS comments (
        id TEXT PRIMARY KEY,
        video_id TEXT NOT NULL,
        author_email TEXT NOT NULL,
        parent_id TEXT,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (video_id) REFERENCES videos(id),
        FOREIGN KEY (author_email) REFERENCES profiles(email)
      )
    `),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS follows (
        creator_email TEXT NOT NULL,
        follower_email TEXT NOT NULL,
        created_at TEXT NOT NULL,
        PRIMARY KEY (creator_email, follower_email),
        FOREIGN KEY (creator_email) REFERENCES profiles(email),
        FOREIGN KEY (follower_email) REFERENCES profiles(email)
      )
    `),
    db.prepare("CREATE INDEX IF NOT EXISTS videos_owner_idx ON videos(owner_email)"),
    db.prepare("CREATE INDEX IF NOT EXISTS videos_created_idx ON videos(created_at DESC)"),
    db.prepare("CREATE INDEX IF NOT EXISTS series_owner_idx ON series(owner_email)"),
    db.prepare("CREATE INDEX IF NOT EXISTS likes_video_idx ON likes(video_id)"),
    db.prepare("CREATE INDEX IF NOT EXISTS comments_video_idx ON comments(video_id, created_at DESC)"),
    db.prepare("CREATE INDEX IF NOT EXISTS follows_creator_idx ON follows(creator_email)"),
    db.prepare("CREATE INDEX IF NOT EXISTS follows_follower_idx ON follows(follower_email)"),
    db.prepare("CREATE INDEX IF NOT EXISTS watch_later_user_idx ON watch_later(user_email, created_at DESC)"),
    db.prepare("CREATE INDEX IF NOT EXISTS watch_progress_user_idx ON watch_progress(user_email, updated_at DESC)"),
    db.prepare("CREATE INDEX IF NOT EXISTS notifications_recipient_idx ON notifications(recipient_email, read, created_at DESC)"),
    db.prepare("CREATE INDEX IF NOT EXISTS reports_status_idx ON reports(status, created_at DESC)"),
  ]);

  const profileColumns = await db
    .prepare("PRAGMA table_info(profiles)")
    .all<{ name: string }>();
  if (!profileColumns.results.some((column) => column.name === "avatar_object_key")) {
    await addColumn(
      db,
      "ALTER TABLE profiles ADD COLUMN avatar_object_key TEXT NOT NULL DEFAULT ''",
    );
  }
  if (!profileColumns.results.some((column) => column.name === "banner_object_key")) {
    await addColumn(
      db,
      "ALTER TABLE profiles ADD COLUMN banner_object_key TEXT NOT NULL DEFAULT ''",
    );
  }
  const profileAdditions = [
    ["chatgpt_url", "ALTER TABLE profiles ADD COLUMN chatgpt_url TEXT NOT NULL DEFAULT ''"],
    ["discord_url", "ALTER TABLE profiles ADD COLUMN discord_url TEXT NOT NULL DEFAULT ''"],
    ["x_url", "ALTER TABLE profiles ADD COLUMN x_url TEXT NOT NULL DEFAULT ''"],
    ["github_url", "ALTER TABLE profiles ADD COLUMN github_url TEXT NOT NULL DEFAULT ''"],
    ["youtube_url", "ALTER TABLE profiles ADD COLUMN youtube_url TEXT NOT NULL DEFAULT ''"],
  ] as const;
  for (const [column, statement] of profileAdditions) {
    if (!profileColumns.results.some((item) => item.name === column)) {
      await addColumn(db, statement);
    }
  }

  const videoColumns = await db
    .prepare("PRAGMA table_info(videos)")
    .all<{ name: string }>();
  if (!videoColumns.results.some((column) => column.name === "duration_seconds")) {
    await addColumn(
      db,
      "ALTER TABLE videos ADD COLUMN duration_seconds REAL NOT NULL DEFAULT 0",
    );
  }
  const videoAdditions = [
    ["series_id", "ALTER TABLE videos ADD COLUMN series_id TEXT"],
    ["season_number", "ALTER TABLE videos ADD COLUMN season_number INTEGER NOT NULL DEFAULT 1"],
    ["episode_number", "ALTER TABLE videos ADD COLUMN episode_number INTEGER NOT NULL DEFAULT 0"],
    ["source_credit_url", "ALTER TABLE videos ADD COLUMN source_credit_url TEXT NOT NULL DEFAULT ''"],
    ["original_size_bytes", "ALTER TABLE videos ADD COLUMN original_size_bytes INTEGER NOT NULL DEFAULT 0"],
    ["storage_savings_bytes", "ALTER TABLE videos ADD COLUMN storage_savings_bytes INTEGER NOT NULL DEFAULT 0"],
    ["content_hash", "ALTER TABLE videos ADD COLUMN content_hash TEXT NOT NULL DEFAULT ''"],
  ] as const;
  for (const [column, statement] of videoAdditions) {
    if (!videoColumns.results.some((item) => item.name === column)) {
      await addColumn(db, statement);
    }
  }
  await db
    .prepare(
      "CREATE UNIQUE INDEX IF NOT EXISTS videos_series_episode_unique ON videos(series_id, season_number, episode_number) WHERE series_id IS NOT NULL AND episode_number > 0",
    )
    .run();
  await db
    .prepare(
      "CREATE UNIQUE INDEX IF NOT EXISTS videos_owner_content_hash_unique ON videos(owner_email, content_hash) WHERE content_hash <> ''",
    )
    .run();
  const commentColumns = await db
    .prepare("PRAGMA table_info(comments)")
    .all<{ name: string }>();
  if (!commentColumns.results.some((column) => column.name === "parent_id")) {
    await addColumn(db, "ALTER TABLE comments ADD COLUMN parent_id TEXT");
  }
  await db
    .prepare(
      "CREATE INDEX IF NOT EXISTS comments_parent_idx ON comments(parent_id, created_at)",
    )
    .run();
}

async function addColumn(db: D1Database, statement: string): Promise<void> {
  try {
    await db.prepare(statement).run();
  } catch (error) {
    if (!(error instanceof Error) || !/duplicate column/i.test(error.message)) {
      throw error;
    }
  }
}

export function mediaBucket(): R2Bucket {
  return bindings().MEDIA;
}

export async function getProfileByEmail(
  email: string,
): Promise<Profile | null> {
  await ensureSchema();
  return (
    (await bindings()
      .DB.prepare(
        `SELECT
          email,
          handle,
          display_name AS displayName,
          bio,
          location,
          website,
          chatgpt_url AS chatgptUrl,
          discord_url AS discordUrl,
          x_url AS xUrl,
          github_url AS githubUrl,
          youtube_url AS youtubeUrl,
          avatar_color AS avatarColor,
          avatar_object_key AS avatarObjectKey,
          banner_object_key AS bannerObjectKey,
          (SELECT COUNT(*) FROM follows f WHERE f.creator_email = profiles.email) AS followerCount,
          (SELECT COUNT(*) FROM follows f WHERE f.follower_email = profiles.email) AS followingCount,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM profiles
        WHERE email = ?1`,
      )
      .bind(email.toLowerCase())
      .first<Profile>()) ?? null
  );
}

export async function getProfileByHandle(
  handle: string,
): Promise<Profile | null> {
  await ensureSchema();
  return (
    (await bindings()
      .DB.prepare(
        `SELECT
          email,
          handle,
          display_name AS displayName,
          bio,
          location,
          website,
          chatgpt_url AS chatgptUrl,
          discord_url AS discordUrl,
          x_url AS xUrl,
          github_url AS githubUrl,
          youtube_url AS youtubeUrl,
          avatar_color AS avatarColor,
          avatar_object_key AS avatarObjectKey,
          banner_object_key AS bannerObjectKey,
          (SELECT COUNT(*) FROM follows f WHERE f.creator_email = profiles.email) AS followerCount,
          (SELECT COUNT(*) FROM follows f WHERE f.follower_email = profiles.email) AS followingCount,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM profiles
        WHERE handle = ?1`,
      )
      .bind(handle.toLowerCase())
      .first<Profile>()) ?? null
  );
}

export async function listProfiles(options?: {
  query?: string;
  limit?: number;
}): Promise<Profile[]> {
  await ensureSchema();
  const query = options?.query?.trim().toLowerCase();
  const values: unknown[] = [];
  const where = query
    ? `(LOWER(handle) LIKE ?1 OR LOWER(display_name) LIKE ?1 OR LOWER(bio) LIKE ?1)`
    : "";
  if (query) values.push(`%${query}%`);
  values.push(Math.min(options?.limit ?? 24, 100));
  const limitIndex = values.length;
  const result = await bindings()
    .DB.prepare(
      `SELECT
        email,
        handle,
        display_name AS displayName,
        bio,
        location,
        website,
        chatgpt_url AS chatgptUrl,
        discord_url AS discordUrl,
        x_url AS xUrl,
        github_url AS githubUrl,
        youtube_url AS youtubeUrl,
        avatar_color AS avatarColor,
        avatar_object_key AS avatarObjectKey,
        banner_object_key AS bannerObjectKey,
        (SELECT COUNT(*) FROM follows f WHERE f.creator_email = profiles.email) AS followerCount,
        (SELECT COUNT(*) FROM follows f WHERE f.follower_email = profiles.email) AS followingCount,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM profiles
      ${where ? `WHERE ${where}` : ""}
      ORDER BY followerCount DESC, created_at DESC
      LIMIT ?${limitIndex}`,
    )
    .bind(...values)
    .all<Profile>();
  return result.results;
}

export async function saveProfile(input: {
  email: string;
  handle: string;
  displayName: string;
  bio: string;
  location: string;
  website: string;
  chatgptUrl: string;
  discordUrl: string;
  xUrl: string;
  githubUrl: string;
  youtubeUrl: string;
  avatarColor: string;
}): Promise<Profile> {
  await ensureSchema();
  const db = bindings().DB;
  const email = input.email.toLowerCase();
  const existing = await getProfileByEmail(email);

  const collision = await db
    .prepare("SELECT email FROM profiles WHERE handle = ?1 AND email <> ?2")
    .bind(input.handle, email)
    .first<{ email: string }>();
  if (collision) throw new Error("That handle is already taken.");

  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO profiles (
        email, handle, display_name, bio, location, website, chatgpt_url,
        discord_url, x_url, github_url, youtube_url, avatar_color,
        created_at, updated_at
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)
      ON CONFLICT(email) DO UPDATE SET
        handle = excluded.handle,
        display_name = excluded.display_name,
        bio = excluded.bio,
        location = excluded.location,
        website = excluded.website,
        chatgpt_url = excluded.chatgpt_url,
        discord_url = excluded.discord_url,
        x_url = excluded.x_url,
        github_url = excluded.github_url,
        youtube_url = excluded.youtube_url,
        avatar_color = excluded.avatar_color,
        updated_at = excluded.updated_at`,
    )
    .bind(
      email,
      input.handle,
      input.displayName,
      input.bio,
      input.location,
      input.website,
      input.chatgptUrl,
      input.discordUrl,
      input.xUrl,
      input.githubUrl,
      input.youtubeUrl,
      input.avatarColor,
      existing?.createdAt ?? now,
      now,
    )
    .run();

  return (await getProfileByEmail(email))!;
}

export async function setProfileMedia(
  email: string,
  kind: "avatar" | "banner",
  objectKey: string,
): Promise<Profile> {
  await ensureSchema();
  const column = kind === "avatar" ? "avatar_object_key" : "banner_object_key";
  await bindings()
    .DB.prepare(
      `UPDATE profiles SET ${column} = ?1, updated_at = ?2 WHERE email = ?3`,
    )
    .bind(objectKey, new Date().toISOString(), email.toLowerCase())
    .run();
  const profile = await getProfileByEmail(email);
  if (!profile) throw new Error("Profile not found.");
  return profile;
}

export const DEFAULT_PROFILE_SETTINGS: ProfileSettings = {
  autoplayPreviews: true,
  previewSound: true,
  dataSaver: false,
  reducedMotion: false,
  autoplayNext: true,
  preferLongform: true,
  notifyLikes: true,
  notifyComments: true,
  notifyFollows: true,
  notifySeries: true,
  showLocation: true,
  showSocials: true,
  showFollowerCounts: true,
  updatedAt: "",
};

export async function getProfileSettings(email: string): Promise<ProfileSettings> {
  await ensureSchema();
  const row = await bindings()
    .DB.prepare(
      `SELECT
        autoplay_previews AS autoplayPreviews,
        preview_sound AS previewSound,
        data_saver AS dataSaver,
        reduced_motion AS reducedMotion,
        autoplay_next AS autoplayNext,
        prefer_longform AS preferLongform,
        notify_likes AS notifyLikes,
        notify_comments AS notifyComments,
        notify_follows AS notifyFollows,
        notify_series AS notifySeries,
        show_location AS showLocation,
        show_socials AS showSocials,
        show_follower_counts AS showFollowerCounts,
        updated_at AS updatedAt
      FROM profile_settings WHERE user_email = ?1`,
    )
    .bind(email.toLowerCase())
    .first<Record<keyof ProfileSettings, number | string>>();
  if (!row) return { ...DEFAULT_PROFILE_SETTINGS };
  return settingsFromRow(row);
}

export async function saveProfileSettings(
  email: string,
  settings: Omit<ProfileSettings, "updatedAt">,
): Promise<ProfileSettings> {
  await ensureSchema();
  const now = new Date().toISOString();
  await bindings()
    .DB.prepare(
      `INSERT INTO profile_settings (
        user_email, autoplay_previews, preview_sound, data_saver, reduced_motion,
        autoplay_next, prefer_longform, notify_likes, notify_comments,
        notify_follows, notify_series, show_location, show_socials,
        show_follower_counts, updated_at
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)
      ON CONFLICT(user_email) DO UPDATE SET
        autoplay_previews = excluded.autoplay_previews,
        preview_sound = excluded.preview_sound,
        data_saver = excluded.data_saver,
        reduced_motion = excluded.reduced_motion,
        autoplay_next = excluded.autoplay_next,
        prefer_longform = excluded.prefer_longform,
        notify_likes = excluded.notify_likes,
        notify_comments = excluded.notify_comments,
        notify_follows = excluded.notify_follows,
        notify_series = excluded.notify_series,
        show_location = excluded.show_location,
        show_socials = excluded.show_socials,
        show_follower_counts = excluded.show_follower_counts,
        updated_at = excluded.updated_at`,
    )
    .bind(
      email.toLowerCase(),
      flag(settings.autoplayPreviews),
      flag(settings.previewSound),
      flag(settings.dataSaver),
      flag(settings.reducedMotion),
      flag(settings.autoplayNext),
      flag(settings.preferLongform),
      flag(settings.notifyLikes),
      flag(settings.notifyComments),
      flag(settings.notifyFollows),
      flag(settings.notifySeries),
      flag(settings.showLocation),
      flag(settings.showSocials),
      flag(settings.showFollowerCounts),
      now,
    )
    .run();
  return getProfileSettings(email);
}

const seriesSelect = `SELECT
  s.id,
  s.owner_email AS ownerEmail,
  p.handle AS ownerHandle,
  p.display_name AS ownerDisplayName,
  s.title,
  s.description,
  s.status,
  (SELECT COUNT(*) FROM videos v WHERE v.series_id = s.id) AS episodeCount,
  COALESCE((SELECT SUM(v.duration_seconds) FROM videos v WHERE v.series_id = s.id), 0) AS totalSeconds,
  s.created_at AS createdAt,
  s.updated_at AS updatedAt
FROM series s
JOIN profiles p ON p.email = s.owner_email`;

export async function listSeries(options?: {
  ownerEmail?: string;
  limit?: number;
}): Promise<Series[]> {
  await ensureSchema();
  const owner = options?.ownerEmail?.toLowerCase();
  const limit = Math.min(options?.limit ?? 50, 100);
  const result = await bindings()
    .DB.prepare(
      `${seriesSelect} ${owner ? "WHERE s.owner_email = ?1" : ""}
       ORDER BY s.updated_at DESC LIMIT ?${owner ? 2 : 1}`,
    )
    .bind(...(owner ? [owner, limit] : [limit]))
    .all<Series>();
  return result.results;
}

export async function getSeries(id: string): Promise<Series | null> {
  await ensureSchema();
  return (
    (await bindings().DB.prepare(`${seriesSelect} WHERE s.id = ?1`).bind(id).first<Series>()) ??
    null
  );
}

export async function createSeries(input: {
  ownerEmail: string;
  title: string;
  description: string;
  status: "ongoing" | "completed";
}): Promise<Series> {
  await ensureSchema();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await bindings()
    .DB.prepare(
      `INSERT INTO series (id, owner_email, title, description, status, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6)`,
    )
    .bind(id, input.ownerEmail.toLowerCase(), input.title, input.description, input.status, now)
    .run();
  return (await getSeries(id))!;
}

export async function updateSeries(
  id: string,
  ownerEmail: string,
  input: { title: string; description: string; status: "ongoing" | "completed" },
): Promise<Series | null> {
  await ensureSchema();
  const result = await bindings()
    .DB.prepare(
      `UPDATE series SET title = ?1, description = ?2, status = ?3, updated_at = ?4
       WHERE id = ?5 AND owner_email = ?6`,
    )
    .bind(
      input.title,
      input.description,
      input.status,
      new Date().toISOString(),
      id,
      ownerEmail.toLowerCase(),
    )
    .run();
  return result.meta.changes ? getSeries(id) : null;
}

export async function deleteSeries(id: string, ownerEmail: string): Promise<boolean> {
  await ensureSchema();
  const email = ownerEmail.toLowerCase();
  const owned = await bindings()
    .DB.prepare("SELECT 1 AS owned FROM series WHERE id = ?1 AND owner_email = ?2")
    .bind(id, email)
    .first<{ owned: number }>();
  if (!owned) return false;
  await bindings().DB.batch([
    bindings()
      .DB.prepare(
        "UPDATE videos SET series_id = NULL, season_number = 1, episode_number = 0 WHERE series_id = ?1",
      )
      .bind(id),
    bindings().DB.prepare("DELETE FROM series WHERE id = ?1 AND owner_email = ?2").bind(id, email),
  ]);
  return true;
}

export async function getCreatorTier(ownerEmail: string): Promise<CreatorTier> {
  await ensureSchema();
  const result = await bindings()
    .DB.prepare(
      `SELECT
        series_id AS seriesId,
        season_number AS seasonNumber,
        episode_number AS episodeNumber,
        duration_seconds AS durationSeconds,
        created_at AS createdAt
      FROM videos
      WHERE owner_email = ?1 AND series_id IS NOT NULL AND episode_number > 0`,
    )
    .bind(ownerEmail.toLowerCase())
    .all<{
      seriesId: string;
      seasonNumber: number;
      episodeNumber: number;
      durationSeconds: number;
      createdAt: string;
    }>();
  return creatorTier(result.results);
}

function settingsFromRow(
  row: Record<keyof ProfileSettings, number | string>,
): ProfileSettings {
  return {
    autoplayPreviews: Boolean(row.autoplayPreviews),
    previewSound: Boolean(row.previewSound),
    dataSaver: Boolean(row.dataSaver),
    reducedMotion: Boolean(row.reducedMotion),
    autoplayNext: Boolean(row.autoplayNext),
    preferLongform: Boolean(row.preferLongform),
    notifyLikes: Boolean(row.notifyLikes),
    notifyComments: Boolean(row.notifyComments),
    notifyFollows: Boolean(row.notifyFollows),
    notifySeries: Boolean(row.notifySeries),
    showLocation: Boolean(row.showLocation),
    showSocials: Boolean(row.showSocials),
    showFollowerCounts: Boolean(row.showFollowerCounts),
    updatedAt: String(row.updatedAt),
  };
}

function flag(value: boolean): number {
  return value ? 1 : 0;
}

const videoSelect = `
  SELECT
    v.id,
    v.owner_email AS ownerEmail,
    v.title,
    v.description,
    v.generation_tool AS generationTool,
    v.generation_mode AS generationMode,
    v.category,
    v.license,
    v.prompt,
    v.object_key AS objectKey,
    v.content_type AS contentType,
    v.size_bytes AS sizeBytes,
    v.duration_seconds AS durationSeconds,
    v.series_id AS seriesId,
    COALESCE(s.title, '') AS seriesTitle,
    COALESCE(s.status, '') AS seriesStatus,
    v.season_number AS seasonNumber,
    v.episode_number AS episodeNumber,
    v.source_credit_url AS sourceCreditUrl,
    v.original_size_bytes AS originalSizeBytes,
    v.storage_savings_bytes AS storageSavingsBytes,
    v.content_hash AS contentHash,
    v.provenance_status AS provenanceStatus,
    v.views,
    v.created_at AS createdAt,
    p.handle AS ownerHandle,
    p.display_name AS ownerDisplayName,
    p.avatar_color AS ownerAvatarColor,
    CASE
      WHEN p.avatar_object_key <> ''
      THEN '/profile-media/' || p.handle || '/avatar?v=' || p.updated_at
      ELSE ''
    END AS ownerAvatarUrl,
    (SELECT COUNT(*) FROM likes l WHERE l.video_id = v.id) AS likeCount,
    (SELECT COUNT(*) FROM comments c WHERE c.video_id = v.id) AS commentCount
  FROM videos v
  JOIN profiles p ON p.email = v.owner_email
  LEFT JOIN series s ON s.id = v.series_id
`;

export async function listVideos(options?: {
  ownerEmail?: string;
  followedByEmail?: string;
  seriesId?: string;
  query?: string;
  category?: string;
  maxDurationSeconds?: number;
  preferSeries?: boolean;
  sort?: "newest" | "community";
  limit?: number;
  offset?: number;
}): Promise<Video[]> {
  await ensureSchema();
  const clauses: string[] = [];
  const values: unknown[] = [];

  if (options?.ownerEmail) {
    clauses.push(`v.owner_email = ?${values.length + 1}`);
    values.push(options.ownerEmail.toLowerCase());
  }
  if (options?.followedByEmail) {
    clauses.push(
      `EXISTS (
        SELECT 1 FROM follows following
        WHERE following.creator_email = v.owner_email
          AND following.follower_email = ?${values.length + 1}
      )`,
    );
    values.push(options.followedByEmail.toLowerCase());
  }
  if (options?.seriesId) {
    clauses.push(`v.series_id = ?${values.length + 1}`);
    values.push(options.seriesId);
  }
  if (options?.query) {
    clauses.push(
      `(LOWER(v.title) LIKE ?${values.length + 1}
        OR LOWER(v.description) LIKE ?${values.length + 1}
        OR LOWER(v.generation_tool) LIKE ?${values.length + 1}
        OR LOWER(p.handle) LIKE ?${values.length + 1}
        OR LOWER(p.display_name) LIKE ?${values.length + 1})`,
    );
    values.push(`%${options.query.toLowerCase()}%`);
  }
  if (options?.category && options.category !== "all") {
    clauses.push(`v.category = ?${values.length + 1}`);
    values.push(options.category);
  }
  if (options?.maxDurationSeconds) {
    clauses.push(
      `v.duration_seconds > 0 AND v.duration_seconds < ?${values.length + 1}`,
    );
    values.push(options.maxDurationSeconds);
  }

  const baseOrder = options?.seriesId
    ? "v.season_number ASC, v.episode_number ASC"
    : options?.sort === "newest"
      ? "v.created_at DESC"
      : COMMUNITY_ORDER_SQL;
  const order =
    options?.preferSeries && !options.seriesId
      ? `CASE WHEN v.series_id IS NOT NULL THEN 0 ELSE 1 END, ${baseOrder}`
      : baseOrder;
  values.push(Math.min(options?.limit ?? 48, 100));
  const limitIndex = values.length;
  values.push(Math.max(0, Math.min(options?.offset ?? 0, 10_000)));
  const offsetIndex = values.length;
  const sql = `${videoSelect}
    ${clauses.length ? `WHERE ${clauses.join(" AND ")}` : ""}
    ORDER BY ${order}
    LIMIT ?${limitIndex}
    OFFSET ?${offsetIndex}`;

  const result = await bindings().DB.prepare(sql).bind(...values).all<Video>();
  return result.results;
}

export async function getVideo(id: string): Promise<Video | null> {
  await ensureSchema();
  return (
    (await bindings()
      .DB.prepare(`${videoSelect} WHERE v.id = ?1`)
      .bind(id)
      .first<Video>()) ?? null
  );
}

export async function createVideo(input: {
  id: string;
  ownerEmail: string;
  title: string;
  description: string;
  generationTool: string;
  generationMode: string;
  category: string;
  license: string;
  prompt: string;
  objectKey: string;
  contentType: string;
  sizeBytes: number;
  durationSeconds: number;
  seriesId: string | null;
  seasonNumber: number;
  episodeNumber: number;
  sourceCreditUrl: string;
  originalSizeBytes: number;
  storageSavingsBytes: number;
  contentHash: string;
  provenanceStatus: string;
}): Promise<Video> {
  await ensureSchema();
  await bindings()
    .DB.prepare(
      `INSERT INTO videos (
        id, owner_email, title, description, generation_tool, generation_mode,
        category, license, prompt, object_key, content_type, size_bytes,
        duration_seconds, series_id, season_number, episode_number,
        source_credit_url, original_size_bytes, storage_savings_bytes,
        content_hash, provenance_status, sqs_score, views, created_at
      ) VALUES (
        ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14,
        ?15, ?16, ?17, ?18, ?19, ?20, ?21, 0, 0, ?22
      )`,
    )
    .bind(
      input.id,
      input.ownerEmail.toLowerCase(),
      input.title,
      input.description,
      input.generationTool,
      input.generationMode,
      input.category,
      input.license,
      input.prompt,
      input.objectKey,
      input.contentType,
      input.sizeBytes,
      input.durationSeconds,
      input.seriesId,
      input.seasonNumber,
      input.episodeNumber,
      input.sourceCreditUrl,
      input.originalSizeBytes,
      input.storageSavingsBytes,
      input.contentHash,
      input.provenanceStatus,
      new Date().toISOString(),
    )
    .run();

  if (input.seriesId) {
    await notifySeriesFollowers(input.ownerEmail, input.id, input.seriesId);
  }

  return (await getVideo(input.id))!;
}

export async function incrementViews(id: string): Promise<void> {
  await ensureSchema();
  await bindings()
    .DB.prepare("UPDATE videos SET views = views + 1 WHERE id = ?1")
    .bind(id)
    .run();
}

export async function deleteVideo(
  id: string,
  ownerEmail: string,
): Promise<{ objectKey: string } | null> {
  await ensureSchema();
  const db = bindings().DB;
  const video = await db
    .prepare(
      "SELECT object_key AS objectKey FROM videos WHERE id = ?1 AND owner_email = ?2",
    )
    .bind(id, ownerEmail.toLowerCase())
    .first<{ objectKey: string }>();
  if (!video) return null;

  await db.batch([
    db.prepare("DELETE FROM comments WHERE video_id = ?1").bind(id),
    db.prepare("DELETE FROM likes WHERE video_id = ?1").bind(id),
    db.prepare("DELETE FROM watch_later WHERE video_id = ?1").bind(id),
    db.prepare("DELETE FROM watch_progress WHERE video_id = ?1").bind(id),
    db.prepare("DELETE FROM reports WHERE video_id = ?1").bind(id),
    db.prepare("DELETE FROM notifications WHERE video_id = ?1").bind(id),
    db
      .prepare("DELETE FROM videos WHERE id = ?1 AND owner_email = ?2")
      .bind(id, ownerEmail.toLowerCase()),
  ]);
  return video;
}

export async function listComments(videoId: string): Promise<Comment[]> {
  await ensureSchema();
  const result = await bindings()
    .DB.prepare(
      `SELECT
        c.id,
        c.video_id AS videoId,
        c.parent_id AS parentId,
        c.content,
        c.created_at AS createdAt,
        p.handle AS authorHandle,
        p.display_name AS authorDisplayName,
        p.avatar_color AS authorAvatarColor,
        CASE
          WHEN p.avatar_object_key <> ''
          THEN '/profile-media/' || p.handle || '/avatar?v=' || p.updated_at
          ELSE ''
        END AS authorAvatarUrl
      FROM comments c
      JOIN profiles p ON p.email = c.author_email
      WHERE c.video_id = ?1
      ORDER BY c.created_at DESC
      LIMIT 100`,
    )
    .bind(videoId)
    .all<Comment>();
  return result.results;
}

export async function addComment(
  videoId: string,
  authorEmail: string,
  content: string,
  requestedParentId: string | null = null,
): Promise<Comment> {
  await ensureSchema();
  const db = bindings().DB;
  const parent = requestedParentId
    ? await db
        .prepare(
          `SELECT id, parent_id AS parentId, author_email AS authorEmail
           FROM comments WHERE id = ?1 AND video_id = ?2`,
        )
        .bind(requestedParentId, videoId)
        .first<{ id: string; parentId: string | null; authorEmail: string }>()
    : null;
  if (requestedParentId && !parent) {
    throw new Error("The comment you are replying to is no longer available.");
  }
  const parentId = parent?.parentId ?? parent?.id ?? null;
  const id = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO comments (id, video_id, author_email, parent_id, content, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
    )
    .bind(
      id,
      videoId,
      authorEmail.toLowerCase(),
      parentId,
      content,
      new Date().toISOString(),
    )
    .run();
  await queueNotification("comment", videoId, authorEmail);
  if (parent && parent.authorEmail !== authorEmail.toLowerCase()) {
    await queueReplyNotification(parent.authorEmail, videoId, authorEmail);
  }
  const comments = await listComments(videoId);
  return comments.find((comment) => comment.id === id)!;
}

export async function getLikeState(
  videoId: string,
  email: string,
): Promise<boolean> {
  await ensureSchema();
  const row = await bindings()
    .DB.prepare(
      "SELECT 1 AS liked FROM likes WHERE video_id = ?1 AND user_email = ?2",
    )
    .bind(videoId, email.toLowerCase())
    .first<{ liked: number }>();
  return Boolean(row);
}

export async function listLikedVideoIds(
  videoIds: string[],
  email: string,
): Promise<string[]> {
  await ensureSchema();
  if (!videoIds.length) return [];
  const placeholders = videoIds.map((_, index) => `?${index + 2}`).join(", ");
  const result = await bindings()
    .DB.prepare(
      `SELECT video_id AS videoId
       FROM likes
       WHERE user_email = ?1 AND video_id IN (${placeholders})`,
    )
    .bind(email.toLowerCase(), ...videoIds)
    .all<{ videoId: string }>();
  return result.results.map((row) => row.videoId);
}

export async function toggleLike(
  videoId: string,
  email: string,
): Promise<{ liked: boolean; count: number }> {
  await ensureSchema();
  const db = bindings().DB;
  const normalizedEmail = email.toLowerCase();
  const liked = await getLikeState(videoId, normalizedEmail);

  if (liked) {
    await db
      .prepare("DELETE FROM likes WHERE video_id = ?1 AND user_email = ?2")
      .bind(videoId, normalizedEmail)
      .run();
  } else {
    await db
      .prepare(
        `INSERT OR IGNORE INTO likes (video_id, user_email, created_at)
         VALUES (?1, ?2, ?3)`,
      )
      .bind(videoId, normalizedEmail, new Date().toISOString())
      .run();
    await queueNotification("like", videoId, normalizedEmail);
  }

  const result = await db
    .prepare("SELECT COUNT(*) AS count FROM likes WHERE video_id = ?1")
    .bind(videoId)
    .first<{ count: number }>();
  return { liked: !liked, count: result?.count ?? 0 };
}

export async function getFollowState(
  creatorEmail: string,
  followerEmail: string,
): Promise<boolean> {
  await ensureSchema();
  const row = await bindings()
    .DB.prepare(
      `SELECT 1 AS following
       FROM follows
       WHERE creator_email = ?1 AND follower_email = ?2`,
    )
    .bind(creatorEmail.toLowerCase(), followerEmail.toLowerCase())
    .first<{ following: number }>();
  return Boolean(row);
}

export async function toggleFollow(
  creatorEmail: string,
  followerEmail: string,
): Promise<{ following: boolean; count: number }> {
  await ensureSchema();
  const creator = creatorEmail.toLowerCase();
  const follower = followerEmail.toLowerCase();
  if (creator === follower) throw new Error("You cannot follow yourself.");

  const db = bindings().DB;
  const following = await getFollowState(creator, follower);
  if (following) {
    await db
      .prepare(
        "DELETE FROM follows WHERE creator_email = ?1 AND follower_email = ?2",
      )
      .bind(creator, follower)
      .run();
  } else {
    await db
      .prepare(
        `INSERT OR IGNORE INTO follows (creator_email, follower_email, created_at)
         VALUES (?1, ?2, ?3)`,
      )
      .bind(creator, follower, new Date().toISOString())
      .run();
    await queueFollowNotification(creator, follower);
  }

  const result = await db
    .prepare("SELECT COUNT(*) AS count FROM follows WHERE creator_email = ?1")
    .bind(creator)
    .first<{ count: number }>();
  return { following: !following, count: result?.count ?? 0 };
}

export async function toggleWatchLater(
  videoId: string,
  email: string,
): Promise<{ saved: boolean }> {
  await ensureSchema();
  const normalized = email.toLowerCase();
  const existing = await bindings()
    .DB.prepare("SELECT 1 AS saved FROM watch_later WHERE video_id = ?1 AND user_email = ?2")
    .bind(videoId, normalized)
    .first<{ saved: number }>();
  if (existing) {
    await bindings()
      .DB.prepare("DELETE FROM watch_later WHERE video_id = ?1 AND user_email = ?2")
      .bind(videoId, normalized)
      .run();
    return { saved: false };
  }
  await bindings()
    .DB.prepare(
      "INSERT INTO watch_later (video_id, user_email, created_at) VALUES (?1, ?2, ?3)",
    )
    .bind(videoId, normalized, new Date().toISOString())
    .run();
  return { saved: true };
}

export async function getWatchLaterState(videoId: string, email: string): Promise<boolean> {
  await ensureSchema();
  return Boolean(
    await bindings()
      .DB.prepare("SELECT 1 AS saved FROM watch_later WHERE video_id = ?1 AND user_email = ?2")
      .bind(videoId, email.toLowerCase())
      .first<{ saved: number }>(),
  );
}

export async function listWatchLater(email: string): Promise<Video[]> {
  await ensureSchema();
  const result = await bindings()
    .DB.prepare(
      `${videoSelect}
       WHERE EXISTS (
         SELECT 1 FROM watch_later wl
         WHERE wl.video_id = v.id AND wl.user_email = ?1
       )
       ORDER BY (
         SELECT wl.created_at FROM watch_later wl
         WHERE wl.video_id = v.id AND wl.user_email = ?1
       ) DESC
       LIMIT 100`,
    )
    .bind(email.toLowerCase())
    .all<Video>();
  return result.results;
}

export async function getWatchProgress(
  videoId: string,
  email: string,
): Promise<WatchProgress | null> {
  await ensureSchema();
  const row = await bindings()
    .DB.prepare(
      `SELECT video_id AS videoId, progress_seconds AS progressSeconds,
       completed, updated_at AS updatedAt
       FROM watch_progress WHERE video_id = ?1 AND user_email = ?2`,
    )
    .bind(videoId, email.toLowerCase())
    .first<Omit<WatchProgress, "completed"> & { completed: number }>();
  return row ? { ...row, completed: Boolean(row.completed) } : null;
}

export async function saveWatchProgress(input: {
  videoId: string;
  userEmail: string;
  progressSeconds: number;
  completed: boolean;
}): Promise<void> {
  await ensureSchema();
  await bindings()
    .DB.prepare(
      `INSERT INTO watch_progress (
        video_id, user_email, progress_seconds, completed, updated_at
      ) VALUES (?1, ?2, ?3, ?4, ?5)
      ON CONFLICT(video_id, user_email) DO UPDATE SET
        progress_seconds = excluded.progress_seconds,
        completed = excluded.completed,
        updated_at = excluded.updated_at`,
    )
    .bind(
      input.videoId,
      input.userEmail.toLowerCase(),
      input.progressSeconds,
      flag(input.completed),
      new Date().toISOString(),
    )
    .run();
}

export type ContinueWatchingItem = Video & WatchProgress;

export async function listContinueWatching(email: string): Promise<ContinueWatchingItem[]> {
  await ensureSchema();
  const result = await bindings()
    .DB.prepare(
      `SELECT source.*, progress.video_id AS videoId,
        progress.progress_seconds AS progressSeconds,
        progress.completed, progress.updated_at AS updatedAt
       FROM (${videoSelect}) source
       JOIN watch_progress progress ON progress.video_id = source.id
       WHERE progress.user_email = ?1 AND progress.completed = 0
       ORDER BY progress.updated_at DESC
       LIMIT 24`,
    )
    .bind(email.toLowerCase())
    .all<Video & Omit<WatchProgress, "completed"> & { completed: number }>();
  return result.results.map((item) => ({ ...item, completed: Boolean(item.completed) }));
}

export async function listNotifications(email: string): Promise<Notification[]> {
  await ensureSchema();
  const result = await bindings()
    .DB.prepare(
      `SELECT
        n.id, n.type, n.video_id AS videoId, n.series_id AS seriesId,
        n.read, n.created_at AS createdAt,
        p.handle AS actorHandle, p.display_name AS actorDisplayName,
        p.avatar_color AS actorAvatarColor,
        CASE WHEN p.avatar_object_key <> ''
          THEN '/profile-media/' || p.handle || '/avatar?v=' || p.updated_at
          ELSE '' END AS actorAvatarUrl
       FROM notifications n
       JOIN profiles p ON p.email = n.actor_email
       WHERE n.recipient_email = ?1
       ORDER BY n.created_at DESC
       LIMIT 100`,
    )
    .bind(email.toLowerCase())
    .all<Omit<Notification, "read"> & { read: number }>();
  return result.results.map((item) => ({ ...item, read: Boolean(item.read) }));
}

export async function unreadNotificationCount(email: string): Promise<number> {
  await ensureSchema();
  const row = await bindings()
    .DB.prepare("SELECT COUNT(*) AS count FROM notifications WHERE recipient_email = ?1 AND read = 0")
    .bind(email.toLowerCase())
    .first<{ count: number }>();
  return row?.count ?? 0;
}

export async function markNotificationsRead(email: string): Promise<void> {
  await ensureSchema();
  await bindings()
    .DB.prepare("UPDATE notifications SET read = 1 WHERE recipient_email = ?1")
    .bind(email.toLowerCase())
    .run();
}

export async function reportVideo(input: {
  videoId: string;
  reporterEmail: string;
  reason: string;
  details: string;
}): Promise<void> {
  await ensureSchema();
  await bindings()
    .DB.prepare(
      `INSERT INTO reports (id, reporter_email, video_id, reason, details, status, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5, 'open', ?6)
       ON CONFLICT(video_id, reporter_email) DO UPDATE SET
         reason = excluded.reason, details = excluded.details,
         status = 'open', created_at = excluded.created_at`,
    )
    .bind(
      crypto.randomUUID(),
      input.reporterEmail.toLowerCase(),
      input.videoId,
      input.reason,
      input.details,
      new Date().toISOString(),
    )
    .run();
}

export async function getStudioSnapshot(email: string) {
  const [videos, creatorSeries, tier] = await Promise.all([
    listVideos({ ownerEmail: email, sort: "newest", limit: 100 }),
    listSeries({ ownerEmail: email, limit: 100 }),
    getCreatorTier(email),
  ]);
  return {
    videos,
    series: creatorSeries,
    tier,
    totals: {
      views: videos.reduce((sum, video) => sum + video.views, 0),
      likes: videos.reduce((sum, video) => sum + video.likeCount, 0),
      comments: videos.reduce((sum, video) => sum + video.commentCount, 0),
      storageBytes: videos.reduce((sum, video) => sum + video.sizeBytes, 0),
    },
  };
}

export async function getAccountExport(email: string) {
  await ensureSchema();
  const normalized = email.toLowerCase();
  const db = bindings().DB;
  const [profile, settings, creatorSeries, videos, likes, comments, follows, saved, progress, notices, reports] =
    await Promise.all([
      getProfileByEmail(normalized),
      getProfileSettings(normalized),
      listSeries({ ownerEmail: normalized, limit: 100 }),
      listVideos({ ownerEmail: normalized, sort: "newest", limit: 100 }),
      db.prepare("SELECT video_id AS videoId, created_at AS createdAt FROM likes WHERE user_email = ?1").bind(normalized).all(),
      db.prepare("SELECT id, video_id AS videoId, parent_id AS parentId, content, created_at AS createdAt FROM comments WHERE author_email = ?1 ORDER BY created_at DESC").bind(normalized).all(),
      db.prepare("SELECT p.handle AS creatorHandle, p.display_name AS creatorDisplayName, f.created_at AS createdAt FROM follows f JOIN profiles p ON p.email = f.creator_email WHERE f.follower_email = ?1").bind(normalized).all(),
      db.prepare("SELECT video_id AS videoId, created_at AS createdAt FROM watch_later WHERE user_email = ?1").bind(normalized).all(),
      db.prepare("SELECT video_id AS videoId, progress_seconds AS progressSeconds, completed, updated_at AS updatedAt FROM watch_progress WHERE user_email = ?1").bind(normalized).all(),
      db.prepare("SELECT n.id, p.handle AS actorHandle, p.display_name AS actorDisplayName, n.type, n.video_id AS videoId, n.series_id AS seriesId, n.read, n.created_at AS createdAt FROM notifications n JOIN profiles p ON p.email = n.actor_email WHERE n.recipient_email = ?1 ORDER BY n.created_at DESC").bind(normalized).all(),
      db.prepare("SELECT id, video_id AS videoId, reason, details, status, created_at AS createdAt FROM reports WHERE reporter_email = ?1 ORDER BY created_at DESC").bind(normalized).all(),
    ]);
  return {
    exportedAt: new Date().toISOString(),
    profile,
    settings,
    series: creatorSeries,
    videos: videos.map(({ objectKey, ownerEmail, contentHash, ...video }) => {
      void objectKey;
      void ownerEmail;
      void contentHash;
      return video;
    }),
    likes: likes.results,
    comments: comments.results,
    follows: follows.results,
    watchLater: saved.results,
    watchProgress: progress.results,
    notifications: notices.results,
    reports: reports.results,
  };
}

async function queueNotification(
  type: "like" | "comment",
  videoId: string,
  actorEmail: string,
): Promise<void> {
  const owner = await bindings()
    .DB.prepare("SELECT owner_email AS ownerEmail FROM videos WHERE id = ?1")
    .bind(videoId)
    .first<{ ownerEmail: string }>();
  if (!owner || owner.ownerEmail === actorEmail.toLowerCase()) return;
  if (!(await notificationEnabled(owner.ownerEmail, type))) return;
  await insertNotification(owner.ownerEmail, actorEmail, type, videoId, "");
}

async function queueFollowNotification(
  creatorEmail: string,
  followerEmail: string,
): Promise<void> {
  if (!(await notificationEnabled(creatorEmail, "follow"))) return;
  await insertNotification(creatorEmail, followerEmail, "follow", "", "");
}

async function queueReplyNotification(
  recipientEmail: string,
  videoId: string,
  actorEmail: string,
): Promise<void> {
  const video = await bindings()
    .DB.prepare("SELECT owner_email AS ownerEmail FROM videos WHERE id = ?1")
    .bind(videoId)
    .first<{ ownerEmail: string }>();
  if (video?.ownerEmail === recipientEmail.toLowerCase()) return;
  if (!(await notificationEnabled(recipientEmail, "comment"))) return;
  await insertNotification(recipientEmail, actorEmail, "reply", videoId, "");
}

async function notifySeriesFollowers(
  creatorEmail: string,
  videoId: string,
  seriesId: string,
): Promise<void> {
  await bindings()
    .DB.prepare(
      `INSERT INTO notifications (
        id, recipient_email, actor_email, type, video_id, series_id, read, created_at
      )
      SELECT lower(hex(randomblob(4)) || hex(randomblob(4)) || hex(randomblob(4))),
        f.follower_email, ?1, 'series', ?2, ?3, 0, ?4
      FROM follows f
      LEFT JOIN profile_settings settings ON settings.user_email = f.follower_email
      WHERE f.creator_email = ?1 AND COALESCE(settings.notify_series, 1) = 1`,
    )
    .bind(creatorEmail.toLowerCase(), videoId, seriesId, new Date().toISOString())
    .run();
}

async function notificationEnabled(
  email: string,
  type: "like" | "comment" | "follow",
): Promise<boolean> {
  const column =
    type === "like"
      ? "notify_likes"
      : type === "comment"
        ? "notify_comments"
        : "notify_follows";
  const row = await bindings()
    .DB.prepare(`SELECT ${column} AS enabled FROM profile_settings WHERE user_email = ?1`)
    .bind(email.toLowerCase())
    .first<{ enabled: number }>();
  return row ? Boolean(row.enabled) : true;
}

async function insertNotification(
  recipientEmail: string,
  actorEmail: string,
  type: Notification["type"],
  videoId: string,
  seriesId: string,
): Promise<void> {
  await bindings()
    .DB.prepare(
      `INSERT INTO notifications (
        id, recipient_email, actor_email, type, video_id, series_id, read, created_at
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0, ?7)`,
    )
    .bind(
      crypto.randomUUID(),
      recipientEmail.toLowerCase(),
      actorEmail.toLowerCase(),
      type,
      videoId,
      seriesId,
      new Date().toISOString(),
    )
    .run();
}
