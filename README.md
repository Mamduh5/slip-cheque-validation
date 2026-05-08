# Document Registry Checker

V1 is a duplicate-document registry and checker scaffold for paper financial document images. Users sign in, upload or capture an image, and the app stores the original file plus metadata for later duplicate detection.

This is not real bank verification, OCR-first processing, cheque clearing, or banking integration.

## Current Scope

- Single Next.js web app using TypeScript and App Router.
- MongoDB stores users, document records, and simple audit records.
- MinIO stores original uploaded document images.
- Auth supports email/password and optional Google sign-in.
- Protected dashboard, upload flow, and document result/detail page.
- Duplicate detection fields exist, but matching is intentionally not implemented yet.

## Run Locally With Docker

1. Create an env file:

```bash
cp .env.example .env
```

2. Set `NEXTAUTH_SECRET` to a long random value.

3. Start the stack:

```bash
docker compose up --build
```

4. Open:

- App: `http://localhost:3000`
- MinIO console: `http://localhost:9001`

Default local MinIO credentials are `minioadmin` / `minioadmin` unless changed in `.env`.

## Local Commands

```bash
npm install
npm run dev
npm run typecheck
npm run lint
npm run build
```

For non-Docker local development, set `MONGODB_URI` and MinIO values to reachable local services.

## Environment Variables

- `NEXT_PUBLIC_APP_NAME`: display name.
- `NEXTAUTH_URL`: local app URL, usually `http://localhost:3000`.
- `NEXTAUTH_SECRET`: required for stable sessions.
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: optional OAuth credentials.
- `MONGODB_URI`, `MONGODB_DB`: MongoDB connection.
- `MINIO_ENDPOINT`, `MINIO_PORT`, `MINIO_USE_SSL`: MinIO connection.
- `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET`: object storage credentials and bucket.
- `MAX_UPLOAD_MB`: upload size limit.

## Architecture Choices

- One web app for v1. No separate backend or microservices.
- MongoDB native driver keeps data access explicit and small.
- NextAuth uses JWT sessions, with MongoDB user records created for credentials and Google auth.
- MinIO bucket creation is lazy: the upload service creates the configured bucket if it does not exist.
- Uploads compute an exact SHA-256 hash now, but duplicate decisions remain `NOT_CHECKED`.

## Intentionally Not Implemented Yet

- Real duplicate matching.
- OCR or field extraction.
- QR extraction for slips.
- Cheque verification or clearing integration.
- Admin workflows, profile management, and document deletion.
- Background workers or queue-based processing.

See `docs/` for architecture, roadmap, data model, and task progress notes.
