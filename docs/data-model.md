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

- update only `documentType` and `updatedAt`;
- write a `DOCUMENT_TYPE_UPDATED` audit log with old type, new type, who changed it, and when;
- do not recompute duplicate matching, quality assessment, normalized images, exact hashes, or perceptual hashes;
- make the corrected type the current source of truth for future type-aware stages.

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
