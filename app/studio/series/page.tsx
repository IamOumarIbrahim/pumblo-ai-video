import { redirect } from "next/navigation";
import { requireChatGPTUser } from "@/app/chatgpt-auth";
import { SeriesManager } from "@/app/components/SeriesManager";
import { getProfileByEmail, listSeries } from "@/db";

export const dynamic = "force-dynamic";

export default async function SeriesStudioPage() {
  const user = await requireChatGPTUser("/studio/series");
  if (!(await getProfileByEmail(user.email))) redirect("/settings/profile?next=/studio/series");
  const series = await listSeries({ ownerEmail: user.email, limit: 100 });
  return (
    <main className="studio-page">
      <div className="form-page-heading">
        <span className="section-kicker">Series studio</span>
        <h1>Build stories people return to.</h1>
        <p>Group numbered episodes, show the intended order, and earn the transparent Storyteller rank.</p>
      </div>
      <SeriesManager initialSeries={series} />
    </main>
  );
}
