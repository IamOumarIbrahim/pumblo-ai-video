import { getChatGPTUser } from "@/app/chatgpt-auth";
import { deleteVideo, getVideo, mediaBucket, updateVideoMetadata } from "@/db";

const allowedModes = new Set([
  "text-to-video",
  "image-to-video",
  "video-to-video",
  "audio-to-video",
  "hybrid-workflow",
]);
const allowedCategories = new Set(["film", "animation", "music", "education", "experimental"]);
const allowedLicenses = new Set(["all-rights-reserved", "cc-by-4.0", "cc-by-nc-4.0", "cc0"]);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });
  const { id } = await params;
  const video = await getVideo(id);
  if (!video) return Response.json({ error: "Video not found." }, { status: 404 });
  if (video.ownerEmail !== user.email.toLowerCase()) {
    return Response.json({ error: "Only the owner can edit this video." }, { status: 403 });
  }
  const body = (await request.json()) as Record<string, unknown>;
  const title = value(body.title, 100);
  const generationTool = value(body.generationTool, 50) || "Not specified";
  const generationMode = value(body.generationMode, 30);
  const category = value(body.category, 30);
  const license = value(body.license, 40);
  if (title.length < 2) {
    return Response.json({ error: "Enter a title with at least 2 characters." }, { status: 400 });
  }
  if (!allowedModes.has(generationMode) || !allowedCategories.has(category) || !allowedLicenses.has(license)) {
    return Response.json({ error: "Choose valid video details." }, { status: 400 });
  }
  let sourceCreditUrl = value(body.sourceCreditUrl, 300);
  if (sourceCreditUrl) {
    try {
      const url = new URL(sourceCreditUrl);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
      sourceCreditUrl = url.toString();
    } catch {
      return Response.json({ error: "Enter a valid source credit URL." }, { status: 400 });
    }
  }
  const updated = await updateVideoMetadata(id, user.email, {
    title,
    description: value(body.description, 1000),
    generationTool,
    generationMode,
    category,
    license,
    prompt: value(body.prompt, 1500),
    sourceCreditUrl,
  });
  return Response.json({ video: updated });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });

  const { id } = await params;
  const video = await getVideo(id);
  if (!video) return Response.json({ error: "Video not found." }, { status: 404 });
  if (video.ownerEmail !== user.email.toLowerCase()) {
    return Response.json(
      { error: "Only the owner can delete this video." },
      { status: 403 },
    );
  }

  await mediaBucket().delete(video.objectKey);
  const deleted = await deleteVideo(id, user.email);
  if (!deleted) return Response.json({ error: "Video not found." }, { status: 404 });
  return Response.json({ deleted: true });
}

function value(input: unknown, maxLength: number) {
  return typeof input === "string" ? input.trim().slice(0, maxLength) : "";
}
