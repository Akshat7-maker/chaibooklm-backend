import { Server } from "socket.io";
import { prisma } from "../utils/db.js";
import { verifyAccessToken } from "../lib/jwt.js";
import { createAdapter } from "@socket.io/redis-adapter";
import { redisConnection } from "../lib/redis.js";
let io = null;

export async function initSocketServer(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      credentials: true,
    },
  });

  // Redis adapter: lets this Socket.IO instance receive emits
  // published from OTHER processes (like the worker) via Redis pub/sub
  const pubClient = redisConnection.duplicate();
  const subClient = redisConnection.duplicate();
  io.adapter(createAdapter(pubClient, subClient));

  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace("Bearer ", "");

      if (!token) return next(new Error("Unauthorized: no token provided"));

      const payload = await verifyAccessToken(token);
      socket.userId = payload.userId;
      next();
    } catch (err) {
      next(new Error("Unauthorized: invalid token"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`[socket] connected: ${socket.id} (user ${socket.userId})`);

    socket.on("notebook:join", async (notebookId) => {
      if (!notebookId) return;

      const notebook = await prisma.notebook.findFirst({
        where: { id: notebookId, userId: socket.userId },
        select: { id: true },
      });

      if (!notebook) {
        socket.emit("error", { message: "Notebook not found or access denied" });
        return;
      }

      socket.join(`notebook:${notebookId}`);
      socket.emit("notebook:joined", { notebookId });
    });

    socket.on("notebook:leave", (notebookId) => {
      if (!notebookId) return;
      socket.leave(`notebook:${notebookId}`);
    });

    socket.on("disconnect", (reason) => {
      console.log(`[socket] disconnected: ${socket.id} (${reason})`);
    });
  });

  return io;
}

export function getSocketServer() {
  if (!io) {
    throw new Error("Socket server not initialized — call initSocketServer(httpServer) first");
  }
  return io;
}