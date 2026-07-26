import {
  resourceProcessingQueue,
  youtubeProcessingQueue,
  websiteUrlProcessingQueue,
} from "../queue/queues.js";
import { resolveResourceType } from "../middlewares/upload.middleware.js";
import { prisma } from "../utils/db.js";
import { deleteResourceVectors } from "../vector/qdrant.client.js";

// !create resource from upload file
export async function createResourceFromUpload({ notebookId, userId, file }) {
  // Ownership check — never trust notebookId blindly
  const notebook = await prisma.notebook.findFirst({
    where: { id: notebookId, userId },
  });

  if (!notebook) {
    throw new Error("Notebook not found or access denied");
  }

  const resourceType = resolveResourceType(file.mimetype);

  const resource = await prisma.resource.create({
    data: {
      notebookId,
      title: file.originalname,
      type: resourceType,
      status: "UPLOADING",
      storagePath: file.path,
      mimeType: file.mimetype,
      fileSize: file.size,
      progress: 0,
      currentStep: "queued",
    },
  });

  await resourceProcessingQueue.add(
    "process-resource",
    {
      resourceId: resource.id,
      notebookId,
      userId,
      resourceType,
      storagePath: resource.storagePath,
    },
    {
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
    },
  );

  // Flip to PROCESSING now that the job is queued
  const updated = await prisma.resource.update({
    where: { id: resource.id },
    data: { status: "PROCESSING", currentStep: "waiting-for-worker" },
  });

  return updated;
}

// !create resource from url
export async function createResourceFromUrl({ notebookId, userId, url, type }) {
  // Ownership check — never trust notebookId blindly
  const notebook = await prisma.notebook.findFirst({
    where: { id: notebookId, userId },
  });

  if (!notebook) {
    throw new Error("Notebook not found or access denied");
  }

  if (!["YOUTUBE", "WEBSITE"].includes(type)) {
    throw new Error("Invalid resource type");
  }
  // ! creare resource
  const resource = await prisma.resource.create({
    data: {
      notebookId,
      title: url, // placeholder — worker updates this with real title once extracted
      type,
      status: "UPLOADING",
      originalUrl: url,
      progress: 0,
      currentStep: "queued",
    },
  });

  // ! add to queue

  await youtubeProcessingQueue.add(
    "youtube-processing",
    {
      resourceId: resource.id,
      notebookId,
      userId,
      url,
      type,
    },
    {
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
    },
  );

  const updated = await prisma.resource.update({
    where: { id: resource.id },
    data: { status: "PROCESSING", currentStep: "waiting-for-worker" },
  });

  return updated;
}

// ! get all resources for notebook
export async function getNotebookResources(notebookId) {
  return prisma.resource.findMany({ where: { notebookId } });
}

// ! delete resource
export async function deleteResource(notebookId, userId, resourceId) {
  const resource = await prisma.resource.findFirst({
    where: {
      id: resourceId,
      notebookId,
      notebook: {
        userId,
      },
    },
    select: {
      id: true,
    },
  });

  if (!resource) {
    throw new Error("Resource not found or access denied");
  }

  await prisma.resource.delete({
    where: {
      id: resource.id,
    },
  });

  // delete vectors form vector db
  await deleteResourceVectors(resource.id);
}
