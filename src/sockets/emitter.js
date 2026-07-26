import { Emitter } from "@socket.io/redis-emitter";
import { redisConnection } from "../lib/redis.js";

const emitter = new Emitter(redisConnection);

export function emitToNotebook(notebookId, event, payload) {
  emitter.to(`notebook:${notebookId}`).emit(event, payload);
}