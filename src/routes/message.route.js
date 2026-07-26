import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { Chat, getMessages } from "../controllers/messages.controller.js";

const messagesRouter = Router({ mergeParams: true });

messagesRouter.use(requireAuth)

messagesRouter.get("/messages", requireAuth, getMessages);
messagesRouter.post("/chat", requireAuth, Chat);

export default messagesRouter;