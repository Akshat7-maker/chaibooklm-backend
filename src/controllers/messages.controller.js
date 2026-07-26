import { generateAnswer } from "../ai/generate-answer";
import { getConversationMessages } from "../services/message.service";
import { emitToNotebook } from "../sockets/emitter";
import { prisma } from "../utils/db";

export async function getMessages(req, res) {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    const messages = await getConversationMessages(conversationId);

    return res.status(200).json({ messages });
  } catch (error) {
    console.error("Error getting messages:", error);
    return res.status(500).json({ error: "Failed to get messages" });
  }
}

export async function Chat(req, res) {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    const { question, resourceIds } = req.body;
    console.log("question", question, "resourceIds", resourceIds);

    if (!question || !question.trim()) {
      return res.status(400).json({ error: "Question is required" });
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });
    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    const userMessage = await prisma.message.create({
      data: {
        conversationId,
        role: "USER",
        content: question,
      },
    });
    emitToNotebook(conversation.notebookId, "message:new", {
      conversationId,
      message: userMessage,
    });
    res.status(202).json({ status: "accepted" });

    generateAssistantReply({
      notebookId: conversation.notebookId,
      conversationId,
      question,
      resourceIds,
      userId: userId,
    });
  } catch (error) {
    console.error("Error getting messages:", error);
    return res.status(500).json({ error: "Failed to get messages" });
  }
}

async function generateAssistantReply({
  notebookId,
  conversationId,
  question,
  resourceIds,
  userId
}) {
  try {
    const history = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "desc" },
      take: 6,
    });

    const result = await generateAnswer({
      question,
      history: history.reverse(),
      notebookId,
      resourceIds,
      userId,
      onToken: (token) =>
        emitToNotebook(notebookId, "answer:token", { conversationId, token }),
    });

    const assistantMessage = await prisma.message.create({
      data: {
        conversationId,
        role: "ASSISTANT",
        content:
          result?.content ??
          "I couldn't find anything relevant in this notebook's sources to answer that.",
        citations: result?.citations ?? [],
      },
    });

    emitToNotebook(notebookId, "answer:done", {
      conversationId,
      message: assistantMessage,
    });
  } catch (error) {
    console.error(
      `[chat] failed generating answer for conversation ${conversationId}:`,
      error,
    );
    emitToNotebook(notebookId, "answer:error", {
      conversationId,
      error: "Failed to generate an answer",
    });
  }
}
