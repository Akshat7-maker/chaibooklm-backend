export function chunkText(text, chunkSize = 1000, overlap = 150, page = null) {
  const chunks = [];
  let start = 0;
  let index = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    const chunk = text.slice(start, end).trim();

    if (chunk.length > 0) {
      chunks.push({
        text: chunk,
        chunkIndex: index,
        ...(page !== null ? { page } : {}),
      });
      index++;
    }

    start += chunkSize - overlap;
  }

  return chunks;
}

/**
 * Chunks a PDF's per-page text array, preserving page numbers
 * and keeping a single global chunkIndex across the whole document.
 */
export function chunkPages(pages, chunkSize = 1000, overlap = 150) {
  const allChunks = [];
  let globalIndex = 0;

  for (const p of pages) {
    if (!p.text.trim()) continue;

    const pageChunks = chunkText(p.text, chunkSize, overlap, p.page);

    for (const chunk of pageChunks) {
      allChunks.push({ ...chunk, chunkIndex: globalIndex });
      globalIndex++;
    }
  }

  return allChunks;
}


export  function chunkTranscripts(cueDocs, chunkSize = 800, chunkOverlap = 100) {
  // Merge consecutive cues into bigger docs with time ranges first
  const merged = [];
  let buffer = "";
  let start = null;
  let end = null;
  let chunkIndex = 0;

  for (const doc of cueDocs) {
    if (start === null) start = doc.start;
    buffer += " " + doc.text;
    end = doc.end;

    if (buffer.length >= chunkSize) {
      merged.push({
        text:buffer.trim(),
        chunkIndex: chunkIndex++,
        start,
        end
      });
      buffer = "";
      start = null;
    }
  }
  if (buffer) {
    merged.push({
      text:buffer.trim(),
      chunkIndex: chunkIndex++,
      start,
      end
    });
  }

  return merged;
}