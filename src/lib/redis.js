import IORedis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

export const redisConnection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null, // required by BullMQ
  enableReadyCheck: false,
});

redisConnection.on("connect", () => {
  console.log("[redis] connected");
});

redisConnection.on("error", (err) => {
  console.error("[redis] connection error:", err);
});