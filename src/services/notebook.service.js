import { prisma } from "../utils/db.js";
import { deleteResourceVectors } from "../vector/qdrant.client.js";
import fs from "fs/promises";

export async function createNotebook({ userId, title, description }) {
  return prisma.notebook.create({
    data: { userId, title, description },
  });
}

export async function listNotebooks(userId) {
  return prisma.notebook.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { resources: true, conversations: true } },
    },
  });
}

export async function getNotebookById(notebookId, userId) {
  const notebook = await prisma.notebook.findFirst({
    where: { id: notebookId, userId },
    include: {
      resources: { orderBy: { createdAt: "desc" } },
      _count: { select: { conversations: true } },
    },
  });

  if (!notebook) {
    const err = new Error("Notebook not found");
    err.status = 404;
    throw err;
  }

  return notebook;
}

export async function updateNotebook(notebookId, userId, data) {
  const result = await prisma.notebook.updateMany({
    where: { id: notebookId, userId },
    data,
  });

  if (result.count === 0) {
    const err = new Error("Notebook not found");
    err.status = 404;
    throw err;
  }

  return prisma.notebook.findUnique({ where: { id: notebookId } });
}

export async function deleteNotebook(notebookId, userId) {
  const notebook = await prisma.notebook.findFirst({
    where: { id: notebookId, userId },
    include: { resources: true },
  });

  if (!notebook) {
    const err = new Error("Notebook not found");
    err.status = 404;
    throw err;
  }

  // Clean up Qdrant vectors for every resource in this notebook first —
  // once the Prisma cascade delete runs, we lose the resourceIds needed to target them
  for (const resource of notebook.resources) {
    await deleteResourceVectors(resource.id).catch((err) =>
      console.error(`[notebook] failed to delete vectors for resource ${resource.id}:`, err)
    );

    if (resource.storagePath) {
      await fs.unlink(resource.storagePath).catch(() => {}); // best-effort file cleanup
    }
  }

  await prisma.notebook.delete({ where: { id: notebookId } });

  return { success: true };
}