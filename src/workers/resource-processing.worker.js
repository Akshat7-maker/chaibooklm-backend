import { Worker } from "bullmq";
import { randomUUID } from "crypto";
import { redisConnection } from "../lib/redis.js";
import { prisma } from "../utils/db.js";
// import { getExtractor } from "../extractors/index.js";
import { chunkPages, chunkText, chunkTranscripts } from "../lib/chunker.js";
import { embedTexts } from "../ai/embeddings.js";
import { upsertChunks } from "../vector/qdrant.client.js";
// import { getSocketServer } from "../sockets/server.js";
import { emitToNotebook } from "../sockets/emitter.js";
import { pdfExtractor } from "../extractors/pdf.extractor.js";
import { vttExtractor } from "../extractors/vtt.extractor.js";
import { docxExtractor } from "../extractors/docx.extractor.js";
import { txtExtractor } from "../extractors/txt.extractor.js";

const CONCURRENCY = Number(process.env.RESOURCE_WORKER_CONCURRENCY || 3);

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
  });

  return resource;
}

const FILE_EXTRACTORS = {
  PDF: {
    extract: pdfExtractor.extract,
    chunk: (e) => chunkPages(e.pages),
    buildPayload: (c) => ({ page: c.page }),
  },
  VTT: {
    extract: vttExtractor.extract,
    chunk: (e) => chunkTranscripts(e.segments),
    buildPayload: (c) => ({ startTime: c.start, endTime: c.end }),
  },
  DOCX: {
    extract: docxExtractor.extract,
    chunk: (e) => chunkText(e.text),
    buildPayload: () => ({}),
  },
  TXT: {
    extract: txtExtractor.extract,
    chunk: (e) => chunkText(e.text),
    buildPayload: () => ({}),
  },
  // AUDIO: {
  //   extract: audioExtractor.extract,
  //   chunk: (e) => chunkTranscripts(e.segments),
  //   buildPayload: (c) => ({ startTime: c.start, endTime: c.end }),
  // },
};

async function processResource(job) {
  const {
    resourceId,
    notebookId,
    userId,
    resourceType,
    storagePath,
    originalUrl,
  } = job.data;

  try {
    // 1. Extract
    await updateProgress(resourceId, notebookId, {
      currentStep: "extracting",
      progress: 10,
    });
    // const extractor = getExtractor(resourceType);
    const extractor = FILE_EXTRACTORS[resourceType];
    const extracted = await extractor.extract({ storagePath, originalUrl });

    // 2. Chunk
    await updateProgress(resourceId, notebookId, {
      currentStep: "chunking",
      progress: 35,
    });
    // const chunks = extracted.pages
    //   ? chunkPages(extracted.pages)
    //   : chunkText(extracted.content);
    const chunks = extractor.chunk(extracted);

    if (chunks.length === 0) {
      throw new Error("No extractable content found in resource");
    }

    // 3. Embed
    await updateProgress(resourceId, notebookId, {
      currentStep: "embedding",
      progress: 55,
    });
    const vectors = await embedTexts(chunks.map((c) => c.text));

    // 4. Store in Qdrant
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
          sourceType: resourceType,
          title: extracted.title,
          chunkIndex: chunk.chunkIndex,
          text: chunk.text,
          ...extractor.buildPayload(chunk),
          ...extracted.metadata,
        },
      })),
    );

    // 5. Mark ready
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
    console.error(`[worker] failed processing resource ${resourceId}:`, err);

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

    throw err; // let BullMQ retry per attempts config
  }
}

export const resourceProcessingWorker = new Worker(
  "resource-processing",
  processResource,
  {
    connection: redisConnection,
    concurrency: CONCURRENCY,
  },
);

resourceProcessingWorker.on("completed", (job) => {
  console.log(`[worker] job ${job.id} completed`);
});

resourceProcessingWorker.on("failed", (job, err) => {
  console.error(`[worker] job ${job?.id} failed:`, err.message);
});
