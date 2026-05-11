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
- Pre-submit upload preview with advisory client-side capture hints.
- Lightweight framing guidance for paper-document photos.
- Staged upload progress indicator showing "Uploading image…", "Processing document…", and "Finalizing result…" states with disabled submit to prevent duplicate uploads.
- Post-upload result summary on the document detail page derived from stored fields: duplicate outcome, review status, quality warnings, and transfer-slip processing stage results. The summary is redirect-safe and refresh-safe because it reads the persisted document record.
- Duplicate-decision transparency: the document detail page shows a dedicated "Duplicate decision" card that explains exactly why a document was marked as exact duplicate, likely duplicate, new upload, or suppressed near-duplicate. For suppressed transfer-slip near-duplicates, the card shows which structured differences (amount, recipient, transaction reference, QR payload, image-read fields) caused the suppression.
- Structured duplicate-decision reason fields (`duplicateDecisionType`, `duplicateDecisionReasons`) are stored on each document record so the UI does not rely on brittle note-string parsing. Legacy records with only freeform suppression notes still render correctly via a compatibility fallback.
- Dashboard list shows subtle suppression badges for near-duplicates that were suppressed by structured evidence, so users can distinguish them from plain new uploads at a glance.
- Uploads require an explicit document type: bank transfer slip, deposit/payment slip, cheque, or not sure/unknown.
- Owners can correct a document type after upload; type changes are audited and do not alter duplicate, review, or quality status.
- Bank transfer slips run conservative QR-candidate analysis, QR decode, transfer-metadata parsing, and slip-image-read (OCR field extraction) stages.
- QR decode stores raw decoded text. Transfer metadata parsing classifies decoded payloads first and only parses supported Thai QR payment payloads into structured fields. Parsed metadata is not verified.
- Slip-image-read extracts visible transaction fields from the slip image (amount, sender/receiver names, date/time, transaction/reference, banks, account tails) with per-field confidence. These are interpretations of visible text, not verified.
- Image-read fields drive duplicate suppression using field-specific trust tiers: `amount` and `transactionReference` suppress alone at `MEDIUM` or higher confidence; `receiverName`, `senderName`, `dateTime`, and `receiverBank` suppress alone at `HIGH` confidence or combine as multi-signal suppression when two or more are at `MEDIUM` confidence. This suppresses false near-duplicates even when QR metadata is missing or weak, without depending on a single field or on QR alone.
- Transfer-slip uploads also persist a minimal `slipVerification` scaffold with `NOT_VERIFIED` and `NO_EVIDENCE` defaults. No local structural validation or external truth source exists yet.
- Document records and original-image previews are owner-only.
- Cheque parsing and bank verification are intentionally not implemented yet.

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
npm run test:e2e:ci
npm run backfill:slip-verification -- --dry-run
npm run backfill:slip-verification
npm run build
```

### Dev / Regression Runner

A lightweight CLI script inspects OCR extraction and duplicate-assessment behavior on real image files without touching the database:

```bash
# List available fixture images
npx tsx scripts/inspect-transfer-slip.ts --list-fixtures

# Inspect a single image
npx tsx scripts/inspect-transfer-slip.ts 016126175244BTF00250.jpg

# Compare two images (duplicate assessment)
npx tsx scripts/inspect-transfer-slip.ts image1.jpg image2.jpg

# Machine-readable JSON output
npx tsx scripts/inspect-transfer-slip.ts --json image1.jpg image2.jpg
```

Bare filenames are resolved under `tests/image/transfer-slip/`. Absolute and relative paths also work. This is for local debugging only; it does not perform financial verification.

For non-Docker local development, set `MONGODB_URI` and MinIO values to reachable local services.

`npm run test:e2e` uses Playwright. The Playwright web-server command starts the existing Docker Compose `mongo` and `minio` services, waits for real MongoDB and MinIO client readiness, runs the Next.js app locally on `127.0.0.1:3100`, and waits for `/api/health`.

`npm run test:e2e:ci` is the CI-friendly wrapper. It runs the same Playwright suite with `CI=true` semantics and performs deterministic artifact cleanup afterward for the E2E user. Useful support commands are `npm run e2e:bootstrap`, `npm run e2e:wait`, `npm run e2e:cleanup`, and `npm run e2e:diagnostics`.

`npm run backfill:slip-verification -- --dry-run` counts older `BANK_TRANSFER_SLIP` records with missing or null `slipVerification`. `npm run backfill:slip-verification` fills only those records with the safe `NOT_VERIFIED` / `NO_EVIDENCE` scaffold. The command is optional and idempotent; the app still reads legacy null records safely. Follow `docs/operations.md` before running write-mode maintenance commands.

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
- `documentType` is a durable user-selected intake field. It is separate from duplicate, review, and quality status and prepares the record for later type-specific processing.
- Correcting `documentType` makes the new type the source of truth for future type-aware stages. Existing original/normalized assets and duplicate/review/quality decisions remain unchanged, and transfer-slip QR-candidate, QR-decode, transfer-metadata, and slip-verification scaffold results are cleared because the record is not reprocessed during correction.
- Upload processing records a type-aware processing profile. Bank transfer slips use the first slip-specific branch and now run QR-candidate analysis, QR decode, transfer metadata parsing, and local-only structural `slipVerification` for supported Thai QR payment metadata after normalized-image generation; external bank/provider verification remains unimplemented.
- Older transfer-slip records may have `slipVerification` missing or null, or may have the older no-evidence scaffold. The read path displays them safely, and the optional backfill command only adds the no-evidence scaffold without touching duplicate, review, quality, QR, or transfer-metadata fields.
- Slip verification terminology is intentionally strict: raw decode, parsed metadata, local structural checks (including CRC-16/CCITT-FALSE checksum correctness), and external truth verification must remain separate.
- Uploads keep the original file unchanged and store a normalized grayscale WebP derivative for fingerprinting.
- The normalized derivative is auto-oriented, resized to fit within 1024x1024, converted to grayscale, lightly normalized, and encoded as WebP.
- The perceptual hash is 64-bit dHash computed from the normalized derivative. dHash was chosen because it is simple, deterministic, fast, and adequate for a conservative first near-duplicate signal.
- Every upload creates an auditable document record. Exact duplicates are marked `EXACT_DUPLICATE` and linked to the earliest matching document.
- Exact-match selection is deterministic: oldest `createdAt` wins, with `_id` as a stable tie-breaker.
- Likely duplicates are marked `LIKELY_DUPLICATE` when no exact match exists and an owner-owned perceptual hash is within Hamming distance `8`. `similarityScore` is `1 - distance / 64`.
- For `BANK_TRANSFER_SLIP`, duplicate detection is structure-aware. Before promoting a perceptual match to `LIKELY_DUPLICATE`, the system compares structured evidence from QR decode, transfer metadata parsing, and image-read OCR fields. Identical raw QR payloads or identical raw transfer metadata payloads are definitive duplicate signals. Image-read conflicts use field-specific trust tiers: `amount` and `transactionReference` suppress at `MEDIUM` confidence or higher; `receiverName`, `senderName`, `dateTime`, and `receiverBank` suppress alone at `HIGH` confidence or combine as multi-signal when two or more differ at `MEDIUM`. This means clearly different slips are suppressed even when QR metadata is absent, without depending on any single field or on QR alone.
- Non-slip document types and transfer slips without parsed metadata continue to use the generic image-based near-duplicate path.
- Machine detection and human review are separate. `duplicateStatus` stores algorithm output; `reviewStatus` stores the user decision.
- Likely duplicates start with `reviewStatus: PENDING`. Users can confirm duplicate or mark not duplicate from the document detail page.
- The dashboard supports filtering documents by document type, duplicate status, and review status using server-side MongoDB queries scoped to the authenticated owner.
- Reviewed document pairs are remembered owner-by-owner in `duplicate_review_pairs`, so the same exact pair does not keep appearing as unresolved after review.
- Quality assessment is separate from duplicate and review state. Accepted uploads store `qualityStatus`, `qualityWarnings`, `qualityMetrics`, and `qualityCheckedAt`.
- Most quality issues warn and continue. Clearly unusable tiny images are rejected with a capture-quality error before the duplicate pipeline runs.
- Client-side preview hints are advisory only. Server-side validation and quality assessment remain the source of truth.
- Framing aids are static guidance only. They do not detect documents, crop images, or verify document contents.
- If the server rejects a poor-quality image, the upload form keeps the user in a recovery flow so they can retake or choose another image.
- API upload, document detail, and original-image routes require authentication. Missing or non-owned documents return `404` for owner-scoped lookups, so another user's document existence is not exposed.
- TypeScript imports use the `@/*` `paths` alias without `baseUrl`, which avoids relying on deprecated `baseUrl` behavior.

## Verification Coverage

Vitest covers upload and authorization route boundaries for authenticated new uploads, authenticated exact duplicate uploads, likely duplicate outcomes, review actions, reviewed pair memory, dashboard review filtering, quality warnings/failures, upload preview helper behavior, unauthenticated upload rejection, owner-only document access, image normalization, dHash helpers, and deterministic perceptual candidate selection.

Vitest also covers the transfer-slip QR-candidate heuristic, no-candidate behavior for plain images, transfer-slip-only stage execution/exposure, local-only structural slip validation, and conservative non-slip profile behavior.

Playwright covers the focused browser-critical upload path: authenticated `/upload` access through a dev/test-only auth bypass, image preview rendering, retake/reselect replacement, recovery after a controlled server `422` quality failure, and one real successful upload through MongoDB and MinIO. Run it locally with `npm run test:e2e`; use `npm run test:e2e:ci` for a CI-style run with final cleanup.

## Intentionally Not Implemented Yet

- External bank/provider slip verification beyond local structural consistency checks.
- Cheque verification or clearing integration.
- Admin workflows, profile management, and document deletion.
- Background workers or queue-based processing.
- Live camera framing overlays, crop tools, and perspective correction UI.
- Automated document-type classification, cheque parsing, and bank verification.

See `docs/` for architecture, roadmap, data model, and task progress notes.
