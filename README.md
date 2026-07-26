#  - Backend

Production-ready backend powering the NotebookLM Clone.

Built with **Bun**, **Express**, **Prisma**, **BullMQ**, **Redis**, **Qdrant**, and **OpenAI**.

The backend is responsible for authentication, notebook management, resource ingestion, AI retrieval, background processing, and real-time updates.

---

# Features

- JWT Authentication
- Notebook Management
- Resource Upload
- Background Processing
- AI Chat
- RAG Pipeline
- Vector Search
- Streaming Responses
- Socket.IO Notifications
- Queue Workers

---

# Tech Stack

Runtime

- Bun

Framework

- Express

Database

- PostgreSQL (Neon)

ORM

- Prisma

Queue

- BullMQ

Queue Backend

- Redis

Vector Database

- Qdrant

AI

- OpenAI

Realtime

- Socket.IO

Validation

- Zod

---

# Architecture

```text
Client

↓

Express API

↓

Prisma

↓

PostgreSQL

↓

BullMQ

↓

Worker

↓

Extractor

↓

Chunker

↓

OpenAI Embeddings

↓

Qdrant

↓

Socket.IO
```

---

# Folder Structure

```text
src/

├── ai/
│
├── config/
│
├── controllers/
│
├── extractors/
│
├── lib/
│
├── middlewares/
│
├── queue/
│
├── routes/
│
├── services/
│
├── sockets/
│
├── utils/
│
├── workers/
│
├── app.ts
│
├── server.ts
│
└── worker.ts

prisma/

uploads/
```

---

# Getting Started

Clone

```bash
git clone <repo-url>

cd backend
```

Install

```bash
bun install
```

---

# Environment Variables

Create

```
.env
```

Example

```env
PORT=5000

DATABASE_URL=

JWT_SECRET=

OPENAI_API_KEY=

REDIS_URL=

QDRANT_URL=

QDRANT_API_KEY=

UPLOAD_DIR=uploads
```

---

# Database

Generate Prisma Client

```bash
bunx prisma generate
```

Run Migrations

```bash
bunx prisma migrate dev
```

---

# Running the Server

Development

```bash
bun run dev
```

Production

```bash
bun run start
```

---

# Running Workers

Workers process long-running tasks independently from the API server.

```bash
bun run worker
```

Workers are responsible for

- PDF Parsing
- Website Extraction
- YouTube Extraction
- DOCX Processing
- Chunking
- Embedding Generation
- Qdrant Indexing

---

# Scripts

```bash
bun run dev
```

Starts API server.

```bash
bun run worker
```

Starts BullMQ worker.

```bash
bun run start
```

Runs production server.

```bash
bunx prisma generate
```

Generates Prisma Client.

```bash
bunx prisma migrate dev
```

Runs database migrations.

---

# API

Authentication

```
POST /auth/register

POST /auth/login
```

---

Notebooks

```
GET /notebooks

POST /notebooks

PATCH /notebooks/:id

DELETE /notebooks/:id
```

---

Resources

```
POST /resources/upload

GET /resources

DELETE /resources/:id
```

---

Chat

```
POST /chat
```

---

# Resource Processing Pipeline

```text
Upload

↓

Create Resource

↓

Queue Job

↓

Worker

↓

Extractor

↓

Chunk

↓

Embeddings

↓

Qdrant

↓

Update Database

↓

Emit Socket Event
```

---

# Supported Resource Types

- PDF
- Website
- YouTube
- DOCX
- TXT
- VTT

---

# RAG Pipeline

```text
User Question

↓

Retrieve Notebook

↓

Vector Search

↓

Top Chunks

↓

OpenAI

↓

Streaming Response
```

Only resources belonging to the selected notebook are searched.

---

# Queue System

BullMQ queues

- Resource Processing
- Embedding Generation
- Summary Generation

Workers can be scaled horizontally.

---

# WebSocket Events

Used for

- Processing Started
- Chunking
- Embedding
- Indexing
- Ready
- Failed

Chat responses use HTTP streaming instead of WebSockets.

---

# Security

Authentication

- JWT

Passwords

- bcrypt

Authorization

Every endpoint validates ownership.

Vector searches always filter by

- userId
- notebookId

to prevent cross-user access.

---

# Scaling

The architecture supports independent scaling of

- API Server
- Workers
- Redis
- Qdrant

Multiple worker instances can process jobs concurrently without affecting API performance.

---

# Deployment

Recommended

- API → Railway / Render / Fly.io
- PostgreSQL → Neon
- Redis → Railway Redis / Upstash
- Qdrant → Qdrant Cloud
- Frontend → Vercel

---

# License

MIT