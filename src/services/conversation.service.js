import { prisma } from "../utils/db.js";

// ! create conversation

export async function createConversation({ notebookId, title = "New Conversation" }) {
  // ! check if notebook exists
  const notebook = await prisma.notebook.findFirst({
    where: { id: notebookId },
  });

  if (!notebook) {
    throw new Error("Notebook not found");
  }

  // ! create conversation
  const conversation = await prisma.conversation.create({
    data: { notebookId, title },
  });

  return conversation;
}


// ! get all conversations for notebook

export async function getNotebookAllConversations(notebookId) {
  return prisma.conversation.findMany({ where: { notebookId } });
}

// ! get latest conversation for notebook

export async function getNotebookLatestConversation(notebookId) {
  return prisma.conversation.findFirst({
    where: { notebookId },
    orderBy: { createdAt: "desc" },
  });
}
