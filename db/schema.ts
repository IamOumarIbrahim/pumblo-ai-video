import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const profiles = sqliteTable(
  "profiles",
  {
    email: text("email").primaryKey(),
    handle: text("handle").notNull(),
    displayName: text("display_name").notNull(),
    bio: text("bio").notNull().default(""),
    location: text("location").notNull().default(""),
    website: text("website").notNull().default(""),
    chatgptUrl: text("chatgpt_url").notNull().default(""),
    discordUrl: text("discord_url").notNull().default(""),
    xUrl: text("x_url").notNull().default(""),
    githubUrl: text("github_url").notNull().default(""),
    youtubeUrl: text("youtube_url").notNull().default(""),
    avatarColor: text("avatar_color").notNull().default("#b8ff3d"),
    avatarObjectKey: text("avatar_object_key").notNull().default(""),
    bannerObjectKey: text("banner_object_key").notNull().default(""),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [uniqueIndex("profiles_handle_unique").on(table.handle)],
);

export const profileSettings = sqliteTable("profile_settings", {
  userEmail: text("user_email")
    .primaryKey()
    .references(() => profiles.email),
  autoplayPreviews: integer("autoplay_previews").notNull().default(1),
  previewSound: integer("preview_sound").notNull().default(1),
  dataSaver: integer("data_saver").notNull().default(0),
  reducedMotion: integer("reduced_motion").notNull().default(0),
  autoplayNext: integer("autoplay_next").notNull().default(1),
  preferLongform: integer("prefer_longform").notNull().default(1),
  notifyLikes: integer("notify_likes").notNull().default(1),
  notifyComments: integer("notify_comments").notNull().default(1),
  notifyFollows: integer("notify_follows").notNull().default(1),
  notifySeries: integer("notify_series").notNull().default(1),
  showLocation: integer("show_location").notNull().default(1),
  showSocials: integer("show_socials").notNull().default(1),
  showFollowerCounts: integer("show_follower_counts").notNull().default(1),
  updatedAt: text("updated_at").notNull(),
});

export const series = sqliteTable(
  "series",
  {
    id: text("id").primaryKey(),
    ownerEmail: text("owner_email")
      .notNull()
      .references(() => profiles.email),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    status: text("status").notNull().default("ongoing"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [index("series_owner_idx").on(table.ownerEmail)],
);

export const videos = sqliteTable(
  "videos",
  {
    id: text("id").primaryKey(),
    ownerEmail: text("owner_email")
      .notNull()
      .references(() => profiles.email),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    generationTool: text("generation_tool").notNull(),
    generationMode: text("generation_mode").notNull(),
    category: text("category").notNull(),
    license: text("license").notNull(),
    prompt: text("prompt").notNull().default(""),
    objectKey: text("object_key").notNull(),
    contentType: text("content_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    durationSeconds: real("duration_seconds").notNull().default(0),
    seriesId: text("series_id").references(() => series.id),
    seasonNumber: integer("season_number").notNull().default(1),
    episodeNumber: integer("episode_number").notNull().default(0),
    sourceCreditUrl: text("source_credit_url").notNull().default(""),
    originalSizeBytes: integer("original_size_bytes").notNull().default(0),
    storageSavingsBytes: integer("storage_savings_bytes").notNull().default(0),
    contentHash: text("content_hash").notNull().default(""),
    provenanceStatus: text("provenance_status").notNull(),
    sqsScore: integer("sqs_score").notNull(),
    views: integer("views").notNull().default(0),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("videos_owner_idx").on(table.ownerEmail),
    index("videos_created_idx").on(table.createdAt),
    uniqueIndex("videos_object_key_unique").on(table.objectKey),
    uniqueIndex("videos_series_episode_unique")
      .on(table.seriesId, table.seasonNumber, table.episodeNumber)
      .where(sql`${table.seriesId} IS NOT NULL AND ${table.episodeNumber} > 0`),
    uniqueIndex("videos_owner_content_hash_unique")
      .on(table.ownerEmail, table.contentHash)
      .where(sql`${table.contentHash} <> ''`),
  ],
);

export const watchLater = sqliteTable(
  "watch_later",
  {
    videoId: text("video_id")
      .notNull()
      .references(() => videos.id),
    userEmail: text("user_email")
      .notNull()
      .references(() => profiles.email),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.videoId, table.userEmail] }),
    index("watch_later_user_idx").on(table.userEmail, table.createdAt),
  ],
);

export const watchProgress = sqliteTable(
  "watch_progress",
  {
    videoId: text("video_id")
      .notNull()
      .references(() => videos.id),
    userEmail: text("user_email")
      .notNull()
      .references(() => profiles.email),
    progressSeconds: real("progress_seconds").notNull().default(0),
    completed: integer("completed").notNull().default(0),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.videoId, table.userEmail] }),
    index("watch_progress_user_idx").on(table.userEmail, table.updatedAt),
  ],
);

export const notifications = sqliteTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    recipientEmail: text("recipient_email")
      .notNull()
      .references(() => profiles.email),
    actorEmail: text("actor_email").notNull(),
    type: text("type").notNull(),
    videoId: text("video_id").notNull().default(""),
    seriesId: text("series_id").notNull().default(""),
    read: integer("read").notNull().default(0),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("notifications_recipient_idx").on(
      table.recipientEmail,
      table.read,
      table.createdAt,
    ),
  ],
);

export const reports = sqliteTable(
  "reports",
  {
    id: text("id").primaryKey(),
    reporterEmail: text("reporter_email")
      .notNull()
      .references(() => profiles.email),
    videoId: text("video_id")
      .notNull()
      .references(() => videos.id),
    reason: text("reason").notNull(),
    details: text("details").notNull().default(""),
    status: text("status").notNull().default("open"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("reports_video_reporter_unique").on(
      table.videoId,
      table.reporterEmail,
    ),
    index("reports_status_idx").on(table.status, table.createdAt),
  ],
);

export const likes = sqliteTable(
  "likes",
  {
    videoId: text("video_id")
      .notNull()
      .references(() => videos.id),
    userEmail: text("user_email")
      .notNull()
      .references(() => profiles.email),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.videoId, table.userEmail] }),
    index("likes_video_idx").on(table.videoId),
  ],
);

export const comments = sqliteTable(
  "comments",
  {
    id: text("id").primaryKey(),
    videoId: text("video_id")
      .notNull()
      .references(() => videos.id),
    authorEmail: text("author_email")
      .notNull()
      .references(() => profiles.email),
    parentId: text("parent_id"),
    content: text("content").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("comments_video_idx").on(table.videoId, table.createdAt),
    index("comments_parent_idx").on(table.parentId, table.createdAt),
  ],
);

export const follows = sqliteTable(
  "follows",
  {
    creatorEmail: text("creator_email")
      .notNull()
      .references(() => profiles.email),
    followerEmail: text("follower_email")
      .notNull()
      .references(() => profiles.email),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.creatorEmail, table.followerEmail] }),
    index("follows_creator_idx").on(table.creatorEmail),
    index("follows_follower_idx").on(table.followerEmail),
  ],
);
