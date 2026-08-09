import { getChatGPTUser } from "@/app/chatgpt-auth";
import {
  DEFAULT_PROFILE_SETTINGS,
  getProfileByEmail,
  getProfileSettings,
  saveProfileSettings,
  type ProfileSettings,
} from "@/db";

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });
  return Response.json({ settings: await getProfileSettings(user.email) });
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });
  if (!(await getProfileByEmail(user.email))) {
    return Response.json({ error: "Create a profile first." }, { status: 403 });
  }
  const body = (await request.json()) as Record<string, unknown>;
  type BooleanKey = Exclude<keyof ProfileSettings, "updatedAt" | "socialPlacement">;
  const booleanKeys = Object.keys(DEFAULT_PROFILE_SETTINGS).filter(
    (key): key is BooleanKey => key !== "updatedAt" && key !== "socialPlacement",
  );
  const settings = {
    ...Object.fromEntries(booleanKeys.map((key) => [key, body[key] === true])),
    socialPlacement:
      body.socialPlacement === "under-description"
        ? "under-description"
        : "under-title",
  } as Omit<ProfileSettings, "updatedAt">;
  return Response.json({ settings: await saveProfileSettings(user.email, settings) });
}
