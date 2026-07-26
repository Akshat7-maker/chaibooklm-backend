import { embedTexts } from "./embeddings.js";
import { searchNotebook } from "../vector/qdrant.client.js";
import { contextualizeQuery } from "./contextualize.js";
import { streamAnswer } from "./answer.js";
import { resolveCitations } from "../lib/citations.js";

const TOP_K = 8;

/**
 * Runs the full RAG pipeline: contextualize -> embed -> retrieve -> stream -> cite.
 * Does NOT save to the DB or emit sockets — that stays the caller's job,
 * since this function doesn't know about conversationId/notebookId semantics.
 *
 * Returns null if no relevant chunks were found (caller decides what to do,
 * e.g. save a "couldn't find anything" message instead of calling this at all).
 */
export async function generateAnswer({ question, history, notebookId, userId, resourceIds, onToken }) {
  const searchQuery = await contextualizeQuery(question, history);
  const [queryVector] = await embedTexts([searchQuery]);

  const results = await searchNotebook(queryVector, notebookId, userId, { resourceIds });

  const chunks = results.map((r) => ({
    resourceId: r.payload.resourceId,
    sourceType: r.payload.sourceType,
    text: r.payload.text,
    title: r.payload.title,
    startTime: r.payload.startTime ?? null,
    endTime: r.payload.endTime ?? null,
    page: r.payload.page ?? null,
  }));

  if (chunks.length === 0) return null;

  let fullAnswer = "";
  const chunksUsedInPrompt = await streamAnswer({
    question,
    history,
    chunks,
    onToken: (token) => {
      fullAnswer += token;
      onToken(token);
    },
  });

  const citations = resolveCitations(fullAnswer, chunksUsedInPrompt);
  return { content: fullAnswer, citations };
}