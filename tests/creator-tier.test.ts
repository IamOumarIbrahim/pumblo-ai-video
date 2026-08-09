import assert from "node:assert/strict";
import test from "node:test";
import { creatorTier, type TierEpisode } from "../app/lib/creator-tier.ts";

function episodes(
  seriesId: string,
  count: number,
  durationSeconds: number,
  startDay: number,
): TierEpisode[] {
  return Array.from({ length: count }, (_, index) => ({
    seriesId,
    seasonNumber: 1,
    episodeNumber: index + 1,
    durationSeconds,
    createdAt: new Date(Date.UTC(2026, 0, startDay + index)).toISOString(),
  }));
}

test("ranks are exactly Rising, Active, and Storyteller", () => {
  assert.equal(creatorTier([], 0).grade, "Rising");
  assert.equal(creatorTier([], 3).grade, "Active");
  assert.equal(creatorTier(episodes("one", 3, 60, 1), 3).grade, "Storyteller");
});

test("Storyteller requires a real consecutive three-part season", () => {
  assert.equal(creatorTier(episodes("short", 3, 59.99, 1), 8).grade, "Active");
  const gap = episodes("gap", 3, 90, 1);
  gap[2].episodeNumber = 4;
  assert.equal(creatorTier(gap, 8).grade, "Active");
  const duplicate = episodes("duplicate", 3, 90, 1);
  duplicate[2].episodeNumber = 2;
  assert.equal(creatorTier(duplicate, 8).grade, "Active");
});

test("unrelated uploads can earn Active but never Storyteller", () => {
  const result = creatorTier([], 12);
  assert.equal(result.grade, "Active");
  assert.equal(result.publishedVideos, 12);
  assert.equal(result.qualifyingSeries, 0);
});
