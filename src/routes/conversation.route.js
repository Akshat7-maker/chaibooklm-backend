import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { getOrCreateConversation } from "../controllers/conversation.controoler.js";

const router = Router({ mergeParams: true });

router.use(requireAuth)

router.get("/current", requireAuth, getOrCreateConversation);

export default router;