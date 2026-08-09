import { getChatGPTUser } from "@/app/chatgpt-auth";
import {
  createVideo,
  getProfileByEmail,
  getSeries,
  listVideos,
  mediaBucket,
} from "@/db";
import {
  MAX_VIDEO_BYTES,
  MAX_VIDEOS_PER_PROFILE,
  MAX_PROFILE_VIDEO_BYTES,
  MAX_OPTIMIZATION_SOURCE_BYTES,
} from "@/app/lib/limits";
import { toPublicVideo } from "@/app/lib/public-video";
import { durationsAgree, readContainerDuration } from "@/app/lib/media-duration";

const allowedTypes = new Set(["video/mp4", "video/webm"]);
const allowedModes = new Set([
  "text-to-video",
  "image-to-video",
  "video-to-video",
  "audio-to-video",
  "hybrid-workflow",
]);
const allowedCategories = new Set([
  "film",
  "animation",
  "music",
  "education",
  "experimental",
]);
const allowedLicenses = new Set([
  "all-rights-reserved",
  "cc-by-4.0",
  "cc-by-nc-4.0",
  "cc0",
]);
export async function GET(request: Request) {
  const url = new URL(request.url);
  const videos = await listVideos({
    query: url.searchParams.get("q")?.slice(0, 80) || undefined,
    category: url.searchParams.get("category") || undefined,
    sort:
      url.searchParams.get("sort") === "newest" ? "newest" : "community",
  });
  return Response.json({
    videos: videos.map(toPublicVideo),
  });
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });

  const profile = await getProfileByEmail(user.email);
  if (!profile) {
    return Response.json(
      { error: "Create your Pumblo profile before uploading." },
      { status: 403 },
    );
  }

  const existingVideos = await listVideos({
    ownerEmail: user.email,
    limit: MAX_VIDEOS_PER_PROFILE + 1,
  });
  const usedBytes = existingVideos.reduce(
    (total, video) => total + video.sizeBytes,
    0,
  );
  if (existingVideos.length >= MAX_VIDEOS_PER_PROFILE) {
    return Response.json(
      { error: `Your ${MAX_VIDEOS_PER_PROFILE} active upload slots are in use. Delete one to publish another.` },
      { status: 409 },
    );
  }

  try {
    const metadata = parseMetadata(request.headers.get("x-pumblo-metadata"));
    const contentType = request.headers.get("content-type")?.split(";")[0] ?? "";
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    const declaredSize =
      typeof metadata.sizeBytes === "number" ? metadata.sizeBytes : Number.NaN;

    if (!request.body) {
      return Response.json({ error: "Choose a video file." }, { status: 400 });
    }
    if (!allowedTypes.has(contentType)) {
      return Response.json(
        { error: "Only MP4 and WebM videos are supported." },
        { status: 415 },
      );
    }
    if (
      !Number.isSafeInteger(declaredSize) ||
      declaredSize <= 0 ||
      declaredSize > MAX_VIDEO_BYTES ||
      contentLength > MAX_VIDEO_BYTES
    ) {
      return Response.json(
        { error: "Video must be between 1 byte and 40 MB." },
        { status: 413 },
      );
    }
    if (contentLength > 0 && contentLength !== declaredSize) {
      return Response.json(
        { error: "The video size changed during upload. Please retry." },
        { status: 400 },
      );
    }
    if (usedBytes + declaredSize > MAX_PROFILE_VIDEO_BYTES) {
      return Response.json(
        { error: "This upload would exceed your 80 MB channel storage allowance. Optimize it or remove an older video." },
        { status: 409 },
      );
    }

    const title = text(metadata.title, 100);
    const description = text(metadata.description, 1000);
    const generationTool = text(metadata.generationTool, 50) || "Not specified";
    const generationMode = text(metadata.generationMode, 30);
    const category = text(metadata.category, 30);
    const license = text(metadata.license, 40);
    const prompt = text(metadata.prompt, 1500);
    const seriesId = text(metadata.seriesId, 64) || null;
    const seasonNumber = integer(metadata.seasonNumber, seriesId ? 1 : 0);
    const episodeNumber = integer(metadata.episodeNumber, 0);
    const sourceCreditUrl = safeHttpUrl(text(metadata.sourceCreditUrl, 300));
    const submittedOriginalSize = integer(metadata.originalSizeBytes, declaredSize);
    const originalSizeBytes = Math.min(
      MAX_OPTIMIZATION_SOURCE_BYTES,
      Math.max(declaredSize, submittedOriginalSize),
    );
    const storageSavingsBytes = Math.max(0, originalSizeBytes - declaredSize);
    const declaration = metadata.aiDeclaration;
    const durationSeconds =
      typeof metadata.durationSeconds === "number"
        ? metadata.durationSeconds
        : Number.NaN;

    if (title.length < 2) {
      return Response.json(
        { error: "Enter a title with at least 2 characters." },
        { status: 400 },
      );
    }
    if (
      !Number.isFinite(durationSeconds) ||
      durationSeconds <= 0 ||
      durationSeconds > 21_600
    ) {
      return Response.json(
        { error: "The browser could not verify this video's duration." },
        { status: 400 },
      );
    }
    if (seriesId) {
      const selectedSeries = await getSeries(seriesId);
      if (!selectedSeries || selectedSeries.ownerEmail !== user.email.toLowerCase()) {
        return Response.json({ error: "Choose one of your own series." }, { status: 400 });
      }
      if (selectedSeries.status !== "ongoing") {
        return Response.json({ error: "Reopen this completed series before adding an episode." }, { status: 409 });
      }
      if (seasonNumber < 1 || seasonNumber > 99 || episodeNumber < 1 || episodeNumber > 999) {
        return Response.json({ error: "Series uploads need a valid season and episode number." }, { status: 400 });
      }
      const episodes = await listVideos({ seriesId, limit: 100 });
      if (
        episodes.some(
          (episode) =>
            episode.seasonNumber === seasonNumber && episode.episodeNumber === episodeNumber,
        )
      ) {
        return Response.json({ error: "That season and episode number already exists." }, { status: 409 });
      }
    }
    if (
      !allowedModes.has(generationMode) ||
      !allowedCategories.has(category) ||
      !allowedLicenses.has(license) ||
      declaration !== "yes"
    ) {
      return Response.json(
        { error: "Complete the required disclosure fields." },
        { status: 400 },
      );
    }

    const id = crypto.randomUUID();
    const extension = contentType === "video/webm" ? "webm" : "mp4";
    const objectKey = `videos/${profile.handle}/${id}.${extension}`;
    const bucket = mediaBucket();

    const storedObject = await bucket.put(objectKey, request.body, {
      httpMetadata: {
        contentType,
        cacheControl: "public, max-age=31536000, immutable",
      },
      customMetadata: {
        owner: profile.handle,
      },
    });

    try {
      if (storedObject.size !== declaredSize) {
        throw new Error("The stored video size did not match the upload.");
      }
      const storedForVerification = await bucket.get(objectKey);
      if (!storedForVerification) throw new Error("The stored video could not be verified.");
      const storedBytes = await storedForVerification.arrayBuffer();
      const verifiedDuration = readContainerDuration(
        storedBytes,
        contentType as "video/mp4" | "video/webm",
      );
      if (!durationsAgree(durationSeconds, verifiedDuration)) {
        throw new Error("The file runtime did not match the browser preview.");
      }
      const contentHash = await sha256Hex(storedBytes);
      const video = await createVideo({
        id,
        ownerEmail: user.email,
        title,
        description,
        generationTool,
        generationMode,
        category,
        license,
        prompt,
        objectKey,
        contentType,
        sizeBytes: storedObject.size,
        durationSeconds: verifiedDuration,
        seriesId,
        seasonNumber: seriesId ? seasonNumber : 1,
        episodeNumber: seriesId ? episodeNumber : 0,
        sourceCreditUrl,
        originalSizeBytes,
        storageSavingsBytes,
        contentHash,
        provenanceStatus: "self-declared",
      });
      return Response.json({ video }, { status: 201 });
    } catch (error) {
      await bucket.delete(objectKey);
      if (error instanceof Error && /content_hash|videos_owner_content_hash_unique/i.test(error.message)) {
        throw new Error("This exact video file is already published on your channel.");
      }
      throw error;
    }
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "The video could not be uploaded.",
      },
      { status: 400 },
    );
  }
}

type UploadMetadata = {
  title?: unknown;
  description?: unknown;
  generationTool?: unknown;
  generationMode?: unknown;
  category?: unknown;
  license?: unknown;
  prompt?: unknown;
  aiDeclaration?: unknown;
  sizeBytes?: unknown;
  durationSeconds?: unknown;
  seriesId?: unknown;
  seasonNumber?: unknown;
  episodeNumber?: unknown;
  sourceCreditUrl?: unknown;
  originalSizeBytes?: unknown;
};

function parseMetadata(value: string | null): UploadMetadata {
  if (!value || value.length > 12_000) {
    throw new Error("The upload details are missing or too large.");
  }
  const parsed: unknown = JSON.parse(decodeURIComponent(value));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("The upload details are invalid.");
  }
  return parsed as UploadMetadata;
}

function text(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function integer(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isSafeInteger(value) ? value : fallback;
}

function safeHttpUrl(value: string): string {
  if (!value) return "";
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) throw new Error();
    return url.toString();
  } catch {
    throw new Error("Enter a valid source credit URL.");
  }
}

async function sha256Hex(input: ArrayBuffer): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", input));
  return [...digest].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
