# ChaibookLM Backend

A Bun-powered Express.js backend scaffold with production-ready folder layout.

## Quick start

1. Install dependencies:
   ```bash
   bun install
   ```
2. Copy environment variables:
   ```bash
   cp .env.example .env
   ```
3. Start the server:
   ```bash
   bun run src/index.js
   ```

## Structure

- `src/` - application source code
- `src/routes/` - route definitions
- `src/controllers/` - request handlers
- `src/services/` - business logic
- `src/middlewares/` - middleware for error handling, logging, and validation
- `src/config/` - shared configuration
- `src/utils/` - reusable utilities

## Environment

This project is built for Bun and uses `Bun.env` for configuration.
