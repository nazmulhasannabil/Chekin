import redis from "./client";

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetInSeconds: number;
}

/**
 * Sliding window rate limiter using Redis.
 * @param key    Unique key (e.g. "checkin:user:123")
 * @param limit  Max requests in window
 * @param windowSeconds  Window duration in seconds
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  try {
    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;
    const fullKey = `rl:${key}`;

    const pipeline = redis.pipeline();
    pipeline.zremrangebyscore(fullKey, "-inf", windowStart);
    pipeline.zadd(fullKey, now, `${now}-${Math.random()}`);
    pipeline.zcard(fullKey);
    pipeline.expire(fullKey, windowSeconds);

    const results = await pipeline.exec();
    const count = (results?.[2]?.[1] as number) ?? 0;
    const allowed = count <= limit;

    return {
      allowed,
      remaining: Math.max(0, limit - count),
      resetInSeconds: windowSeconds,
    };
  } catch {
    // If Redis is unavailable, allow the request
    return { allowed: true, remaining: limit, resetInSeconds: windowSeconds };
  }
}
