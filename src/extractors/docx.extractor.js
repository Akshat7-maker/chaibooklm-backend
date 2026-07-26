import fs from "fs/promises";
import mammoth from "mammoth";
import path from "path";

const FETCH_TIMEOUT_MS = 15000;
const MAX_BYTES = 25 * 1024 * 1024; // 25MB safety cap

export const docxExtractor = {
  async extract({ storagePath, originalUrl }) {
    const buffer = await readDocxBuffer(storagePath, originalUrl);

    const result = await mammoth.extractRawText({ buffer });
    const text = (result.value || "").replace(/\n{3,}/g, "\n\n").trim();

    if (result.messages?.length) {
      const warnings = result.messages.filter((m) => m.type === "warning");
      if (warnings.length) {
        console.warn(
          `[docx-extractor] ${warnings.length} warning(s) extracting ${storagePath || originalUrl}:`,
          warnings.map((w) => w.message).join("; "),
        );
      }
    }

    if (!text || text.length < 20) {
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

async function readDocxBuffer(storagePath, originalUrl) {
  if (storagePath) {
    const buf = await fs.readFile(storagePath);
    if (buf.byteLength > MAX_BYTES) throw new Error("File too large to process");
    return buf;
  }

  if (!originalUrl) throw new Error("No storagePath or originalUrl provided");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(originalUrl, { signal: controller.signal });
    if (!res.ok) throw new Error(`Failed to fetch DOCX file (status ${res.status})`);

    const contentLength = Number(res.headers.get("content-length") || 0);
    if (contentLength > MAX_BYTES) throw new Error("File too large to process");

    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } finally {
    clearTimeout(timeout);
  }
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