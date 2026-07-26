import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.OPENAI_CHAT_MODEL || "gpt-4o";
const MAX_CONTEXT_TOKENS = 3000;

export async function streamAnswer({ question, history, chunks, onToken }) {
  const budgeted = fitToTokenBudget(chunks, MAX_CONTEXT_TOKENS);
  const context = buildContext(budgeted);

  const systemPrompt = `You answer questions using only the numbered sources below. Cite claims inline using [n] matching the source number. Multiple sources can support one claim: [1][3]. If the sources don't contain the answer, say so directly — do not guess or use outside knowledge.

<sources>
${context}
</sources>`;

  const messages = [
    { role: "system", content: systemPrompt },
    ...history.map((m) => ({
      role: m.role.toLowerCase(), // "user" | "assistant"
      content: m.content,
    })),
    { role: "user", content: question },
  ];

  const stream = await openai.chat.completions.create({
    model: MODEL,
    messages,
    max_tokens: 1024,
    stream: true,
  });

  for await (const chunk of stream) {
    const token = chunk.choices[0]?.delta?.content;
    if (token) onToken(token);
  }

  // Return which chunks actually made it into the prompt, so citation
  // resolution numbers against the same set the model actually saw
  return budgeted;
}

function fitToTokenBudget(chunks, maxTokens) {
  const kept = [];
  let tokenCount = 0;

  for (const chunk of chunks) {
    const estimatedTokens = Math.ceil(chunk.text.length / 4); // rough char-to-token estimate
    if (tokenCount + estimatedTokens > maxTokens) break;
    tokenCount += estimatedTokens;
    kept.push(chunk);
  }

  return kept;
}

function buildContext(chunks) {
  return chunks
    .map((chunk, i) => formatChunk(chunk, i + 1))
    .join("\n\n---\n\n");
}

function formatChunk(chunk, marker) {
  const location =
    chunk.sourceType === "YOUTUBE" || chunk.sourceType === "VTT"
      ? `at ${formatTimestamp(chunk.startTime)}`
      : chunk.sourceType === "PDF"
        ? `page ${chunk.page}`
        : "";

  const locationSuffix = location ? `, ${location}` : "";

  return `[${marker}] Source: "${chunk.title || "Untitled"}" (${chunk.sourceType}${locationSuffix})\n${chunk.text}`;
}

function formatTimestamp(seconds) {
  if (seconds == null) return "";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}