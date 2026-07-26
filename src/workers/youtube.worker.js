// youtube.worker.js
import { Worker } from "bullmq";
import { randomUUID } from "crypto";
import { redisConnection } from "../lib/redis.js";
import { prisma } from "../utils/db.js";
import { youtubeExtractor } from "../extractors/youtube.extractor.js";
import { chunkTranscripts, chunkText } from "../lib/chunker.js";
import { embedTexts } from "../ai/embeddings.js";
import { upsertChunks } from "../vector/qdrant.client.js";
import { emitToNotebook } from "../sockets/emitter.js";
import { websiteExtractor } from "../extractors/website.extractor.js";

async function updateProgress(resourceId, notebookId, data) {
  const resource = await prisma.resource.update({
    where: { id: resourceId },
    data,
  });
  emitToNotebook(notebookId, "resource:update", {
    resourceId,
    status: resource.status,
    progress: resource.progress,
    currentStep: resource.currentStep,
    title: resource.title || null,
  });
  return resource;
}

const URL_EXTRACTORS = {
  YOUTUBE: {
    extract: youtubeExtractor.extract,
    chunk: (extracted) => chunkTranscripts(extracted.segments),
    buildPayload: (chunk) => ({ startTime: chunk.start, endTime: chunk.end }),
  },
  WEBSITE: {
    extract: websiteExtractor.extract,
    chunk: (extracted) => chunkText(extracted.text),
    buildPayload: () => ({}),
  },
};

async function processYoutube(job) {
  const { resourceId, notebookId, userId, url, type } = job.data;

  console.log({ resourceId, notebookId, userId, url, type });

  const extractor = URL_EXTRACTORS[type];
  if (!extractor) {
    throw new Error(`No extractor registered for resource type: ${type}`);
  }

  try {
    await updateProgress(resourceId, notebookId, {
      currentStep: "extracting",
      progress: 10,
    });
    // const extracted = await youtubeExtractor.extract({ originalUrl: url });
    const extracted = await extractor.extract({ originalUrl: url });

    // console.log("extr", extracted);

    await updateProgress(resourceId, notebookId, {
      currentStep: "chunking",
      progress: 35,
      title: extracted.title,
    });
    // const chunks = chunkTranscripts(extracted.segments);
    const chunks = extractor.chunk(extracted);
    // console.log("chunks", chunks);
    if (chunks.length === 0)
      throw new Error("No extractable content found in resource");

    await updateProgress(resourceId, notebookId, {
      currentStep: "embedding",
      progress: 55,
    });
    const vectors = await embedTexts(chunks.map((c) => c.text));

    await updateProgress(resourceId, notebookId, {
      currentStep: "indexing",
      progress: 80,
    });
    await upsertChunks(
      chunks.map((chunk, i) => ({
        id: randomUUID(),
        vector: vectors[i],
        payload: {
          resourceId,
          notebookId,
          userId,
          sourceType: type,
          chunkIndex: chunk.chunkIndex,
          title: extracted.title,
          text: chunk.text,
          ...extractor.buildPayload(chunk),
          ...extracted.metadata,
        },
      })),
    );

    await updateProgress(resourceId, notebookId, {
      status: "READY",
      currentStep: "done",
      progress: 100,
    });
    await prisma.resource.update({
      where: { id: resourceId },
      data: { indexedAt: new Date(), title: extracted.title || undefined },
    });
  } catch (err) {
    console.error(
      `[youtube-worker] failed processing resource ${resourceId}:`,
      err,
    );
    await prisma.resource.update({
      where: { id: resourceId },
      data: {
        status: "FAILED",
        errorMessage: err.message?.slice(0, 500) || "Unknown error",
      },
    });
    emitToNotebook(notebookId, "resource:update", {
      resourceId,
      status: "FAILED",
      errorMessage: err.message,
    });
    throw err;
  }
}

export const youtubeProcessingWorker = new Worker(
  "youtube-processing",
  processYoutube,
  {
    connection: redisConnection,
    concurrency: Number(process.env.YOUTUBE_WORKER_CONCURRENCY || 3),
  },
);

youtubeProcessingWorker.on("completed", (job) =>
  console.log(`[youtube-worker] job ${job.id} completed`),
);
youtubeProcessingWorker.on("failed", (job, err) =>
  console.error(`[youtube-worker] job ${job?.id} failed:`, err.message),
);
