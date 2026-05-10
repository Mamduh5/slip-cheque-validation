# Architecture

## App Structure

- `app/`: Next.js App Router pages and API routes.
- `components/`: reusable UI components and client-side forms.
- `lib/`: server-side auth, MongoDB, storage, validation, and document services.
- `types/`: NextAuth session type extensions.
- `docs/`: project memory for future work.

Imports use a TypeScript `paths` mapping for `@/*` without `baseUrl`. This keeps existing imports concise while avoiding deprecated `baseUrl` behavior in newer TypeScript versions.

## Auth

Auth is handled by NextAuth in the same Next.js app.

- Credentials provider supports email/password login.
- Optional Google provider is enabled when OAuth env values are present.
- Sessions use JWT strategy.
- User records are stored in MongoDB in the `users` collection.
- `proxy.ts` protects `/dashboard`, `/upload`, and `/documents/*` using NextAuth.
- `POST /api/documents`, `GET /api/documents/{id}`, `GET /api/documents/{id}/original`, and `POST /api/documents/{id}/review` require an authenticated session.
- Document access is owner-only in v1. Non-owned and missing documents both return `404` from owner-scoped API lookups to avoid exposing whether another user's document exists.
- Review actions are owner-only and only apply to pending likely duplicates.

Email/password registration is exposed through `POST /api/register`. Passwords are hashed with bcrypt before storage.

## MongoDB

MongoDB stores application records:

- `users`: auth users and optional password hashes.
- `documents`: uploaded document registry records.
- `duplicate_review_pairs`: owner-scoped memory of reviewed document pairs.
- `audit_logs`: lightweight audit entries for early lifecycle events.

The document service creates basic indexes lazily for user document listing, owner-scoped exact hash lookup, owner-scoped perceptual hash candidate lookup, and duplicate status lookup.

## MinIO

MinIO stores original uploaded images and normalized derivatives. The app uses a small object-storage helper in `lib/object-storage.ts`.

The configured bucket is created lazily on upload if it does not already exist. Object keys use:

```text
documents/{userId}/{documentId}/original.{ext}
documents/{userId}/{documentId}/normalized.webp
```

## Upload Flow

1. Authenticated user opens `/upload`.
2. User selects a document type: bank transfer slip, deposit/payment slip, cheque, or not sure/unknown.
3. Browser sends multipart form data to `POST /api/documents`.
4. Server validates document type, source type, MIME type, and file size.
5. Server computes a SHA-256 exact file hash.
6. Server checks MongoDB for the earliest existing document owned by the same user with the same `exactHash`.
7. The in-process document processing service receives the selected document type, decodes the image, assesses capture quality, creates a normalized grayscale WebP derivative, stores it in MinIO, and computes a 64-bit dHash from that derivative.
8. For `BANK_TRANSFER_SLIP` only, the transfer-slip branch runs conservative QR-candidate analysis on the normalized derivative, attempts QR decode when a plausible candidate exists, then classifies and parses supported decoded QR payloads into transfer metadata. Raw decode, parsed metadata, and future verification are stored separately.
9. If no exact match exists, the server checks owner-scoped perceptual-hash candidates for a likely duplicate.
10. Original image bytes are stored unchanged in MinIO.
11. A new document record is inserted into MongoDB for auditability.
12. If no match exists, `duplicateStatus` is `NEW`.
13. If an exact match exists, `duplicateStatus` is `EXACT_DUPLICATE`, `matchedDocumentId` points to the matched document, and `similarityScore` is `1`.
14. If no exact match exists but a perceptual match is close enough, `duplicateStatus` is `LIKELY_DUPLICATE`, `matchedDocumentId` points to the best matched document, and `similarityScore` is `1 - hammingDistance / 64`.
15. User is redirected to `/documents/{id}`.

`documentType` is user-selected and durable. It is not inferred from image content and is separate from machine duplicate status, human review status, and capture quality status.

Supported document types:

- `BANK_TRANSFER_SLIP`
- `DEPOSIT_PAYMENT_SLIP`
- `CHEQUE`
- `UNKNOWN`

The processing boundary includes a document-type processing profile so later stages can add slip verification, cheque-specific extraction, or payment-slip handling without changing the stored type model. Slip verification is not implemented yet.

## Type-Aware Processing Boundary

`lib/document-processing-profiles.ts` is the single dispatch point for document-type-aware processing. The current runtime uses shared intake stages for every type:

- capture-quality assessment;
- normalized image generation;
- SHA-256 exact duplicate check;
- dHash near-duplicate check.

Profiles define the current branch and future stage hints:

- `BANK_TRANSFER_SLIP`: `TRANSFER_SLIP` branch. This is the first specialized path. It runs `QR_CANDIDATE`, `QR_DECODE`, `TRANSFER_METADATA_PARSE`, and a minimal `SLIP_VERIFICATION` runtime scaffold that records no verification evidence.
- `DEPOSIT_PAYMENT_SLIP`: `PAYMENT_SLIP` branch. Future work can add printed-field extraction and payment-slip-specific validation.
- `CHEQUE`: `CHEQUE` branch. Future work can add cheque field extraction and cheque layout review support.
- `UNKNOWN`: `GENERIC` branch. It stays generic unless the owner corrects the type.

The profile is stored on new document records as lightweight metadata and exposed by document APIs. Planned stages are contract metadata only. They are not OCR or verification results.

The `SLIP_VERIFICATION` boundary is governed by `docs/slip-verification-spec.md`. The current runtime field is a scaffold only; it records `NOT_VERIFIED` with `NO_EVIDENCE` and does not perform local structural validation or external truth verification.

## Transfer-Slip QR-Candidate Analysis

`QR_CANDIDATE` is now a real executed transfer-slip stage. It only applies to `BANK_TRANSFER_SLIP` documents.

- The analyzer reads the normalized grayscale derivative, not the raw original.
- It scans small square windows for high-contrast, QR-like transition patterns.
- It stores `qrCandidateAnalysis.status`, `result`, `checkedAt`, `candidateCount`, an optional approximate best-candidate box in normalized-image coordinates, and short notes.
- `CANDIDATE_FOUND` means a plausible QR-like region was detected. It does not mean QR payloads were decoded or that a transfer is valid.
- Non-slip types do not run the stage and keep their conservative profiles.

The heuristic is intentionally explainable and lightweight. It can miss poor, cropped, or unusual QR regions, and it can produce false positives on dense high-contrast patterns. QR decoding treats this as candidate triage, not proof.

## Transfer-Slip QR Decode

`QR_DECODE` is now a real executed transfer-slip stage. It only applies to `BANK_TRANSFER_SLIP` documents and runs after `QR_CANDIDATE`.

- The decoder uses jsQR to attempt QR content extraction from the normalized image.
- Decoding is only attempted when `QR_CANDIDATE` completes successfully with `CANDIDATE_FOUND`.
- If no candidate exists, the stage is `SKIPPED`.
- If decoding succeeds, `qrDecode.result` is `QR_DECODED` and `rawDecodedText` contains the extracted content.
- If decoding fails, `qrDecode.result` is `NO_QR_DECODED`.
- The stage stores `status`, `result`, `decodedAt`, `rawDecodedText`, `decodedTextLength`, `sourceImageType`, and notes.
- **Raw decoded text is not verified. It is not treated as trustworthy payment data.**
- Transfer metadata parsing is a separate stage after decode. Slip verification remains separate and currently records only a safe no-evidence scaffold.
- Non-slip types do not run the stage.

## Transfer-Slip Metadata Parse

`TRANSFER_METADATA_PARSE` is now a real executed transfer-slip stage. It only applies to `BANK_TRANSFER_SLIP` documents and runs after `QR_DECODE`.

- The parser starts by classifying decoded payloads as `THAI_QR_PAYMENT`, `GENERIC_URL`, `PLAIN_TEXT`, or `UNKNOWN_FORMAT`.
- Generic URLs and plain text are not treated as payment metadata.
- Only `THAI_QR_PAYMENT` proceeds to structured parsing.
- Supported Thai QR payment parsing is EMV-style TLV parsing for PromptPay and bill-payment merchant account information using Thai QR application IDs.
- Parsed fields may include EMV version, initiation method, Thai merchant account subtype, target identifier, bill references, country, currency, amount, merchant name/city, CRC, and raw top-level tags.
- Parsed fields remain an interpretation of the decoded payload only. They are not verified and are not proof of payment status, authenticity, or bank truth.
- Unsupported formats produce clean `UNSUPPORTED_FORMAT` or `NO_STRUCTURED_METADATA` results instead of fake business fields.
- Non-slip types do not run the stage.

## Slip Verification Runtime

`SLIP_VERIFICATION` now runs local-only structural validation for supported Thai QR payment metadata and otherwise falls back to safe no-evidence outcomes. The design contract is documented in `docs/slip-verification-spec.md`.

- Successful QR decode means raw QR content was extracted.
- Successful transfer metadata parse means supported structure was interpreted from decoded QR content.
- For parsed supported Thai QR payment metadata, `slipVerification` can use `result: "STRUCTURALLY_CONSISTENT"` or `result: "STRUCTURALLY_INCONSISTENT"` with `evidenceCategory: "LOCAL_STRUCTURAL_CHECK"`.
- Legacy transfer-slip records with missing or null `slipVerification` remain readable. API responses coalesce missing values to `null`, and the UI shows safe "not available" wording instead of implying verification.
- Backfill is optional and operational, not automatic at startup. `npm run backfill:slip-verification -- --dry-run` reports eligible records; `npm run backfill:slip-verification` updates only `BANK_TRANSFER_SLIP` records where `slipVerification` is missing or null. The operator checklist is in `docs/operations.md`.
- The existing backfill sets only `slipVerification` to the older no-evidence scaffold for legacy shape normalization. It does not recompute local structural results and does not modify duplicate, review, quality, QR-candidate, QR-decode, or transfer-metadata fields.
- Local structural validation checks only parsed structure: EMV payload indicator, Thai country/currency tags, Thai QR merchant account information, subtype-specific target/reference fields, optional amount syntax, and CRC-16/CCITT-FALSE checksum correctness. A CRC mismatch makes the result `STRUCTURALLY_INCONSISTENT`.
- External truth verification, if later implemented, requires a configured external evidence source and must identify what claim was checked.
- Local structural consistency must not be labeled as bank/provider verification.
- Until an external truth source exists, UI/API language must continue to say parsed values are not verified.

## Dashboard Filtering

The dashboard supports server-side filtering of documents by `documentType`, `duplicateStatus`, and `reviewStatus`. Filtering is implemented via MongoDB queries scoped to the authenticated owner and uses URL search params for state. Filter state is managed by a client component that updates the URL, keeping the server-side rendering approach deterministic and owner-scoped. Empty states distinguish between "no documents yet" and "no documents match current filters".

## Document-Type Correction

Owners can correct `documentType` after upload from the document detail page. The update is handled by `PATCH /api/documents/{id}` and is owner-scoped like the detail and original-image routes.

Correction behavior is intentionally narrow:

- Only `documentType`, `processingProfile`, `qrCandidateAnalysis`, `qrDecode`, `transferMetadata`, `slipVerification`, and `updatedAt` are changed on the document record.
- Non-owned or missing documents return `404`.
- Invalid type values return `400`.
- Duplicate status, review status, quality status, hashes, object references, original assets, and normalized assets are not recomputed or overwritten.
- Existing QR-candidate analysis, QR decode, transfer metadata, and slip-verification scaffold results are cleared on type correction because the document is not reprocessed in this v1 flow.
- The corrected type becomes the current source of truth for future type-aware stages.

Each correction writes a `DOCUMENT_TYPE_UPDATED` audit record with old type, new type, labels, actor user id, and the unchanged duplicate/review/quality statuses. No audit-history UI is implemented yet.

Exact-match selection is deterministic: matching candidates are sorted by `createdAt ASC` and then `_id ASC`. The pending upload's generated id is excluded from the lookup, so the current upload cannot become its own match. If several exact matches already exist for the same owner, new duplicates link to the earliest record by that ordering.

## Normalized Image And Perceptual Hashing

The normalized-image stage is intentionally small and in-process. It does not use a queue or separate worker yet.

- Original uploads are stored unchanged.
- Normalized derivatives are stored as WebP at `documents/{userId}/{documentId}/normalized.webp`.
- Normalization uses Sharp to auto-orient, resize within 1024x1024, convert to grayscale, apply light contrast normalization, and encode as WebP.
- The chosen perceptual hash is 64-bit dHash. It is simpler than pHash, fast to compute, deterministic, and easy to explain for this v1 stage.
- dHash compares adjacent grayscale pixels after resizing the normalized image to 9x8.
- Likely duplicate threshold is Hamming distance `<= 8`, a conservative starting point.
- Likely duplicate `similarityScore` means `1 - hammingDistance / 64`, rounded to four decimals. Exact duplicates continue to use `1`.

## Capture Quality

Quality assessment is a separate machine signal from duplicate detection and human review.

- `qualityStatus`: `PASS`, `WARN`, or `FAIL`.
- `qualityWarnings`: machine-readable warnings such as `IMAGE_TOO_SMALL`, `BLURRY_IMAGE`, `TOO_DARK`, and `TOO_BRIGHT`.
- `qualityMetrics`: image width, height, mean luminance, and a Laplacian-variance sharpness heuristic.
- `qualityCheckedAt`: timestamp for the assessment.

Warn-vs-fail behavior is conservative:

- Invalid MIME type, empty file, and configured upload-size violations are rejected before image processing.
- Clearly unusable tiny images fail quality assessment and return `422`.
- Small-but-usable, blurry, dark, and bright images warn but continue through exact and near-duplicate detection.
- Quality warnings do not overwrite `duplicateStatus` or `reviewStatus`.

The upload UI gives mobile capture guidance: keep the document flat, include all corners, avoid glare and shadows, and retake if the image is soft. Document detail shows quality status, warning text, and basic metrics.

## Pre-Submit Upload Preview

The upload form now shows a local image preview after file selection or camera capture. Users can inspect the selected image before final upload and quickly retake or choose another image.

The upload page also includes lightweight framing guidance for photographed paper documents:

- A short capture checklist near the upload control.
- A static phone-photo framing card that reminds users to keep the paper edges visible.
- Corner-style guides on the selected-image preview.
- A preview checklist for corners, frame fill, sharpness, glare, and shadows.

These framing aids are not document detection. They do not crop, transform, verify, or block images.

Client-side advisory hints are intentionally limited:

- The browser checks selected image dimensions, average brightness, and a simple canvas sharpness heuristic.
- These hints are labeled as preview/advisory signals.
- Client hints do not block upload.
- The server remains authoritative for file validation and quality assessment.

If the server returns a quality failure such as an unusably small image, the user stays on the upload form, sees the server reason, and can retake or reselect without a dead end.

## Browser E2E

The project uses Playwright for a deliberately small browser E2E layer. It is scoped to user interaction that unit tests cannot cover well:

- Reaching `/upload` as an authenticated user.
- Rendering a selected image preview.
- Replacing the selected image through the retake/reselect flow.
- Showing recovery UI after a server-authoritative quality failure.

The E2E config starts the existing Docker Compose `mongo` and `minio` services through `scripts/e2e-env.mjs`, waits for MongoDB `ping` and MinIO `listBuckets`, then starts the Next.js dev server on port `3100`. Playwright waits on `/api/health`, which checks app availability plus MongoDB and MinIO connectivity. It uses `E2E_TEST_AUTH_ENABLED=true` plus `E2E_TEST_AUTH_USER_ID` to enable a dev/test-only auth bypass in `lib/session.ts` and `proxy.ts`; the bypass returns null when `NODE_ENV` is `production`, even if those env vars are present.

E2E commands:

- `npm run test:e2e`: local Playwright run using the same Docker-backed readiness path.
- `npm run test:e2e:ci`: CI-style wrapper that runs Playwright with `CI=true` behavior and performs final artifact cleanup.
- `npm run e2e:bootstrap`: starts Docker services and waits for MongoDB and MinIO.
- `npm run e2e:wait`: waits for MongoDB, MinIO, and `/api/health`.
- `npm run e2e:cleanup`: removes artifacts for the deterministic E2E user.
- `npm run e2e:diagnostics`: prints checked service endpoints and `docker compose ps`.

Current E2E coverage stays narrow:

- Preview/reselect is browser-only and does not hit storage services.
- Quality-failure recovery intercepts `POST /api/documents` and returns a controlled `422`.
- One happy-path test uses the real upload route with MongoDB and MinIO, then verifies the created document record and original object.

The real-service E2E uses `e2e-user` and cleans MongoDB records in `documents`, `audit_logs`, and `duplicate_review_pairs` for that user. It also removes MinIO objects under `documents/e2e-user/` before and after the real upload scenario. The CI wrapper repeats cleanup at process end so interrupted or failed runs are less likely to pollute the next run.

No provider-specific CI workflow is committed yet. The generic requirement is Docker availability, Node dependencies installed, and `npm run test:e2e:ci`.

## Duplicate Fields

- `exactHash`: exact byte-level duplicate lookup.
- `perceptualHash`: dHash from the normalized derivative.
- `duplicateStatus`: `NEW`, `EXACT_DUPLICATE`, or `LIKELY_DUPLICATE` for current v1 uploads.
- `matchedDocumentId`: related document when a duplicate is found.
- `similarityScore`: `1` for exact duplicates, or dHash similarity for likely duplicates.
- `reviewStatus`: separate human review state. Likely duplicates start as `PENDING`; new and exact duplicates use `NOT_REQUIRED`.
- `reviewedAt`: when the owner made a review decision.
- `reviewedMatchDocumentId`: the matched document reviewed by the owner.

Near-duplicate candidate selection is deterministic: lowest Hamming distance wins, then oldest `createdAt`, then lowest `_id`. Candidates are owner-scoped and the current upload id is excluded.

## Review Workflow

Machine detection and human review are intentionally separate:

- Machine status is stored in `duplicateStatus` and remains historically true.
- Human review is stored in `reviewStatus`.
- `LIKELY_DUPLICATE` records enter `reviewStatus: "PENDING"`.
- Owners can confirm the pair as `CONFIRMED_DUPLICATE` or mark it `CONFIRMED_DISTINCT`.
- Review actions keep `matchedDocumentId` and `similarityScore` intact; a human disagreement does not erase the machine result.
- The dashboard can filter all documents, pending review, confirmed duplicate, and confirmed distinct.
- Document detail shows side-by-side original previews for likely duplicates.

Pairwise review memory is stored in `duplicate_review_pairs` with canonical sorted document ids. Both confirmed duplicate and confirmed distinct pairs are remembered. Candidate selection skips already reviewed exact pairs, and reviewed records no longer appear as unresolved because their document-level `reviewStatus` is no longer `PENDING`.

Skipping reviewed pairs is pair-specific, not document-wide. If a pair was marked `CONFIRMED_DISTINCT`, that exact pair is suppressed, but the document can still surface a different likely-duplicate candidate later.

OCR, cheque field extraction, slip verification, and bank verification remain later pipeline stages, not the core v1 intake path.

## Known Limitations

Concurrent uploads of identical bytes by the same user can still race: two requests that both perform the duplicate lookup before either insert commits may both be marked `NEW`. A later pass can address this with a per-user hash claim, transaction strategy, or post-insert reconciliation if the product needs strong concurrent duplicate guarantees.

Near-duplicate matching is intentionally conservative and image-only. dHash may miss rotated, heavily cropped, warped, occluded, or very low-quality photos, and it may still produce false positives for visually similar documents. It should be treated as a review signal, not financial verification.

Pairwise review memory does not infer cluster-level decisions. If document A is distinct from B, and B is distinct from C, the app does not infer anything about A and C.

Quality heuristics are lightweight and explainable, not proof that the paper document is valid. Blur detection can be fooled by graphics or blank areas, and brightness checks use simple average luminance.

Client-side preview hints can differ from server-side quality results because the browser uses a smaller canvas sample and does not perform the full server pipeline. Server results should be treated as final.
