import { z } from "zod";

export const createNotebookSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(1000).optional(),
});

export const updateNotebookSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
});

export const addUrlResourceSchema = z.object({
  url: z.string().url("Must be a valid URL"),
  type: z.enum(["YOUTUBE", "WEBSITE"]),
});