/**
 * Explainable trending model: real likes and comments, discounted by post age.
 * score = (3 * likes + 2 * comments) / (age in hours + 2).
 * The +2 hour floor keeps brand-new posts from dominating on a tiny sample.
 */

export const TRENDING_WINDOW_DAYS = 30;
export const TRENDING_CANDIDATE_LIMIT = 200;

export interface TrendingCandidate {
  postId: string;
  likeCount: number;
  commentCount: number;
  createdAt: string;
}

interface RankedCandidate extends TrendingCandidate {
  rawScore: number;
}

function round(value: number, places: number): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

/** Returns null when a post has no real engagement or an unusable timestamp. */
export function scoreTrendingPost(
  post: TrendingCandidate,
  now: number = Date.now(),
): RankedCandidate | null {
  const created = new Date(post.createdAt).getTime();
  const ageMs = now - created;
  if (!Number.isFinite(ageMs) || ageMs < 0) return null;

  const engagement = post.likeCount + post.commentCount;
  if (engagement <= 0) return null;

  const ageHours = ageMs / 3_600_000;
  const rawScore = (3 * post.likeCount + 2 * post.commentCount) / (ageHours + 2);
  if (!Number.isFinite(rawScore)) return null;

  return { ...post, rawScore };
}

/** Bounded, deterministic ranking; ties keep the newest candidate first. */
export function rankTrendingPosts(
  candidates: TrendingCandidate[],
  limit: number,
  now: number = Date.now(),
): Array<TrendingCandidate & { ageHours: number; score: number }> {
  const safeLimit = Math.min(24, Math.max(1, Math.floor(limit)));

  return candidates
    .map((candidate) => scoreTrendingPost(candidate, now))
    .filter((item): item is RankedCandidate => item !== null)
    .sort(
      (a, b) =>
        b.rawScore - a.rawScore ||
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() ||
        a.postId.localeCompare(b.postId),
    )
    .slice(0, safeLimit)
    .map((item) => ({
      postId: item.postId,
      likeCount: item.likeCount,
      commentCount: item.commentCount,
      createdAt: item.createdAt,
      ageHours: round((now - new Date(item.createdAt).getTime()) / 3_600_000, 1),
      score: round(item.rawScore, 2),
    }));
}
