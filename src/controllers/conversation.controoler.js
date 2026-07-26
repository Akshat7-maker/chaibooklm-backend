import {
  createConversation,
  getNotebookLatestConversation,
} from "../services/conversation.service";
import { prisma } from "../utils/db";

export async function getOrCreateConversation(req, res) {
  try {
    const { notebookId } = req.params;
    const userId = req.user.id;

    const notebook = await prisma.notebook.findFirst({
      where: { id: notebookId, userId },
    });

    if (!notebook) {
      return res.status(404).json({ error: "Notebook not found" });
    }

    // get latest conversation for notebook
    const latestConvo = await getNotebookLatestConversation(notebookId);

    if (latestConvo) {
      return res.status(200).json({ conversation: latestConvo });
    }

    // create conversation
    const conversation = await createConversation({ notebookId });

    return res.status(200).json({ conversation });
  } catch (error) {
    console.error("Error creating conversation:", error);
    return res.status(500).json({ error: "Failed to create conversation" });
  }
}
