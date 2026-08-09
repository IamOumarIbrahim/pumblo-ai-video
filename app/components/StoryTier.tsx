import type { CreatorTier } from "@/app/lib/creator-tier";
import { formatDuration } from "@/app/lib/format";

export function StoryTier({
  tier,
  compact = false,
}: {
  tier: CreatorTier;
  compact?: boolean;
}) {
  return (
    <div
      className={`story-tier rank-${tier.grade.toLowerCase()}${compact ? " compact" : ""}`}
    >
      <span className="tier-grade">{tier.grade}</span>
      <div>
        <strong>{tier.label}</strong>
        <p>
          {tier.publishedVideos} published · {tier.qualifyingSeries} qualifying
          series · {formatDuration(tier.totalRuntimeSeconds)} structured runtime
        </p>
        {!compact ? <small>{tier.nextRequirement}</small> : null}
      </div>
    </div>
  );
}
