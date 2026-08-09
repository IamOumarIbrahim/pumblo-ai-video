import { redirect } from "next/navigation";
import { requireChatGPTUser } from "@/app/chatgpt-auth";
import { UploadForm } from "@/app/components/UploadForm";
import { BatchImportModal } from "@/app/components/BatchImportModal";
import {
  MAX_PROFILE_VIDEO_BYTES,
  MAX_VIDEO_BYTES,
  MAX_VIDEOS_PER_PROFILE,
} from "@/app/lib/limits";
import { getProfileByEmail, listSeries, listVideos } from "@/db";

export const dynamic = "force-dynamic";

export default async function UploadPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const user = await requireChatGPTUser("/upload");
  const profile = await getProfileByEmail(user.email);
  if (!profile) redirect("/settings/profile?next=/upload");

  const [videos, series] = await Promise.all([
    listVideos({ ownerEmail: user.email, limit: MAX_VIDEOS_PER_PROFILE + 1 }),
    listSeries({ ownerEmail: user.email, limit: 100 }),
  ]);
  const remaining = Math.max(0, MAX_VIDEOS_PER_PROFILE - videos.length);
  const usedBytes = videos.reduce((total, video) => total + video.sizeBytes, 0);
  const remainingBytes = Math.max(0, MAX_PROFILE_VIDEO_BYTES - usedBytes);
  const { welcome } = await searchParams;

  return (
    <main className="upload-page">
      <div className="upload-heading">
        <div>
          <span className="section-kicker">Upload studio</span>
          <h1>Share an AI video with the network.</h1>
          <p>
            The video is the main event. Tools, workflow, license, and process
            notes are optional context viewers can open afterward.
          </p>
        </div>
        <div className="quota-card">
          <span>Channel storage</span>
          <strong>{remaining} of {MAX_VIDEOS_PER_PROFILE} active uploads available</strong>
          <small>{(remainingBytes / 1024 / 1024).toFixed(1)} of {MAX_PROFILE_VIDEO_BYTES / 1024 / 1024} MB available · {MAX_VIDEO_BYTES / 1024 / 1024} MB per file</small>
        </div>
      </div>
      {remaining > 0 && remainingBytes > 0 ? (
        <div className="batch-import-launcher">
          <div>
            <strong>Bringing several originals?</strong>
            <p>Select them together, review still previews and storage, then import in one guided flow.</p>
          </div>
          <BatchImportModal
            defaultOpen={welcome === "1"}
            profileHandle={profile.handle}
            remainingBytes={remainingBytes}
            remainingSlots={remaining}
          />
        </div>
      ) : null}
      {remaining > 0 && remainingBytes > 0 ? (
        <UploadForm series={series.filter((item) => item.status === "ongoing")} remainingBytes={remainingBytes} />
      ) : (
        <div className="empty-state">
          <h3>Your active upload allowance is full</h3>
          <p>
            Delete one of your videos from its watch page to free a slot and
            keep the no-card launch capacity predictable.
          </p>
        </div>
      )}
    </main>
  );
}
