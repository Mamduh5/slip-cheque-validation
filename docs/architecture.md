# Architecture

## App Structure

- `app/`: Next.js App Router pages and API routes.
- `components/`: reusable UI components and client-side forms.
- `lib/`: server-side auth, MongoDB, storage, validation, and document services.
- `types/`: NextAuth session type extensions.
- `docs/`: project memory for future work.

## Review Queue Workflow

The review workflow surfaces documents with `duplicateStatus: LIKELY_DUPLICATE` and `reviewStatus: PENDING` through a dedicated first-class queue.

**Routes:**
- `/review` — Review queue page. Lists all pending items for the authenticated user. Shows compact cards with key OCR-derived fields (amount, receiver, reference, date/time), similarity score, and the matched document name. Two quick actions per card: **Compare & review** (goes to the compare page) and **Full detail** (goes to the document detail page).
- `/review/[id]` — Side-by-side compare page. Shows both images, a structured field comparison table with OCR-derived fields side by side, difference highlighting, and review action buttons (Confirm duplicate / Mark not duplicate). Low-confidence fields are excluded from the comparison table. Links to full detail for both documents. Also handles already-reviewed items gracefully (shows the recorded decision, no action buttons).
- `/dashboard` — Shows a pending-review count banner that links to `/review` when items are waiting.

**Data layer:**
- `getReviewQueueForUser(userId)` in `lib/documents.ts` — fetches LIKELY_DUPLICATE + PENDING documents for a user, batches the matched-document lookup in a single query, and returns pairs.

**Information density:**
- **Compact (default):** review queue cards and compare page show only decision-relevant fields. OCR fields, QR details, structural analysis, and technical identifiers are hidden.
- **Full detail:** the existing `/documents/[id]` page exposes everything, reorganised into collapsible sections so primary content is visible on first load.

**Collapsible sections** (`components/collapsible-section.tsx`): a thin client component wrapping any children behind a toggle button. Used on the document detail page to collapse "Document metadata", "Image-read fields", "Transfer slip analysis", and "Technical identifiers" behind on-demand expansion. The primary review decision and images remain always visible.

**Field comparison helpers** (`lib/review-helpers.ts`): pure helpers for the compare page, exported and unit-tested independently of the page component. Includes `reviewValuesMatch` (display-only string comparison — does not apply OCR normalisation; that responsibility stays in `normalizeReferenceForCompare`), `getImageReadField`, `getImageReadConfidence`, and `isLowConfidence`.

**Semantics preserved:** compact mode summarises existing stored truth. No new verification claims, no new duplicate logic, and no new statuses are introduced. The review decision API (`POST /api/documents/[id]/review`) is unchanged.

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

- `BANK_TRANSFER_SLIP`: `TRANSFER_SLIP` branch. This is the first specialized path. It runs `QR_CANDIDATE`, `QR_DECODE`, `TRANSFER_METADATA_PARSE`, `SLIP_IMAGE_READ` (OCR field extraction from the slip image), and a minimal `SLIP_VERIFICATION` runtime scaffold that records no verification evidence.
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

## Transfer-Slip Image Reading (SLIP_IMAGE_READ)

`SLIP_IMAGE_READ` is a real executed transfer-slip stage. It runs independently of QR decode and transfer metadata parsing, using OCR on the normalized image to extract printed or displayed transaction fields.

- The stage uses `tesseract.js` with multi-variant preprocessing (original, upscaled, contrast-boosted, edge-sharpened) to improve OCR robustness.
- Extracted fields are kept separate from QR-derived data. They are labeled as image-read and are not treated as verified.
- Extracted fields include: amount, sender name, receiver name, date/time, transaction/reference number, sender bank, receiver bank, sender account tail, receiver account tail.
- Each field carries a confidence level (`HIGH`, `MEDIUM`, `LOW`, `NONE`) and a source tag so callers know whether it came from a labeled line, contextual next line, or fallback regex.
- When OCR yields no usable text, the stage returns `result: "NONE"` with all fields set to `null` and `confidence: "NONE"`.
- When extraction yields at least one usable field, the stage returns `result: "EXTRACTED"` or `result: "PARTIAL"`.
- **Image-read fields are not verified. They are interpretations of visible text, not proof of bank truth, payment completion, or authenticity.**
- The stage runs even when QR decode fails or produces no structured metadata, providing an independent evidence source for duplicate suppression.

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

- Only `documentType`, `processingProfile`, `qrCandidateAnalysis`, `qrDecode`, `transferMetadata`, `slipImageRead`, `slipVerification`, and `updatedAt` are changed on the document record.
- Non-owned or missing documents return `404`.
- Invalid type values return `400`.
- Duplicate status, review status, quality status, hashes, object references, original assets, and normalized assets are not recomputed or overwritten.
- Existing QR-candidate analysis, QR decode, transfer metadata, slip-image-read, and slip-verification scaffold results are cleared on type correction because the document is not reprocessed in this v1 flow.
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

## Structure-Aware Transfer-Slip Duplicate Detection

For `BANK_TRANSFER_SLIP`, the duplicate decision layer is now structure-aware. After exact-hash matching, perceptual-hash candidates are collected and then assessed using structured evidence from QR decode, transfer metadata parsing, and image-read field extraction. This prevents visually similar but structurally different slips from becoming false `LIKELY_DUPLICATE` review candidates.

Evidence classes:

- **Definitive positive signals** (override everything): identical `qrDecode.rawDecodedText`, identical `transferMetadata.rawPayload`.
- **Strong conflict signals from QR/metadata** (suppress `LIKELY_DUPLICATE` when no definitive positive exists): different `qrDecode.rawDecodedText`, different `transferMetadata.rawPayload`, different `amount`, different `merchantAccountInfo.targetIdentifier` (recipient), different `merchantAccountInfo.references.reference1` (transaction reference).
- **Image-read conflict signals — field-specific trust tiers**:
  - *Tier 1 — strong fields*: `amount` and `transactionReference` are trusted at `MEDIUM` or higher. Either alone can suppress a near-duplicate without a definitive positive signal.
  - *Tier 2 — supporting fields*: `receiverName`, `senderName`, `dateTime`, and `receiverBank` suppress alone at `HIGH` confidence. At `MEDIUM` confidence they contribute to multi-signal suppression.
  - *Multi-signal combining rule*: two or more `MEDIUM`-confidence Tier-2 conflicts suppress together. A single `MEDIUM` Tier-2 conflict is also included in the suppression record when a Tier-1 conflict already exists, for maximum explainability.
- **Weak/tie-breaker signals** (used when structured evidence is insufficient or absent): perceptual image similarity, same bank template/layout.

Decision behavior:

- If a definitive positive signal exists, the candidate is accepted as a duplicate regardless of other differences.
- If any conflict signal exists and there is no definitive positive, the `LIKELY_DUPLICATE` classification is suppressed. The document receives `duplicateStatus: NEW` and a `notes` field records the suppression reason (e.g., "Suppressed near-duplicate: image-read different amount, image-read different transaction reference").
- Tier-1 image-read conflicts (`amount`, `transactionReference`) fire at `MEDIUM` or `HIGH` confidence, so the system does not depend on QR metadata to suppress clearly different slips.
- Tier-2 supporting fields require `HIGH` confidence to suppress alone, but two or more `MEDIUM` Tier-2 conflicts together are sufficient for suppression (multi-signal).
- Structured duplicate-decision reason codes carry all conflicting fields, so the suppression is fully explainable from `duplicateDecisionReasons` without parsing freeform notes.
- If structured evidence is insufficient (e.g., one side lacks parsed metadata and image-read fields, or neither side has the relevant fields), the system falls back to the generic perceptual-image path.
- Non-slip document types and transfer slips without parsed metadata or useful image-read results continue to use the original image-only near-duplicate path.

The assessment logic lives in `lib/transfer-slip-duplicate-assessment.ts` and is consumed by `lib/documents.ts` during the upload duplicate-decision flow. It is deterministic, does not call external services, and does not modify the stored candidate documents.

### OCR Comparison Normalization

Before comparing extracted field values in the duplicate assessment, values are normalized by `lib/slip-ocr-normalization.ts`. Normalization is applied at comparison time only — stored field values remain the raw OCR-derived strings.

**Reference normalization** (`normalizeReferenceForCompare`):
- Detects the Thai bank reference format: a long digit prefix (`{9-20}` chars), a `{3-5}` uppercase-letter transaction code, and a digit suffix (`{4+}` chars).
- In the digit prefix and suffix, normalizes three common OCR character confusions: `O` (letter O) → `0` (zero), `I` (uppercase I) → `1`, `l` (lowercase L) → `1`.
- Strips leading zeros from the digit prefix. OCR sometimes places the leading `0` of a reference on its own line, causing the captured prefix to be truncated (e.g. `16126175244BTF00250` instead of `016126175244BTF00250`). Stripping leading zeros from both sides makes them compare equal.
- The letter-code group is left unchanged so that genuinely different transaction codes remain distinct.
- Non-matching strings fall back to plain lowercase-and-trim comparison.
- Consequence: `01612I214623BTF04629`, `016121214623BTF04629`, and `16121214623BTF04629` (leading-zero-truncated) all compare as equal (same transaction, OCR variants); `016126175244BTF00250` and `016121214623BTF04629` remain distinct (genuinely different transactions).

**Reference extraction** (`extractTransactionReference` in `lib/slip-image-read.ts`):
- Priority 2 (label + generic alphanumeric): all-numeric captured values must be ≥ 15 characters. Rejects short garbage like `046123` (6 chars) or `0161212158448` (13-char truncated OCR artifact) that can appear when OCR degrades the label context.
- Priority 3 (robust contextual alphanumeric): tolerates noise after the label colon (e.g. ` : .` from OCR garbage). Looks up to 3 lines ahead for a bank-format reference.
- Priority 3b (contextual pure-numeric, runs after Priority 5): captures 15–20 digit PromptPay-style references that appear on the line(s) after a reference label, only when no alphanumeric bank-code reference was found by higher priorities.
- Variant scoring bonus: OCR variants that extract an alphanumeric (letter-code-bearing) reference score 1.5 points higher than variants with only a pure-numeric reference. This ensures the variant that correctly reads `BTF`/`BPP`/`ATF` beats a garbled variant where those letters were OCR-read as digits.

**Thai date/time normalization** (`normalizeThaiDateTimeForCompare`):
- Tesseract frequently fragments Thai month abbreviations by inserting spaces around Thai characters and dots (e.g., `6 พ . ค . 69 17:52` instead of `6 พ.ค.69 17:52`).
- Normalization strips all spaces adjacent to Thai characters and dots, then collapses remaining whitespace.
- Both fragmented and compact OCR representations of the same date/time map to the same canonical form, preventing false conflicts caused purely by tesseract spacing behaviour.
- Non-Thai formats (ISO, slash-date, time-only) are not affected.

**Thai name normalization** (`normalizeThaiNameForCompare`) and **comparison** (`compareThaiNames`):
- Applies at comparison time only; stored raw OCR values are never mutated.
- Strips leading honorific title prefixes — `นาย` (Mr), `นาง` (Mrs), `นางสาว`/`น.ส.` (Miss) — including OCR dot-space variants like `น . ส .`. `นางสาว` is tested before `นาง` to avoid partial stripping.
- Fixes the common tesseract Thai misread: nikhahit (U+0E4D) + sara-a (U+0E32) is replaced by sara-am (U+0E33).
- Collapses **all** spaces between adjacent Thai characters iteratively. This simultaneously handles OCR spacing fragmentation (`น า ย` → `นาย`) and inconsistent word-boundary spacing (`สมชาย ใจดี` → `สมชายใจดี`). Both forms produce the same canonical token for comparison.
- Strips leading/trailing punctuation noise and normalizes remaining whitespace.
- `compareThaiNames` returns `EXACT` (normalized strings identical), `CLOSE` (one normalized form is a prefix of the other and ≥4 chars — covers OCR truncation of long names), or `DIFFERENT`. `INSUFFICIENT` is returned when either normalized form is empty.
- Only `DIFFERENT` raises a duplicate conflict. `EXACT` and `CLOSE` are both treated as "same person".
- Confidence scores for name fields are not affected. The `CLOSE` path does not claim higher extraction quality; it only avoids false conflicts caused by OCR truncation.

These normalizations do not affect confidence scores and do not claim that values are verified. They improve comparison reliability without over-claiming extraction quality.

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

## Upload Progress States

The upload form provides staged progress feedback while the upload request is in flight:

- **"Uploading image…"** — the network request is being sent.
- **"Processing document…"** — the server has received the request and is processing.
- **"Finalizing result…"** — the response has been received and the client is preparing to redirect.

The submit button is disabled during all stages to prevent duplicate uploads. A visual stage bar shows progress through the three stages. Network errors are caught and surfaced with a clear retry message.

## Post-Upload Result Summary

After a successful upload, the user is redirected to `/documents/{id}`. The document detail page shows an "Upload result" summary banner derived entirely from the persisted document record. This makes it redirect-safe, refresh-safe, and bookmarkable.

The summary communicates:

- **Duplicate check**: exact duplicate, likely duplicate (review needed), new upload, or suppressed near-duplicate.
- **Review**: pending, confirmed duplicate, or confirmed distinct.
- **Quality**: warning count if warnings exist.
- **Transfer-slip stages** (for `BANK_TRANSFER_SLIP` only): QR decode status, metadata parse status, and local structural check status.
- **Notes**: suppression reason if a near-duplicate was suppressed by structured evidence.

All wording is honest and conservative. It does not claim bank/provider verification, payment truth, or authenticity. The summary logic lives in `lib/document-result-summary.ts` as a pure function over `DocumentRecord`.

## Duplicate-Decision Transparency

Beyond the general upload result summary, the document detail page includes a dedicated **"Duplicate decision"** card that explains the duplicate outcome in more depth.

### What it shows

- **Exact duplicate**: title "Exact duplicate" with explanation that it is a byte-level match.
- **Likely duplicate**: title "Likely duplicate — review needed" with explanation that image similarity suggests a match, and a side-by-side comparison is available.
- **New upload**: title "New upload" with a brief explanation.
- **Suppressed near-duplicate** (transfer slips only): title "Near-duplicate review suppressed" with a description that a visually similar candidate was found but not flagged for review, and which structured differences (amount, recipient, transaction reference, or QR payload) outweighed visual similarity.

### Matched candidate reference

If a match candidate exists (`matchedDocumentId`), the card also shows:
- A link to the matched document
- The visual similarity score when available

### Dashboard visibility

The dashboard list adds a small sky-blue badge under the filename for suppressed near-duplicates:
- Single reason: `Suppressed: amount differed`
- Two reasons: `Suppressed: amount differed, recipient differed`
- More than two: `Suppressed: amount differed, recipient differed+`

This helps users quickly distinguish suppressed near-duplicates from plain new uploads without opening each document.

### Structured duplicate-decision reason fields

The `DocumentRecord` now includes two dedicated explanation fields:

- **`duplicateDecisionType`**: `EXACT_DUPLICATE`, `LIKELY_DUPLICATE_REVIEW`, `NEW_UPLOAD`, or `SUPPRESSED_NEAR_DUPLICATE`.
- **`duplicateDecisionReasons`**: an array of machine-readable reason codes such as `AMOUNT_MISMATCH`, `RECIPIENT_MISMATCH`, `REFERENCE_MISMATCH`, `QR_PAYLOAD_MISMATCH`, `TRANSFER_METADATA_PAYLOAD_MISMATCH`, `IMAGE_SIMILARITY_ONLY`, `IDENTICAL_QR_PAYLOAD`, and `IDENTICAL_TRANSFER_METADATA_PAYLOAD`.

These fields are populated at upload time by the duplicate decision engine in `lib/duplicate-detection.ts` and `lib/transfer-slip-duplicate-assessment.ts`. The UI (`lib/document-result-summary.ts`, `app/documents/[id]/page.tsx`, and `app/dashboard/page.tsx`) prefers structured fields when present and only falls back to parsing the legacy `notes` field for older records.

Reason code mapping lives in one place: `reasonCodeToLabel` in `lib/document-result-summary.ts`.

### Legacy fallback

Older records that were created before structured reason fields existed still render correctly. The UI checks `duplicateDecisionType` first; when it is `null`, the system falls back to the existing `parseSuppressionReasons` helper that reads the `notes` field. This means:

- New documents write structured reasons and render from them.
- Legacy documents with only freeform notes continue to render acceptably.
- No migration or backfill is required.

This is data-shape and explanation UX hardening only: no new verification logic, no external integration.

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

## Dev / Regression Runner

A local CLI script (`scripts/inspect-transfer-slip.ts`) lets developers inspect OCR extraction and duplicate-assessment behavior on real image files without touching the database or running the full web app.

- Reads one or two image paths from CLI arguments.
- Bare filenames resolve under `tests/image/transfer-slip/`; absolute and relative paths also work.
- Runs the real `attemptSlipImageRead` pipeline on each image, using the same preprocessing (normalized + high-res OCR buffers) as production.
- Prints a human-readable report of extracted fields, confidence levels, warnings, and OCR stage status.
- When two images are provided, constructs minimal document-like objects and runs `assessTransferSlipDuplicateCandidate` plus `resolveDuplicateDecision`, printing the simulated duplicate outcome, conflicts, reason codes, and suppression behavior.
- Supports `--json` for machine-readable output and `--list-fixtures` to enumerate available test images.
- Labels all extracted values as OCR-derived and unverified. Does not claim bank/provider truth.

This is a development and debugging tool only. It is not a web endpoint, not part of production runtime, and does not perform financial verification.

## Known Limitations

Concurrent uploads of identical bytes by the same user can still race: two requests that both perform the duplicate lookup before either insert commits may both be marked `NEW`. A later pass can address this with a per-user hash claim, transaction strategy, or post-insert reconciliation if the product needs strong concurrent duplicate guarantees.

Near-duplicate matching is intentionally conservative and image-only. dHash may miss rotated, heavily cropped, warped, occluded, or very low-quality photos, and it may still produce false positives for visually similar documents. It should be treated as a review signal, not financial verification.

Pairwise review memory does not infer cluster-level decisions. If document A is distinct from B, and B is distinct from C, the app does not infer anything about A and C.

Quality heuristics are lightweight and explainable, not proof that the paper document is valid. Blur detection can be fooled by graphics or blank areas, and brightness checks use simple average luminance.

Client-side preview hints can differ from server-side quality results because the browser uses a smaller canvas sample and does not perform the full server pipeline. Server results should be treated as final.
