import { prisma } from "../utils/db";

// ! get all messages for conversation
export async function getConversationMessages(conversationId) {
  return prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
  });
}
