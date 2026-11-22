/**
 * Minimal in-process rate limiter for auth endpoints.
 *
 * This is deliberately a preparation layer: a single Node process keeps the
 * counters in memory. A multi-instance deployment must replace `consume`
 * with a shared store (for example a Neon table or Redis) before relying on
 * it as a security control.
 */
interface RateLimitBucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, RateLimitBucket>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/** Consumes one token from a fixed window keyed by action + identifier. */
export function consumeRateLimit(
  key: string,
  limit = 10,
  windowMs = 60_000,
  now = Date.now(),
): RateLimitResult {
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return {
      allowed: true,
      remaining: Math.max(0, limit - 1),
      retryAfterSeconds: Math.ceil(windowMs / 1000),
    };
  }

  if (current.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  current.count += 1;
  return {
    allowed: true,
    remaining: Math.max(0, limit - current.count),
    retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
  };
}

/** Used by tests and by long-running dev servers that need a clean slate. */
export function resetRateLimiter(): void {
  buckets.clear();
}
