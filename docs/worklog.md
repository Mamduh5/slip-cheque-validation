# Worklog

## 2026-05-10

### Upload Progress and Result Summary

#### Changed

- Added staged upload progress states to `components/upload-form.tsx`.
  - New `uploadStage` state with values `idle`, `uploading`, `processing`, `redirecting`.
  - Submit button disabled during all active stages to prevent duplicate uploads.
  - Visual progress indicator with spinner, stage label ("Uploading image…", "Processing document…", "Finalizing result…"), and three-segment progress bar.
  - Network-level fetch errors are caught and surfaced with "Check your connection and try again."
- Improved upload failure messaging:
  - Quality failures show "Image rejected due to quality issues" header with warning list and retake guidance.
  - Non-quality errors show "Upload failed" header.
- Added post-upload result summary to `app/documents/[id]/page.tsx`.
  - New "Upload result" summary banner derived entirely from the persisted `DocumentRecord`.
  - Redirect-safe and refresh-safe because it reads stored fields, not ephemeral client state.
  - Shows: duplicate outcome (exact/likely/new/suppressed), review status, quality warnings, transfer-slip stage results (QR decode, metadata parse, local structural check), and suppression notes.
  - Color-coded by tone: positive (green), warning (orange), info (blue), neutral (slate).
- Extracted pure result-summary builder to `lib/document-result-summary.ts` for testability.
- Added 15 focused tests for result summary behavior: new upload, exact duplicate, likely duplicate, suppressed near-duplicate, confirmed duplicate/distinct, quality warnings singular/plural, transfer-slip stage results, non-slip exclusion, no-review hiding, no-quality hiding, and overclaiming-term guard.
- Updated README, architecture, roadmap, and worklog documentation.

#### Key Decisions

- The result summary is rendered server-side on the document detail page from stored fields. This is the simplest redirect-safe/refresh-safe approach and avoids sessionStorage/query-param fragility.
- All summary wording is conservative: "Structurally consistent" not "verified", "Likely duplicate" not "confirmed duplicate", "New upload (near-duplicate suppressed)" not "different transaction".
- Non-slip types do not show transfer-slip stage fields in the summary.
- The upload progress indicator uses text-based stages rather than byte-level progress because true network upload percentage is not cleanly available in the current fetch-based upload path.

#### Verification

- `npm run test` - all 105 tests pass (15 new result-summary tests)
- `npm run typecheck`
- `npm run lint`
- `npm run build`

## 2026-05-10

### Duplicate-Decision Transparency

#### Changed

- Added `parseSuppressionReasons` to `lib/document-result-summary.ts` to normalize existing suppression notes like "Suppressed near-duplicate: different amount, different recipient" into human-readable reason fragments ("amount differed", "recipient differed", etc.).
- Updated `buildResultSummary` so suppressed near-duplicates show:
  - Duplicate check: "Near-duplicate review suppressed" (info tone, more visible than the old "New upload (near-duplicate suppressed)")
  - Why: "Suppressed because {reasons}" with proper list formatting for multiple reasons
- Added dedicated **"Duplicate decision"** card to `app/documents/[id]/page.tsx`:
  - Exact duplicate: explains byte-level match, links to matched document with similarity score
  - Likely duplicate: explains image similarity and side-by-side comparison availability
  - New upload: brief explanation
  - Suppressed near-duplicate: explains that a visually similar candidate was found but structured differences outweighed visual similarity, lists which differences (amount, recipient, transaction reference, QR payload)
- Updated dashboard (`app/dashboard/page.tsx`) to show small sky-blue suppression badges under filenames for suppressed near-duplicates, with concise reason snippets like "Suppressed: amount differed" or "Suppressed: amount differed, recipient differed+".
- Added 6 new tests for `parseSuppressionReasons` covering all known conflict types and edge cases.
- Added 1 new test for single-reason suppression in `buildResultSummary`.
- Updated existing suppressed test to match the new messaging format.

#### Key Decisions

- Reused the existing `notes` field (already populated by `lib/transfer-slip-duplicate-assessment.ts`) instead of adding new stored fields. This keeps the change purely UX/explanation.
- Used `parseSuppressionReasons` as a single formatting helper so string parsing stays in one clean place, not scattered across components.
- Kept dashboard badge subtle (small sky-blue pill, 10px font) so it does not overwhelm the list but still provides a useful signal.
- All wording stays honest: "suppressed" not "verified different", "structured differences found" not "proved unrelated", "near-duplicate review suppressed" not "confirmed not duplicate".

#### Verification

- `npm run test` - all 112 tests pass (6 new parseSuppressionReasons tests, 1 new single-reason test, updated suppressed test)
- `npm run typecheck`
- `npm run lint`
- `npm run build`

## 2026-05-10

### Structure-Aware Transfer-Slip Duplicate Detection

#### Changed

- Added `lib/transfer-slip-duplicate-assessment.ts` to centralize structured duplicate assessment for `BANK_TRANSFER_SLIP` documents.
- The assessment compares `qrDecode.rawDecodedText`, `transferMetadata.rawPayload`, parsed `amount`, `merchantAccountInfo.targetIdentifier` (recipient), and `merchantAccountInfo.references.reference1` (transaction reference) between a new upload and perceptual-hash candidates.
- Definitive positive signals (identical raw QR payload or identical raw metadata payload) override everything and accept the candidate as a duplicate.
- Strong conflict signals (different raw QR payload, different raw metadata payload, different amount, different recipient, different transaction reference) suppress `LIKELY_DUPLICATE` classification when no definitive positive exists.
- When suppression occurs, the document receives `duplicateStatus: NEW` and the `notes` field records the suppression reason (e.g., "Suppressed near-duplicate: different amount, different recipient").
- Added `findDuplicateMatchForUser` in `lib/documents.ts` that fetches full candidate documents (including `qrDecode` and `transferMetadata`) and runs the structured assessment on all perceptual candidates before selecting the best match.
- Non-slip document types and transfer slips without parsed metadata continue to use the original generic image-only near-duplicate path.
- Added 10 focused tests for the assessment logic: identical QR payload, different QR payload, different amount, different recipient, different transaction reference, different raw metadata payload, definitive signals, insufficient evidence, both sides lacking metadata, and conflict suppression with mixed fields.
- Updated README, architecture, roadmap, and worklog documentation.

#### Key Decisions

- Image similarity is no longer the primary signal for `BANK_TRANSFER_SLIP` when structured evidence is available. It becomes a weaker signal or tie-breaker.
- Any strong conflict suppresses the near-duplicate classification unless a definitive positive signal exists. This is intentionally conservative to reduce false review candidates.
- The assessment is deterministic, uses only already-persisted data, and does not call external services.
- Non-slip types were intentionally left on the original image-only path to keep the change focused and avoid destabilizing other document types.

#### Verification

- `npm run test` - all 89 tests pass (10 new assessment tests)
- `npm run typecheck`
- `npm run lint`
- `npm run build`

## 2026-05-10

### Local Structural Slip Verification

#### Changed

- Added `slip-verification-local-structural-v1` for supported Thai QR payment metadata.
- `SLIP_VERIFICATION` now records `STRUCTURALLY_CONSISTENT` or `STRUCTURALLY_INCONSISTENT` with `LOCAL_STRUCTURAL_CHECK` only when local structural checks run.
- Unsupported or unavailable metadata remains safe with `UNSUPPORTED` or `NOT_VERIFIED` and `NO_EVIDENCE`.
- Updated the transfer-slip processing profile and detail-page wording to describe local structural results without implying bank/provider verification.
- Added focused tests for consistent, inconsistent, unsupported, non-slip, API exposure, and legacy null behavior.
- Updated README, architecture, roadmap, data-model, and slip-verification spec documentation.

#### Key Decisions

- Local structural validation checks parsed Thai QR payment structure only.
- The checks do not confirm payment completion, bank truth, recipient truth, amount truth, or slip authenticity.
- No external provider integration, OCR, cheque parsing, queue, service split, or migration was added.
- The existing backfill remains a no-evidence legacy-shape normalization path and does not recompute structural results.

#### Verification

- `npm run test` - all 69 tests pass
- `npm run typecheck`
- `npm run lint`

## 2026-05-10

### Dashboard Document Filtering

#### Changed

- Added server-side filtering to the dashboard for `documentType`, `duplicateStatus`, and `reviewStatus`.
- Extended `getRecentDocumentsForUser` in `lib/documents.ts` to accept `documentType` and `duplicateStatus` filter options alongside the existing `reviewFilter`.
- Created `DashboardFilters` client component (`components/dashboard-filters.tsx`) with pill-style review filter buttons and dropdown selects for document type and duplicate status.
- Updated dashboard page (`app/dashboard/page.tsx`) to use the new filter component and pass filter state via URL search params.
- Added "Clear filters" action that appears when any filter is active.
- Improved empty state to distinguish between "no documents yet" and "no documents match current filters".
- Added focused tests for filtering by document type, duplicate status, review status, combined filters, empty results, owner scoping, and limit parameter in `tests/documents.test.ts`.

#### Key Decisions

- Filtering is server-side via MongoDB queries scoped to the authenticated owner, keeping the approach consistent with existing architecture.
- Filter state is managed via URL search params, keeping the page bookmarkable and the server-side rendering deterministic.
- The review filter uses pill-style buttons for quick access to common review states.
- Document type and duplicate status use dropdown selects to accommodate more options.
- No new verification semantics or external integrations were added; this is list UX only using existing stored fields.
- Labels reflect stored state accurately (e.g., "All reviews" instead of "All documents" to clarify the review filter scope).

#### Verification

- `npm run test` - all 79 tests pass (8 new filtering tests added)
- `npm run typecheck`
- `npm run lint`

## 2026-05-10

### CRC Checksum Validation for Local Structural Slip Verification

#### Changed

- Added deterministic CRC-16/CCITT-False checksum validation to local structural slip verification.
- `transferMetadata.rawPayload` is now persisted so `SLIP_VERIFICATION` can validate the decoded QR payload against its CRC tag.
- CRC mismatch now produces `STRUCTURALLY_INCONSISTENT` with `LOCAL_STRUCTURAL_CHECK`.
- Missing CRC tag is now treated as a structural inconsistency.
- Updated slip-verification spec, architecture, data-model, roadmap, and README documentation.
- Added focused tests for valid CRC, invalid CRC, and missing CRC.

#### Key Decisions

- CRC validation is local-only and deterministic. It does not imply payment completion, bank truth, or slip authenticity.
- A CRC mismatch only means the payload fails the EMV checksum rule; it does not mean the payment is invalid or fraudulent.
- The CRC is computed over the raw payload with the CRC value replaced by `0000`.
- Legacy records without `rawPayload` are not recomputed; the existing backfill remains a no-evidence legacy-shape normalization path.

#### Verification

- `npm run test` - all 71 tests pass
- `npm run typecheck`
- `npm run lint`

## 2026-05-10

### Operations Runbook

#### Changed

- Added `docs/operations.md` with a general write-mode maintenance checklist.
- Documented the `slipVerification` backfill workflow: backup reminder, environment variables, dry-run, real run, post-run confirmation, expected output, and caveats.
- Linked the runbook from README, architecture, and roadmap docs without duplicating the full checklist.

#### Key Decisions

- Documentation-only change.
- No verification logic, OCR, bank/provider integration, queue, service split, or command behavior change was added.
- The runbook states that the backfill is optional, idempotent, does not create per-record audit logs, and only writes the safe no-evidence scaffold.

#### Verification

- `npm run lint`

## 2026-05-10

### Slip Verification Backfill Policy

#### Changed

- Added `lib/slip-verification-backfill.ts` with a reusable idempotent backfill query/update path.
- Added `scripts/backfill-slip-verification.mjs` and `npm run backfill:slip-verification`.
- Added `--dry-run` support to report eligible legacy transfer-slip records without updating them.
- Kept document reads lazy-compatible with missing or null `slipVerification`; detail API returns null and UI remains safe.
- Added tests for missing/null targeting, non-slip skip behavior, populated-record skip behavior, idempotency, dry-run reporting, update arguments, and legacy detail API readability.
- Updated README, architecture, roadmap, and data-model docs with the policy and command.

#### Key Decisions

- No startup migration was added.
- The backfill only targets `BANK_TRANSFER_SLIP` records where `slipVerification` is missing or null.
- The backfill only sets the safe no-evidence scaffold and does not modify duplicate, review, quality, QR, transfer metadata, hash, object, or document-type fields.
- No local structural validation, external provider integration, OCR, cheque parsing, queue, or new service was added.

#### Verification

- `npm run test` - all 65 tests pass
- `npm run typecheck`
- `npm run lint`

## 2026-05-10

### Slip Verification Runtime Scaffold

#### Changed

- Added a persisted `slipVerification` field for transfer-slip records.
- Added `lib/slip-verification.ts` with a minimal scaffold result for `BANK_TRANSFER_SLIP` uploads.
- The current scaffold records `stage: "SLIP_VERIFICATION"`, `status: "COMPLETED"`, `result: "NOT_VERIFIED"`, and `evidenceCategory: "NO_EVIDENCE"`.
- Exposed `slipVerification` in upload/detail API responses and the document detail UI with safe no-evidence wording.
- Cleared `slipVerification` during document-type correction because the image is not reprocessed in that flow.
- Added route and model fixture coverage for transfer-slip persistence/exposure, non-slip null behavior, and correction clearing.
- Updated README, architecture, roadmap, and data-model documentation.

#### Key Decisions

- The runtime scaffold is not real verification.
- No local structural validation, external provider integration, bank truth check, OCR, or cheque parsing was added.
- `slipVerification` remains separate from `qrDecode` and `transferMetadata`.
- `verificationImplemented` remains false because the scaffold only records `NOT_VERIFIED` with `NO_EVIDENCE`.

#### Verification

- `npm run test` - all 58 tests pass
- `npm run typecheck`
- `npm run lint`
- `npm run build`

## 2026-05-10

### Changed

- Added `docs/slip-verification-spec.md` as a design-only contract for future `SLIP_VERIFICATION`.
- Defined the boundaries between raw decode, parsed metadata, local structural validation, and external truth verification.
- Documented future verification inputs, proposed statuses/results, evidence categories, and a suggested non-live output shape.
- Added safe UI/API terminology guidance and phrases to avoid unless a real external truth source exists.
- Updated README, architecture, roadmap, data-model, and processing-profile wording to point to the spec and keep verification distinct from parsing.

### Key Decisions

- No runtime slip verification logic was implemented.
- Local structural validation must not be called external verification.
- Parsed metadata must continue to be presented as unverified.
- External bank/provider truth remains unimplemented and must require an explicit future integration.

### Verification

- `npm run typecheck`

## 2026-05-10 Transfer Metadata Parse

### Changed

- Implemented `TRANSFER_METADATA_PARSE` stage for bank transfer slips.
- Added `lib/transfer-metadata-parse.ts` with decoded-payload classification before parsing.
- Added conservative payload classifications: `THAI_QR_PAYMENT`, `GENERIC_URL`, `PLAIN_TEXT`, and `UNKNOWN_FORMAT`.
- Added supported Thai QR payment parsing using EMV-style TLV structure and Thai QR PromptPay / bill-payment application IDs.
- Added `transferMetadata` to document records with stage status, result, payload format, parsed metadata, notes, warnings, and timestamp.
- Updated the transfer-slip processing profile to mark `TRANSFER_METADATA_PARSE` as ACTIVE while keeping `SLIP_VERIFICATION` planned.
- Updated upload processing, persistence, API responses, and document detail UI to expose parsed metadata separately from raw QR decode.
- Added deterministic unit and route coverage for supported Thai QR payment parsing, generic URL unsupported format handling, plain text no-structured-metadata handling, non-slip skip behavior, and API persistence.
- Updated README, architecture, roadmap, worklog, and data-model documentation.

### Key Decisions

- Parsing is separate from both `qrDecode.rawDecodedText` and future slip verification.
- Decoded payloads are classified before parsing so generic URLs and plain text are not misrepresented as transfer metadata.
- Parsed Thai QR payment values are structural fields only; they are not verified and are not proof of payment status, authenticity, or bank truth.
- No OCR, cheque parsing, bank verification, queues, or microservice architecture were introduced.

### Verification

- `npm run typecheck`
- `npm run test` - all 57 tests pass

### Assumptions

- Initial supported structured format is Thai QR payment / PromptPay-like EMV TLV payloads.
- Broader payload families can be added later behind the same classification-first boundary.

## 2026-05-10 QR Decode

### Changed

- Implemented `QR_DECODE` stage for bank transfer slips.
- Added jsQR library for QR code decoding.
- Created `lib/qr-decode.ts` with conservative QR decode logic that attempts decoding when a plausible QR candidate exists.
- Updated `DocumentRecord` schema to include `qrDecode` field with stage status, result, raw decoded text, text length, source image type, and notes.
- Updated document processing pipeline to run QR decode after QR candidate analysis for transfer slips.
- Updated transfer-slip processing profile to mark `QR_DECODE` as ACTIVE.
- Updated API routes to expose `qrDecode` data in document detail responses.
- Updated document detail page UI to display QR decode results with clear messaging that content is not parsed or verified.
- Added test coverage for QR decode success, failure, and skip scenarios.
- Updated README, architecture, roadmap, and worklog documentation.

### Key Decisions

- QR decode is strictly technical: it extracts raw QR content without parsing business fields or verifying payment data.
- Decoding only runs when `QR_CANDIDATE` completes with `CANDIDATE_FOUND`.
- Raw decoded text is stored separately from future parsed transfer metadata to maintain clear separation of concerns.
- Document type correction clears both `qrCandidateAnalysis` and `qrDecode` since records are not reprocessed.
- Transfer metadata parsing and slip verification remain intentionally unimplemented.

### Verification

- `npm run test` - all 51 tests pass
- `npm run typecheck`
- `npm run lint`

### Assumptions

- jsQR is adequate for v1 QR decoding needs.
- Normalized image provides sufficient quality for QR decode attempts.
- Raw decoded text storage without parsing is acceptable for this phase.

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
- `npm run build`
- `npm audit --omit=dev`
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

## 2026-05-09 Focused Upload E2E

### Changed

- Added Playwright as the browser E2E tool for focused user-interaction coverage.
- Added `npm run test:e2e`.
- Added `playwright.config.ts` with a local Next.js dev server on port `3100`.
- Added a dev/test-only auth bypass gated by `E2E_TEST_AUTH_USER_ID`, disabled in production.
- Added stable upload-form test ids for the file input, preview card, replace button, submit button, and server error message.
- Added browser E2E coverage for authenticated upload-page access, preview rendering, image replacement, and recovery after a controlled server `422` quality failure.
- Added `.gitignore` entries for Playwright reports and test results.

### Key Decisions

- Playwright was chosen because it is the standard browser E2E tool for Next.js apps, supports file chooser interactions cleanly, and can run a local dev server from config.
- The suite intentionally avoids real MongoDB and MinIO setup by intercepting the upload POST for the server-quality-failure scenario.
- The E2E layer stays narrow; logic-heavy duplicate, review, and quality tests remain in Vitest.

### Verification

- `npm run test:e2e`
- `npm run test`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm audit --omit=dev`

### Known Limitations

- E2E currently covers preview and recovery only, not a full successful upload through MongoDB and MinIO.
- The auth bypass is test-only and controlled by `E2E_TEST_AUTH_USER_ID`; it should not be enabled in production.

## 2026-05-09 Capture Quality Signals

### Changed

- Added document-level quality fields: `qualityStatus`, `qualityWarnings`, `qualityMetrics`, and `qualityCheckedAt`.
- Added lightweight capture-quality analysis during the in-process document image processing step.
- Added warnings for small images, blurry images, too-dark images, and too-bright images.
- Added a narrow hard-fail path for clearly unusable tiny images; valid but questionable images continue through upload with `qualityStatus: "WARN"`.
- Kept quality status separate from machine duplicate status and human review status.
- Included quality status and warnings in upload and document detail API responses.
- Added mobile-friendly capture guidance on the upload page and upload form.
- Added quality status, warning text, and image metrics to document detail.
- Verified reviewed-pair behavior: a confirmed-distinct pair is suppressed, but the document can still match a different candidate later.
- Added tests for small-image failure, blur/sharpness behavior, dark/bright warnings, upload warning persistence, hard quality failure, quality API exposure, and reviewed-pair candidate behavior.

### Key Decisions

- Quality checks are conservative and explainable heuristics, not document verification.
- Most quality issues are warnings, not blockers.
- The only hard fail is a clearly unusable image below minimum usable dimensions.
- No ML, OCR, QR parsing, cheque parsing, bank verification, queues, or microservices were added.

### Verification

- `npm run test`
- `npm run typecheck`
- `npm run lint`

### Known Limitations

- Blur detection uses a simple Laplacian-variance heuristic and can misread blank or highly graphic documents.
- Exposure checks use average luminance and may miss local glare or shadows.
- There is no client-side pre-submit quality analysis yet; warnings are shown after upload on failure or on the resulting detail page.
- The app does not detect all document corners or correct perspective skew.

## 2026-05-09 Pre-Submit Upload Preview

### Changed

- Added a local image preview after camera capture or file selection.
- Added file metadata display for the selected image.
- Added a retake/reselect action that keeps the upload flow mobile-friendly.
- Added client-side advisory hints for small images, possible blur, too-dark images, and too-bright images.
- Clearly labeled client-side hints as advisory; server-side validation and server-side quality assessment remain authoritative.
- Kept upload enabled when advisory hints appear.
- Improved quality-failure recovery so server `422` responses keep the user on the upload form with clear warning details and a way to choose another image.
- Added pure helper tests for preview metadata, reselect/replace state, advisory warning selection, and recovery prompt behavior.

### Key Decisions

- No browser-side result is trusted for persistence or enforcement.
- Client-side heuristics mirror the server warning concepts but remain lower-fidelity because they run on a canvas preview sample.
- Document detail remains the main place for full quality, duplicate, and review state.

### Verification

- `npm run test`
- `npm run typecheck`
- `npm run lint`

### Known Limitations

- Browser E2E remains intentionally focused on preview/reselect and upload recovery instead of broad UI coverage.
- Client-side hints can differ from server-side quality results.
- No crop tool, corner overlay, or perspective correction is implemented.
- OCR, QR extraction, cheque parsing, bank verification, background queues, and microservices remain out of scope.

## 2026-05-09 Real-Service Upload E2E

### Changed

- Added one Playwright happy-path upload test that uses the real `POST /api/documents` route.
- Updated Playwright web server setup to start Docker Compose `mongo` and `minio` services before the local Next.js dev server.
- Added E2E fixture helpers for deterministic image generation, MongoDB cleanup, MinIO cleanup, document lookup, and object existence checks.
- Verified the happy-path E2E reaches the document detail page, shows duplicate/quality state, persists a MongoDB document, and writes the original object to MinIO.
- Tightened the test-only auth bypass so it requires both non-production runtime and `E2E_TEST_AUTH_ENABLED=true`.
- Routed document API auth checks through the same guarded current-user helper so the bypass behaves consistently in E2E without broadening production behavior.

### Key Decisions

- The real-service E2E uses the existing Docker Compose `mongo` and `minio` services instead of new infrastructure.
- Fixture cleanup is explicit and owner-scoped: MongoDB rows for `e2e-user` are deleted from relevant collections, and MinIO objects under `documents/e2e-user/` are removed.
- Only one real happy-path scenario was added to keep E2E narrow and reliable.

### Verification

- `npm run test:e2e`
- `npm run test`
- `npm run typecheck`
- `npm run lint`
- `npm run build`

### Known Limitations

- The happy-path E2E depends on local Docker being available.
- It does not cover duplicate, review, or multi-user flows through the browser; those remain covered by unit/integration tests.

## 2026-05-09 CI-Ready E2E Bootstrap

### Changed

- Added `scripts/e2e-env.mjs` as a small generic E2E environment runner.
- Added `npm run test:e2e:ci` as the CI-friendly command for the Docker-backed Playwright suite.
- Added support commands: `e2e:bootstrap`, `e2e:wait`, `e2e:cleanup`, and `e2e:diagnostics`.
- Replaced the inline Docker startup in Playwright config with `npm run e2e:bootstrap`.
- Changed Playwright readiness from the app root to `/api/health`.
- Expanded `/api/health` to check both MongoDB and MinIO connectivity.
- Made E2E fixture helpers read the same environment defaults used by Playwright.

### Key Decisions

- The bootstrap stays generic and provider-neutral; no GitHub Actions or other CI-provider workflow was added yet.
- Readiness uses real client checks: MongoDB `ping`, MinIO `listBuckets`, and app `/api/health`.
- Diagnostics stay concise: checked endpoints, configured services, and `docker compose ps`.
- Test artifact cleanup remains owner/path scoped to `e2e-user` and `documents/e2e-user/`.
- The E2E auth bypass still requires non-production runtime, `E2E_TEST_AUTH_ENABLED=true`, and `E2E_TEST_AUTH_USER_ID`.

### Verification

- `npm run e2e:bootstrap`
- `npm run e2e:diagnostics`
- `npm run e2e:cleanup`
- `npm run test:e2e:ci`
- `npm run test:e2e`
- `npm run test`
- `npm run typecheck`
- `npm run lint`
- `npm run build`

### Known Limitations

- CI runners must provide Docker Compose and a working browser environment for Playwright.
- The bootstrap does not stop Docker services automatically; it cleans test artifacts and leaves shared local services running.
- No provider-specific CI workflow is committed until the deployment/CI target is known.

## 2026-05-10 Upload Framing Guidance

### Changed

- Added a clearer upload-page capture checklist for paper document photos.
- Added a static phone-photo framing card with corner marks as visual guidance.
- Added corner-style framing aids around the selected-image preview.
- Added a preview checklist that reminds users to check corners, frame fill, sharpness, glare, and shadows before upload.
- Kept advisory warning badges visible in the preview area and preserved the retake/reselect flow.
- Added Playwright assertions for the framing guidance, preview framing aid, advisory warning display, and reselect behavior.

### Key Decisions

- Framing aids are guidance only. They do not detect documents, crop images, validate contents, or replace server-side quality checks.
- Client-side advisory hints remain separate from server-side quality status.
- Duplicate status, review status, and quality status were not changed.
- No crop tool, perspective correction UI, live camera overlay, OCR, QR extraction, cheque parsing, bank verification, queue, or microservice was added.

### Verification

- `npm run test:e2e`
- `npm run test`
- `npm run typecheck`
- `npm run lint`
- `npm run build`

### Known Limitations

- The framing guide is static and cannot tell whether the actual document is aligned or complete.
- Users can still upload photos that ignore the guide unless server-side validation rejects them.
- More advanced capture tooling, such as crop handles or perspective correction, remains intentionally out of scope.

## 2026-05-10 Document-Type Groundwork

### Changed

- Added a document-type helper module for labels, descriptions, upload guidance, and a small future-processing profile.
- Kept the existing stored `documentType` enum as the durable source of truth.
- Replaced raw enum display with user-facing labels on dashboard and document detail.
- Changed upload document-type selection from a plain select to mobile-friendly radio cards.
- Added conservative type-specific upload guidance for transfer slips, deposit/payment slips, cheques, and unknown documents.
- Added `documentType` and `documentTypeLabel` to upload and document detail API responses.
- Included document type and display label in upload audit metadata.
- Passed the selected document type into the in-process image-processing boundary so future type-specific stages have a clear branch point.
- Added tests for type labels/profiles, type persistence, API detail exposure, upload selection UI, and real-service E2E persistence.

### Key Decisions

- Document type is user-selected in this phase; the app does not infer it from image content.
- Document type remains separate from machine duplicate status, human review status, and capture quality status.
- Type-specific guidance is instructional only and does not claim content understanding or verification.
- No OCR, QR extraction, cheque parsing, bank verification, queue, microservice, crop tool, or camera overlay was added.

### Verification

- `npm run test`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run test:e2e`

### Known Limitations

- Users can choose the wrong document type; there is no automated type suggestion yet.
- Future type-specific extraction pipelines are represented only by a lightweight profile boundary.
- Existing documents with older or missing type values would need a migration/backfill before production data import.

## 2026-05-10 Document-Type Correction

### Changed

- Added owner-only `PATCH /api/documents/{id}` support for document-type correction.
- Added a document detail correction panel with change, save, cancel, success, and error states.
- Kept correction scope narrow: only `documentType` and `updatedAt` change on the document record.
- Added `DOCUMENT_TYPE_UPDATED` audit records with old type, new type, display labels, actor user id, and unchanged duplicate/review/quality statuses.
- Updated the real-service Playwright upload test to correct the type after upload and verify the dashboard shows the corrected type.
- Added route tests for owner update, non-owner rejection, invalid type rejection, audit logging, and unchanged duplicate/review/quality state.

### Key Decisions

- Document type remains user-managed; the app still does not infer type from image content.
- The corrected type becomes the current source of truth for future type-aware processing.
- Existing original/normalized assets, hashes, duplicate status, review status, and quality status are not recomputed during correction.
- No OCR, QR extraction, cheque parsing, bank verification, queue, microservice, crop tool, camera overlay, or automatic type inference was added.

### Verification

- `npm run test`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run test:e2e`

### Known Limitations

- There is no audit-history UI yet; correction events are stored in `audit_logs`.
- A user can still choose the wrong type again.
- Existing documents with missing or legacy type values still need migration/backfill before production data import.

## 2026-05-10 Type-Aware Processing Boundary

### Changed

- Added `lib/document-processing-profiles.ts` as the single type-aware processing dispatch point.
- Added processing branches for transfer slips, deposit/payment slips, cheques, and generic unknown documents.
- Made `BANK_TRANSFER_SLIP` use the first slip-specific internal branch.
- Persisted a lightweight `processingProfile` snapshot on new document records.
- Exposed processing profile metadata through upload and document detail API responses.
- Added a small processing profile note on document detail.
- Updated document-type correction to update the current processing profile alongside the corrected type.
- Added tests for profile dispatch, slip-specific branch selection, all supported upload types, API profile exposure, and real-service E2E profile display after correction.

### Key Decisions

- Current runtime behavior remains shared: quality assessment, normalized image generation, exact hash matching, and dHash near-duplicate matching.
- Processing profiles are planning metadata, not evidence that extraction or verification has run.
- Transfer slips are the first planned specialized path; likely future work is QR candidate handling.
- Deposit/payment slips and cheques stay conservative/manual for now.
- Unknown documents stay on the generic branch unless the owner corrects the type.
- No OCR, QR extraction, cheque parsing, bank verification, automatic type inference, queue, microservice, crop tool, or camera overlay was added.

### Verification

- `npm run test`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run test:e2e`

### Known Limitations

- Profiles are lightweight metadata only; they do not execute specialized extraction stages.
- Existing records without `processingProfile` rely on runtime fallback from `documentType` until backfilled.
- Correcting a type updates the current profile but does not reprocess original or normalized assets.

## 2026-05-10 Transfer-Slip QR Groundwork

### Changed

- Extended transfer-slip processing profile metadata with a planned QR-oriented stage contract.
- Added planned transfer-slip stages: `QR_CANDIDATE`, `QR_DECODE`, `TRANSFER_METADATA_PARSE`, and `SLIP_VERIFICATION`.
- Added profile capability flags showing transfer slips are the QR-oriented future path while extraction and verification remain unimplemented.
- Kept deposit/payment slip, cheque, and unknown profiles conservative with only shared active stages.
- Exposed planned transfer-slip stage labels on document detail as future stages that are not executed yet.
- Added tests for transfer-slip planned stage metadata, non-slip conservative capabilities, API exposure, and existing upload behavior.

### Key Decisions

- Stage entries are metadata/contracts only. No QR candidate detection, QR decoding, OCR, parsing, or bank verification was added.
- Transfer slips remain the first specialized path.
- Shared duplicate, review, and quality flows remain generic and unchanged.
- Existing records without the newer profile shape still rely on runtime fallback where needed.

### Verification

- `npm run test`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run test:e2e`

### Known Limitations

- Planned stages do not produce results yet.
- There is no QR library, QR payload parser, OCR engine, or verification integration.
- The UI intentionally labels planned stages as not executed.

## 2026-05-10 Transfer-Slip QR-Candidate Stage

### Changed

- Added `lib/qr-candidate-analysis.ts` with a conservative normalized-image heuristic for QR-like square regions.
- Made `QR_CANDIDATE` an active transfer-slip stage while keeping `QR_DECODE`, `TRANSFER_METADATA_PARSE`, and `SLIP_VERIFICATION` planned only.
- Persisted `qrCandidateAnalysis` on new transfer-slip document records with status, result, timestamp, candidate count, optional best-candidate box, confidence, and notes.
- Kept non-slip document types conservative; they do not run QR-candidate analysis.
- Exposed QR-candidate analysis in upload/detail API responses and added a small document-detail note that QR content was not decoded.
- Cleared QR-candidate analysis on document-type correction because correction does not reprocess the image.
- Added tests for the heuristic, no-candidate behavior, transfer-slip route exposure, non-slip behavior, and updated profile metadata.

### Key Decisions

- The stage uses the normalized grayscale WebP derivative so it aligns with the existing image-processing pipeline.
- The heuristic checks high-contrast square windows and transition density. It is explainable and lightweight, but not a QR reader.
- `CANDIDATE_FOUND` is a triage signal only. It does not mean payload extraction, transfer metadata parsing, or bank verification happened.
- No QR decoding, OCR, cheque parsing, bank verification, queue, microservice, automatic type inference, camera overlay, or crop tooling was added.

### Verification

- `npm run test`
- `npm run typecheck`

### Known Limitations

- The heuristic can miss small, blurred, cropped, rotated, or low-contrast QR regions.
- Dense high-contrast non-QR patterns can still look QR-like.
- Candidate boxes are approximate normalized-image coordinates and are not yet exposed as crop artifacts.
- Existing records do not have backfilled QR-candidate analysis.
