import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function text(path) {
  return readFile(new URL(path, root), "utf8");
}

test("Sites provisioning declares durable database and video storage", async () => {
  const config = JSON.parse(await text(".openai/hosting.json"));
  assert.match(config.project_id, /^appgprj_/);
  assert.equal(config.d1, "DB");
  assert.equal(config.r2, "MEDIA");
});

test("the 100-creator launch has enforceable media guards and no signup wall", async () => {
  const database = await text("db/index.ts");
  const limits = await text("app/lib/limits.ts");
  assert.doesNotMatch(database, /MAX_PROFILES|SELECT COUNT\(\*\) AS count FROM profiles/);
  assert.match(limits, /LAUNCH_CREATOR_TARGET = 100/);
  assert.match(limits, /MAX_VIDEOS_PER_PROFILE = 12/);
  assert.match(limits, /MAX_PROFILE_VIDEO_BYTES = 80 \* 1024 \* 1024/);
  assert.match(limits, /MAX_VIDEO_BYTES = 40 \* 1024 \* 1024/);
  assert.match(await text("app/api/videos/route.ts"), /MAX_VIDEOS_PER_PROFILE/);
});

test("video uploads stream into R2 instead of buffering multipart files", async () => {
  const route = await text("app/api/videos/route.ts");
  assert.match(route, /bucket\.put\(objectKey, request\.body/);
  assert.doesNotMatch(route, /request\.formData\(\)/);
  assert.match(route, /storedObject\.size !== declaredSize/);
});

test("production identity comes from Sign in with ChatGPT headers", async () => {
  const auth = await text("app/chatgpt-auth.ts");
  const devSession = await text("app/api/dev-session/route.ts");
  assert.match(auth, /oai-authenticated-user-email/);
  assert.match(devSession, /process\.env\.NODE_ENV !== "development"/);
  assert.match(devSession, /status: 404/);
});

test("the promised two-person journey has server routes", async () => {
  const paths = [
    "app/page.tsx",
    "app/settings/profile/page.tsx",
    "app/profile/[handle]/page.tsx",
    "app/profile-media/[handle]/[kind]/route.ts",
    "app/following/page.tsx",
    "app/quicks/page.tsx",
    "app/upload/page.tsx",
    "app/watch/[id]/page.tsx",
    "app/media/[id]/route.ts",
    "app/api/videos/[id]/like/route.ts",
    "app/api/videos/[id]/comments/route.ts",
    "app/api/videos/[id]/route.ts",
    "app/api/videos/[id]/view/route.ts",
    "app/api/videos/[id]/save/route.ts",
    "app/api/videos/[id]/progress/route.ts",
    "app/api/videos/[id]/report/route.ts",
    "app/api/settings/route.ts",
    "app/api/series/route.ts",
    "app/api/notifications/read/route.ts",
    "app/api/account/export/route.ts",
    "app/api/quicks/route.ts",
    "app/api/profile/media/[kind]/route.ts",
    "app/api/profiles/[handle]/follow/route.ts",
    "app/manifest.webmanifest/route.ts",
    "app/robots.txt/route.ts",
    "app/sitemap.xml/route.ts",
    "app/favicon.svg/route.ts",
    "app/library/page.tsx",
    "app/notifications/page.tsx",
    "app/settings/page.tsx",
    "app/studio/page.tsx",
    "app/studio/series/page.tsx",
    "app/series/[id]/page.tsx",
  ];
  await Promise.all(paths.map((path) => stat(new URL(path, root))));
});

test("profiles support cropped avatar and banner create, update, read, and removal", async () => {
  const crop = await text("app/components/ImageCropField.tsx");
  const form = await text("app/components/ProfileForm.tsx");
  const mediaApi = await text("app/api/profile/media/[kind]/route.ts");
  const mediaRead = await text("app/profile-media/[handle]/[kind]/route.ts");
  const schema = await text("db/schema.ts");
  assert.match(crop, /512, height: 512/);
  assert.match(crop, /1600, height: 480/);
  assert.match(crop, /toBlob/);
  assert.match(crop, /positionX/);
  assert.match(crop, /positionY/);
  assert.match(form, /Finish each open crop/);
  assert.match(form, /method: action\.action === "delete" \? "DELETE" : "POST"/);
  assert.match(mediaApi, /MAX_PROFILE_IMAGE_BYTES/);
  assert.match(mediaApi, /matchesImageType/);
  assert.match(mediaApi, /readLimitedImage/);
  assert.doesNotMatch(mediaApi, /request\.arrayBuffer/);
  assert.match(mediaRead, /mediaBucket\(\)\.get/);
  assert.match(schema, /avatarObjectKey/);
  assert.match(schema, /bannerObjectKey/);
  assert.match(await text("db/index.ts"), /\?13, \?14\)/);
});

test("Quicks is a strict, paginated, keyboard-accessible community feed", async () => {
  const database = await text("db/index.ts");
  const feed = await text("app/components/QuickFeed.tsx");
  const upload = await text("app/components/UploadForm.tsx");
  const api = await text("app/api/quicks/route.ts");
  assert.match(database, /v\.duration_seconds > 0 AND v\.duration_seconds < /);
  assert.match(database, /OFFSET/);
  assert.match(feed, /ArrowDown/);
  assert.match(feed, /ArrowUp/);
  assert.match(feed, /IntersectionObserver/);
  assert.match(feed, /api\/videos\/\$\{current\.id\}\/view/);
  assert.match(upload, /isQuickDuration/);
  assert.match(api, /QUICK_DURATION_CEILING_SECONDS/);
  assert.doesNotMatch(api, /ownerEmail|objectKey/);
});

test("the left navigation keeps guest viewing open and gates only write actions", async () => {
  const navigation = await text("app/components/SidebarNav.tsx");
  const quicks = await text("app/components/QuickFeed.tsx");
  assert.match(navigation, /label: "Quicks"/);
  assert.match(navigation, /Watch as a guest/);
  assert.match(navigation, /Sign in with ChatGPT/);
  assert.match(quicks, /signInPath/);
  assert.match(quicks, /api\/videos\/\$\{video\.id\}\/like/);
});

test("migration 0003 adds durable profile media references and video duration", async () => {
  const migration = await text("drizzle/0003_flimsy_microchip.sql");
  assert.match(migration, /avatar_object_key/);
  assert.match(migration, /banner_object_key/);
  assert.match(migration, /duration_seconds/);
});

test("migration 0004 adds durable series, settings, library, notifications, reports, and episode uniqueness", async () => {
  const migration = await text("drizzle/0004_short_blizzard.sql");
  assert.match(migration, /CREATE TABLE `series`/);
  assert.match(migration, /CREATE TABLE `profile_settings`/);
  assert.match(migration, /CREATE TABLE `watch_later`/);
  assert.match(migration, /CREATE TABLE `watch_progress`/);
  assert.match(migration, /CREATE TABLE `notifications`/);
  assert.match(migration, /CREATE TABLE `reports`/);
  assert.match(migration, /videos_series_episode_unique/);
});

test("migration 0005 adds duplicate-file protection per channel", async () => {
  const migration = await text("drizzle/0005_lucky_khan.sql");
  assert.match(migration, /content_hash/);
  assert.match(migration, /videos_owner_content_hash_unique/);
});

test("video cards provide inline pointer previews with an audible user fallback", async () => {
  const card = await text("app/components/VideoCard.tsx");
  assert.match(card, /onPointerEnter/);
  assert.match(card, /player\.muted = !wantsSound/);
  assert.match(card, /Click for sound/);
  assert.match(card, /playsInline/);
  assert.doesNotMatch(card, /requestFullscreen/);
});

test("creator ranks are structural, server-runtime-verified, and resistant to easy numbering abuse", async () => {
  const tier = await text("app/lib/creator-tier.ts");
  const upload = await text("app/api/videos/route.ts");
  const schema = await text("db/schema.ts");
  assert.match(tier, /minimumEpisodeSeconds: 60/);
  assert.match(tier, /publishingSpanDays/);
  assert.match(tier, /"Rising" \| "Active" \| "Storyteller"/);
  assert.match(upload, /readContainerDuration/);
  assert.match(upload, /durationsAgree/);
  assert.match(schema, /videos_series_episode_unique/);
  assert.match(schema, /videos_owner_content_hash_unique/);
  assert.match(upload, /SHA-256/);
});

test("profiles expose durable creator links and configurable playback, content, notification, and privacy controls", async () => {
  const profile = await text("app/components/ProfileForm.tsx");
  const settings = await text("app/components/SettingsForm.tsx");
  const schema = await text("db/schema.ts");
  assert.match(profile, /ChatGPT/);
  assert.match(profile, /Discord/);
  assert.match(profile, />X</);
  assert.match(profile, /GitHub/);
  assert.match(schema, /profileSettings/);
  assert.match(settings, /Playback & performance/);
  assert.match(settings, /Notifications/);
  assert.match(settings, /Public profile privacy/);
});

test("the retention layer includes Watch Later, resume, Studio, activity notifications, and reporting", async () => {
  const database = await text("db/index.ts");
  const player = await text("app/components/WatchPlayer.tsx");
  const report = await text("app/components/ReportButton.tsx");
  assert.match(database, /toggleWatchLater/);
  assert.match(database, /saveWatchProgress/);
  assert.match(database, /getStudioSnapshot/);
  assert.match(database, /listNotifications/);
  assert.match(database, /reportVideo/);
  assert.match(player, /initialProgress/);
  assert.match(report, /api\/videos\/\$\{videoId\}\/report/);
});

test("the storage optimizer is local, conservative, optional, and server-checked", async () => {
  const upload = await text("app/components/UploadForm.tsx");
  const route = await text("app/api/videos/route.ts");
  assert.match(upload, /MediaRecorder/);
  assert.match(upload, /captureStream/);
  assert.match(upload, /optimized\.size >= file\.size \* 0\.92/);
  assert.match(upload, /original runtime preserved/);
  assert.match(route, /storedForVerification\.arrayBuffer/);
});

test("the main product is an AI-only video network", async () => {
  const home = await text("app/page.tsx");
  assert.doesNotMatch(home, /className="hero"/);
  assert.doesNotMatch(home, /Watch what AI can imagine/);
  assert.match(home, /Trending/);
  assert.match(home, /Latest/);
  assert.match(home, /<VideoCard/);
  assert.match(home, /Star Pumblo on GitHub/);
  assert.doesNotMatch(home, /Give the clip a home/);
});

test("removed marketing explainers stay off the home page", async () => {
  const home = await text("app/page.tsx");
  const watch = await text("app/watch/[id]/page.tsx");
  assert.doesNotMatch(home, /value-section|how-section/);
  assert.doesNotMatch(home, /Watch first\. Go deeper|A familiar video loop/);
  assert.match(watch, /Optional creator feature/);
  assert.match(watch, /Behind the render/);
});

test("profile and upload setup remove avoidable friction", async () => {
  const profile = await text("app/components/ProfileForm.tsx");
  const upload = await text("app/components/UploadForm.tsx");
  assert.match(profile, /suggestedHandle\(suggestedName\)/);
  assert.equal((profile.match(/\brequired\b/g) ?? []).length, 2);
  assert.match(upload, /<input[\s\S]*name="generationTool"[\s\S]*list="generation-tools"/);
  assert.match(upload, /Seedance 2\.0/);
  assert.match(upload, /Generation tool <i>optional<\/i>/);
  assert.match(upload, /value="hybrid-workflow"/);
  assert.doesNotMatch(upload, /<select name="generationTool"/);
});

test("comments support three-level threads with ranked like and dislike reactions", async () => {
  const schema = await text("db/schema.ts");
  const database = await text("db/index.ts");
  const engagement = await text("app/components/Engagement.tsx");
  const route = await text("app/api/videos/[id]/comments/route.ts");
  assert.match(schema, /parentId: text\("parent_id"\)/);
  assert.match(database, /comments_parent_idx/);
  assert.match(database, /queueReplyNotification/);
  assert.match(database, /toggleCommentReaction/);
  assert.match(schema, /commentReactions/);
  assert.match(engagement, /comment-replies/);
  assert.match(engagement, /depth < 2/);
  assert.match(engagement, /Dislike \{comment\.dislikeCount\}/);
  assert.match(engagement, /RankBadge/);
  assert.match(route, /parentId/);
});

test("new channels receive a still-preview batch importer with an 80 MB capacity bar", async () => {
  const profile = await text("app/components/ProfileForm.tsx");
  const importer = await text("app/components/BatchImportModal.tsx");
  assert.match(profile, /\/upload\?welcome=1/);
  assert.match(importer, /canvas\.toDataURL/);
  assert.match(importer, /Projected channel storage/);
  assert.match(importer, /MAX_PROFILE_VIDEO_BYTES/);
  assert.match(importer, /Edit videos/);
  assert.doesNotMatch(importer, /yt-dlp|youtube\.com\/watch/);
});

test("navigation is text-only and the default type scale is 110 percent", async () => {
  const navigation = await text("app/components/SidebarNav.tsx");
  const styles = await text("app/globals.css");
  assert.doesNotMatch(navigation, /glyph/);
  assert.doesNotMatch(styles, /side-nav-glyph/);
  assert.match(styles, /font-size: 110%/);
});

test("following is persisted, protected, and queryable", async () => {
  const schema = await text("db/schema.ts");
  const database = await text("db/index.ts");
  const route = await text("app/api/profiles/[handle]/follow/route.ts");
  assert.match(schema, /export const follows = sqliteTable/);
  assert.match(database, /followedByEmail/);
  assert.match(database, /toggleFollow/);
  assert.match(route, /getChatGPTUser/);
  assert.match(route, /You cannot follow yourself/);
});

test("search reaches videos, creators, and creator identities", async () => {
  const database = await text("db/index.ts");
  const home = await text("app/page.tsx");
  const profilesApi = await text("app/api/profiles/route.ts");
  assert.match(database, /LOWER\(p\.handle\)/);
  assert.match(database, /export async function listProfiles/);
  assert.match(home, /listProfiles\(\{ query, limit: 6 \}\)/);
  assert.match(profilesApi, /listProfiles/);
});

test("public query APIs never expose identity emails or storage keys", async () => {
  const videoApi = await text("app/api/videos/route.ts");
  const profileApi = await text("app/api/profiles/route.ts");
  const videoGet = videoApi.slice(
    videoApi.indexOf("export async function GET"),
    videoApi.indexOf("export async function POST"),
  );
  assert.doesNotMatch(videoGet, /ownerEmail|objectKey/);
  assert.doesNotMatch(await text("app/lib/public-video.ts"), /originalSizeBytes:|storageSavingsBytes:/);
  assert.doesNotMatch(profileApi, /\bemail\s*:/);
  assert.match(profileApi, /handle: profile\.handle/);
});

test("owners can delete videos and reclaim storage", async () => {
  const route = await text("app/api/videos/[id]/route.ts");
  const button = await text("app/components/DeleteVideoButton.tsx");
  assert.match(route, /Only the owner can delete this video/);
  assert.match(route, /mediaBucket\(\)\.delete/);
  assert.match(button, /method: "DELETE"/);
  assert.match(button, /likes and comments will also be removed/);
});

test("video pages have canonical metadata, structured data, and progressive sharing", async () => {
  const layout = await text("app/layout.tsx");
  const watch = await text("app/watch/[id]/page.tsx");
  const engagement = await text("app/components/Engagement.tsx");
  assert.match(layout, /url: "\/og\.png"/);
  assert.match(layout, /manifest: "\/manifest\.webmanifest"/);
  assert.match(watch, /alternates: \{ canonical: `\/watch\/\$\{video\.id\}` \}/);
  assert.match(watch, /"@type": "VideoObject"/);
  assert.match(engagement, /navigator\.share/);
  assert.match(engagement, /navigator\.clipboard\.writeText/);
});

test("metadata endpoints are explicit Vinext routes and index public entities", async () => {
  const manifest = await text("app/manifest.webmanifest/route.ts");
  const robots = await text("app/robots.txt/route.ts");
  const sitemap = await text("app/sitemap.xml/route.ts");
  const favicon = await text("app/favicon.svg/route.ts");
  assert.match(manifest, /application\/manifest\+json/);
  assert.match(robots, /Sitemap: \$\{base\}\/sitemap\.xml/);
  assert.match(sitemap, /application\/xml/);
  assert.match(sitemap, /listProfiles\(\{ limit: 100 \}\)/);
  assert.match(sitemap, /profile\.handle/);
  assert.match(favicon, /image\/svg\+xml/);
  assert.match(favicon, /aria-label="Pumblo"/);
});

test("the social preview is exactly 1200 by 630", async () => {
  const image = await readFile(new URL("public/og.png", root));
  assert.equal(image.subarray(1, 4).toString("ascii"), "PNG");
  assert.equal(image.readUInt32BE(16), 1200);
  assert.equal(image.readUInt32BE(20), 630);
});

test("market-facing source makes no unsupported trust or quality claim", async () => {
  const files = await Promise.all(
    [
      "README.md",
      "app/page.tsx",
      "app/about/page.tsx",
      "app/components/VideoCard.tsx",
      "app/components/UploadForm.tsx",
      "app/watch/[id]/page.tsx",
    ].map(text),
  );
  const marketSource = files.join("\n");
  assert.doesNotMatch(
    marketSource,
    /provably AI-generated|human verified|human signed|SQS|quality score|10-person beta/i,
  );
  assert.match(marketSource, /creator-declared/i);
});
