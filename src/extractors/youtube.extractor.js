// extractors/youtube.extractor.js
import { YoutubeTranscript } from "youtube-transcript";

function extractVideoId(url) {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/,
  );
  if (!match) throw new Error("Invalid YouTube URL");
  return match[1];
}

async function fetchVideoTitle(videoId) {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.title || null;
  } catch {
    return null;
  }
}

export const youtubeExtractor = {
  async extract({ originalUrl }) {
    const videoId = extractVideoId(originalUrl);

    const rawSegments = await YoutubeTranscript.fetchTranscript(videoId);
    if (!rawSegments?.length) {
      throw new Error("No transcript available for this video");
    }

    const segments = rawSegments.map((s) => ({
      text: s.text,
      start: s.offset / 1000, // seconds
      duration: s.duration / 1000,
      end: (s.offset + s.duration) / 1000,
    }));

    const title = await fetchVideoTitle(videoId);

    return {
      title,
      segments, // <-- new shape, distinct from `pages`/`content`
      metadata: { videoId, sourceType: "YOUTUBE", url: originalUrl, title },
    };
  },
};
