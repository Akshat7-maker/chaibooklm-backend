import fs from "fs/promises";
import path from "path";

const FETCH_TIMEOUT_MS = 15000;
const MAX_BYTES = 10 * 1024 * 1024; // 10MB safety cap

export const txtExtractor = {
  async extract({ storagePath, originalUrl }) {
    const raw = await readTxtContent(storagePath, originalUrl);
    const text = normalizeText(raw);

    if (!text || text.length < 10) {
      throw new Error("No extractable content found in resource");
    }

    return {
      title: deriveTitle(storagePath, originalUrl),
      text,
      metadata: {
        sourceUrl: originalUrl,
        preview: text.slice(0, 280),
      },
    };
  },
};

async function readTxtContent(storagePath, originalUrl) {
  if (storagePath) {
    const buf = await fs.readFile(storagePath);
    if (buf.byteLength > MAX_BYTES) throw new Error("File too large to process");
    return stripBom(buf.toString("utf-8"));
  }

  if (!originalUrl) throw new Error("No storagePath or originalUrl provided");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(originalUrl, { signal: controller.signal });
    if (!res.ok) throw new Error(`Failed to fetch TXT file (status ${res.status})`);

    const contentLength = Number(res.headers.get("content-length") || 0);
    if (contentLength > MAX_BYTES) throw new Error("File too large to process");

    return stripBom(await res.text());
  } finally {
    clearTimeout(timeout);
  }
}

function stripBom(text) {
  return text.replace(/^\uFEFF/, "");
}

function normalizeText(raw) {
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function deriveTitle(storagePath, originalUrl) {
  const source = storagePath || originalUrl || "";
  try {
    const base = source.split("?")[0];
    return decodeURIComponent(path.basename(base)) || source;
  } catch {
    return source;
  }
}