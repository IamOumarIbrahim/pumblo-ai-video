import Link from "next/link";
import type { CreatorTier } from "@/app/lib/creator-tier";

export function RankBadge({ rank }: { rank: CreatorTier["grade"] }) {
  return (
    <Link
      className={`rank-badge rank-${rank.toLowerCase()}`}
      href="/ranks"
      aria-label={`${rank} creator rank — view rank rules`}
    >
      {rank}
    </Link>
  );
}
