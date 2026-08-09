import { getChatGPTUser } from "@/app/chatgpt-auth";
import { getProfileByEmail, toggleCommentReaction } from "@/db";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });
  if (!(await getProfileByEmail(user.email))) {
    return Response.json(
      { error: "Create your profile before reacting." },
      { status: 403 },
    );
  }
  const body = (await request.json()) as { value?: unknown };
  if (body.value !== 1 && body.value !== -1) {
    return Response.json({ error: "Choose like or dislike." }, { status: 400 });
  }
  try {
    const { id } = await params;
    return Response.json(await toggleCommentReaction(id, user.email, body.value));
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Reaction could not be saved." },
      { status: 404 },
    );
  }
}
