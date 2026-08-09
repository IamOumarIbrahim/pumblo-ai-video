import { notFound, redirect } from "next/navigation";
import { requireChatGPTUser } from "@/app/chatgpt-auth";
import { VideoEditForm } from "@/app/components/VideoEditForm";
import { getProfileByEmail, getVideo } from "@/db";

export const dynamic = "force-dynamic";

export default async function EditVideoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireChatGPTUser(`/studio/videos/${id}`);
  const profile = await getProfileByEmail(user.email);
  if (!profile) redirect(`/settings/profile?next=/studio/videos/${id}`);
  const video = await getVideo(id);
  if (!video || video.ownerEmail !== user.email.toLowerCase()) notFound();
  return (
    <main className="form-page">
      <header className="form-page-heading">
        <span className="section-kicker">Video details</span>
        <h1>Edit what viewers see.</h1>
        <p>The video file stays unchanged. Update its title, description, tool, category, license, and optional process notes.</p>
      </header>
      <VideoEditForm initial={video} profileHandle={profile.handle} />
    </main>
  );
}
