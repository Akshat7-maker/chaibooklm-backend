import { pdfExtractor } from "./pdf.extractor.js";
import { websiteExtractor } from "./website.extractor.js";
import { youtubeExtractor } from "./youtube.extractor.js";

export const extractorRegistry = {
  PDF: pdfExtractor,
  YOUTUBE: youtubeExtractor,
    WEBSITE: websiteExtractor,
  //   VTT: vttExtractor,
  //   DOCX: docxExtractor,
};

export function getExtractor(resourceType) {
  const extractor = extractorRegistry[resourceType];
  if (!extractor) {
    throw new Error(
      `No extractor registered for resource type: ${resourceType}`,
    );
  }
  return extractor;
}
