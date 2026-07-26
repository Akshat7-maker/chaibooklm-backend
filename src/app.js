import express from 'express';
import { config } from './config/index.js';
import apiRouter from './routes/api.js';
import { notFoundHandler, errorHandler } from './middlewares/errorHandler.js';
import {prisma} from './utils/db.js';
import resourceRoutes from "./routes/resource.routes";
import convesationRoutes from "./routes/conversation.route.js";
import messageRoutes from "./routes/message.route.js";
import authRoutes from "./routes/auth.routes.js";
import notebookRoutes from "./routes/notebook.routes.js";
import cookieParser from "cookie-parser";
import cors from "cors";
const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use('/api', apiRouter);
app.use("/auth", authRoutes);
app.use("/notebooks", notebookRoutes);
app.use("/notebooks/:notebookId/resources", resourceRoutes);
app.use("/notebooks/:notebookId/conversations", convesationRoutes);
app.use('/conversations/:conversationId', messageRoutes);
app.use('/resources', resourceRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
