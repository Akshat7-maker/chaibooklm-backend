# NotebookLM Clone - Architecture

> A production-ready AI knowledge workspace built with Next.js, Bun, Express, PostgreSQL, Qdrant, BullMQ, and Redis.

---

# Table of Contents

1. Vision
2. Goals
3. High Level Architecture
4. Technology Stack
5. Project Structure
6. Database Design
7. Vector Database Design
8. Resource Processing Pipeline
9. Chat Pipeline (RAG)
10. WebSocket Architecture
11. Queue System
12. Extractor Architecture
13. Data Flow
14. API Design
15. Security
16. Future Improvements

---

# Vision

This project aims to build an application similar to Google's NotebookLM.

Instead of being a simple "Chat with PDF" application, users can create notebooks that contain multiple knowledge sources.

Examples:

* PDF
* YouTube Videos
* Websites
* VTT Files
* DOCX
* TXT
* Audio (future)

The AI should answer questions using **only the resources inside the selected notebook**.

---

# Goals

* Multiple notebooks per user
* Multiple resource types
* Fast ingestion pipeline
* Production-ready RAG architecture
* Real-time processing updates
* Streaming AI responses
* Scalable architecture
* Clean separation of responsibilities

---

# High Level Architecture

```text
                   Browser
                      │
         ┌────────────┴────────────┐
         │                         │
         ▼                         ▼
     Next.js UI              Socket.IO Client
         │                         ▲
         │ REST API                │
         ▼                         │
           Bun + Express Backend
                    │
        ┌───────────┼────────────┐
        │           │            │
        ▼           ▼            ▼
   PostgreSQL     Redis      BullMQ Queue
                                   │
                                   ▼
                             Worker Process
                                   │
                    ┌──────────────┴─────────────┐
                    │                            │
                    ▼                            ▼
               Qdrant                     OpenAI APIs
```

---

# Technology Stack

## Frontend

* Next.js
* React
* TypeScript
* Tailwind CSS
* Socket.IO Client

Responsibilities:

* Authentication
* Dashboard
* Notebook UI
* Upload UI
* Chat Interface
* Resource Management

---

## Backend

Runtime

* Bun

Framework

* Express

Responsibilities

* REST APIs
* Authentication
* File Upload
* Resource Management
* Chat API
* Queue Creation
* WebSocket Server

---

## Database

PostgreSQL

Stores application data.

Never stores embeddings.

---

## Vector Database

Qdrant

Stores

* Embeddings
* Chunk text
* Metadata

---

## Queue

BullMQ

Responsible for

* PDF Processing
* Website Processing
* YouTube Processing
* Embedding Creation
* Indexing

---

## Cache / Queue Backend

Redis

Used by

* BullMQ
* Future caching
* Pub/Sub (optional)

---

## AI

OpenAI

Used for

* Embeddings
* Chat Completion

---

# Why This Architecture?

Heavy operations like:

* PDF Parsing
* Chunking
* Embedding Creation

can take several seconds.

Instead of blocking the API:

```text
Upload

↓

Wait 30 seconds

↓

Response
```

we do

```text
Upload

↓

Create Job

↓

Return immediately

↓

Worker processes in background
```

This provides a much better user experience.

---

# Project Structure

```text
notebooklm/

├── frontend/
│
│   ├── app/
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   └── types/
│
├── backend/
│
│   ├── src/
│   │
│   ├── controllers/
│   ├── routes/
│   ├── middleware/
│   ├── services/
│   ├── extractors/
│   ├── queue/
│   ├── workers/
│   ├── sockets/
│   ├── ai/
│   ├── vector/
│   ├── lib/
│   ├── app.ts
│   └── server.ts
│
│   └── prisma/
│
└── docs/
```

---

# Database Design

PostgreSQL stores application state.

## User

Stores authentication information.

Relationships

```
User

↓

Many Notebooks
```

Fields

* id
* name
* email
* password

---

## Notebook

Represents a workspace.

Relationships

```
Notebook

├── Resources

├── Conversations

└── Summaries
```

Fields

* title
* description

---

## Resource

Represents every uploaded source.

Examples

* PDF
* YouTube
* Website
* VTT

Fields

* title
* type
* status
* progress
* currentStep
* storagePath
* originalUrl
* indexedAt

Status lifecycle

```
UPLOADING

↓

PROCESSING

↓

READY
```

or

```
FAILED
```

---

## Conversation

Each notebook can have multiple conversations.

```
Notebook

↓

Conversation

↓

Messages
```

---

## Message

Stores

* User prompts
* AI responses

Each assistant message may include citations.

---

## Summary

Stores notebook-level AI generated summaries.

---

# Why We Don't Store Chunks in PostgreSQL

Chunks already exist inside Qdrant.

Duplicating them would create:

* extra storage
* synchronization problems
* unnecessary complexity

PostgreSQL stores metadata.

Qdrant stores semantic knowledge.

---

# Qdrant Design

One collection

```
knowledge
```

Not

```
pdf_collection

youtube_collection

website_collection
```

Everything lives together.

Filtering happens using metadata.

Example payload

```json
{
  "resourceId": "...",
  "userId": "...",
  "notebookId": "...",
  "sourceType": "PDF",
  "chunkIndex": 1,
  "page": 12,
  "text": "..."
}
```

---

# Resource Processing Pipeline

## Upload

```
User

↓

Upload PDF
```

---

## API

```
Express

↓

Save File

↓

Create Resource Record

↓

Queue Job

↓

Return Response
```

---

## Worker

```
Read Resource

↓

Choose Extractor

↓

Extract Text

↓

Chunk

↓

Embeddings

↓

Store in Qdrant

↓

Update PostgreSQL

↓

Emit Socket Event
```

---

# Extractor Architecture

Every resource type implements the same interface.

```
Extractor

↓

extract()

↓

Returns Text
```

Implementations

```
PDFExtractor

YouTubeExtractor

WebsiteExtractor

VTTExtractor

DOCXExtractor
```

Each returns the same normalized structure.

```ts
{
    title: "...",
    content: "...",
    metadata: {}
}
```

This allows the rest of the pipeline to remain unchanged regardless of source type.

---

# Chunking

All extractors eventually produce plain text.

```
Text

↓

Chunker

↓

Chunk 1

Chunk 2

Chunk 3
```

Chunking is completely independent of source type.

---

# Embedding

Every chunk becomes

```
Chunk

↓

Embedding Model

↓

Vector
```

---

# Vector Storage

Each vector contains

* embedding
* text
* metadata

Metadata

```
userId

notebookId

resourceId

chunkIndex

page

sourceType
```

---

# Chat (RAG) Pipeline

```
User Question

↓

Express

↓

Retrieve Notebook ID

↓

Search Qdrant

↓

Top K Chunks

↓

OpenAI

↓

Answer

↓

Stream Response
```

The LLM never searches all documents.

It only searches resources inside the current notebook.

---

# WebSocket Architecture

WebSockets are **not** used for chat.

Chat uses streaming HTTP responses.

WebSockets are used for

* upload progress
* processing updates
* notifications

Example

```
PROCESSING

↓

EMBEDDING

↓

INDEXING

↓

READY
```

The frontend updates immediately.

---

# Queue System

BullMQ is responsible for long-running jobs.

Queues

```
resource-processing

youtube-processing

embedding

summary-generation
```

Workers consume jobs independently from the API.

---

# Data Flow

## Upload

```
Browser

↓

Next.js

↓

Express

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

PostgreSQL Update

↓

Socket.IO

↓

Browser
```

---

## Chat

```
Browser

↓

Next.js

↓

Express

↓

Qdrant Search

↓

OpenAI

↓

Streaming Response

↓

Browser
```

---

# API Design

Authentication

```
POST /auth/register

POST /auth/login
```

Notebook

```
GET /notebooks

POST /notebooks

PATCH /notebooks/:id

DELETE /notebooks/:id
```

Resources

```
POST /resources/upload

GET /resources

DELETE /resources/:id
```

Chat

```
POST /chat
```

---

# Security

Authentication

* JWT

Passwords

* bcrypt

Authorization

Every request validates ownership.

Users can only access

* their notebooks
* their conversations
* their resources

Qdrant searches always filter by

```
userId

AND

notebookId
```

to prevent cross-user data leakage.

---

# Future Improvements

* OCR support
* Image understanding
* Audio transcription
* Collaborative notebooks
* Notebook sharing
* Background summary generation
* Hybrid search (BM25 + Vector Search)
* Re-ranking
* Agentic workflows
* Notebook versioning
* Semantic caching
* Usage analytics
* Citation highlighting
* Multi-model support
* Document comparison
* Multi-tenant architecture
* Horizontal worker scaling

---

# Design Principles

This architecture follows a few important principles:

1. **Single Responsibility** — APIs, workers, vector storage, and the frontend each have a clearly defined role.
2. **Asynchronous Processing** — Heavy ingestion tasks run in background workers so API responses remain fast.
3. **Scalability** — Workers can be scaled independently of the API server.
4. **Extensibility** — New resource types can be added by implementing another extractor without changing the rest of the pipeline.
5. **Separation of Data** — PostgreSQL stores application state, while Qdrant stores semantic knowledge.
6. **Real-Time User Experience** — WebSockets provide live ingestion updates, while chat responses are streamed for responsiveness.

The result is a modular, production-oriented architecture that is easy to maintain, extend, and scale as new AI capabilities are introduced.
