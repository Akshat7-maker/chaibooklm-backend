import fs from "node:fs/promises";
import { PDFParse } from "pdf-parse";

export const pdfExtractor = {
  async extract({ storagePath }) {
    if (!storagePath) {
      throw new Error("PDF extractor requires a storagePath");
    }

    const buffer = await fs.readFile(storagePath);

    const parser = new PDFParse({
      data: new Uint8Array(buffer),
    });

    try {
      const result = await parser.getText();

      const pages =
        result.pages?.map((page, index) => ({
          page: index + 1,
          text: page.text ?? "",
        })) ?? [];

      return {
        title: result.info?.Title ?? null,
        content: result.text.trim(),
        metadata: {
          pageCount: result.total ?? pages.length,
          pdfInfo: result.info ?? {},
        },
        pages,
      };
    } finally {
      await parser.destroy();
    }
  },
};