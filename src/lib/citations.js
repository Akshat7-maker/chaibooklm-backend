export function resolveCitations(answerText, chunksUsedInPrompt) {
  const usedMarkers = new Set(
    [...answerText.matchAll(/\[(\d+)\]/g)].map((match) => parseInt(match[1], 10)),
  );

  return chunksUsedInPrompt
    .map((chunk, i) => ({ ...chunk, marker: i + 1 }))
    .filter((chunk) => usedMarkers.has(chunk.marker))
    .map((chunk) => ({
      marker: chunk.marker,
      resourceId: chunk.resourceId,
      sourceType: chunk.sourceType,
      title: chunk.title,
      startTime: chunk.startTime ?? null,
      endTime: chunk.endTime ?? null,
      page: chunk.page ?? null,
    }));
}