import { getChatGPTUser } from "@/app/chatgpt-auth";
import {
  addComment,
  getProfileByEmail,
  getVideo,
  listComments,
} from "@/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const viewer = await getChatGPTUser();
  if (!(await getVideo(id))) {
    return Response.json({ error: "Video not found." }, { status: 404 });
  }
  return Response.json({ comments: await listComments(id, viewer?.email) });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });
  if (!(await getProfileByEmail(user.email))) {
    return Response.json(
      { error: "Create your profile before commenting." },
      { status: 403 },
    );
  }

  const { id } = await params;
  if (!(await getVideo(id))) {
    return Response.json({ error: "Video not found." }, { status: 404 });
  }

  const body = (await request.json()) as {
    content?: unknown;
    parentId?: unknown;
  };
  const content =
    typeof body.content === "string" ? body.content.trim().slice(0, 500) : "";
  if (!content) {
    return Response.json({ error: "Write a comment first." }, { status: 400 });
  }

  const parentId =
    typeof body.parentId === "string" ? body.parentId.slice(0, 64) : null;
  try {
    const comment = await addComment(id, user.email, content, parentId);
    return Response.json({ comment }, { status: 201 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Reply could not be posted." },
      { status: 400 },
    );
  }
}
