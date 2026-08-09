export type TierEpisode = {
  seriesId: string;
  seasonNumber: number;
  episodeNumber: number;
  durationSeconds: number;
  createdAt: string;
};

export type CreatorTier = {
  grade: "Rising" | "Active" | "Storyteller";
  label: string;
  publishedVideos: number;
  qualifyingSeries: number;
  qualifyingEpisodes: number;
  totalRuntimeSeconds: number;
  publishingSpanDays: number;
  nextRequirement: string;
};

export const RANK_RULES = {
  active: { publishedVideos: 3 },
  storyteller: { consecutiveEpisodes: 3, minimumEpisodeSeconds: 60 },
} as const;

export function creatorTier(
  episodes: TierEpisode[],
  publishedVideos = episodes.length,
): CreatorTier {
  const bySeries = new Map<string, TierEpisode[]>();
  for (const episode of episodes) {
    if (!episode.seriesId) continue;
    const group = bySeries.get(episode.seriesId) ?? [];
    group.push(episode);
    bySeries.set(episode.seriesId, group);
  }

  const qualifying = [...bySeries.values()].filter(qualifiesAsSeries);
  const qualifyingEpisodes = qualifying.flat();
  const totalRuntimeSeconds = qualifyingEpisodes.reduce(
    (total, episode) => total + episode.durationSeconds,
    0,
  );
  const dates = qualifyingEpisodes
    .map((episode) => new Date(episode.createdAt).getTime())
    .filter(Number.isFinite);
  const publishingSpanDays = dates.length
    ? Math.floor((Math.max(...dates) - Math.min(...dates)) / 86_400_000)
    : 0;
  const metrics = {
    publishedVideos: Math.max(0, publishedVideos),
    series: qualifying.length,
    episodes: qualifyingEpisodes.length,
    runtimeSeconds: totalRuntimeSeconds,
    spanDays: publishingSpanDays,
  };

  if (metrics.series >= 1) {
    return result(
      "Storyteller",
      metrics,
      "Top rank earned through a complete, consecutive series.",
    );
  }
  if (metrics.publishedVideos >= RANK_RULES.active.publishedVideos) {
    return result(
      "Active",
      metrics,
      "Publish 3 consecutive numbered episodes of at least 60 seconds in one series.",
    );
  }
  const remaining = Math.max(
    0,
    RANK_RULES.active.publishedVideos - metrics.publishedVideos,
  );
  return result(
    "Rising",
    metrics,
    `Publish ${remaining} more ${remaining === 1 ? "video" : "videos"} to reach Active.`,
  );
}

function qualifiesAsSeries(episodes: TierEpisode[]): boolean {
  if (
    episodes.length < RANK_RULES.storyteller.consecutiveEpisodes ||
    episodes.some(
      (episode) => episode.durationSeconds < RANK_RULES.storyteller.minimumEpisodeSeconds,
    )
  ) {
    return false;
  }
  const seasons = new Map<number, number[]>();
  for (const episode of episodes) {
    const season = Math.max(1, Math.floor(episode.seasonNumber));
    const numbers = seasons.get(season) ?? [];
    numbers.push(Math.floor(episode.episodeNumber));
    seasons.set(season, numbers);
  }
  return [...seasons.values()].some((numbers) => {
    const ordered = [...new Set(numbers)].sort((a, b) => a - b);
    return (
      ordered.length === numbers.length &&
      ordered.length >= RANK_RULES.storyteller.consecutiveEpisodes &&
      ordered.every((number, index) => number === index + 1)
    );
  });
}

function result(
  grade: CreatorTier["grade"],
  metrics: {
    publishedVideos: number;
    series: number;
    episodes: number;
    runtimeSeconds: number;
    spanDays: number;
  },
  nextRequirement: string,
): CreatorTier {
  return {
    grade,
    label: `${grade} creator`,
    publishedVideos: metrics.publishedVideos,
    qualifyingSeries: metrics.series,
    qualifyingEpisodes: metrics.episodes,
    totalRuntimeSeconds: metrics.runtimeSeconds,
    publishingSpanDays: metrics.spanDays,
    nextRequirement,
  };
}
