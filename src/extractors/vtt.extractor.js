import fs from "fs";
import webvtt from "node-webvtt";

export const vttExtractor = {
  async extract({ storagePath }) {
    if (!storagePath) {
      throw new Error("VTT extractor requires a storagePath");
    }

    const raw = fs.readFileSync(storagePath, "utf8");
    const { cues } = webvtt.parse(raw);

    const segments = cues.map((cue) => ({
      text: cue.text,
      start: cue.start,
      duration: cue.end - cue.start,
      end: cue.end,
    }));

    return { segments };
  },
};
