import { QdrantClient } from "@qdrant/js-client-rest";

const COLLECTION_NAME = "knowledge";

export const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL || "http://localhost:6333",
  apiKey: process.env.QDRANT_API_KEY,
});

export async function ensureCollection() {
  const collections = await qdrant.getCollections();
  const exists = collections.collections.some((c) => c.name === COLLECTION_NAME);

  if (!exists) {
    await qdrant.createCollection(COLLECTION_NAME, {
      vectors: { size: 1536, distance: "Cosine" }, // text-embedding-3-small
    });
    console.log(`[qdrant] created collection "${COLLECTION_NAME}"`);
  }
}

export async function upsertChunks(points) {
  return qdrant.upsert(COLLECTION_NAME, {
    wait: true,
    points,
  });
}

export async function deleteResourceVectors(resourceId) {
  return qdrant.delete(COLLECTION_NAME, {
    filter: {
      must: [{ key: "resourceId", match: { value: resourceId } }],
    },
  });
}

export async function searchNotebook(vector, notebookId, userId, { limit = 8, resourceIds } = {}) {
  const must = [
    { key: "notebookId", match: { value: notebookId } },
    { key: "userId", match: { value: userId } },
  ];

  if (resourceIds?.length) {
    must.push({ key: "resourceId", match: { any: resourceIds } });
  }

  return qdrant.search(COLLECTION_NAME, {
    vector,
    limit,
    filter: { must },
    with_payload: true,
  });
}

export { COLLECTION_NAME };