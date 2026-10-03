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
