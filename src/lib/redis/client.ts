import Redis from "ioredis";

declare global {
  // eslint-disable-next-line no-var
  var redis: Redis | undefined;
}

function createRedisClient(): Redis {
  const client = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    maxRetriesPerRequest: 3,
    enableReadyCheck: false,
    lazyConnect: true,
  });

  client.on("error", (err) => {
    // Log but don't crash — Redis is used for optional features (rate limiting, challenges)
    console.error("[Redis] Connection error:", err.message);
  });

  return client;
}

const redis: Redis = global.redis ?? createRedisClient();
if (process.env.NODE_ENV !== "production") {
  global.redis = redis;
}

export default redis;
