# Worklog

## 2026-05-08

### Changed

- Initialized a new Next.js TypeScript App Router project in an empty repository.
- Added Tailwind, ESLint, TypeScript, and base app configuration.
- Added auth scaffold with email/password registration, credentials login, optional Google login, JWT sessions, and protected routes.
- Added MongoDB helpers, user/document/audit model types, and document service functions.
- Added MinIO object storage helper with lazy bucket creation.
- Added upload API route with server-side metadata, MIME type, and size validation.
- Added pages for landing, login, register, dashboard, upload, and document detail/result.
- Added Dockerfile and Docker Compose services for app, MongoDB, and MinIO.
- Added README and documentation under `docs/`.
- Upgraded to Next.js 16 and added a PostCSS override so production audit reports zero vulnerabilities.

### Key Decisions

- V1 remains a single web app instead of split frontend/backend services.
- Document intake is shared across transfer slips, deposit/payment slips, cheques, and unknown documents.
- Initial scaffold prepared duplicate matching fields; exact duplicate matching was implemented in the later pass below.
- MinIO stores original image files; MongoDB stores metadata and processing state.
- Google sign-in is optional and disabled in the UI when OAuth env values are missing.

### Verification

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm audit --omit=dev`
- `docker compose up -d --build`
- `GET /api/health`

### Assumptions

- Local development will usually run through Docker Compose.
- Uploads are limited to JPEG, PNG, and WebP for the initial scaffold.
- `NEXTAUTH_SECRET` should be supplied before meaningful local use.
- Exact SHA-256 hash is safe to compute during upload for v1.

### Pending Items

- Add richer upload progress.
- Add integration tests around authenticated upload.

## 2026-05-08 Exact Duplicate Pass

### Changed

- Removed `baseUrl` from `tsconfig.json` and kept the `@/*` alias through `paths`.
- Added exact duplicate detection using the existing SHA-256 file hash.
- Added `EXACT_DUPLICATE` to duplicate statuses.
- Kept one MongoDB document record per upload for auditability.
- Exact duplicate records now link to the earliest matching document through `matchedDocumentId` and set `similarityScore` to `1`.
- Added a protected original-image route for document previews.
- Updated dashboard, upload guidance, and document detail UI to surface exact duplicate status and matched document references.
- Added Vitest unit tests for duplicate decisions, document record construction, hash/key helpers, and upload validation.

### Key Decisions

- Exact duplicate matching is system-wide by `exactHash`, not limited to the current user.
- Duplicate uploads create a new record instead of reusing the existing one, preserving upload history and auditability.
- Near-duplicate, OCR, QR, and cheque parsing remain out of scope.

### Verification

- `npm run test`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm audit --omit=dev`

### Pending Items

- Add integration coverage for authenticated multipart uploads.
- Add old-record migration/backfill if any documents exist with `NOT_CHECKED`.
- Add perceptual-hash near-duplicate detection in a later phase.

## 2026-05-08 Auth and Exact Duplicate Hardening Pass

### Changed

- Kept protected dashboard, upload, and document pages behind `requireUser` and NextAuth middleware.
- Added `GET /api/documents/{id}` for authenticated owner-scoped document detail responses.
- Confirmed `GET /api/documents/{id}/original` requires authentication and owner access before reading MinIO.
- Changed exact duplicate lookup to owner-scoped matching to avoid leaking another user's document existence.
- Made exact duplicate selection deterministic with `createdAt ASC` and `_id ASC`.
- Excluded the pending upload id from duplicate lookup so a record cannot match itself.
- Kept duplicate uploads auditable: every upload still creates a new document record.
- Added upload response `similarityScore` for exact duplicate result verification.
- Lightly clarified UI labels for `NEW` and `EXACT_DUPLICATE` and improved matched-document wording.
- Added Vitest integration-style route coverage for authenticated new upload, authenticated exact duplicate upload, unauthenticated upload rejection, cross-user duplicate isolation, and cross-user document detail/original-image rejection.

### Key Decisions

- V1 document ownership is single-user owner-only. There is no admin or shared-document rule yet.
- Non-owned documents are returned as `404` at API boundaries rather than `403` to avoid document existence disclosure.
- Exact duplicate matching is scoped to the owner account, not system-wide.

### Verification

- `npm install`
- `npm run test`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm audit --omit=dev`

### Known Limitations

- Concurrent identical uploads from the same user can still race if both requests check before either insert is visible; both could be marked `NEW`. Fixing that cleanly likely needs a per-user hash claim, transaction strategy, or reconciliation pass.
- Perceptual hashing, OCR, QR extraction, cheque parsing, and bank verification remain intentionally out of scope.

## 2026-05-08 Near Duplicate Image Stage

### Changed

- Added Sharp as the image-processing dependency for robust JPEG, PNG, and WebP decoding plus EXIF orientation support.
- Added an in-process document processing boundary in `lib/document-processing.ts`.
- Kept original uploaded files unchanged in MinIO.
- Added normalized grayscale WebP derivatives at `documents/{userId}/{documentId}/normalized.webp`.
- Added normalized image metadata to document records.
- Added 64-bit dHash generation from normalized derivatives.
- Added `LIKELY_DUPLICATE` duplicate status.
- Implemented exact-first duplicate resolution: exact SHA-256 matches always win over near matches.
- Implemented owner-scoped near-duplicate lookup using dHash Hamming distance.
- Added deterministic likely match selection: lowest Hamming distance, then oldest `createdAt`, then lowest `_id`.
- Added UI support for likely duplicate labels, matched document wording, similarity display, perceptual hash, and normalized derivative metadata.
- Added tests for normalization, dHash helpers, exact-vs-near decision ordering, owner-scoped likely duplicate isolation, deterministic candidate selection, and upload route likely duplicate outcomes.

### Key Decisions

- dHash was chosen over pHash for v1 because it is simpler, deterministic, fast, and easy to explain. It is enough for a conservative first image-only near-duplicate signal.
- The likely duplicate threshold is Hamming distance `<= 8` out of 64 bits.
- `similarityScore` means `1 - hammingDistance / 64` for likely duplicates and remains `1` for exact duplicates.
- Processing still runs in-process during upload; no queue, worker, microservice, ML, OCR, QR parsing, cheque parsing, or bank verification was added.

### Verification

- `npm install sharp`
- `npm run test`
- `npm run typecheck`
- `npm run lint`

### Known Limitations

- dHash is a visual similarity signal, not proof that two documents are the same financial instrument.
- The current normalization does not correct perspective skew, heavy cropping, glare, occlusion, handwritten changes, or extreme rotations.
- Near-duplicate matching fetches a bounded set of owner candidates and scores them in-process; this is acceptable for v1 but may need indexing or bucketing as volume grows.
- Concurrent same-user uploads can still race before either record is visible to duplicate lookup.

## 2026-05-08 Likely Duplicate Review Workflow

### Changed

- Added separate document-level human review fields: `reviewStatus`, `reviewedAt`, and `reviewedMatchDocumentId`.
- Kept machine detection fields unchanged: `duplicateStatus`, `matchedDocumentId`, and `similarityScore`.
- Made likely duplicates enter `reviewStatus: "PENDING"`.
- Made new and exact duplicate records enter `reviewStatus: "NOT_REQUIRED"`.
- Added owner-scoped `duplicate_review_pairs` memory for reviewed document pairs.
- Added `POST /api/documents/{id}/review` for owner-only review decisions.
- Added review decisions for `CONFIRMED_DUPLICATE` and `CONFIRMED_DISTINCT`.
- Kept machine match linkage and similarity score intact after human review.
- Updated likely duplicate candidate selection to skip already reviewed exact pairs.
- Added dashboard review filters for all documents, pending review, confirmed duplicate, and confirmed distinct.
- Added side-by-side original previews and review action buttons on likely duplicate detail pages.
- Added route/service tests for pending review entry, owner review actions, non-owner rejection, pair memory, and dashboard review filtering.

### Key Decisions

- Machine detection and human review remain separate fields so historical algorithm output is not overwritten by review decisions.
- Pair memory is a small dedicated collection instead of overloading document records.
- Pair ids are stored canonically by sorting the two document ids, so review memory works regardless of pair order.
- Exact duplicates do not enter the human review workflow in v1.

### Verification

- `npm run test`
- `npm run typecheck`
- `npm run lint`

### Known Limitations

- Review memory is pairwise only. It does not infer decisions across clusters or train the dHash matcher.
- Review notes and reset/reopen review actions are not implemented.
- OCR, QR extraction, cheque parsing, bank verification, background queues, and microservices remain out of scope.
