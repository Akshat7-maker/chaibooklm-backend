import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { create, list, getOne, update, remove } from "../controllers/notebook.controller.js";

const router = Router();

router.use(requireAuth); // every notebook route requires auth

router.post("/", create);
router.get("/", list);
router.get("/:id", getOne);
router.patch("/:id", update);
router.delete("/:id", remove);

export default router;