// extractors/website.extractor.js
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import * as cheerio from "cheerio";

const USER_AGENT =
  "Mozilla/5.0 (compatible; ChatBookLMBot/1.0; +https://chatbooklm.app/bot)";
const FETCH_TIMEOUT_MS = 15000;
const MAX_HTML_BYTES = 10 * 1024 * 1024;

export const websiteExtractor = {
  async extract({ originalUrl }) {
    const html = await fetchHtml(originalUrl);

    const primary = tryReadability(html, originalUrl);
    if (primary) return primary;

    const fallback = tryCheerioHeuristic(html, originalUrl);
    if (fallback) return fallback;

    throw new Error("No extractable content found in resource");
  },
};

function tryReadability(html, originalUrl) {
  try {
    const dom = new JSDOM(html, { url: originalUrl });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article || !article.textContent || article.textContent.trim().length < 50) {
      return null;
    }

    return {
      title: article.title || originalUrl,
      text: article.textContent.trim().replace(/\n{3,}/g, "\n\n"),
      metadata: {
        sourceUrl: originalUrl,
        siteName: article.siteName || "",
        description: article.excerpt || "",
        byline: article.byline || "",
        extractedVia: "readability",
      },
    };
  } catch (err) {
    console.warn(`[website-extractor] readability failed for ${originalUrl}:`, err.message);
    return null;
  }
}

function tryCheerioHeuristic(html, originalUrl) {
  const $ = cheerio.load(html);
  $("script, style, noscript, iframe, svg, nav, footer, header, form, aside").remove();
  $("[aria-hidden='true']").remove();

  const title =
    $("meta[property='og:title']").attr("content")?.trim() ||
    $("title").first().text().trim() ||
    originalUrl;

  const description =
    $("meta[property='og:description']").attr("content")?.trim() ||
    $("meta[name='description']").attr("content")?.trim() ||
    "";

  const siteName = $("meta[property='og:site_name']").attr("content")?.trim() || "";

  const container = $("article").first().length
    ? $("article").first()
    : $("main").first().length
      ? $("main").first()
      : $("body");

  const blocks = [];
  container.find("h1, h2, h3, h4, h5, h6, p, li, blockquote, pre").each((_, el) => {
    const text = $(el).text().replace(/\s+/g, " ").trim();
    if (text) blocks.push(text);
  });

  const text = blocks.length > 0
    ? blocks.join("\n\n")
    : container.text().replace(/\s+/g, " ").trim();

  if (!text || text.length < 50) return null;

  return {
    title,
    text,
    metadata: { sourceUrl: originalUrl, siteName, description, extractedVia: "cheerio-fallback" },
  };
}

async function fetchHtml(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Invalid URL");
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only http/https URLs are supported");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(parsed.toString(), {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html,*/*" },
      redirect: "follow",
      signal: controller.signal,
    });

    if (!res.ok) throw new Error(`Failed to fetch URL (status ${res.status})`);

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) {
      throw new Error(`Unsupported content type: ${contentType || "unknown"}`);
    }

    const contentLength = Number(res.headers.get("content-length") || 0);
    if (contentLength > MAX_HTML_BYTES) throw new Error("Page too large to process");

    return await res.text();
  } finally {
    clearTimeout(timeout);
  }
}