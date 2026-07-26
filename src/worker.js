import "dotenv/config";
import { resourceProcessingWorker } from "./workers/resource-processing.worker.js";
import { youtubeProcessingWorker } from "./workers/youtube.worker.js";
// import { websiteProcessingWorker } from "./workers/website.worker.js";
import { ensureCollection } from "./vector/qdrant.client.js";

const workers = [
  resourceProcessingWorker,
  youtubeProcessingWorker,
  // websiteProcessingWorker,
];

async function main() {
  await ensureCollection();
  console.log(
    "[worker] started:",
    workers.map((w) => w.name).join(", ")
  );
}

main();

async function shutdown() {
  console.log("[worker] shutting down...");
  await Promise.all(workers.map((w) => w.close()));
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);