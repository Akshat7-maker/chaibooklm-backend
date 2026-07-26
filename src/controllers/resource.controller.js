import {
  createResourceFromUpload,
  getNotebookResources,
  deleteResource,
  createResourceFromUrl,
} from "../services/resource.service.js";
import fs from "fs";

// !upload file
export async function uploadResource(req, res) {
  const file = req.file;
  const { notebookId } = req.params;
  const userId = req.user.id; // from auth middleware

  if (!file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  if (!notebookId) {
    fs.unlinkSync(file.path); // clean up orphaned file
    return res.status(400).json({ error: "notebookId is required" });
  }

  try {
    const resource = await createResourceFromUpload({
      notebookId,
      userId,
      file,
    });

    return res.status(201).json({
      resource: {
        id: resource.id,
        title: resource.title,
        type: resource.type,
        status: resource.status,
        progress: resource.progress,
      },
    });
  } catch (err) {
    fs.unlinkSync(file.path); // don't leave orphaned files on failure

    if (err.message.includes("access denied")) {
      return res.status(403).json({ error: err.message });
    }

    console.error("Upload failed:", err);
    return res.status(500).json({ error: "Failed to process upload" });
  }
}

// !uplaod web resource
export async function uploadWebResource(req, res) {
  const userId = req.user.id;
  const { notebookId } = req.params;
  const { url, type } = req.body;

  try {
    const resource = await createResourceFromUrl({
      notebookId,
      userId,
      url,
      type,
    });
    return res.status(201).json({
      resource: {
        id: resource.id,
        title: resource.title,
        type: resource.type,
        status: resource.status,
        progress: resource.progress,
      },
    });
  } catch (err) {
    console.error("Error creating resource:", err);
    return res.status(500).json({ error: "Failed to create resource" });
  }
}

// fetch all resources form notebook
export async function getResources(req, res) {
  try {
    const resources = await getNotebookResources(req.params.notebookId);
    return res.status(200).json({ resources });
  } catch (err) {
    console.error("Error fetching resources:", err);
    return res.status(500).json({ error: "Failed to fetch resources" });
  }
}

// delete resources
export async function deleteNotebookResources(req, res) {
  try {
    const { resourceid, notebookId } = req.params;
    await deleteResource(notebookId, req.user.id, resourceid);
    return res.status(200).json({ message: "Resource deleted successfully" });
  } catch (err) {
    console.error("Error deleting resource:", err);
    return res.status(500).json({ error: "Failed to delete resource" });
  }
}
