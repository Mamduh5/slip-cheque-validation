# Document Registry Checker

V1 is a duplicate-document registry and checker for paper financial document images. Users sign in, upload or capture an image, and the app stores the original file plus metadata for exact and likely duplicate detection.

This is not real bank verification, OCR-first processing, cheque clearing, or banking integration.

## Current Scope

- Single Next.js web app using TypeScript and App Router.
- MongoDB stores users, document records, and simple audit records.
- MinIO stores original uploaded document images.
- Auth supports email/password and optional Google sign-in.
- Protected dashboard, upload flow, and document result/detail page.
- Exact duplicate detection is implemented using SHA-256 file hashes.
- Near-duplicate detection is implemented using a normalized image derivative and 64-bit dHash.
- Likely duplicates have a separate human review workflow with side-by-side comparison.
- Capture quality assessment records warning signals for small, blurry, dark, or bright images.
- Upload includes a pre-submit image preview with advisory client-side capture hints and a retake/reselect flow.
- Document records and original-image previews are owner-only.
- OCR, QR extraction, cheque parsing, and bank verification are intentionally not implemented yet.

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
npm run test
npm run test:e2e
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
- Uploads compute an exact SHA-256 hash and compare it with existing document records owned by the same user.
- Uploads keep the original file unchanged and store a normalized grayscale WebP derivative for fingerprinting.
- The normalized derivative is auto-oriented, resized to fit within 1024x1024, converted to grayscale, lightly normalized, and encoded as WebP.
- The perceptual hash is 64-bit dHash computed from the normalized derivative. dHash was chosen because it is simple, deterministic, fast, and adequate for a conservative first near-duplicate signal.
- Every upload creates an auditable document record. Exact duplicates are marked `EXACT_DUPLICATE` and linked to the earliest matching document.
- Exact-match selection is deterministic: oldest `createdAt` wins, with `_id` as a stable tie-breaker.
- Likely duplicates are marked `LIKELY_DUPLICATE` when no exact match exists and an owner-owned perceptual hash is within Hamming distance `8`. `similarityScore` is `1 - distance / 64`.
- Machine detection and human review are separate. `duplicateStatus` stores algorithm output; `reviewStatus` stores the user decision.
- Likely duplicates start with `reviewStatus: PENDING`. Users can confirm duplicate or mark not duplicate from the document detail page.
- Reviewed document pairs are remembered owner-by-owner in `duplicate_review_pairs`, so the same exact pair does not keep appearing as unresolved after review.
- Quality assessment is separate from duplicate and review state. Accepted uploads store `qualityStatus`, `qualityWarnings`, `qualityMetrics`, and `qualityCheckedAt`.
- Most quality issues warn and continue. Clearly unusable tiny images are rejected with a capture-quality error before the duplicate pipeline runs.
- Client-side preview hints are advisory only. Server-side validation and quality assessment remain the source of truth.
- If the server rejects a poor-quality image, the upload form keeps the user in a recovery flow so they can retake or choose another image.
- API upload, document detail, and original-image routes require authentication. Missing or non-owned documents return `404` for owner-scoped lookups, so another user's document existence is not exposed.
- TypeScript imports use the `@/*` `paths` alias without `baseUrl`, which avoids relying on deprecated `baseUrl` behavior.

## Verification Coverage

Vitest covers upload and authorization route boundaries for authenticated new uploads, authenticated exact duplicate uploads, likely duplicate outcomes, review actions, reviewed pair memory, dashboard review filtering, quality warnings/failures, upload preview helper behavior, unauthenticated upload rejection, owner-only document access, image normalization, dHash helpers, and deterministic perceptual candidate selection.

Playwright covers the focused browser-critical upload preview path: authenticated `/upload` access through a dev/test-only auth bypass, image preview rendering, retake/reselect replacement, and recovery after a controlled server `422` quality failure. Run it with `npm run test:e2e`.

## Intentionally Not Implemented Yet

- OCR or field extraction.
- QR extraction for slips.
- Cheque verification or clearing integration.
- Admin workflows, profile management, and document deletion.
- Background workers or queue-based processing.

See `docs/` for architecture, roadmap, data model, and task progress notes.
