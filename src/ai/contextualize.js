import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.OPENAI_CONTEXTUALIZE_MODEL || "gpt-4o-mini"; // small/fast — this is just query rewriting

export async function contextualizeQuery(question, history) {
  if (!history || history.length === 0) return question;

  const recentTurns = history
    .slice(-4)
    .map((m) => `${m.role.toLowerCase()}: ${m.content}`)
    .join("\n");

  const response = await openai.chat.completions.create({
    model: MODEL,
    max_tokens: 100,
    messages: [
      {
        role: "system",
        content:
          "Rewrite the user's latest question into a standalone question that makes sense without the conversation history, by resolving pronouns and implicit references. If the question is already standalone, return it unchanged. Return ONLY the rewritten question, nothing else.",
      },
      {
        role: "user",
        content: `Conversation so far:\n${recentTurns}\n\nLatest question: ${question}\n\nStandalone version:`,
      },
    ],
  });

  const rewritten = response.choices[0]?.message?.content?.trim();
  return rewritten || question; // fall back to the original if something goes wrong
}