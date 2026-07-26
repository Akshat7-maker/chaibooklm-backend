import {
  createNotebook,
  listNotebooks,
  getNotebookById,
  updateNotebook,
  deleteNotebook,
} from "../services/notebook.service.js";
import { createNotebookSchema, updateNotebookSchema } from "../validators/notebook.validator.js";

export async function create(req, res) {
  const parsed = createNotebookSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0].message });
  }

  try {
    const notebook = await createNotebook({ userId: req.user.id, ...parsed.data });
    return res.status(201).json({ notebook });
  } catch (err) {
    return res.status(500).json({ error: "Failed to create notebook" });
  }
}

export async function list(req, res) {
  const notebooks = await listNotebooks(req.user.id);
  return res.status(200).json({ notebooks });
}

export async function getOne(req, res) {
  try {
    const notebook = await getNotebookById(req.params.id, req.user.id);
    return res.status(200).json({ notebook });
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
}

export async function update(req, res) {
  const parsed = updateNotebookSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0].message });
  }

  try {
    const notebook = await updateNotebook(req.params.id, req.user.id, parsed.data);
    return res.status(200).json({ notebook });
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
}

export async function remove(req, res) {
  try {
    await deleteNotebook(req.params.id, req.user.id);
    return res.status(200).json({ message: "Notebook deleted" });
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
}