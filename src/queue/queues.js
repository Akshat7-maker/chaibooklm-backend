import { Queue } from "bullmq";
import { redisConnection } from "../lib/redis";

const defaultJobOptions = {
  attempts: 3,
  backoff: { type: "exponential", delay: 5000 },
  removeOnComplete: { age: 3600, count: 1000 }, // keep last hour / 1000 jobs
  removeOnFail: { age: 86400 }, // keep failures for a day for debugging
};

export const resourceProcessingQueue = new Queue("resource-processing", {
  connection: redisConnection,
  defaultJobOptions,
});

export const youtubeProcessingQueue = new Queue("youtube-processing", {
  connection: redisConnection,
  defaultJobOptions,
});

export const websiteUrlProcessingQueue = new Queue("website-url-processing", {
  connection: redisConnection,
  defaultJobOptions,
});

export const embeddingQueue = new Queue("embedding", {
  connection: redisConnection,
  defaultJobOptions,
});

export const summaryGenerationQueue = new Queue("summary-generation", {
  connection: redisConnection,
  defaultJobOptions,
});
