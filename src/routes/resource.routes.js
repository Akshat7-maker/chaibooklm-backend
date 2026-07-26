import { Router } from "express";
import {
  getResources,
  uploadResource,
  deleteNotebookResources,
  uploadWebResource,
} from "../controllers/resource.controller.js";
import { upload } from "../middlewares/upload.middleware.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const router = Router({ mergeParams: true });

router.use(requireAuth);

router.get("/get-resources", getResources);
router.post("/upload", upload.single("file"), uploadResource);
router.post("/web", uploadWebResource);
router.delete("/:resourceid", deleteNotebookResources);

export default router;
