# Backend

NestJS REST API with Prisma and SQLite.

## Setup

1. Copy `.env.example` to `.env` if `.env` does not exist.
2. Run `npm install`.
3. Run `npm run prisma:generate`.
4. Run `npm run prisma:migrate`.
5. Run `npm run prisma:seed`.
6. Run `npm run start:dev`.

The SQLite database is created at `prisma/dev.db`. No separate database server is required.

Swagger: `http://localhost:3001/api/docs`.

## Video darslar va Gemini

Environment variables (see `.env.example`):

- `UPLOAD_DIR` — where uploaded videos are stored (default `./uploads`, served at `/api/uploads/`).
- `GEMINI_API_KEY` — Google AI Studio key (free tier). Leave empty to disable AI; recommendations then use the rule-based fallback.
- `GEMINI_MODEL` — default `gemini-2.5-flash`; change it if Google retires the model.
- `GEMINI_TIMEOUT_MS` — request timeout, default 8000.

Endpoints: `GET/POST/PATCH/DELETE /api/admin/videos` (admin, multipart for uploads), `GET /api/videos`, `GET /api/videos/recommended`.
