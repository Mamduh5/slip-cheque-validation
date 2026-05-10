# Data Model

Collection and field names are currently implemented in camelCase TypeScript/Mongo records.

## `users`

Stores authentication users.

| Field | Type | Notes |
| --- | --- | --- |
| `_id` | ObjectId | Primary user id used in sessions. |
| `email` | string | Unique normalized email. |
| `name` | string \| null | Display name. |
| `image` | string \| null | OAuth profile image when available. |
| `emailVerified` | Date \| null | Reserved for future verification. |
| `passwordHash` | string \| null | Present for email/password users; null for OAuth-only users. |
| `createdAt` | Date | Creation timestamp. |
| `updatedAt` | Date | Update timestamp. |

## `documents`

Stores one registry record per uploaded document image.

| Field | Type | Notes |
| --- | --- | --- |
| `_id` | ObjectId | Document id. |
| `userId` | string | Owner user id from session. |
| `documentType` | enum | Durable user-selected intake type: `BANK_TRANSFER_SLIP`, `DEPOSIT_PAYMENT_SLIP`, `CHEQUE`, `UNKNOWN`. |
| `sourceType` | enum | `CAMERA` or `UPLOAD`. |
| `originalFilename` | string | Browser-provided filename. |
| `mimeType` | string | Allowed now: JPEG, PNG, WebP. |
| `fileSize` | number | Original upload size in bytes. |
| `originalObject.bucket` | string | MinIO bucket. |
| `originalObject.key` | string | MinIO object key. |
| `normalizedObject.bucket` | string \| null | MinIO bucket for the normalized derivative. |
| `normalizedObject.key` | string \| null | Normalized WebP derivative object key. |
| `normalizedImage.width` | number \| null | Normalized derivative width in pixels. |
| `normalizedImage.height` | number \| null | Normalized derivative height in pixels. |
| `normalizedImage.mimeType` | string \| null | Currently `image/webp`. |
| `normalizedImage.fileSize` | number \| null | Normalized derivative size in bytes. |
| `normalizedImage.algorithm` | string \| null | Currently `normalized-webp-grayscale-v1`. |
| `processingProfile.name` | string | Type-aware processing profile name, such as `bank-transfer-slip-v1`. |
| `processingProfile.branch` | enum | `TRANSFER_SLIP`, `PAYMENT_SLIP`, `CHEQUE`, or `GENERIC`. |
| `processingProfile.currentStages` | string[] | Current enabled stages. All types use shared quality, normalization, and duplicate stages; transfer slips also include `qr-candidate-analysis`, `qr-decode`, and `transfer-metadata-parse`. |
| `processingProfile.futureStages` | string[] | Documented future stage hints; not executed in v1. |
| `processingProfile.plannedStages` | object[] | Stage contract metadata. Transfer slips mark `QR_CANDIDATE`, `QR_DECODE`, and `TRANSFER_METADATA_PARSE` as `ACTIVE`; verification remains `PLANNED`. Shared stages are marked `ACTIVE`. |
| `processingProfile.capabilities` | object | Capability flags such as QR-oriented future path, QR-candidate analysis availability, and whether extraction/verification are implemented. Extraction and verification are currently false. |
| `qrCandidateAnalysis.stage` | string \| null | Transfer-slip-only stage key, currently `QR_CANDIDATE`. Null or absent for non-slip records and older records. |
| `qrCandidateAnalysis.algorithm` | string \| null | Currently `qr-candidate-heuristic-v1`. |
| `qrCandidateAnalysis.status` | enum \| null | `COMPLETED`, `FAILED`, `PENDING`, or `NOT_APPLICABLE`. New transfer-slip uploads normally use `COMPLETED` unless analysis fails. |
| `qrCandidateAnalysis.result` | enum \| null | `CANDIDATE_FOUND`, `NO_CANDIDATE_FOUND`, or `ANALYSIS_SKIPPED`. This is candidate detection, not QR decoding. |
| `qrCandidateAnalysis.checkedAt` | Date \| null | When candidate analysis ran. |
| `qrCandidateAnalysis.candidateCount` | number \| null | Count of plausible QR-like windows retained by the heuristic. |
| `qrCandidateAnalysis.bestCandidate` | object \| null | Approximate best candidate box and confidence in normalized-image coordinates when found. |
| `qrCandidateAnalysis.notes` | string[] \| null | Short non-authoritative notes about candidate detection. |
| `qrDecode.stage` | string \| null | Transfer-slip-only stage key, currently `QR_DECODE`. Null or absent for non-slip records and older records. |
| `qrDecode.algorithm` | string \| null | Currently `jsqr-decode-v1`. |
| `qrDecode.status` | enum \| null | `COMPLETED`, `FAILED`, `SKIPPED`, or `NOT_APPLICABLE`. `SKIPPED` when no candidate exists; `COMPLETED` when decode was attempted. |
| `qrDecode.result` | enum \| null | `QR_DECODED` or `NO_QR_DECODED`. This is raw QR content extraction, not business field parsing. |
| `qrDecode.decodedAt` | Date \| null | When QR decode ran. |
| `qrDecode.rawDecodedText` | string \| null | Raw decoded QR content when successful. Not parsed into bank/account/amount/reference fields. Not verified. |
| `qrDecode.decodedTextLength` | number \| null | Length of raw decoded text when successful. |
| `qrDecode.sourceImageType` | enum \| null | Currently `normalized-image` when decode was attempted; null when skipped. |
| `qrDecode.notes` | string[] \| null | Short non-authoritative notes about decode attempt. No business interpretation is stored. |
| `transferMetadata.stage` | string \| null | Transfer-slip-only stage key, currently `TRANSFER_METADATA_PARSE`. Null or absent for non-slip records and older records. |
| `transferMetadata.algorithm` | string \| null | Currently `transfer-metadata-parse-v1`. |
| `transferMetadata.status` | enum \| null | `COMPLETED`, `FAILED`, `SKIPPED`, or `NOT_APPLICABLE`. `SKIPPED` when decoded QR text is unavailable. |
| `transferMetadata.result` | enum \| null | `PARSED`, `UNSUPPORTED_FORMAT`, `NO_STRUCTURED_METADATA`, or `PARSE_FAILED`. |
| `transferMetadata.payloadFormat` | enum \| null | Conservative classification before parsing: `THAI_QR_PAYMENT`, `GENERIC_URL`, `PLAIN_TEXT`, or `UNKNOWN_FORMAT`. |
| `transferMetadata.parsedAt` | Date \| null | When transfer metadata parse ran. |
| `transferMetadata.metadata` | object \| null | Parsed structured metadata when available. This is parsed from decoded QR content and is not verified. |
| `transferMetadata.metadata.merchantAccountInfo` | object \| null | Supported Thai QR merchant account info such as PromptPay or bill-payment subtype, target identifier, and bill references when derivable. |
| `transferMetadata.metadata.amount` | string \| null | Amount string from the supported QR payload when present. Not a verified payment amount. |
| `transferMetadata.metadata.countryCode` | string \| null | Country tag from the supported QR payload when present. |
| `transferMetadata.metadata.currencyCode` | string \| null | Currency tag from the supported QR payload when present. |
| `transferMetadata.metadata.rawTopLevelTags` | object | Raw parsed top-level TLV tags for audit/debug use. |
| `transferMetadata.notes` | string[] \| null | Short non-authoritative notes about parse behavior. |
| `transferMetadata.warnings` | string[] \| null | Warnings for suspicious but parseable structure, such as unexpected amount formatting. |
| `status` | enum | `UPLOADED`, `PROCESSING`, `READY`, `FAILED`. |
| `duplicateStatus` | enum | `NOT_CHECKED`, `PENDING`, `NEW`, `EXACT_DUPLICATE`, `LIKELY_DUPLICATE`, `DUPLICATE`, `POSSIBLE_DUPLICATE`, `ERROR`. |
| `matchedDocumentId` | string \| null | Match reference for exact or likely duplicates; null for new documents. |
| `similarityScore` | number \| null | `1` for exact duplicates; `1 - hammingDistance / 64` for likely duplicates. |
| `reviewStatus` | enum | Human review state: `NOT_REQUIRED`, `PENDING`, `CONFIRMED_DUPLICATE`, `CONFIRMED_DISTINCT`. |
| `reviewedAt` | Date \| null | When the owner made the review decision. |
| `reviewedMatchDocumentId` | string \| null | Matched document id that was reviewed. |
| `qualityStatus` | enum | Capture quality signal: `PASS`, `WARN`, or `FAIL`. Persisted records are usually `PASS` or `WARN`; hard-fail uploads are rejected before insert. |
| `qualityWarnings` | string[] | Warning codes such as `IMAGE_TOO_SMALL`, `BLURRY_IMAGE`, `TOO_DARK`, `TOO_BRIGHT`. |
| `qualityMetrics.width` | number \| null | Decoded image width in pixels. |
| `qualityMetrics.height` | number \| null | Decoded image height in pixels. |
| `qualityMetrics.meanLuminance` | number \| null | Average grayscale luminance used for exposure warnings. |
| `qualityMetrics.sharpness` | number \| null | Laplacian-variance sharpness heuristic. |
| `qualityCheckedAt` | Date \| null | Capture quality assessment timestamp. |
| `exactHash` | string \| null | SHA-256 of the original uploaded bytes. |
| `perceptualHash` | string \| null | 64-bit dHash of the normalized derivative as 16 hex characters. |
| `notes` | string \| null | Reserved for internal notes. |
| `createdAt` | Date | Creation timestamp. |
| `updatedAt` | Date | Update timestamp. |

## `audit_logs`

Optional lightweight audit collection.

| Field | Type | Notes |
| --- | --- | --- |
| `_id` | ObjectId | Audit id. |
| `userId` | string | Optional actor id. |
| `action` | string | Event name. |
| `targetType` | string | `document`, `user`, or `system`. |
| `targetId` | string | Optional target id. |
| `metadata` | object | Small contextual payload. Document-type corrections store old/new type, display labels, actor user id, and unchanged duplicate/review/quality status values. |
| `createdAt` | Date | Event timestamp. |

## `duplicate_review_pairs`

Stores owner-scoped review memory for a specific pair of documents.

| Field | Type | Notes |
| --- | --- | --- |
| `_id` | ObjectId | Pair review id. |
| `userId` | string | Owner user id. |
| `documentAId` | string | Lower sorted document id for canonical pair storage. |
| `documentBId` | string | Higher sorted document id for canonical pair storage. |
| `decision` | enum | `CONFIRMED_DUPLICATE` or `CONFIRMED_DISTINCT`. |
| `reviewedByUserId` | string | User who made the decision. |
| `reviewedAt` | Date | Decision timestamp. |
| `createdAt` | Date | Pair memory creation timestamp. |
| `updatedAt` | Date | Pair memory update timestamp. |

## Document-Type Field

`documentType` is selected during upload and stored on every document record. It is a product intake category, not automated content extraction.

Supported values:

- `BANK_TRANSFER_SLIP`: transfer receipt or confirmation slip.
- `DEPOSIT_PAYMENT_SLIP`: deposit, bill payment, or counter payment slip.
- `CHEQUE`: paper cheque image.
- `UNKNOWN`: user is not sure or the document type is unclear.

The upload form shows type-specific guidance after selection, dashboard items and detail pages display the chosen type, and upload/detail API responses expose both the enum and a display label. This field is separate from:

- `duplicateStatus`: machine duplicate decision.
- `reviewStatus`: human decision for likely duplicates.
- `qualityStatus`: capture-quality signal.

Future type-specific work can use this field for QR handling, cheque-specific extraction, or payment-slip handling. Those pipelines are intentionally not implemented yet.

Owners can correct `documentType` after upload. Corrections:

- update only `documentType`, `processingProfile`, `qrCandidateAnalysis`, and `updatedAt`;
- clear any existing `qrCandidateAnalysis` because the image is not reprocessed during correction;
- write a `DOCUMENT_TYPE_UPDATED` audit log with old type, new type, who changed it, and when;
- do not recompute duplicate matching, quality assessment, normalized images, exact hashes, or perceptual hashes;
- make the corrected type the current source of truth for future type-aware stages.

## Type-Aware Processing Profile

`processingProfile` is a lightweight snapshot of the current type-aware processing branch.

- `BANK_TRANSFER_SLIP` uses `bank-transfer-slip-v1` on the `TRANSFER_SLIP` branch.
- `DEPOSIT_PAYMENT_SLIP` uses `deposit-payment-slip-v1` on the `PAYMENT_SLIP` branch.
- `CHEQUE` uses `cheque-v1` on the `CHEQUE` branch.
- `UNKNOWN` uses `generic-unknown-v1` on the `GENERIC` branch.

Transfer slips include stage contract entries:

- `QR_CANDIDATE`: active QR-like region candidate analysis on the normalized derivative. No QR decoding is performed.
- `QR_DECODE`: future QR payload decoding.
- `TRANSFER_METADATA_PARSE`: future parsing of decoded transfer metadata.
- `SLIP_VERIFICATION`: future verification after extraction exists.

Profiles document the branch, active shared stages, transfer-slip QR-candidate analysis, and future stage hints. They do not mean QR decoding, OCR, cheque parsing, or bank verification has run.

## Transfer-Slip QR-Candidate Fields

`qrCandidateAnalysis` is only populated for new `BANK_TRANSFER_SLIP` records processed after the QR-candidate stage was added. The stage uses the normalized derivative and an explainable high-contrast square-window heuristic to record whether a plausible QR-like region exists.

`CANDIDATE_FOUND` means the image may contain a QR-like region. It does not mean the QR payload was read, parsed, or verified. `NO_CANDIDATE_FOUND` means the heuristic did not find a plausible region, not that the original slip has no QR code.

Non-slip types keep `qrCandidateAnalysis` null. Existing records without this field should be treated as not analyzed.

## Duplicate-Check Fields

V1 computes `exactHash` during upload and checks for the earliest existing document owned by the same user with the same hash.

- New unique uploads are stored with `duplicateStatus: "NEW"`.
- Exact duplicate uploads still create a new document record for auditability.
- Exact duplicate records use `duplicateStatus: "EXACT_DUPLICATE"`, set `matchedDocumentId`, and set `similarityScore` to `1`.
- If there is no exact match, perceptual candidates are checked with owner-scoped dHash Hamming distance.
- Likely duplicate records use `duplicateStatus: "LIKELY_DUPLICATE"`, set `matchedDocumentId`, and set `similarityScore` to `1 - hammingDistance / 64`.
- Machine duplicate status remains separate from human review status.
- New and exact duplicate records use `reviewStatus: "NOT_REQUIRED"`.
- Likely duplicate records use `reviewStatus: "PENDING"` until the owner reviews them.
- Exact matching is deterministic: `createdAt ASC`, then `_id ASC`.
- Likely duplicate matching is deterministic: lowest Hamming distance, then `createdAt ASC`, then `_id ASC`.
- The generated current document id is excluded from the lookup so a record cannot match itself.
- Reviewed pairs in `duplicate_review_pairs` are skipped during likely duplicate candidate selection for that exact pair.
- `NOT_CHECKED` remains in the enum for older or future deferred-processing records.

## Image Storage

- `originalObject` always points to the unchanged uploaded file.
- `normalizedObject` points to the generated derivative used for fingerprinting.
- Normalized derivatives are auto-oriented, resized within 1024x1024, converted to grayscale, lightly normalized, and stored as WebP.
- Current object key pattern is `documents/{userId}/{documentId}/normalized.webp`.

## Quality Fields

Quality assessment is separate from duplicate detection and human review.

- `PASS`: no current capture warnings.
- `WARN`: upload is accepted but may be harder to match or review.
- `FAIL`: clearly unusable image. Current hard-fail uploads are rejected and are not inserted as documents.

Current warning codes:

- `IMAGE_TOO_SMALL`: image is below recommended dimensions, or below minimum usable dimensions for hard fail.
- `BLURRY_IMAGE`: low Laplacian-variance sharpness heuristic.
- `TOO_DARK`: low average luminance.
- `TOO_BRIGHT`: high average luminance, often glare or overexposure.

## Ownership Rules

- Each document belongs to exactly one `userId`.
- Dashboard and document detail pages only query documents for the current session user.
- `POST /api/documents` requires authentication and stores the session user id as owner.
- `GET /api/documents/{id}` and `GET /api/documents/{id}/original` require authentication and only return owner documents.
- `POST /api/documents/{id}/review` requires authentication, owner access, and a pending likely duplicate.
- Missing and non-owned documents are handled the same way at the API boundary.
